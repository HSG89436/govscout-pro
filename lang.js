// GovScout Pro — EN / ES Language Toggle  v2
// Uses Google Translate Element (free, no API key required)
// Also patches JS-injected UI strings that Google Translate can't reach.

// ── Spanish CTA / UI string dictionary ──────────────────────────────────────
var GS_ES = {
  // Auth flow
  'Checking your account...':          'Verificando tu cuenta...',
  'Checking account...':               'Verificando cuenta...',
  'Signing in...':                     'Iniciando sesión...',
  'Creating your account...':          'Creando tu cuenta...',
  'Please enter a valid email address.':'Ingresa una dirección de correo válida.',
  'Please enter your password.':       'Ingresa tu contraseña.',
  'Password must be at least 6 characters.': 'La contraseña debe tener al menos 6 caracteres.',
  'Passwords do not match.':           'Las contraseñas no coinciden.',
  'Connection error. Please try again.': 'Error de conexión. Intenta de nuevo.',
  'Invalid email or password.':        'Correo o contraseña incorrectos.',
  'Could not create account. Contact support.': 'No se pudo crear la cuenta. Contacta soporte.',
  // Alerts panel
  'Enter your Chat ID first.':         'Ingresa tu Chat ID primero.',
  '✅ Test message sent — check Telegram!': '✅ Mensaje de prueba enviado — revisa Telegram!',
  '✅ Test email sent — check your inbox!': '✅ Correo de prueba enviado — revisa tu bandeja!',
  'Enter your email address first.':   'Ingresa tu correo electrónico primero.',
  'Enter at least one delivery method — email or Telegram Chat ID.':
    'Ingresa al menos un método de entrega: correo o ID de Telegram.',
  '✅ Alerts activated':               '✅ Alertas activadas',
  'Pause contract alerts?':            '¿Pausar alertas de contratos?',
  // Search / contracts
  'No Results':                        'Sin Resultados',
  'Connection Error':                  'Error de Conexión',
  // Auth gate / paywall (JS-rendered, hidden at load — Google Translate misses these)
  'SIGN IN':                           'INICIAR SESIÓN',
  'GET STARTED — $9/MO →':            'COMENZAR — $9/MES →',
  'CONTINUE →':                        'CONTINUAR →',
  'SIGN IN →':                         'INICIAR SESIÓN →',
  'CREATE MY ACCOUNT →':              'CREAR MI CUENTA →',
  '// SUBSCRIPTION REQUIRED':         '// SUSCRIPCIÓN REQUERIDA',
  'Sign Out':                          'Cerrar sesión',
  // Buttons (static HTML — Google Translate handles these, but we patch as backup)
  'Get Started — $9/mo':               'Comenzar — $9/mes',
  'See Pricing':                       'Ver Precios',
  'Request Early Access':              'Solicitar Acceso Anticipado',
  'Sending…':                          'Enviando…',
  'Error':                             'Error',
};

// Reverse map for switching back to EN
var GS_EN = {};
Object.keys(GS_ES).forEach(function(k) { GS_EN[GS_ES[k]] = k; });

// Current active language (reflects what Google Translate has applied)
window._gsActiveLang = localStorage.getItem('gs_lang') || 'en';

// ── t() — use this in JS to output translatable strings ─────────────────────
// Usage: el.textContent = t('Checking account...');
window.t = function(str) {
  if (window._gsActiveLang === 'es' && GS_ES[str]) return GS_ES[str];
  return str;
};

// ── _gsPatchDOM() — swap known strings already in the DOM ───────────────────
function _gsPatchDOM(toLang) {
  var dict = toLang === 'es' ? GS_ES : GS_EN;
  // Patch textContent on elements that Google Translate can't reach
  // (JS-injected text, hidden-at-load auth gate, aria-labels, status messages)
  var selectors = [
    '#auth-checking', '#auth-error',
    '#alerts-tg-result', '#alerts-email-test-result',
    '#alerts-save-msg', '#alerts-err-msg',
    // Auth gate / paywall — hidden at page load, so Google Translate skips them
    '#auth-signin-btn', '#auth-getstarted-btn',
    '#auth-continue-btn-txt', '#auth-pw-signin-txt', '#auth-create-txt',
    '#auth-sub-required', '#auth-signout-btn',
  ];
  selectors.forEach(function(sel) {
    var el = document.querySelector(sel);
    if (!el) return;
    var txt = el.textContent.trim();
    if (dict[txt]) el.textContent = dict[txt];
  });

  // innerHTML patches — elements containing HTML markup (<br>, &bull;, etc.)
  var htmlPatches = {
    es: {
      '#auth-gate-desc':  '¿Ya eres suscriptor? Inicia sesión abajo.<br>¿Nuevo? Crea tu cuenta — el pago con PayPal sigue.',
      '#auth-sub-cancel': 'Cancela cuando quieras &bull; Sin contratos',
    },
    en: {
      '#auth-gate-desc':  'Already a subscriber? Sign in below.<br>New? Create your account — PayPal checkout follows.',
      '#auth-sub-cancel': 'Cancel anytime &bull; No contracts',
    },
  };
  var htmlMap = htmlPatches[toLang] || {};
  Object.keys(htmlMap).forEach(function(sel) {
    var el = document.querySelector(sel);
    if (el) el.innerHTML = htmlMap[sel];
  });
}

// ── Google Translate widget init ─────────────────────────────────────────────
window.googleTranslateElementInit = function () {
  new google.translate.TranslateElement({
    pageLanguage: 'en',
    includedLanguages: 'en,es',
    autoDisplay: false
  }, 'gs_translate_el');

  // Apply saved preference after widget initialises
  var saved = localStorage.getItem('gs_lang');
  if (saved === 'es') {
    setTimeout(function () { _gsApply('es'); }, 900);
    _gsSetActive('es');
    setTimeout(function () { _gsPatchDOM('es'); }, 1200);
  }
};

function _gsApply(lang) {
  var combo = document.querySelector('.goog-te-combo');
  if (!combo) return;
  combo.value = lang;
  var e = document.createEvent('HTMLEvents');
  e.initEvent('change', true, true);
  combo.dispatchEvent(e);
}

function _gsSetActive(lang) {
  ['en', 'es'].forEach(function (l) {
    var btn = document.getElementById('gs-lang-' + l);
    if (btn) btn.className = 'gs-lang-btn' + (l === lang ? ' gs-lang-active' : '');
  });
}

function setLang(lang) {
  localStorage.setItem('gs_lang', lang);
  window._gsActiveLang = lang;
  _gsSetActive(lang);
  _gsPatchDOM(lang);

  if (lang === 'en') {
    // Try clicking Google's built-in "Show original" close button first
    var bar = document.querySelector('.goog-te-banner-frame');
    if (bar) {
      try {
        var doc = bar.contentDocument || bar.contentWindow.document;
        var closeBtn = doc.querySelector('.goog-close-link');
        if (closeBtn) { closeBtn.click(); return; }
      } catch (e) {}
    }
    _gsApply('en');
  } else {
    _gsApply(lang);
  }
}

// Set initial button state on DOM ready
// GS-V61-002 fix: apply Spanish patches immediately without waiting for
// Google Translate widget initialisation. When the user navigated from the
// homepage with ES selected, googleTranslateElementInit fires with a ~1200ms
// delay and could run AFTER showAuthGate() — leaving the gate in English.
// We patch the DOM synchronously here so the gate is always in the right
// language the instant it becomes visible.
document.addEventListener('DOMContentLoaded', function () {
  var saved = localStorage.getItem('gs_lang') || 'en';
  window._gsActiveLang = saved;
  _gsSetActive(saved);
  if (saved === 'es') {
    _gsPatchDOM('es');
  }
});

// ── Re-patch auth gate whenever it becomes visible ───────────────────────────
// The paywall is display:none at load — Google Translate skips hidden content.
// When JS shows it (safeOpen / showAuthGate), we re-run _gsPatchDOM so the
// active language is applied immediately instead of showing mixed EN/ES text.
(function () {
  var _authGateEl = null;
  function _repatch() {
    var lang = window._gsActiveLang || 'en';
    if (lang !== 'en') _gsPatchDOM(lang);
  }
  function _observe() {
    var gate = document.getElementById('auth-modal-overlay') ||
               document.getElementById('auth-gate') ||
               document.getElementById('auth-overlay');
    if (!gate) return;
    _authGateEl = gate;
    var obs = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.attributeName === 'style' || m.attributeName === 'class') {
          _repatch();
        }
      });
    });
    obs.observe(gate, { attributes: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _observe);
  } else {
    _observe();
  }
  // Expose so safeOpen / showAuthGate can call it directly as a safety net
  window._gsRepatchGate = _repatch;
})();
