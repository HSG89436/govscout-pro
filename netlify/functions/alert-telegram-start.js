// alert-telegram-start.js — Telegram webhook, handles /start and /chatid commands
// Set webhook: POST https://api.telegram.org/bot{TOKEN}/setWebhook
//   with url = https://govscout.pro/.netlify/functions/alert-telegram-start

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!tgToken) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Bot not configured' }) };

  try {
    const update = JSON.parse(event.body || '{}');
    const message = update.message || update.edited_message;
    if (!message) return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };

    const chatId  = message.chat.id;
    const text    = (message.text || '').trim().toLowerCase();
    const firstName = message.from ? (message.from.first_name || 'there') : 'there';

    let reply = '';

    if (text.startsWith('/start') || text.startsWith('/chatid')) {
      reply = `👋 Hey ${firstName}!\n\n` +
        `Your *Telegram Chat ID* is:\n\n` +
        `\`${chatId}\`\n\n` +
        `Copy that number and paste it into the Telegram Chat ID field at:\n` +
        `https://govscout.pro/alerts\n\n` +
        `Once you sign up, I'll send you federal contract alerts every morning based on your keywords and certifications. 🎯`;
    } else if (text.startsWith('/help')) {
      reply = `*GovScout Pro Alert Bot*\n\n` +
        `Commands:\n` +
        `/start — Get your Chat ID for alerts signup\n` +
        `/chatid — Same as /start\n` +
        `/help — Show this message\n\n` +
        `Sign up for alerts at: https://govscout.pro/alerts`;
    } else {
      reply = `I'm the GovScout Pro alert bot 🤖\n\n` +
        `Use /start to get your Chat ID, then sign up at:\nhttps://govscout.pro/alerts`;
    }

    await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: reply, parse_mode: 'Markdown' })
    });

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    console.error('alert-telegram-start error:', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};
