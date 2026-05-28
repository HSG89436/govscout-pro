/**
 * FEDSCOUT i18n — Multi-Language Support
 * Adds EN / ES (and future languages) to govscout.pro
 * Zero design changes — inject via <script> tag only
 * Version 1.0 | govscout.pro
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────
  //  TRANSLATION DICTIONARIES
  // ─────────────────────────────────────────────
  const DICT = {

    es: {
      // ── NAV ──────────────────────────────────
      'LAUNCH APP': 'INICIAR APP',
      '▶ LAUNCH APP': '▶ INICIAR APP',
      'MARCUS': 'MARCUS',
      'WHO IT SERVES': 'PARA QUIÉN',
      'HOW IT WORKS': 'CÓMO FUNCIONA',
      'BETA': 'BETA',
      'BLOG': 'BLOG',
      'RESOURCES': 'RECURSOS',
      'ROADMAP': 'HOJA DE RUTA',
      'HOME': 'INICIO',
      'GOV CONTRACTING AI': 'IA DE CONTRATACIÓN FEDERAL',

      // ── HERO ─────────────────────────────────
      'Meet': 'Conoce a',
      'Your Federal Contracting Consultant': 'Tu Consultor de Contratación Federal',
      'Not a search tool. Not a dashboard. A': 'No es un buscador. No es un panel. Un',
      'complete AI consultant': 'consultor de IA completo',
      'who reads your SAM.gov documents, finds contracts you can win, identifies subcontracting opportunities, and builds your entire bid package. Works for':
        'que lee tus documentos de SAM.gov, encuentra contratos que puedes ganar, identifica oportunidades de subcontratación y construye todo tu paquete de propuesta. Funciona para',
      'any small business': 'cualquier pequeña empresa',
      '— veteran, women-owned, 8(a), HUBZone, minority, or plain small business.':
        '— veterana, de propietaria mujer, 8(a), HUBZone, minoritaria o simple pequeña empresa.',
      '🎯 Launch FEDSCOUT — Free': '🎯 Iniciar FEDSCOUT — Gratis',
      '📋 Request Beta Access': '📋 Solicitar Acceso Beta',

      // ── MARQUEE / TICKER ─────────────────────
      'Marcus Hale GovCon Consultant': 'Marcus Hale Consultor GovCon',
      'SAM.gov Document Analysis': 'Análisis de Documentos SAM.gov',
      'SDVOSB Set-Asides': 'Contratos SDVOSB',
      'WOSB Federal Contracts': 'Contratos Federales WOSB',
      '8(a) Sole-Source Strategy': 'Estrategia de Fuente Única 8(a)',
      'HUBZone Opportunities': 'Oportunidades HUBZone',
      'MBE Subcontracting': 'Subcontratación MBE',
      'General Foreman Placement': 'Contratación de Capataz General',
      'Electrical Sub Teaming': 'Alianza con Sub Eléctrico',
      'Bid Package Builder': 'Constructor de Paquete de Oferta',
      '72-Hour Attack Protocol': 'Protocolo de Ataque en 72 Horas',
      'GovCon School': 'Escuela GovCon',
      'Certification Guide': 'Guía de Certificaciones',
      'Awardable Pricing Engine': 'Motor de Precios Adjudicables',
      'Sources Sought Strategy': 'Estrategia Sources Sought',
      'Incumbent Intelligence': 'Inteligencia sobre el Titular',
      'Trojan Sub Strategy': 'Estrategia Sub Troyano',

      // ── V5 BANNER ────────────────────────────
      'v5.0 NOW LIVE  ·  COMPLETE REBUILD  ·  APRIL 27, 2026':
        'v5.0 EN VIVO  ·  RECONSTRUCCIÓN COMPLETA  ·  27 ABRIL 2026',
      '✓ Any Business Type': '✓ Cualquier Tipo de Empresa',
      '✓ Marcus Reads Your Documents': '✓ Marcus Lee Tus Documentos',
      '✓ Sub & Teaming Finder': '✓ Buscador de Subs y Socios',
      '✓ GovCon School Built In': '✓ Escuela GovCon Integrada',
      '✓ Certification Guide': '✓ Guía de Certificaciones',
      '✓ Complete Bid Package Builder': '✓ Constructor Completo de Propuestas',
      '✓ Foreman & Electrical Sub Finder': '✓ Buscador de Capataz y Sub Eléctrico',
      '✓ Conversation-First Interface': '✓ Interfaz Conversacional',

      // ── STATS ─────────────────────────────────
      '$500M+': '$500M+',
      'CONTRACTS WON': 'CONTRATOS GANADOS',
      'SUCCESS RATE': 'TASA DE ÉXITO',
      'YRS INSIDE GOV': 'AÑOS DENTRO DEL GOB',
      'BIZ TYPES': 'TIPOS DE EMPRESA',

      // ── MARCUS QUOTE ─────────────────────────
      "I don't help you apply for contracts. I help you win them before they're written. If you're reading the RFP for the first time — you're already late. The winner helped shape it.":
        "No te ayudo a aplicar a contratos. Te ayudo a ganarlos antes de que estén escritos. Si estás leyendo el RFP por primera vez — ya llegaste tarde. El ganador ayudó a definirlo.",
      'The Consultant People Pay': 'El Consultor Que Cobra',
      '10% of Contract Value': '10% del Valor del Contrato',
      'Marcus spent 20+ years as a federal CO inside DoD, GSA, VA, and DOE. He influenced over $500 million in contract awards. Then he switched sides. Now he works for small businesses — and his win rate is 90% on every contract he says GO on.':
        'Marcus pasó más de 20 años como CO federal en DoD, GSA, VA y DOE. Influyó en más de $500 millones en adjudicaciones. Luego cambió de bando. Ahora trabaja para pequeñas empresas — con una tasa de éxito del 90% en cada contrato que dice GO.',

      // ── WHAT MARCUS DOES ─────────────────────
      'He reads your SAM.gov documents': 'Lee tus documentos de SAM.gov',
      'Upload everything — solicitation, PWS, SOW, amendments. Marcus reads every word like a 20-year CO and gives you a complete plain-English breakdown of exactly what they want and exactly how to win.':
        'Sube todo — solicitud, PWS, SOW, enmiendas. Marcus lee cada palabra como un CO de 20 años y te da un análisis completo en español de exactamente qué quieren y cómo ganar.',
      'He pre-screens contracts before you see them': 'Pre-filtra contratos antes de que los veas',
      "Not 200 search results — 10 pre-screened opportunities with GO, TEAM, or PASS already attached, and exactly why. Stop wasting time on contracts you can't win.":
        "No 200 resultados — 10 oportunidades pre-filtradas con GO, EQUIPO o PASAR ya adjuntos, y exactamente por qué. Deja de perder tiempo en contratos que no puedes ganar.",
      'He finds your subcontractors and teaming partners': 'Encuentra tus subcontratistas y socios',
      'On every contract Marcus spots General Foreman needs, electrical sub requirements, teaming partner opportunities, and prime contractors to approach. He tells you exactly what to say.':
        'En cada contrato Marcus identifica necesidades de Capataz General, requisitos de sub eléctrico, oportunidades de socios y contratistas principales. Te dice exactamente qué decir.',
      'He builds your complete bid package': 'Construye tu paquete de propuesta completo',
      'Cover letter, capability statement, technical approach, pricing narrative, compliance checklist — all written for that specific contract in the language evaluators score on.':
        'Carta de presentación, declaración de capacidades, enfoque técnico, narrativa de precios, lista de cumplimiento — todo redactado para ese contrato específico en el lenguaje que evalúan los evaluadores.',
      'He teaches you the game — in plain English': 'Te enseña el juego — en español claro',
      'GovCon School built in. Ask Marcus anything — FAR clauses, LPTA vs Best Value, Sources Sought, Trojan Sub play, awardable pricing. Real answers, not government jargon.':
        'Escuela GovCon integrada. Pregúntale a Marcus cualquier cosa — cláusulas FAR, LPTA vs Mejor Valor, Sources Sought, estrategia Sub Troyano, precios adjudicables. Respuestas reales, no jerga gubernamental.',

      // ── WHO MARCUS WORKS FOR ──────────────────
      '// WHO MARCUS WORKS FOR': '// PARA QUIÉN TRABAJA MARCUS',
      'Any Small Business.': 'Cualquier Pequeña Empresa.',
      'Any Certification.': 'Cualquier Certificación.',
      'Tell Marcus what your business does. He figures out NAICS codes, agencies, set-asides, and teaming strategy automatically.':
        'Dile a Marcus qué hace tu empresa. Él determina los códigos NAICS, agencias, contratos reservados y estrategia de equipo automáticamente.',

      'SDVOSB / VOSB': 'SDVOSB / VOSB',
      'Service-Disabled & Veteran-Owned': 'Propiedad de Veterano con Discapacidad',
      "Marcus targets VA set-asides first — the VA is legally mandated to use SDVOSBs. Your certification is your single biggest competitive weapon and most veterans don't use it right.":
        "Marcus prioriza los contratos reservados del VA — el VA está legalmente obligado a usar SDVOSBs. Tu certificación es tu mayor arma competitiva y la mayoría de los veteranos no la usan bien.",
      '"The VA spent $28B with SDVOSBs last year. Most went to the same 500 companies. You can break in — if you know which contracts to target and when."':
        '"El VA gastó $28B con SDVOSBs el año pasado. La mayoría fue a las mismas 500 empresas. Puedes entrar — si sabes qué contratos elegir y cuándo."',

      'WOSB / EDWOSB': 'WOSB / EDWOSB',
      'Women-Owned Businesses': 'Empresas de Propietaria Mujer',
      'Marcus knows exactly which NAICS codes have WOSB set-asides and which agencies hit their spending goals. Design firms, consulting companies, staffing agencies — all eligible.':
        'Marcus sabe exactamente qué códigos NAICS tienen contratos WOSB y qué agencias alcanzan sus metas de gasto. Firmas de diseño, consultoras, agencias de personal — todas elegibles.',
      '"Most WOSB companies don\'t know half the set-aside categories they qualify for. I fix that in the first conversation."':
        '"La mayoría de las empresas WOSB no conocen ni la mitad de las categorías de contratos para las que califican. Lo corrijo en la primera conversación."',

      'SBA 8(a)': 'SBA 8(a)',
      'SBA 8(a) Business Development': 'Desarrollo de Negocios SBA 8(a)',
      'The most powerful cert in federal contracting. Sole-source awards up to $4.5M with zero competition. Most 8(a) companies massively underuse their sole-source authority. Marcus fixes that.':
        'La certificación más poderosa en la contratación federal. Adjudicaciones de fuente única hasta $4.5M sin competencia. La mayoría de las empresas 8(a) subutilizan masivamente su autoridad de fuente única. Marcus lo corrige.',
      '"8(a) sole-source access is free money that most companies leave on the table. I find every opportunity before your competitors see it."':
        '"El acceso de fuente única 8(a) es dinero gratis que la mayoría de las empresas deja sobre la mesa. Encuentro cada oportunidad antes de que tus competidores la vean."',

      'HUBZone': 'HUBZone',
      'HUBZone Businesses': 'Empresas HUBZone',
      '10% price evaluation preference in full and open competition plus dedicated set-asides. Marcus targets the competitions where your geographic advantage wins — most contractors miss these.':
        'Preferencia del 10% en evaluación de precios en competencia abierta más contratos reservados dedicados. Marcus apunta a las competencias donde tu ventaja geográfica gana — la mayoría de los contratistas los pierden.',
      '"HUBZone is underused by agencies and underappreciated by contractors. That gap is your opportunity."':
        '"Las agencias subutilizan HUBZone y los contratistas lo infravaloran. Esa brecha es tu oportunidad."',

      'MBE / Minority-Owned': 'MBE / Propietario Minoritario',
      'Minority-Owned Businesses': 'Empresas de Propietario Minoritario',
      'Marcus focuses on subcontracting goals of large primes first — get paid to build past performance — then moves you into prime contracting. Teaching companies, design agencies, consultants all welcome.':
        'Marcus se enfoca primero en los objetivos de subcontratación de los grandes contratistas principales — cobra mientras construyes desempeño pasado — luego te lleva a la contratación principal. Empresas educativas, agencias de diseño, consultores todos bienvenidos.',
      '"Large primes must hit subcontracting goals. You are the solution to their compliance problem. I find those primes and tell you exactly what to say."':
        '"Los grandes contratistas deben cumplir metas de subcontratación. Tú eres la solución a su problema de cumplimiento. Encuentro esos contratistas y te digo exactamente qué decir."',

      'SMALL BUSINESS': 'PEQUEÑA EMPRESA',
      'Any Small Business Type': 'Cualquier Tipo de Pequeña Empresa',
      "No certification yet? Marcus assesses what you qualify for and gets you started. IT firms, construction, staffing, widget manufacturers, design companies, training organizations — if you're small, Marcus knows how to get you in.":
        "¿Sin certificación aún? Marcus evalúa para qué calificas y te pone en marcha. Empresas de TI, construcción, personal, fabricantes, diseño, organizaciones de capacitación — si eres pequeño, Marcus sabe cómo hacerte entrar.",
      '"Tell me what your business does. Two sentences. I\'ll tell you which certifications to get, which agencies to target, and what contract to go after first."':
        '"Dime qué hace tu empresa. Dos oraciones. Te diré qué certificaciones obtener, qué agencias elegir y qué contrato perseguir primero."',

      // ── THE PROBLEM ───────────────────────────
      '// THE PROBLEM': '// EL PROBLEMA',
      'Sound': '¿Te',
      'Familiar?': 'Suena Familiar?',
      'Every small contractor hits the same wall. Marcus tears it down.':
        'Todo pequeño contratista choca con la misma pared. Marcus la derriba.',
      'Hours on SAM.gov Finding Nothing Useful': 'Horas en SAM.gov Sin Encontrar Nada Útil',
      'Thousands of contracts posted daily with no scoring, no filtering by what you can actually win. Most contractors waste 4+ hours a week just finding relevant opportunities.':
        'Miles de contratos publicados diariamente sin puntuación, sin filtrado por lo que realmente puedes ganar. La mayoría de los contratistas pierde 4+ horas por semana solo encontrando oportunidades relevantes.',
      'Marcus pre-screens everything. You see only what you can win.':
        'Marcus pre-filtra todo. Solo ves lo que puedes ganar.',
      'Documents Written in Another Language': 'Documentos Escritos en Otro Idioma',
      "PWS, SOW, CLIN, FAR clauses — it takes hours to understand what they're actually asking for. Most contractors miss the thing that kills their bid before they start writing.":
        "PWS, SOW, CLIN, cláusulas FAR — toma horas entender qué están pidiendo realmente. La mayoría de los contratistas se pierde lo que mata su oferta antes de empezar a escribir.",
      'Marcus reads every document. Plain English in minutes.':
        'Marcus lee cada documento. En español claro en minutos.',
      'No Idea Who to Call or Team With': 'Sin Idea de a Quién Llamar o con Quién Aliarse',
      'General Foreman needed on site? Need an electrical sub? Which prime to approach? Most small businesses miss every teaming opportunity hiding inside a solicitation.':
        '¿Necesitas un Capataz General en obra? ¿Un sub eléctrico? ¿Qué contratista principal contactar? La mayoría de las pequeñas empresas pierde cada oportunidad de alianza escondida en una solicitud.',
      'Marcus identifies every sub and teaming opportunity on every contract.':
        'Marcus identifica cada oportunidad de sub y alianza en cada contrato.',
      'Building Bid Packages Takes Days': 'Construir Paquetes de Propuesta Toma Días',
      'Cover letter, capability statement, technical approach, pricing — rebuilt from scratch every time. Hours of work before writing one word of your actual proposal.':
        'Carta de presentación, declaración de capacidades, enfoque técnico, precios — reconstruido desde cero cada vez. Horas de trabajo antes de escribir una palabra de tu propuesta.',
      'Marcus builds your complete package. One click.':
        'Marcus construye tu paquete completo. Un clic.',

      // ── NEW IN V5 ─────────────────────────────
      '// NEW IN v5.0': '// NUEVO EN v5.0',
      'Marcus Finds Every': 'Marcus Encuentra Cada',
      'Sub Opportunity': 'Oportunidad de Sub',
      "You're Missing": 'Que Estás Perdiendo',
      "On every contract Marcus automatically identifies General Foreman needs, electrical subs, teaming partners, and primes to approach. Here's what it looks like:":
        "En cada contrato Marcus identifica automáticamente necesidades de Capataz General, subs eléctricos, socios y contratistas principales a contactar. Así es como se ve:",

      '// WHAT MARCUS DOES': '// QUÉ HACE MARCUS',
      'Everything a': 'Todo lo que Hace un',
      '$500/Hour Consultant': 'Consultor de $500/Hora',
      "For $49/month. And he works at 2am when you're ready.":
        'Por $49/mes. Y trabaja a las 2am cuando estás listo.',

      'NEW IN v5.0': 'NUEVO EN v5.0',
      'Document Intelligence': 'Inteligencia de Documentos',
      'Upload everything from SAM.gov. Marcus reads every page and produces a complete plain-English report — what they want, what to submit, evaluation criteria decoded, compliance checklist, incumbent signals, pricing range, and the 72-hour attack plan.':
        'Sube todo de SAM.gov. Marcus lee cada página y produce un informe completo en español — qué quieren, qué enviar, criterios de evaluación decodificados, lista de cumplimiento, señales del titular, rango de precios y el plan de ataque de 72 horas.',
      'Business Profile System': 'Sistema de Perfil de Negocio',
      'Tell Marcus what your business does in plain English. He figures out your NAICS codes, target agencies, and set-aside strategy. Works for any business type — consultant, designer, manufacturer, trainer, IT firm, contractor.':
        'Dile a Marcus qué hace tu empresa en español simple. Él determina tus códigos NAICS, agencias objetivo y estrategia de contratos reservados. Funciona para cualquier tipo de negocio — consultor, diseñador, fabricante, capacitador, empresa de TI, contratista.',

      // ── PRICING ───────────────────────────────
      'Free': 'Gratis',
      'month': 'mes',
      'per month': 'por mes',
      'Get Started': 'Comenzar',
      'Most Popular': 'Más Popular',
      'Sign Up Free': 'Registro Gratis',
      'Start Free Trial': 'Iniciar Prueba Gratis',
      'NO CREDIT CARD': 'SIN TARJETA DE CRÉDITO',
      'NO SETUP': 'SIN CONFIGURACIÓN',
      'WORKS IN 5 MINUTES': 'FUNCIONA EN 5 MINUTOS',
      'NO CREDIT CARD  ·  NO SETUP  ·  WORKS IN 5 MINUTES':
        'SIN TARJETA  ·  SIN CONFIGURACIÓN  ·  LISTO EN 5 MINUTOS',

      // ── FINAL CTA ─────────────────────────────
      'Ready to': 'Listo para',
      'Government Contracts?': '¿Contratos Federales?',
      'Marcus is waiting. Tell him about your business and he goes to work immediately.':
        'Marcus está esperando. Cuéntale sobre tu empresa y se pone a trabajar de inmediato.',
      '🎯 Launch Marcus — Free': '🎯 Iniciar Marcus — Gratis',
      '📋 Request Beta Access': '📋 Solicitar Acceso Beta',

      // ── FOOTER ────────────────────────────────
      'Built by a service-disabled veteran for every small business pursuing federal contracts.':
        'Construido por un veterano con discapacidad de servicio para cada pequeña empresa que busca contratos federales.',
      'CAGE Code: 9YZ59 · SAM.gov Active · SDVOSB Certified · Reno, NV':
        'Código CAGE: 9YZ59 · SAM.gov Activo · Certificado SDVOSB · Reno, NV',

      // ── RESOURCES PAGE ───────────────────────
      'Free Downloads — No Email Required': 'Descargas Gratuitas — Sin Correo Requerido',
      'Free Ebooks & Guides': 'Ebooks y Guías Gratis',
      'Practical, no-fluff guides for small businesses pursuing federal contracts. Written by GovScout Pro with input from Marcus — our AI capture advisor. Download free. Share freely.':
        'Guías prácticas y directas para pequeñas empresas que buscan contratos federales. Escritas por GovScout Pro con Marcus — nuestro asesor de captura IA. Descarga gratis. Comparte libremente.',
      'Free Ebooks': 'Ebooks Gratis',
      'Languages': 'Idiomas',
      'Coming Soon': 'Próximamente',
      'Available Now': 'Disponible Ahora',
      'FILTER:': 'FILTRAR:',
      'All': 'Todo',
      'Bid Strategy': 'Estrategia de Oferta',
      'Certifications': 'Certificaciones',
      'En Español': 'En Español',
      'Proposals': 'Propuestas',
      'Free Download': 'Descarga Gratis',
      'Preview': 'Vista Previa',
      'Put the guides to work': 'Pon las guías a trabajar',
      'These ebooks show you the strategy. FEDSCOUT does the daily legwork — scanning SAM.gov for your NAICS codes and certifications, sending the right opportunities before you\'d ever find them manually.':
        'Estos ebooks te muestran la estrategia. FEDSCOUT hace el trabajo diario — escaneando SAM.gov para tus códigos NAICS y certificaciones, enviando las oportunidades correctas antes de que las encuentres manualmente.',
      '▶ Launch FEDSCOUT Free': '▶ Iniciar FEDSCOUT Gratis',
      'What Should We Write Next?': '¿Qué Debemos Escribir Después?',

      // ── CERTIFICATION PAGES ───────────────────
      'Learn More': 'Saber Más',
      'Download Free': 'Descargar Gratis',
      'Get Alerts': 'Obtener Alertas',
      'Start Getting Alerts — Free →': 'Comenzar a Recibir Alertas — Gratis →',
      'How It Works': 'Cómo Funciona',
      'Check Requirements': 'Verificar Requisitos',
      'Compare Program Types': 'Comparar Tipos de Programa',
      'Certifications': 'Certificaciones',
      'Home': 'Inicio',
      'Federal Spending Goal': 'Meta de Gasto Federal',
      'Awarded Annually': 'Adjudicado Anualmente',
      'New Opps Per Day': 'Nuevas Opps Por Día',
      'The Basics': 'Lo Básico',
      'Eligibility Requirements': 'Requisitos de Elegibilidad',
      'Do You Qualify?': '¿Calificas?',
      'How FEDSCOUT Helps': 'Cómo Ayuda FEDSCOUT',
      'Get Started Free': 'Comenzar Gratis',
      'FAQ': 'Preguntas Frecuentes',
      'Where the Money Is': 'Dónde Está el Dinero',

      // ── CHAT / MARCUS INTERFACE ───────────────
      'Ask Marcus anything about federal contracting...':
        'Pregúntale a Marcus cualquier cosa sobre contratación federal...',
      'Tell Marcus about your business...':
        'Cuéntale a Marcus sobre tu empresa...',
      'Send': 'Enviar',
      'Thinking...': 'Pensando...',
      'Marcus is typing...': 'Marcus está escribiendo...',
      'Start a conversation with Marcus': 'Inicia una conversación con Marcus',

      // ── GENERAL UI ────────────────────────────
      'View All Resources + Coming Soon Guides →': 'Ver Todos los Recursos + Guías Próximas →',
      'Free Download (PDF)': 'Descarga Gratis (PDF)',
      'Descarga Gratis (PDF)': 'Descarga Gratis (PDF)',
    }
  };

  // ─────────────────────────────────────────────
  //  CORE ENGINE
  // ─────────────────────────────────────────────

  let currentLang = 'en';
  let originalTexts = new WeakMap(); // node → original text

  function getLang() {
    try { return localStorage.getItem('fedscout_lang') || detectBrowserLang(); }
    catch (e) { return 'en'; }
  }

  function detectBrowserLang() {
    const lang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    if (lang.startsWith('es')) return 'es';
    return 'en';
  }

  function saveLang(lang) {
    try { localStorage.setItem('fedscout_lang', lang); } catch (e) {}
  }

  // Walk all text nodes and translate them
  function translateDOM(targetLang) {
    const dict = targetLang === 'en' ? null : DICT[targetLang];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
          if (parent.closest('#fedscout-lang-switcher')) return NodeFilter.FILTER_REJECT;
          if (node.textContent.trim().length < 2) return NodeFilter.FILTER_SKIP;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);

    nodes.forEach(function (textNode) {
      const trimmed = textNode.textContent.trim();
      if (!trimmed) return;

      // Save original if not already saved
      if (!originalTexts.has(textNode)) {
        originalTexts.set(textNode, textNode.textContent);
      }

      if (targetLang === 'en') {
        // Restore original
        textNode.textContent = originalTexts.get(textNode);
        return;
      }

      // Try exact match first
      if (dict[trimmed] !== undefined) {
        textNode.textContent = textNode.textContent.replace(trimmed, dict[trimmed]);
        return;
      }

      // Try trimmed-only match preserving surrounding whitespace
      const leadingSpace = textNode.textContent.match(/^(\s*)/)[1];
      const trailingSpace = textNode.textContent.match(/(\s*)$/)[1];
      if (dict[trimmed] !== undefined) {
        textNode.textContent = leadingSpace + dict[trimmed] + trailingSpace;
      }
    });

    // Also translate placeholder attributes
    document.querySelectorAll('[placeholder]').forEach(function (el) {
      if (!el.dataset.origPlaceholder) {
        el.dataset.origPlaceholder = el.getAttribute('placeholder');
      }
      const orig = el.dataset.origPlaceholder;
      if (targetLang === 'en') {
        el.setAttribute('placeholder', orig);
      } else if (dict && dict[orig]) {
        el.setAttribute('placeholder', dict[orig]);
      }
    });

    // Translate title attribute on key elements
    document.querySelectorAll('[title]').forEach(function (el) {
      if (!el.dataset.origTitle) el.dataset.origTitle = el.getAttribute('title');
      const orig = el.dataset.origTitle;
      if (targetLang === 'en') {
        el.setAttribute('title', orig);
      } else if (dict && dict[orig]) {
        el.setAttribute('title', dict[orig]);
      }
    });
  }

  // Update <html lang=""> attribute
  function updateHtmlLang(lang) {
    document.documentElement.setAttribute('lang', lang === 'es' ? 'es' : 'en');
  }

  // Notify Marcus chat (if present) about language change
  function notifyMarcus(lang) {
    // Store language for chat context injection
    try { window.FEDSCOUT_LANG = lang; } catch (e) {}

    // If the chat input exists, update placeholder
    const chatInput = document.querySelector('#chat-input, textarea[name="message"], .chat-input textarea');
    if (chatInput) {
      const ph = lang === 'es'
        ? 'Pregúntale a Marcus sobre contratación federal en español...'
        : 'Ask Marcus anything about federal contracting...';
      chatInput.setAttribute('placeholder', ph);
    }

    // Fire custom event for any chat implementation to listen to
    const event = new CustomEvent('fedscout:language', { detail: { lang: lang } });
    document.dispatchEvent(event);
  }

  // ─────────────────────────────────────────────
  //  LANGUAGE SWITCHER COMPONENT
  // ─────────────────────────────────────────────

  function buildSwitcher() {
    const sw = document.createElement('div');
    sw.id = 'fedscout-lang-switcher';
    sw.setAttribute('role', 'group');
    sw.setAttribute('aria-label', 'Language / Idioma');
    sw.innerHTML = [
      '<style>',
      '#fedscout-lang-switcher{',
      '  display:inline-flex;align-items:center;gap:2px;',
      '  background:var(--s2,rgba(255,255,255,.06));',
      '  border:1px solid var(--border,rgba(255,255,255,.12));',
      '  border-radius:8px;padding:3px;',
      '  margin-right:6px;',
      '}',
      '#fedscout-lang-switcher button{',
      '  background:transparent;border:none;cursor:pointer;',
      '  font-family:"DM Mono",monospace;font-size:10px;letter-spacing:.08em;',
      '  color:var(--txt3,#6b7280);padding:4px 10px;border-radius:5px;',
      '  transition:all .15s;display:flex;align-items:center;gap:4px;',
      '  white-space:nowrap;',
      '}',
      '#fedscout-lang-switcher button.active{',
      '  background:var(--gold,#f5a623);color:#000;font-weight:700;',
      '}',
      '#fedscout-lang-switcher button:not(.active):hover{',
      '  color:var(--txt,#eef2ff);background:var(--s3,rgba(255,255,255,.1));',
      '}',
      '</style>',
      '<button id="lang-btn-en" onclick="window.FEDSCOUT_LANG_SET(\'en\')" aria-pressed="true" title="English">EN</button>',
      '<button id="lang-btn-es" onclick="window.FEDSCOUT_LANG_SET(\'es\')" aria-pressed="false" title="Español">ES</button>',
    ].join('');
    return sw;
  }

  function updateSwitcherUI(lang) {
    const enBtn = document.getElementById('lang-btn-en');
    const esBtn = document.getElementById('lang-btn-es');
    if (!enBtn || !esBtn) return;
    enBtn.classList.toggle('active', lang === 'en');
    esBtn.classList.toggle('active', lang === 'es');
    enBtn.setAttribute('aria-pressed', lang === 'en' ? 'true' : 'false');
    esBtn.setAttribute('aria-pressed', lang === 'es' ? 'true' : 'false');
  }

  function injectSwitcher() {
    // Find nav links container or theme toggle
    const nav = document.querySelector('nav');
    if (!nav) return;

    // Don't double-inject
    if (document.getElementById('fedscout-lang-switcher')) return;

    const sw = buildSwitcher();

    // Insert before theme toggle button (in its actual parent container)
    const themeBtn = nav.querySelector('.theme-toggle, #themeBtn, button[id="themeBtn"]');
    if (themeBtn && themeBtn.parentNode) {
      themeBtn.parentNode.insertBefore(sw, themeBtn);
    } else {
      // Append to nav-links if exists
      const navLinks = nav.querySelector('.nav-links');
      if (navLinks) {
        navLinks.insertBefore(sw, navLinks.firstChild);
      } else {
        nav.appendChild(sw);
      }
    }
  }

  // ─────────────────────────────────────────────
  //  PUBLIC API
  // ─────────────────────────────────────────────

  window.FEDSCOUT_LANG_SET = function (lang) {
    if (lang !== 'en' && lang !== 'es') return;
    currentLang = lang;
    saveLang(lang);
    translateDOM(lang);
    updateHtmlLang(lang);
    updateSwitcherUI(lang);
    notifyMarcus(lang);
  };

  window.FEDSCOUT_GET_LANG = function () {
    return currentLang;
  };

  // Returns the system prompt injection for Marcus chat
  // Call this before sending a message to Marcus
  window.FEDSCOUT_LANG_PROMPT = function () {
    if (currentLang === 'es') {
      return 'IMPORTANT: The user has selected Spanish as their language. You MUST respond entirely in Spanish. Use clear, professional Spanish appropriate for small business owners. Do not mix languages.';
    }
    return '';
  };

  // ─────────────────────────────────────────────
  //  INIT
  // ─────────────────────────────────────────────

  function init() {
    injectSwitcher();
    const lang = getLang();
    currentLang = lang;
    if (lang !== 'en') {
      translateDOM(lang);
      updateHtmlLang(lang);
      notifyMarcus(lang);
    }
    updateSwitcherUI(lang);

    // Intercept any chat form submissions to inject language prompt
    document.addEventListener('submit', function (e) {
      const form = e.target;
      if (!form.closest('#chat-form, .chat-form, [data-chat]')) return;
      const langPrompt = window.FEDSCOUT_LANG_PROMPT();
      if (!langPrompt) return;
      // Inject as hidden field if not already present
      if (!form.querySelector('[name="lang_context"]')) {
        const hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = 'lang_context';
        hidden.value = langPrompt;
        form.appendChild(hidden);
      }
    });

    // Listen for dynamic content (SPA-style chat responses)
    // Re-translate any new nodes added to the chat area
    const chatArea = document.querySelector('#chat-messages, .chat-messages, #messages, .messages-container');
    if (chatArea && currentLang !== 'en') {
      const observer = new MutationObserver(function () {
        if (currentLang !== 'en') translateDOM(currentLang);
      });
      observer.observe(chatArea, { childList: true, subtree: true });
    }
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
