// run-alerts.js — Netlify Scheduled Function, runs daily at 9am UTC  (v1 CommonJS)
// Schedule defined in netlify.toml: [functions."run-alerts"] schedule = "0 9 * * *"
const { getDatabase } = require('@netlify/database');

const DEFAULT_NAICS = ['541611', '541512', '541330', '541519', '611430'];

const CERT_SETASIDE_MAP = {
  'SDVOSB':  ['SDVOSBC', 'SDVOSBS', 'SDVOSB', 'SDVOB'],
  'VOSB':    ['VOSBC', 'VOSBS', 'VOSB'],
  '8(a)':    ['8A', '8(A)', 'SBA'],
  'WOSB':    ['WOSB', 'WOSBSS', 'EDWOSB'],
  'HUBZone': ['HUBZ', 'HUBN'],
};

function scoreOpportunity(opp, certifications) {
  const setAside = (opp.typeOfSetAside || '').toUpperCase();
  if (!setAside || setAside === 'NONE' || setAside === '') return 'TEAM';
  for (const cert of certifications) {
    const aliases = CERT_SETASIDE_MAP[cert] || [cert.toUpperCase()];
    if (aliases.some(a => setAside.includes(a))) return 'GO';
  }
  return 'PASS';
}

async function fetchSAMOpportunities(sub, postedFrom) {
  const naicsList = sub.naics_codes ? sub.naics_codes.split(',').map(s=>s.trim()).filter(Boolean) : DEFAULT_NAICS;
  const keywords  = sub.keywords ? sub.keywords.split(',').map(s=>s.trim()).filter(Boolean) : ['consulting', 'services'];
  const today     = fmtDate(new Date());
  const results   = [];
  const seen      = new Set();

  for (const kw of keywords.slice(0, 2)) {
    for (const naicsCode of naicsList.slice(0, 3)) {
      const apiKey = sub.sam_api_key || process.env.SAM_GOV_API_KEY || '';
      if (!apiKey) {
        console.error(`SAM fetch skipped for ${sub.email}: no API key configured`);
        return results;
      }
      const params = new URLSearchParams({
        api_key: apiKey,
        title: kw,
        ncode: naicsCode,
        postedFrom: postedFrom || fmtDate(daysAgo(1)),
        postedTo: today,
        ptype: 'o',
        limit: '25',
        offset: '0'
      });
      try {
        const res  = await fetch(`https://api.sam.gov/opportunities/v2/search?${params}`);
        if (res.status === 404) continue;
        if (!res.ok) {
          console.error(`SAM fetch failed kw=${kw} naics=${naicsCode}: HTTP ${res.status}`);
          continue;
        }
        const data = await res.json();
        for (const opp of (data.opportunitiesData || [])) {
          if (!seen.has(opp.noticeId)) { seen.add(opp.noticeId); results.push(opp); }
        }
      } catch (e) { console.error(`SAM fetch error kw=${kw} naics=${naicsCode}:`, e.message); }
    }
  }
  return results;
}

exports.handler = async () => {
  const { sql } = getDatabase({ connectionString: process.env.APP_DB_URL });
  const resendKey = process.env.RESEND_API_KEY;
  const tgToken   = process.env.TELEGRAM_BOT_TOKEN;
  const siteUrl   = process.env.SITE_URL || 'https://govscout.pro';

  // ── Session cleanup: delete expired tokens once daily ────────────────────
  try {
    const deleted = await sql`DELETE FROM user_sessions WHERE expires_at < NOW()`;
    console.log(`Session cleanup: removed expired tokens`);
  } catch (e) {
    console.warn('Session cleanup failed (non-fatal):', e.message);
  }

  let subscribers = [];
  try {
    subscribers = await sql`SELECT * FROM alert_subscribers WHERE active = TRUE`;
  } catch (err) {
    console.error('Failed to fetch subscribers:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }

  if (!subscribers.length) { console.log('No active subscribers.'); return { statusCode: 200, body: 'OK' }; }
  console.log(`Processing ${subscribers.length} subscribers`);

  for (const sub of subscribers) {
    try {
      const postedFrom = sub.last_run ? fmtDate(new Date(sub.last_run)) : fmtDate(daysAgo(1));
      const opps = await fetchSAMOpportunities(sub, postedFrom);
      const certs = sub.certifications ? sub.certifications.split(',').map(s=>s.trim()).filter(Boolean) : [];
      const minScore = sub.min_score || 'TEAM';

      const scored = opps
        .map(o => ({ opp: o, score: scoreOpportunity(o, certs) }))
        .filter(s => {
          if (minScore === 'GO') return s.score === 'GO';
          if (minScore === 'TEAM') return s.score === 'GO' || s.score === 'TEAM';
          return true;
        });

      await sql`UPDATE alert_subscribers SET last_run = NOW(), updated_at = NOW() WHERE id = ${sub.id}`;

      if (!scored.length) {
        console.log(`No leads for ${sub.email}`);
        // Log skipped run
        try {
          await sql`INSERT INTO alert_delivery_log (subscriber_id, subscriber_email, channel, status, leads_count)
            VALUES (${sub.id}, ${sub.email}, 'email', 'skipped', 0)`;
        } catch (e) {
          console.warn(`Skipped-run logging failed for ${sub.email}:`, e.message);
        }
        continue;
      }

      const unsubLink = `${siteUrl}/api/alert-unsubscribe?token=${sub.unsubscribe_token}&email=${encodeURIComponent(sub.email)}`;

      if (resendKey && sub.email) {
        let emailStatus = 'failed';
        let emailError = null;
        try {
          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'GovScout Pro <alerts@govscout.pro>',
              to: [sub.email],
              subject: `🎯 ${scored.length} New Contract ${scored.length === 1 ? 'Lead' : 'Leads'} — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
              html: buildDigestEmail(sub, scored, unsubLink, siteUrl)
            })
          });
          if (emailRes.ok) {
            emailStatus = 'sent';
            console.log(`Email → ${sub.email} (${scored.length} leads)`);
          } else {
            const errBody = await emailRes.text().catch(() => '');
            emailError = `HTTP ${emailRes.status}: ${errBody.slice(0, 200)}`;
            console.error(`Email failed ${sub.email}: ${emailError}`);
          }
        } catch (e) {
          emailError = e.message;
          console.error(`Email failed ${sub.email}:`, e.message);
        }
        // Log delivery attempt
        try {
          await sql`INSERT INTO alert_delivery_log (subscriber_id, subscriber_email, channel, status, leads_count, error_message)
            VALUES (${sub.id}, ${sub.email}, 'email', ${emailStatus}, ${scored.length}, ${emailError})`;
        } catch (e) {
          console.warn(`Email delivery logging failed for ${sub.email}:`, e.message);
        }
      }

      if (tgToken && sub.telegram_chat_id) {
        let tgStatus = 'failed';
        let tgError = null;
        try {
          const goCount   = scored.filter(s => s.score === 'GO').length;
          const teamCount = scored.filter(s => s.score === 'TEAM').length;
          let tgMsg = `🎯 *GovScout Pro — Daily Alert*\n`;
          tgMsg += `${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}\n\n`;
          tgMsg += `Found *${scored.length}* contract ${scored.length === 1 ? 'lead' : 'leads'}:\n`;
          if (goCount)   tgMsg += `🟢 *${goCount} GO* — matches your cert\n`;
          if (teamCount) tgMsg += `🟡 *${teamCount} TEAM* — open competition\n`;
          tgMsg += '\n';
          for (const { opp, score } of scored.slice(0, 5)) {
            const badge  = score === 'GO' ? '🟢' : '🟡';
            const agency = (opp.organizationHierarchy?.[0]?.name || opp.department || 'Agency').slice(0, 40);
            const due    = opp.responseDeadLine ? new Date(opp.responseDeadLine).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD';
            tgMsg += `${badge} *${(opp.title || 'Untitled').slice(0, 60)}*\n${agency} | Due: ${due}\n\n`;
          }
          if (scored.length > 5) tgMsg += `_...and ${scored.length - 5} more in your email_\n\n`;
          tgMsg += `[View in GovScout Pro](${siteUrl}/app)`;

          const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: sub.telegram_chat_id, text: tgMsg, parse_mode: 'Markdown', disable_web_page_preview: true })
          });
          const tgData = await tgRes.json().catch(() => ({}));
          if (tgData.ok) {
            tgStatus = 'sent';
            console.log(`Telegram → chatId ${sub.telegram_chat_id}`);
          } else {
            tgError = tgData.description || 'Telegram API error';
            console.error(`Telegram failed ${sub.email}:`, tgError);
          }
        } catch (e) {
          tgError = e.message;
          console.error(`Telegram failed ${sub.email}:`, e.message);
        }
        // Log delivery attempt
        try {
          await sql`INSERT INTO alert_delivery_log (subscriber_id, subscriber_email, channel, status, leads_count, error_message)
            VALUES (${sub.id}, ${sub.email}, 'telegram', ${tgStatus}, ${scored.length}, ${tgError})`;
        } catch (e) {
          console.warn(`Telegram delivery logging failed for ${sub.email}:`, e.message);
        }
      }
    } catch (e) { console.error(`Error processing subscriber ${sub.email}:`, e.message); }
  }

  return { statusCode: 200, body: JSON.stringify({ processed: subscribers.length }) };
};

function fmtDate(d) {
  return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`;
}
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate()-n); return d; }

function buildDigestEmail(sub, scored, unsubLink, siteUrl) {
  const goOpps   = scored.filter(s => s.score === 'GO');
  const teamOpps = scored.filter(s => s.score === 'TEAM');
  const dateStr  = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  function oppCard(opp, score) {
    const badgeBg    = score === 'GO' ? '#166534' : '#713f12';
    const badgeColor = score === 'GO' ? '#4ade80' : '#fbbf24';
    const badgeLabel = score === 'GO' ? 'GO — CERT MATCH' : 'TEAM — OPEN COMP';
    const agency  = (opp.organizationHierarchy?.[0]?.name || opp.department || 'Federal Agency').slice(0, 80);
    const due     = opp.responseDeadLine ? new Date(opp.responseDeadLine).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'TBD';
    const posted  = opp.postedDate ? new Date(opp.postedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    const samUrl  = `https://sam.gov/opp/${opp.solicitationNumber || opp.noticeId}/view`;
    const title   = (opp.title || 'Untitled').slice(0, 120);
    return `<div style="background:#131829;border:1px solid #1e2a42;border-radius:8px;padding:20px;margin-bottom:16px;">
<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
<span style="background:${badgeBg};color:${badgeColor};font-size:10px;font-weight:700;letter-spacing:1.5px;padding:4px 8px;border-radius:4px;">${badgeLabel}</span>
${posted ? `<span style="color:#4a5a82;font-size:11px;">Posted ${posted}</span>` : ''}
</div>
<div style="color:#eef2ff;font-size:15px;font-weight:600;margin-bottom:8px;line-height:1.4;">${title}</div>
<div style="color:#8a9cc8;font-size:12px;margin-bottom:4px;">${agency}</div>
${opp.naicsCode ? `<div style="color:#4a5a82;font-size:11px;">NAICS: ${opp.naicsCode}</div>` : ''}
<div style="margin-top:14px;display:flex;align-items:center;justify-content:space-between;">
<span style="color:${score==='GO'?'#4ade80':'#fbbf24'};font-size:13px;font-weight:600;">Due: ${due}</span>
<a href="${samUrl}" style="background:#f5a623;color:#05070f;font-size:12px;font-weight:700;padding:8px 16px;border-radius:6px;text-decoration:none;">View on SAM.gov →</a>
</div></div>`;
  }

  const goSection   = goOpps.length   ? `<div style="margin-bottom:8px;"><div style="color:#4ade80;font-size:11px;letter-spacing:1.5px;font-weight:700;margin-bottom:12px;">🟢 GO — CERT MATCHES (${goOpps.length})</div>${goOpps.map(s=>oppCard(s.opp,s.score)).join('')}</div>` : '';
  const teamSection = teamOpps.length ? `<div style="margin-bottom:8px;"><div style="color:#fbbf24;font-size:11px;letter-spacing:1.5px;font-weight:700;margin-bottom:12px;">🟡 TEAM — OPEN COMPETITION (${teamOpps.length})</div>${teamOpps.map(s=>oppCard(s.opp,s.score)).join('')}</div>` : '';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#05070f;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:640px;margin:0 auto;padding:32px 16px;">
<div style="background:#0e1225;border:1px solid #1e2a42;border-radius:12px;overflow:hidden;">
<div style="background:linear-gradient(135deg,#0e1225,#131829);padding:28px 32px;border-bottom:1px solid #1e2a42;">
<div style="font-size:20px;color:#f5a623;font-weight:700;letter-spacing:1px;">GOV<span style="color:#eef2ff;">SCOUT</span> PRO</div>
<div style="color:#8a9cc8;font-size:13px;margin-top:4px;">Daily Contract Alert · ${dateStr}</div>
</div>
<div style="padding:28px 32px;">
<h1 style="color:#eef2ff;font-size:20px;margin:0 0 6px;">Hey ${sub.name || 'Scout'} — ${scored.length} new ${scored.length===1?'lead':'leads'} today</h1>
<p style="color:#8a9cc8;font-size:14px;margin:0 0 24px;">Federal opportunities matching your profile on SAM.gov.</p>
${goSection}${teamSection}
<div style="margin-top:24px;text-align:center;"><a href="${siteUrl}/app" style="display:inline-block;background:#f5a623;color:#05070f;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;text-decoration:none;">Analyze with Marcus AI →</a></div>
</div>
<div style="background:#090c18;padding:20px 32px;border-top:1px solid #1e2a42;text-align:center;">
<p style="color:#4a5a82;font-size:12px;margin:0;">You're receiving this because you signed up at govscout.pro · <a href="${unsubLink}" style="color:#8a9cc8;text-decoration:underline;">Unsubscribe</a></p>
</div></div></div></body></html>`;
}
