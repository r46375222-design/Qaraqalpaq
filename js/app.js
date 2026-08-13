(() => {
  'use strict';

  const PAGE_SIZE = 48;
  let WORDS = [];
  let CATEGORIES = [];

  const state = {
    search: '',
    category: 'All',
    page: 1,
    flash: { category: 'All', list: [], index: 0, flipped: false },
    quiz: { category: 'All', lang: 'en', pool: [], current: null, score: 0, streak: 0, answered: 0, locked: false },
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function norm(s) {
    return (s || '').toLowerCase();
  }

  // ===== LEARNING PROGRESS SYSTEM =====
  const PROGRESS_KEY = 'qaraqalpaq_progress';

  function defaultProgress() {
    return { learned: {}, quizCorrect: {}, quizBestScore: 0, streak: 0, lastPracticeDate: null };
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (!raw) return defaultProgress();
      return Object.assign(defaultProgress(), JSON.parse(raw));
    } catch (e) {
      return defaultProgress();
    }
  }

  let PROGRESS = loadProgress();

  function saveProgress() {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(PROGRESS)); } catch (e) {}
  }

  function todayStr() { return new Date().toISOString().slice(0, 10); }

  function wordId(w) { return `${w.category}::${w.kk}`; }

  function isLearned(id) { return !!PROGRESS.learned[id]; }

  function recordPractice() {
    const today = todayStr();
    if (PROGRESS.lastPracticeDate !== today) {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yesterday = y.toISOString().slice(0, 10);
      PROGRESS.streak = PROGRESS.lastPracticeDate === yesterday ? (PROGRESS.streak || 0) + 1 : 1;
      PROGRESS.lastPracticeDate = today;
    }
    saveProgress();
  }

  function setLearned(id, learned) {
    if (learned) {
      if (!PROGRESS.learned[id]) PROGRESS.learned[id] = { at: Date.now() };
      recordPractice();
    } else {
      delete PROGRESS.learned[id];
      saveProgress();
    }
  }

  function toggleLearned(id) {
    setLearned(id, !isLearned(id));
  }

  function recordQuizAnswer(id, correct) {
    if (correct) {
      PROGRESS.quizCorrect[id] = (PROGRESS.quizCorrect[id] || 0) + 1;
      if (PROGRESS.quizCorrect[id] >= 3 && !PROGRESS.learned[id]) {
        PROGRESS.learned[id] = { at: Date.now() };
      }
    }
    recordPractice();
  }

  function updateQuizBestScore(score) {
    if (score > (PROGRESS.quizBestScore || 0)) {
      PROGRESS.quizBestScore = score;
      saveProgress();
    }
  }

  function wordsLearnedToday() {
    const today = todayStr();
    return Object.values(PROGRESS.learned)
      .filter(e => new Date(e.at).toISOString().slice(0, 10) === today).length;
  }

  function totalWordsLearned() { return Object.keys(PROGRESS.learned).length; }

  function renderProgressWidget() {
    const el = $('#progressWidget');
    if (!el) return;
    el.innerHTML = `
      <div class="progress-widget-grid">
        <div class="pw-stat"><span class="pw-num">${wordsLearnedToday()}</span><span class="pw-label">Learned Today</span></div>
        <div class="pw-stat"><span class="pw-num">${totalWordsLearned()}</span><span class="pw-label">Total Learned</span></div>
        <div class="pw-stat"><span class="pw-num">${PROGRESS.streak || 0}</span><span class="pw-label">Day Streak</span></div>
        <div class="pw-stat"><span class="pw-num">${PROGRESS.quizBestScore || 0}</span><span class="pw-label">Quiz Best</span></div>
      </div>`;
  }

  function renderProgressBar() {
    const el = $('#progressBarWrap');
    if (!el) return;
    const total = WORDS.length;
    const learned = totalWordsLearned();
    const pct = total ? Math.min(100, Math.round((learned / total) * 100)) : 0;
    el.innerHTML = `
      <div class="progress-bar-label">${learned.toLocaleString()} / ${total.toLocaleString()} words learned</div>
      <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${pct}%"></div></div>`;
  }

  // ===== CATEGORY ICONS & ACCENT COLORS =====
  const ICON_RULES = [
    [/phrase/i, '\u{1F4AC}'],
    [/verb/i, '\u{1F3C3}'],
    [/adjective/i, '\u{1F3A8}'],
    [/anatomy|health|medicine|body/i, '\u{1FA7A}'],
    [/animal/i, '\u{1F43E}'],
    [/food|drink|fruit|vegetable/i, '\u{1F34E}'],
    [/family|people|relationship|profession/i, '\u{1F46A}'],
    [/number/i, '\u{1F522}'],
    [/time|calendar|season|measurement/i, '\u{23F0}'],
    [/weather|nature|geography|agriculture/i, '\u{1F326}️'],
    [/city|transport|place|direction|location/i, '\u{1F3D9}️'],
    [/clothing|footwear/i, '\u{1F455}'],
    [/home|furniture|household|decor/i, '\u{1F3E0}'],
    [/tech|gadget|\bit\b|analytics|business|economy|money/i, '\u{1F4BB}'],
    [/tool|material|mineral|stationery|object/i, '\u{1F6E0}️'],
    [/space|science/i, '\u{1F680}'],
    [/society|government/i, '\u{1F3DB}️'],
    [/culture|entertainment/i, '\u{1F3AD}'],
    [/abstract|feeling|concept/i, '\u{1F4AD}'],
    [/basic/i, '\u{1F4D8}'],
  ];
  const FALLBACK_ICONS = ['\u{1F4DA}', '✨', '\u{1F524}', '\u{1F5C2}️'];
  const ACCENT_PALETTE = ['#2dd4bf', '#8b7af2', '#5b9df0', '#f472b6', '#fbbf24', '#34d399', '#f97316', '#60a5fa', '#c084fc', '#f87171'];

  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }
  function categoryIcon(cat) {
    for (const [re, icon] of ICON_RULES) if (re.test(cat)) return icon;
    return FALLBACK_ICONS[hashStr(cat) % FALLBACK_ICONS.length];
  }
  function categoryColor(cat) {
    return ACCENT_PALETTE[hashStr(cat) % ACCENT_PALETTE.length];
  }

  // ===== LOAD DATA =====
  fetch('public/data/words.json')
    .then(r => r.json())
    .then(data => {
      WORDS = data;
      CATEGORIES = Array.from(new Set(WORDS.map(w => w.category))).sort();
      init();
    })
    .catch(err => {
      console.error('Failed to load dictionary data', err);
      const grid = $('#wordGrid');
      if (grid) grid.innerHTML = '<p style="text-align:center;color:#8A93A0;">Could not load dictionary data.</p>';
    });

  function init() {
    setupNavActive();
    setupTubelight();
    setupNavToggle();
    setupNavScroll();
    if ($('#heroCanvas')) {
      try { initDottedSurface(); }
      catch (e) {
        // Whatever happens to the background, it must never break the rest of the app
        console.warn('Hero background failed, using static fallback', e);
        $('#heroCanvas').classList.add('webgl-fallback');
      }
      // Back/forward cache: the Back button restores the page WITHOUT reloading,
      // but pagehide already destroyed the WebGL canvas — rebuild it from scratch.
      window.addEventListener('pageshow', (e) => {
        const c = $('#heroCanvas');
        if (!e.persisted || !c || c.querySelector('canvas')) return;
        try { initDottedSurface(); }
        catch (err) { c.classList.add('webgl-fallback'); }
      });
    }
    if ($('.stat-num')) setupStatsAnimation();
    if ($('.phone-screen')) initPhoneMockup();
    if ($('#translatorInput')) initTranslator(); // dictionary page AND home page
    if ($('#wordGrid')) initDictionaryPage();
    if ($('#flashcard')) initFlashcardsPage();
    if ($('#quizIntro')) initQuizPage();
    if ($('#sozleBoard')) initSozle();
    if ($('#progressWidget')) renderProgressWidget();
    initWordRequest();
    initFeedbackWidget();
  }

  // ===== TUBELIGHT NAV INDICATOR =====
  function setupTubelight() {
    const navLinks = $('.nav-links');
    if (!navLinks) return;

    const indicator = document.createElement('div');
    indicator.className = 'tubelight-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    indicator.innerHTML =
      '<div class="tubelight-bar">' +
        '<div class="tubelight-glow-1"></div>' +
        '<div class="tubelight-glow-2"></div>' +
        '<div class="tubelight-glow-3"></div>' +
      '</div>';
    navLinks.insertBefore(indicator, navLinks.firstChild);

    function positionOver(linkEl) {
      indicator.style.left = linkEl.offsetLeft + 'px';
      indicator.style.width = linkEl.offsetWidth + 'px';
      indicator.style.opacity = '1';
    }

    function returnToActive() {
      const active = $('.nav-link.active', navLinks);
      if (active) positionOver(active);
      else indicator.style.opacity = '0';
    }

    returnToActive();

    $$('.nav-link', navLinks).forEach(link => {
      link.addEventListener('mouseenter', () => positionOver(link));
      link.addEventListener('click', () => {
        $$('.nav-link', navLinks).forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        positionOver(link);
      });
    });

    navLinks.addEventListener('mouseleave', returnToActive);

    window.addEventListener('resize', returnToActive, { passive: true });
  }

  // ===== NAV =====
  function setupNavActive() {
    const file = location.pathname.split('/').pop() || 'index.html';
    const page = file.replace('.html', '') || 'index';
    $$('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.page === page));
  }
  // Pill-shrink scroll effect for the floating nav (index.html, dictionary.html only —
  // gated on the .nav-pill class so other pages' sticky nav is untouched).
  function setupNavScroll() {
    const nav = $('.nav.nav-pill');
    if (!nav) return;
    const updateScrolled = () => nav.classList.toggle('is-scrolled', window.scrollY > 50);
    updateScrolled();
    window.addEventListener('scroll', updateScrolled, { passive: true });
  }
  function setupNavToggle() {
    const toggle = $('#navToggle');
    if (!toggle) return;
    toggle.addEventListener('click', () => $('.nav').classList.toggle('menu-open'));
  }

  // ===== STATS COUNT-UP (animates each number once it scrolls into view) =====
  function setupStatsAnimation() {
    const nums = $$('.stat-num');
    if (!('IntersectionObserver' in window)) {
      nums.forEach(animateStatNum);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        animateStatNum(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    nums.forEach(el => observer.observe(el));
  }

  function animateStatNum(el) {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    const duration = 1100;
    const start = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target).toLocaleString() + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ===== WEBGL DOTTED SURFACE =====
  function initDottedSurface(attempt) {
    attempt = attempt || 0;
    const container = $('#heroCanvas');
    const hero = container.closest('.hero') || container;
    const showFallback = () => container.classList.add('webgl-fallback');

    if (!window.THREE) { showFallback(); return; }
    const T = window.THREE;

    const mobile = hero.offsetWidth < 768;
    const AMOUNTX = mobile ? 24 : 40;
    const AMOUNTY = mobile ? 36 : 60;
    const SEPARATION = 150;

    const scene = new T.Scene();
    scene.fog = new T.Fog(0x0a0a14, 2000, 10000);

    const camera = new T.PerspectiveCamera(60, hero.offsetWidth / hero.offsetHeight, 1, 10000);
    camera.position.set(0, 355, 1220);

    let renderer;
    try {
      renderer = new T.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
    } catch (err) {
      // GPU refused to create a context (driver reset / context pool exhausted).
      // Show static CSS dots so the hero is never empty; retry once a bit later.
      console.warn('WebGL unavailable, using static dots fallback', err);
      showFallback();
      if (attempt < 1) setTimeout(() => initDottedSurface(attempt + 1), 4000);
      return;
    }
    container.classList.remove('webgl-fallback');
    renderer.setPixelRatio(mobile ? 1 : Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(hero.offsetWidth, hero.offsetHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const posArr = new Float32Array(AMOUNTX * AMOUNTY * 3);
    let idx = 0;
    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        posArr[idx++] = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
        posArr[idx++] = 0;
        posArr[idx++] = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.BufferAttribute(posArr, 3));

    const material = new T.PointsMaterial({
      size: 8, transparent: true, opacity: 0.8,
      color: new T.Color(0x818cf8), sizeAttenuation: true,
    });
    scene.add(new T.Points(geometry, material));

    let count = 0;
    let rafId = null;
    let heroVisible = true;
    let tabVisible = true;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function renderFrame() {
      const pos = geometry.attributes.position;
      let i = 0;
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          pos.array[i * 3 + 1] = Math.sin((ix + count) * 0.3) * 50 + Math.sin((iy + count) * 0.5) * 50;
          i++;
        }
      }
      pos.needsUpdate = true;
      renderer.render(scene, camera);
      count += 0.1;
    }

    function loop() {
      if (!heroVisible || !tabVisible) { rafId = null; return; }
      rafId = requestAnimationFrame(loop);
      renderFrame();
    }

    function tryStart() {
      if (rafId || reduced) return;
      loop();
    }

    function tryStop() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    if (reduced) {
      renderFrame();
    } else {
      loop();
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        heroVisible = entry.isIntersecting;
        heroVisible ? tryStart() : tryStop();
      }, { threshold: 0 }).observe(hero);
    }

    document.addEventListener('visibilitychange', () => {
      tabVisible = document.visibilityState === 'visible';
      tabVisible ? tryStart() : tryStop();
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const w = hero.offsetWidth;
        const h = hero.offsetHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }, 150);
    }, { passive: true });

    // GPU context can be lost at any moment (sleep, driver reset, too many
    // contexts). Never leave the hero empty: swap to static CSS dots and
    // recover automatically when the context comes back.
    renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      tryStop();
      showFallback();
    });
    renderer.domElement.addEventListener('webglcontextrestored', () => {
      container.classList.remove('webgl-fallback');
      if (reduced) { renderFrame(); } else { tryStart(); }
    });

    // Free the context on unload so repeated reloads don't exhaust the
    // browser's WebGL context pool (the cause of "Error creating WebGL context").
    window.addEventListener('pagehide', () => {
      tryStop();
      geometry.dispose();
      material.dispose();
      renderer.forceContextLoss();
      renderer.dispose();
      // Remove the dead canvas and show static dots, so if the page comes back
      // from bfcache nothing white/stale can ever be visible.
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      showFallback();
    }, { once: true });
  }

  // ===== PHONE MOCKUP CYCLE =====
  function initPhoneMockup() {
    const previews = $$('.phone-preview');
    if (previews.length < 2) return;
    let idx = 0;
    setInterval(() => {
      previews[idx].classList.remove('active');
      idx = (idx + 1) % previews.length;
      previews[idx].classList.add('active');
    }, 2500);
  }

  // ===== TRANSLATOR (dictionary-based, no external APIs) =====
  let TRANS_INDEX = null;   // exact-match maps: kk/en/ru → Map(foldedKey → [words])
  let SEARCH_KEYS = null;   // per-word folded keys for suggestion scans

  // Fold text into a diacritics-insensitive, punctuation-free key so that
  // "salemetsiz" finds "Sálemetsiz be!" and "привет" finds "Привет!".
  function foldKey(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/ı/g, 'i')                           // dotless ı has no combining mark
      .normalize('NFD').replace(/[̀-ͯ]/g, '')  // á ǵ ń ó ú → a g n o u
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')                 // strip punctuation
      .replace(/\s+/g, ' ')
      .trim();
  }

  // "Excuse me / Sorry" and "Hello! (polite)" should match "sorry" and "hello".
  function textVariants(s) {
    const base = String(s || '');
    const noParen = base.replace(/\([^)]*\)/g, ' ');
    const out = new Set();
    [base, noParen, ...noParen.split(/[\/,;]/)].forEach(p => {
      const k = foldKey(p);
      if (k) out.add(k);
    });
    return [...out];
  }

  function buildTranslatorIndex() {
    TRANS_INDEX = { kk: new Map(), en: new Map(), ru: new Map() };
    SEARCH_KEYS = [];
    const add = (map, key, w) => {
      const arr = map.get(key);
      if (arr) { if (!arr.includes(w)) arr.push(w); }
      else map.set(key, [w]);
    };
    WORDS.forEach(w => {
      textVariants(w.kk).forEach(k => add(TRANS_INDEX.kk, k, w));
      textVariants(w.en).forEach(k => add(TRANS_INDEX.en, k, w));
      textVariants(w.ru).forEach(k => add(TRANS_INDEX.ru, k, w));
      SEARCH_KEYS.push({ w, kk: foldKey(w.kk), en: foldKey(w.en), ru: foldKey(w.ru) });
    });
  }

  function detectLang(raw) {
    if (/[Ѐ-ӿ]/.test(raw)) return 'ru';
    if (/[áǵńóúıÁǴŃÓÚ]/.test(raw)) return 'kk'; // á ǵ ń ó ú ı
    return null; // plain Latin — could be Qaraqalpaq or English
  }

  function lookupExact(key, lang) {
    if (lang === 'ru') return { src: 'ru', matches: TRANS_INDEX.ru.get(key) || [] };
    if (lang === 'kk') return { src: 'kk', matches: TRANS_INDEX.kk.get(key) || [] };
    const kk = TRANS_INDEX.kk.get(key) || [];
    if (kk.length) return { src: 'kk', matches: kk };
    return { src: 'en', matches: TRANS_INDEX.en.get(key) || [] };
  }

  function suggestWords(key, lang, limit = 6) {
    const fields = lang === 'ru' ? ['ru'] : lang === 'kk' ? ['kk'] : ['kk', 'en'];
    const starts = [], contains = [];
    for (const item of SEARCH_KEYS) {
      let placed = false;
      for (const f of fields) {
        if (item[f].startsWith(key)) { starts.push(item.w); placed = true; break; }
      }
      if (!placed) {
        for (const f of fields) {
          if (item[f].includes(key)) { contains.push(item.w); break; }
        }
      }
      if (starts.length >= limit) break;
    }
    return starts.concat(contains).slice(0, limit);
  }

  function translateQuery(raw) {
    const lang = detectLang(raw);
    const key = foldKey(raw);
    if (!key) return null;
    const exact = lookupExact(key, lang);
    if (exact.matches.length) return { type: 'exact', src: exact.src, matches: exact.matches.slice(0, 4) };
    const rawTokens = raw.split(/\s+/).filter(t => foldKey(t));
    if (rawTokens.length > 1) {
      const parts = rawTokens.map(t => Object.assign({ raw: t }, lookupExact(foldKey(t), lang)));
      if (parts.some(p => p.matches.length)) return { type: 'phrase', parts };
    }
    return { type: 'suggest', lang, suggestions: suggestWords(key, lang) };
  }

  const LANG_NAMES = { kk: 'Qaraqalpaq', en: 'English', ru: 'Русский' };
  const TARGET_LABELS = { kk: 'English · Русский', en: 'Qaraqalpaq', ru: 'Qaraqalpaq' };

  // "Hello! (polite)" → "Hello!", "Excuse me / Sorry" → "Excuse me" — clean text for the output pane
  function primaryText(s) {
    const t = String(s || '').replace(/\([^)]*\)/g, '').split(/[\/;]/)[0].trim();
    return t || String(s || '');
  }

  function trSetLangs(src) {
    const srcEl = $('#trLangSrc');
    const dstEl = $('#trLangDst');
    if (!srcEl || !dstEl) return;
    srcEl.textContent = src ? LANG_NAMES[src] : 'Detect language';
    dstEl.textContent = src ? TARGET_LABELS[src] : 'Translation';
  }

  function trMatchHtml(w) {
    return `
      <div class="tr-match" style="--accent:${categoryColor(w.category)}">
        <span class="tr-match-icon">${categoryIcon(w.category)}</span>
        <div class="tr-match-text">
          <span class="tr-match-kk">${escapeHtml(w.kk)}</span>
          <span class="tr-match-en">${escapeHtml(w.en)}</span>
          <span class="tr-match-ru">${escapeHtml(w.ru)}</span>
        </div>
        <div class="tr-match-side">
          <span class="tr-cat">${escapeHtml(w.category)}</span>
          <button class="tr-find" data-kk="${escapeAttr(w.kk)}">Find in dictionary →</button>
        </div>
      </div>`;
  }

  function trPhraseRowHtml(part) {
    const m = part.matches[0];
    const target = !m
      ? '<span class="tr-note">not found</span>'
      : part.src === 'kk'
        ? `<span class="tr-phrase-en">${escapeHtml(m.en)}</span><span class="tr-phrase-ru">${escapeHtml(m.ru)}</span>`
        : `<span class="tr-phrase-kk">${escapeHtml(m.kk)}</span>`;
    return `
      <div class="tr-phrase-row${m ? '' : ' is-missing'}">
        <span class="tr-phrase-token">${escapeHtml(part.raw)}</span>
        <span class="tr-phrase-arrow">→</span>
        <div class="tr-phrase-target">${target}</div>
      </div>`;
  }

  const TR_OUTPUT_HINT = '<span class="tr-output-hint">Translation appears here</span>';

  function renderTranslation(raw) {
    const results = $('#translatorResults');
    const out = $('#translatorOutput');
    const res = translateQuery(raw);
    if (!res) {
      results.hidden = true; results.innerHTML = '';
      out.innerHTML = TR_OUTPUT_HINT;
      trSetLangs(null);
      return;
    }

    let html = '';

    if (res.type === 'exact') {
      const m = res.matches[0];
      trSetLangs(res.src);
      const big = res.src === 'kk' ? primaryText(m.en) : m.kk;
      const sub = res.src === 'kk' ? m.ru : (res.src === 'ru' ? primaryText(m.en) : m.ru);
      out.innerHTML = `
        <div class="tr-output-main">
          <span class="tr-output-big">${escapeHtml(big)}</span>
          <span class="tr-output-sub">${escapeHtml(sub)}</span>
          <div class="tr-output-meta">
            <span class="tr-cat">${escapeHtml(m.category)}</span>
            <button class="tr-find" data-kk="${escapeAttr(m.kk)}">Find in dictionary →</button>
          </div>
        </div>`;
      const rest = res.matches.slice(1);
      html = rest.length ? `<p class="tr-note">More matches:</p>` + rest.map(trMatchHtml).join('') : '';
    } else if (res.type === 'phrase') {
      const firstFound = res.parts.find(p => p.matches.length);
      trSetLangs(firstFound ? firstFound.src : null);
      const joined = res.parts.map(p => {
        const m = p.matches[0];
        if (!m) return `<span class="tr-miss">${escapeHtml(p.raw)}</span>`;
        return escapeHtml(p.src === 'kk' ? primaryText(m.en) : m.kk);
      }).join(' ');
      out.innerHTML = `
        <div class="tr-output-main">
          <span class="tr-output-big tr-output-phrase">${joined}</span>
          <span class="tr-output-sub">Word-by-word — grammar may differ in full sentences.</span>
        </div>`;
      html = `<div class="tr-phrase">${res.parts.map(trPhraseRowHtml).join('')}</div>`;
    } else {
      trSetLangs(res.lang);
      out.innerHTML = `<span class="tr-output-hint">No exact match — this word isn't in the dictionary yet (1,301 words and growing).</span>
        <button class="tr-report" data-q="${escapeAttr(raw)}">Missing a word? Tell us →</button>`;
      if (res.suggestions.length) {
        const chips = res.suggestions.map(w => {
          const label = res.lang === 'ru' ? `${w.kk} · ${w.ru}` : `${w.kk} · ${w.en}`;
          return `<button class="pill tr-sugg" data-q="${escapeAttr(w.kk)}">${escapeHtml(label)}</button>`;
        }).join('');
        html = `<p class="tr-note">Did you mean:</p><div class="tr-suggest">${chips}</div>`;
      }
    }

    results.hidden = !html;
    results.innerHTML = html;
  }

  function initTranslator() {
    const input = $('#translatorInput');
    if (!input) return;
    const results = $('#translatorResults');
    const out = $('#translatorOutput');
    const clearBtn = $('#translatorClear');
    let timer;

    const run = () => {
      const raw = input.value.trim();
      clearBtn.hidden = raw === '';
      if (!raw) {
        results.hidden = true; results.innerHTML = '';
        out.innerHTML = TR_OUTPUT_HINT;
        trSetLangs(null);
        return;
      }
      if (!TRANS_INDEX) buildTranslatorIndex();
      renderTranslation(raw);
    };

    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 160); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); run(); } });
    clearBtn.addEventListener('click', () => { input.value = ''; run(); input.focus(); });

    // One listener on the whole card: "Find in dictionary" now also lives in the output pane
    $('#translator').addEventListener('click', e => {
      const sugg = e.target.closest('.tr-sugg');
      if (sugg) { input.value = sugg.dataset.q; run(); return; }
      const find = e.target.closest('.tr-find');
      if (find) {
        const search = $('#searchInput');
        if (!search) {
          // Home page has no word grid — hand the query over to the dictionary page
          location.href = 'dictionary.html?q=' + encodeURIComponent(find.dataset.kk);
          return;
        }
        search.value = find.dataset.kk;
        state.search = find.dataset.kk;
        state.page = 1;
        renderDictionary();
        $('.search-wrap').scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    // Support dictionary.html?q=word links (e.g. from the home-page translator)
    const q = new URLSearchParams(location.search).get('q');
    if (q) {
      input.value = q;
      run();
      $('#translator').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // ===== SÓZLE — the Karakalpak word game (Wordle-style, data from words.json) =====
  const SOZLE_KEY = 'qaraqalpaq_sozle';
  const SOZLE_EPOCH = Date.UTC(2026, 6, 22); // puzzle #1 = 22 July 2026
  const SOZLE_ALLOWED = new Set('aábdefgǵhıijklmnńoópqrstuúvwxyz');
  const SOZLE_ROWS = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'ı', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ń', 'ǵ'],
    ['enter', 'z', 'x', 'v', 'b', 'n', 'm', 'á', 'ó', 'ú', 'back'],
  ];

  let SOZLE_LIST = null; // deterministically shuffled [{key, w}]
  let sozle = null;      // current game

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function buildSozleList() {
    const seen = new Set();
    const list = [];
    WORDS.forEach(w => {
      const key = String(w.kk || '').trim().toLowerCase();
      if (key.length !== 5 || seen.has(key)) return;
      for (const ch of key) if (!SOZLE_ALLOWED.has(ch)) return;
      seen.add(key);
      list.push({ key, w });
    });
    // Fixed-seed shuffle so every player in the world gets the same daily word
    const rnd = mulberry32(20260722);
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    SOZLE_LIST = list;
  }

  function sozleDayNum() {
    const now = new Date();
    const local = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.floor((local - SOZLE_EPOCH) / 86400000) + 1;
  }

  function sozleDefaultStats() {
    return { played: 0, won: 0, streak: 0, maxStreak: 0, lastWonNum: 0, lastPlayedNum: 0, dist: [0, 0, 0, 0, 0, 0], lastGame: null };
  }
  function loadSozleStats() {
    try { return Object.assign(sozleDefaultStats(), JSON.parse(localStorage.getItem(SOZLE_KEY) || '{}')); }
    catch (e) { return sozleDefaultStats(); }
  }
  function saveSozleStats(s) { try { localStorage.setItem(SOZLE_KEY, JSON.stringify(s)); } catch (e) {} }

  // Classic Wordle evaluation: two passes so repeated letters colour correctly
  function sozleEval(guess, answer) {
    const res = new Array(5).fill('absent');
    const left = {};
    for (let i = 0; i < 5; i++) {
      if (guess[i] === answer[i]) res[i] = 'correct';
      else left[answer[i]] = (left[answer[i]] || 0) + 1;
    }
    for (let i = 0; i < 5; i++) {
      if (res[i] !== 'correct' && left[guess[i]]) { res[i] = 'present'; left[guess[i]]--; }
    }
    return res;
  }

  function sozleRenderBoard() {
    const board = $('#sozleBoard');
    let html = '';
    for (let r = 0; r < 6; r++) {
      html += '<div class="sozle-row">';
      for (let c = 0; c < 5; c++) {
        let ch = '', cls = '';
        if (r < sozle.guesses.length) {
          ch = sozle.guesses[r][c];
          cls = ' is-' + sozle.evals[r][c];
        } else if (r === sozle.guesses.length && !sozle.done) {
          ch = sozle.cur[c] || '';
          if (ch) cls = ' is-filled';
        }
        html += `<div class="sozle-tile${cls}">${escapeHtml(ch)}</div>`;
      }
      html += '</div>';
    }
    board.innerHTML = html;
  }

  function sozleRenderKeys() {
    const status = {}; // letter → best status
    const rank = { absent: 1, present: 2, correct: 3 };
    sozle.guesses.forEach((g, gi) => {
      for (let i = 0; i < 5; i++) {
        const s = sozle.evals[gi][i];
        if (!status[g[i]] || rank[s] > rank[status[g[i]]]) status[g[i]] = s;
      }
    });
    $('#sozleKeys').innerHTML = SOZLE_ROWS.map(row =>
      '<div class="sozle-key-row">' + row.map(k => {
        if (k === 'enter') return '<button class="sozle-key sozle-key-wide" data-key="enter">ENTER</button>';
        if (k === 'back') return '<button class="sozle-key sozle-key-wide" data-key="back">⌫</button>';
        const s = status[k] ? ' is-' + status[k] : '';
        return `<button class="sozle-key${s}" data-key="${k}">${k}</button>`;
      }).join('') + '</div>'
    ).join('');
  }

  function sozleRenderStats() {
    const s = loadSozleStats();
    const winPct = s.played ? Math.round((s.won / s.played) * 100) : 0;
    $('#sozleStats').innerHTML = `
      <span class="sozle-stat"><strong>${s.played}</strong> played</span>
      <span class="sozle-stat"><strong>${winPct}%</strong> won</span>
      <span class="sozle-stat">🔥 <strong>${s.streak}</strong> streak</span>`;
  }

  function sozleMsg(text, sticky) {
    const el = $('#sozleMsg');
    el.textContent = text;
    clearTimeout(sozleMsg._t);
    if (!sticky && text) sozleMsg._t = setTimeout(() => { el.textContent = ''; }, 2200);
  }

  function sozleShareText() {
    const n = sozle.mode === 'daily' ? `#${sozle.num}` : '(practice)';
    const score = sozle.win ? sozle.guesses.length : 'X';
    const hint = sozle.hintUsed ? ' 💡' : '';
    const grid = sozle.evals.map(row =>
      row.map(s => s === 'correct' ? '🟩' : s === 'present' ? '🟨' : '⬛').join('')
    ).join('\n');
    return `Sózle ${n} ${score}/6${hint}\n${grid}\nhttps://qaraqalpaq.vercel.app/game.html`;
  }

  function sozleEndPanel() {
    const w = sozle.entry.w;
    const head = sozle.win
      ? ['', 'Genius! 🤯', 'Ájayıp! 🎉', 'Great! 🎉', 'Nice! 👏', 'Good! 🙂', 'Phew! 😅'][sozle.guesses.length]
      : 'The word was:';
    $('#sozlePanel').innerHTML = `
      <p class="sozle-panel-head">${head}</p>
      <div class="sozle-answer">
        <span class="sozle-answer-kk">${escapeHtml(w.kk)}</span>
        <span class="sozle-answer-en">${escapeHtml(w.en)}</span>
        <span class="sozle-answer-ru">${escapeHtml(w.ru)}</span>
        <span class="tr-cat">${escapeHtml(w.category)}</span>
      </div>
      <p class="sozle-learned">You just learned a Karakalpak word 🎓</p>
      <div class="sozle-share">
        <button class="btn btn-primary btn-sm" id="sozleCopy">Copy result</button>
        <a class="btn btn-outline btn-sm" id="sozleTg" target="_blank" rel="noopener"
           href="https://t.me/share/url?url=${encodeURIComponent('https://qaraqalpaq.vercel.app/game.html')}&text=${encodeURIComponent(sozleShareText())}">Share on Telegram</a>
        <a class="btn btn-outline btn-sm" href="dictionary.html?q=${encodeURIComponent(w.kk)}">Find in dictionary →</a>
      </div>`;
    $('#sozlePanel').hidden = false;
    $('#sozleFree').hidden = false;
    $('#sozleHint').hidden = true;
    const copyBtn = $('#sozleCopy');
    copyBtn.addEventListener('click', () => {
      const done = () => { copyBtn.textContent = 'Copied ✓'; setTimeout(() => { copyBtn.textContent = 'Copy result'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(sozleShareText()).then(done, done);
      else done();
    });
  }

  function sozleFinish(win) {
    sozle.done = true;
    sozle.win = win;
    if (sozle.mode === 'daily') {
      const s = loadSozleStats();
      if (s.lastPlayedNum !== sozle.num) {
        s.played++;
        s.lastPlayedNum = sozle.num;
        if (win) {
          s.won++;
          s.dist[sozle.guesses.length - 1]++;
          s.streak = s.lastWonNum === sozle.num - 1 ? s.streak + 1 : 1;
          s.maxStreak = Math.max(s.maxStreak, s.streak);
          s.lastWonNum = sozle.num;
        } else {
          s.streak = 0;
        }
        s.lastGame = { num: sozle.num, guesses: sozle.guesses, evals: sozle.evals, win, hintUsed: sozle.hintUsed };
        saveSozleStats(s);
      }
      recordPractice(); // counts toward the site-wide day streak too
    }
    sozleRenderStats();
    sozleEndPanel();
  }

  function sozleSubmit() {
    if (sozle.done) return;
    if (sozle.cur.length < 5) { sozleMsg('Not enough letters'); return; }
    const guess = sozle.cur;
    const ev = sozleEval(guess, sozle.answer);
    sozle.guesses.push(guess);
    sozle.evals.push(ev);
    sozle.cur = '';
    sozleRenderBoard();
    sozleRenderKeys();
    if (guess === sozle.answer) { sozleFinish(true); return; }
    if (sozle.guesses.length >= 6) { sozleFinish(false); return; }
  }

  function sozleKey(k) {
    if (!sozle || sozle.done) return;
    if (k === 'enter') { sozleSubmit(); return; }
    if (k === 'back') { sozle.cur = sozle.cur.slice(0, -1); sozleRenderBoard(); return; }
    if (sozle.cur.length >= 5 || !SOZLE_ALLOWED.has(k)) return;
    sozle.cur += k;
    sozleRenderBoard();
  }

  function sozleStart(mode) {
    const num = sozleDayNum();
    const entry = mode === 'daily'
      ? SOZLE_LIST[((num - 1) % SOZLE_LIST.length + SOZLE_LIST.length) % SOZLE_LIST.length]
      : SOZLE_LIST[Math.floor(Math.random() * SOZLE_LIST.length)];
    sozle = { mode, num, entry, answer: entry.key, guesses: [], evals: [], cur: '', done: false, win: false, hintUsed: false };
    $('#sozleNum').textContent = mode === 'daily' ? ` #${num}` : ' · practice';
    $('#sozlePanel').hidden = true;
    $('#sozleHint').hidden = false;
    $('#sozleHintText').hidden = true;
    $('#sozleFree').hidden = true;
    sozleMsg('');

    // Already finished today's puzzle → restore the finished board (no replaying for stats)
    if (mode === 'daily') {
      const s = loadSozleStats();
      if (s.lastGame && s.lastGame.num === num) {
        sozle.guesses = s.lastGame.guesses;
        sozle.evals = s.lastGame.evals;
        sozle.done = true;
        sozle.win = s.lastGame.win;
        sozle.hintUsed = !!s.lastGame.hintUsed;
        sozleRenderBoard();
        sozleRenderKeys();
        sozleRenderStats();
        sozleEndPanel();
        return;
      }
    }
    sozleRenderBoard();
    sozleRenderKeys();
    sozleRenderStats();
  }

  function initSozle() {
    buildSozleList();
    if (!SOZLE_LIST.length) return;
    sozleStart('daily');

    $('#sozleKeys').addEventListener('click', e => {
      const btn = e.target.closest('.sozle-key');
      if (btn) sozleKey(btn.dataset.key);
    });

    document.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName)) return; // don't steal typing from forms
      if (e.key === 'Enter') { sozleKey('enter'); return; }
      if (e.key === 'Backspace') { sozleKey('back'); return; }
      const k = e.key.toLowerCase();
      if (k.length === 1 && SOZLE_ALLOWED.has(k)) sozleKey(k);
    });

    $('#sozleHint').addEventListener('click', () => {
      const w = sozle.entry.w;
      sozle.hintUsed = true;
      const el = $('#sozleHintText');
      el.innerHTML = `💡 It means: <strong>${escapeHtml(w.en)}</strong> · ${escapeHtml(w.ru)}`;
      el.hidden = false;
    });

    $('#sozleFree').addEventListener('click', () => sozleStart('free'));
  }

  // ===== DICTIONARY PAGE =====
  function initDictionaryPage() {
    buildCategoryPills();
    setupSearch();
    setupPillsScroll();
    $('#wordGrid').addEventListener('click', e => {
      const learnBtn = e.target.closest('.learn-btn');
      if (learnBtn) {
        e.stopPropagation();
        handleLearnToggle(learnBtn);
        return;
      }
      const card = e.target.closest('.word-card');
      if (card) card.classList.toggle('flipped');
    });
    renderDictionary();
  }

  function buildCategoryPills() {
    const wrap = $('#categoryPills');
    const all = ['All', ...CATEGORIES];
    wrap.innerHTML = all.map(cat =>
      `<button class="pill ${cat === 'All' ? 'active' : ''}" data-cat="${escapeAttr(cat)}">${escapeHtml(cat)}</button>`
    ).join('');
    $$('.pill', wrap).forEach(pill => {
      pill.addEventListener('click', () => {
        state.category = pill.dataset.cat;
        state.page = 1;
        $$('.pill', wrap).forEach(p => p.classList.toggle('active', p === pill));
        renderDictionary();
      });
    });
  }

  function setupPillsScroll() {
    const pills = $('#categoryPills');
    $('#pillsLeft').addEventListener('click', () => pills.scrollBy({ left: -220, behavior: 'smooth' }));
    $('#pillsRight').addEventListener('click', () => pills.scrollBy({ left: 220, behavior: 'smooth' }));
  }

  function setupSearch() {
    const input = $('#searchInput');
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        state.search = input.value.trim();
        state.page = 1;
        renderDictionary();
      }, 120);
    });
  }

  function getFilteredWords() {
    const q = norm(state.search);
    return WORDS.filter(w => {
      if (state.category !== 'All' && w.category !== state.category) return false;
      if (!q) return true;
      return norm(w.kk).includes(q) || norm(w.en).includes(q) || norm(w.ru).includes(q);
    });
  }

  function renderWordOfDay() {
    const el = $('#wordOfDay');
    if (!el) return;
    if (state.search || state.category !== 'All') { el.hidden = true; el.innerHTML = ''; return; }
    const start = new Date(new Date().getFullYear(), 0, 0);
    const dayIdx = Math.floor((Date.now() - start) / 86400000) % WORDS.length;
    const w = WORDS[dayIdx];
    el.hidden = false;
    el.innerHTML = `
      <div class="wotd-card" style="--accent:${categoryColor(w.category)}">
        <span class="wotd-label">✨ Word of the Day</span>
        <div class="wotd-body">
          <span class="wotd-icon">${categoryIcon(w.category)}</span>
          <div class="wotd-text">
            <span class="wotd-kk">${escapeHtml(w.kk)}</span>
            <span class="wotd-en">${escapeHtml(w.en)}</span>
            <span class="wotd-ru">${escapeHtml(w.ru)}</span>
          </div>
        </div>
        <span class="wotd-cat">${escapeHtml(w.category)}</span>
      </div>`;
  }

  function handleLearnToggle(btn) {
    const id = btn.dataset.id;
    toggleLearned(id);
    const learned = isLearned(id);
    const card = btn.closest('.word-card');
    card.classList.toggle('is-learned', learned);
    $$('.learn-btn', card).forEach(b => b.textContent = learned ? '✓ Learned' : 'Mark as Learned');
    renderProgressBar();
    renderProgressWidget();
  }

  function renderDictionary() {
    const filtered = getFilteredWords();
    renderWordOfDay();
    renderProgressBar();
    renderProgressWidget();

    const grid = $('#wordGrid');
    const empty = $('#emptyState');
    const paginationEl = $('#pagination');

    if (filtered.length === 0) {
      $('#searchCount').textContent = '0 results found';
      grid.innerHTML = '';
      empty.hidden = false;
      paginationEl.innerHTML = '';
      return;
    }
    empty.hidden = true;

    const sorted = [...filtered].sort((a, b) => a.category.localeCompare(b.category) || a.kk.localeCompare(b.kk));
    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    if (state.page > totalPages) state.page = totalPages;
    const startIdx = (state.page - 1) * PAGE_SIZE;
    const pageItems = sorted.slice(startIdx, startIdx + PAGE_SIZE);

    $('#searchCount').textContent = `Showing ${pageItems.length} of ${sorted.length.toLocaleString()} word${sorted.length === 1 ? '' : 's'}`;
    grid.innerHTML = pageItems.map(wordCardHtml).join('');
    renderPagination(totalPages);
  }

  function wordCardHtml(w) {
    const accent = categoryColor(w.category);
    const icon = categoryIcon(w.category);
    const id = wordId(w);
    const learned = isLearned(id);
    const learnBtnHtml = `<button class="learn-btn" data-id="${escapeAttr(id)}">${learned ? '✓ Learned' : 'Mark as Learned'}</button>`;
    return `
      <div class="word-card${learned ? ' is-learned' : ''}" style="--accent:${accent}">
        <span class="learned-badge" aria-hidden="true">✓</span>
        <div class="word-card-inner">
          <div class="word-card-face word-card-front">
            <div class="word-card-top">
              <span class="word-card-icon">${icon}</span>
              <span class="word-cat-badge">${escapeHtml(w.category)}</span>
            </div>
            <span class="word-kk">${escapeHtml(w.kk)}</span>
            <span class="word-flip-hint">Tap to reveal ⟳</span>
            ${learnBtnHtml}
          </div>
          <div class="word-card-face word-card-back">
            <div class="word-card-top"><span class="word-card-icon">${icon}</span></div>
            <div class="word-card-trans">
              <span class="word-en">${escapeHtml(w.en)}</span>
              <span class="word-ru">${escapeHtml(w.ru)}</span>
            </div>
            <span class="word-flip-hint">Tap to go back ⟲</span>
            ${learnBtnHtml}
          </div>
        </div>
      </div>`;
  }

  function renderPagination(totalPages) {
    const el = $('#pagination');
    if (totalPages <= 1) { el.innerHTML = ''; return; }
    const cur = state.page;
    let pages = [];
    const pushRange = (a, b) => { for (let i = a; i <= b; i++) pages.push(i); };

    if (totalPages <= 7) {
      pushRange(1, totalPages);
    } else {
      pages.push(1);
      if (cur > 3) pages.push('...');
      pushRange(Math.max(2, cur - 1), Math.min(totalPages - 1, cur + 1));
      if (cur < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    let html = `<button class="page-btn" data-page="${cur - 1}" ${cur === 1 ? 'disabled' : ''}>‹</button>`;
    pages.forEach(p => {
      if (p === '...') html += `<span class="page-ellipsis">…</span>`;
      else html += `<button class="page-btn ${p === cur ? 'active' : ''}" data-page="${p}">${p}</button>`;
    });
    html += `<button class="page-btn" data-page="${cur + 1}" ${cur === totalPages ? 'disabled' : ''}>›</button>`;
    el.innerHTML = html;

    $$('.page-btn', el).forEach(btn => {
      btn.addEventListener('click', () => {
        const p = parseInt(btn.dataset.page, 10);
        if (!p || p < 1 || p > totalPages) return;
        state.page = p;
        renderDictionary();
        $('#view-dictionary').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // ===== FLASHCARDS PAGE =====
  function buildSelectOptions(select) {
    select.innerHTML = ['All Categories', ...CATEGORIES]
      .map(cat => `<option value="${escapeAttr(cat === 'All Categories' ? 'All' : cat)}">${escapeHtml(cat)}</option>`)
      .join('');
  }

  function initFlashcardsPage() {
    buildSelectOptions($('#flashCategory'));
    $('#flashCategory').addEventListener('change', e => {
      state.flash.category = e.target.value;
      refreshFlashList();
    });
    $('#flashcard').addEventListener('click', flipFlashcard);
    $('#flashFlipBtn').addEventListener('click', flipFlashcard);
    $('#flashPrev').addEventListener('click', () => stepFlashcard(-1));
    $('#flashNext').addEventListener('click', () => stepFlashcard(1));
    $('#flashShuffle').addEventListener('click', () => {
      shuffle(state.flash.list);
      state.flash.index = 0;
      showFlashcard();
    });
    const learnBtn = $('#flashLearnBtn');
    if (learnBtn) learnBtn.addEventListener('click', () => {
      const { list, index } = state.flash;
      if (list.length === 0) return;
      toggleLearned(wordId(list[index]));
      showFlashcard();
      renderProgressBar();
    });
    renderProgressBar();
    refreshFlashList();
  }

  function refreshFlashList() {
    const cat = state.flash.category;
    state.flash.list = WORDS.filter(w => cat === 'All' || w.category === cat);
    state.flash.index = 0;
    showFlashcard();
  }

  function showFlashcard() {
    const { list, index } = state.flash;
    const card = $('#flashcard');
    card.classList.remove('flipped');
    state.flash.flipped = false;
    const learnBtn = $('#flashLearnBtn');
    const badge = $('#flashLearnedBadge');
    if (list.length === 0) {
      $('#flashCatBadge').textContent = '—';
      $('#flashWordKK').textContent = 'No words in this category';
      $('#flashWordEN').textContent = '';
      $('#flashWordRU').textContent = '';
      $('#flashProgress').textContent = '0 / 0';
      if (learnBtn) learnBtn.hidden = true;
      if (badge) badge.classList.remove('is-visible');
      return;
    }
    const w = list[index];
    $('#flashCatBadge').textContent = w.category;
    $('#flashWordKK').textContent = w.kk;
    $('#flashWordEN').textContent = w.en;
    $('#flashWordRU').textContent = w.ru;
    $('#flashProgress').textContent = `${index + 1} / ${list.length}`;
    const learned = isLearned(wordId(w));
    if (learnBtn) {
      learnBtn.hidden = false;
      learnBtn.textContent = learned ? '✓ Learned' : '✓ Mark as Learned';
      learnBtn.classList.toggle('is-learned', learned);
    }
    if (badge) badge.classList.toggle('is-visible', learned);
  }

  function flipFlashcard() {
    if (state.flash.list.length === 0) return;
    state.flash.flipped = !state.flash.flipped;
    $('#flashcard').classList.toggle('flipped', state.flash.flipped);
  }

  function stepFlashcard(dir) {
    const { list } = state.flash;
    if (list.length === 0) return;
    state.flash.index = (state.flash.index + dir + list.length) % list.length;
    showFlashcard();
  }

  // ===== QUIZ PAGE =====
  function initQuizPage() {
    buildSelectOptions($('#quizCategory'));
    $('#quizStart').addEventListener('click', startQuiz);
    $('#quizNext').addEventListener('click', nextQuizQuestion);
    setupQuizLangToggle();
  }

  function setupQuizLangToggle() {
    const wrap = $('#quizLangToggle');
    if (!wrap) return;
    $$('.lang-btn', wrap).forEach(btn => {
      btn.addEventListener('click', () => {
        state.quiz.lang = btn.dataset.lang;
        $$('.lang-btn', wrap).forEach(b => b.classList.toggle('active', b === btn));
        if (!$('#quizStage').hidden && state.quiz.current && !state.quiz.locked) {
          renderQuizOptions(state.quiz.current.correct);
        }
      });
    });
  }

  const QUIZ_LANG_FIELD = { en: 'en', ru: 'ru' };

  function startQuiz() {
    const cat = $('#quizCategory').value;
    state.quiz.category = cat;
    state.quiz.pool = WORDS.filter(w => cat === 'All' || w.category === cat);
    state.quiz.score = 0;
    state.quiz.streak = 0;
    state.quiz.answered = 0;
    if (state.quiz.pool.length < 4) {
      alert('Not enough words in this category for a quiz. Try "All Categories".');
      return;
    }
    $('#quizIntro').hidden = true;
    $('#quizStage').hidden = false;
    updateQuizScoreboard();
    nextQuizQuestion();
  }

  function nextQuizQuestion() {
    const pool = state.quiz.pool;
    const correct = pool[Math.floor(Math.random() * pool.length)];
    $('#quizQuestionWord').textContent = correct.kk;
    $('#quizNext').hidden = true;
    renderQuizOptions(correct);
  }

  function renderQuizOptions(correct) {
    const pool = state.quiz.pool;
    const targetField = QUIZ_LANG_FIELD[state.quiz.lang] || 'en';

    const distractors = [];
    const used = new Set([correct[targetField]]);
    let attempts = 0;
    while (distractors.length < 3 && attempts < 200) {
      attempts++;
      const candidate = pool[Math.floor(Math.random() * pool.length)];
      const val = candidate[targetField];
      if (!used.has(val)) {
        used.add(val);
        distractors.push(val);
      }
    }
    const options = shuffle([correct[targetField], ...distractors]);

    state.quiz.current = { correct, targetField, options };
    state.quiz.locked = false;

    const optWrap = $('#quizOptions');
    optWrap.innerHTML = options.map(opt =>
      `<button class="quiz-option" data-val="${escapeAttr(opt)}">${escapeHtml(opt)}</button>`
    ).join('');

    $$('.quiz-option', optWrap).forEach(btn => {
      btn.addEventListener('click', () => handleQuizAnswer(btn));
    });
  }

  function handleQuizAnswer(btn) {
    if (state.quiz.locked) return;
    state.quiz.locked = true;
    const { correct, targetField } = state.quiz.current;
    const correctVal = correct[targetField];
    const chosen = btn.dataset.val;
    const isCorrect = chosen === correctVal;

    $$('.quiz-option').forEach(b => {
      b.disabled = true;
      if (b.dataset.val === correctVal) b.classList.add('correct');
      else if (b === btn) b.classList.add('wrong');
    });

    state.quiz.answered++;
    if (isCorrect) {
      state.quiz.score++;
      state.quiz.streak++;
    } else {
      state.quiz.streak = 0;
    }
    recordQuizAnswer(wordId(correct), isCorrect);
    updateQuizBestScore(state.quiz.score);
    updateQuizScoreboard();
    $('#quizNext').hidden = false;
  }

  function updateQuizScoreboard() {
    $('#quizScore').textContent = state.quiz.score;
    $('#quizStreak').textContent = state.quiz.streak;
    $('#quizTotal').textContent = state.quiz.answered;
    $('#quizScoreLive').textContent = state.quiz.score;
    $('#quizStreakLive').textContent = state.quiz.streak;
  }

  // ===== WORD REQUESTS & CORRECTIONS (own Google Form, no backend) =====
  const WORDREQ = {
    action: 'https://docs.google.com/forms/d/e/1FAIpQLSeYM-zDv2jb9djAaMwqs7YMeqAOQ_71NeFMYM46kajxce9FUQ/formResponse',
    wordField: 'entry.1570439197',
    noteField: 'entry.355778381',
  };

  function initWordRequest() {
    const form = $('#wordReqForm');
    if (!form) return;
    const word = $('#wordReqWord');
    const note = $('#wordReqNote');
    const msg = $('#wordReqMsg');

    const say = (text, ok) => {
      msg.hidden = false;
      msg.textContent = text;
      msg.classList.toggle('is-ok', !!ok);
      msg.classList.toggle('is-warn', !ok);
    };

    form.addEventListener('submit', e => {
      e.preventDefault();
      const w = word.value.trim();
      if (!w) { say('Please type the word first.', false); word.focus(); return; }

      const body = new URLSearchParams();
      body.append(WORDREQ.wordField, w);
      const n = note.value.trim();
      if (n) body.append(WORDREQ.noteField, n);
      // Google Forms rejects CORS reads, so fire-and-forget: the POST still lands
      fetch(WORDREQ.action, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      }).catch(() => {});

      form.reset();
      say('Raxmet! Got it — we\'ll review this word soon. 💜', true);
    });

    // "Missing a word? Tell us →" inside the translator jumps here with the word filled in
    document.addEventListener('click', e => {
      const btn = e.target.closest('.tr-report');
      if (!btn) return;
      word.value = btn.dataset.q || '';
      msg.hidden = true;
      $('#wordReq').scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => note.focus(), 400);
    });
  }

  // ===== FEEDBACK WIDGET (submits to Google Form, no backend needed) =====
  const FEEDBACK = {
    action: 'https://docs.google.com/forms/d/e/1FAIpQLSerHvwfsAVGPyPhC8fC5JLWscpDIeo-Ub-wsbLGD7sN2eMyVw/formResponse',
    ratingField: 'entry.1122276316',
    commentField: 'entry.2033114747',
    showAfterSeconds: 120, // cumulative time on site before the card appears
    storageKey: 'qaraqalpaq_feedback',
  };

  function initFeedbackWidget() {
    let fb;
    try { fb = JSON.parse(localStorage.getItem(FEEDBACK.storageKey)) || {}; } catch (e) { fb = {}; }
    if (fb.done || fb.dismissed) return;

    const save = () => { try { localStorage.setItem(FEEDBACK.storageKey, JSON.stringify(fb)); } catch (e) {} };

    // Count time across visits/pages, pause while the tab is hidden
    const tick = 5;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      fb.seconds = (fb.seconds || 0) + tick;
      save();
      if (fb.seconds >= FEEDBACK.showAfterSeconds) {
        clearInterval(timer);
        showFeedbackCard();
      }
    }, tick * 1000);

    function showFeedbackCard() {
      const card = document.createElement('div');
      card.className = 'feedback-card';
      card.innerHTML = `
        <button class="feedback-close" aria-label="Close">✕</button>
        <p class="feedback-title">Enjoying Qaraqalpaq Tili?</p>
        <p class="feedback-sub">Rate the site — it takes 5 seconds and helps a lot.</p>
        <div class="feedback-stars" role="radiogroup" aria-label="Rating">
          ${[1, 2, 3, 4, 5].map(n => `<button class="feedback-star" data-val="${n}" aria-label="${n} star${n > 1 ? 's' : ''}">★</button>`).join('')}
        </div>
        <div class="feedback-extra" hidden>
          <textarea class="feedback-comment" rows="2" placeholder="What should we improve? (optional)"></textarea>
          <button class="feedback-send">Send</button>
        </div>`;
      document.body.appendChild(card);
      requestAnimationFrame(() => card.classList.add('is-visible'));

      let rating = 0;
      const stars = $$('.feedback-star', card);
      const paint = () => stars.forEach((s, i) => s.classList.toggle('is-on', i < rating));

      stars.forEach(star => {
        star.addEventListener('click', () => {
          rating = parseInt(star.dataset.val, 10);
          paint();
          $('.feedback-extra', card).hidden = false;
        });
      });

      $('.feedback-close', card).addEventListener('click', () => {
        fb.dismissed = true;
        save();
        hide();
      });

      $('.feedback-send', card).addEventListener('click', () => {
        if (!rating) return;
        const body = new URLSearchParams();
        body.append(FEEDBACK.ratingField, String(rating));
        const comment = $('.feedback-comment', card).value.trim();
        if (comment) body.append(FEEDBACK.commentField, comment);
        fetch(FEEDBACK.action, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        }).catch(() => {});
        fb.done = true;
        save();
        $('.feedback-title', card).textContent = 'Raxmet! Thank you 💜';
        $('.feedback-sub', card).textContent = 'Your feedback helps Qaraqalpaq Tili grow.';
        $('.feedback-stars', card).style.pointerEvents = 'none';
        $('.feedback-extra', card).hidden = true;
        setTimeout(hide, 2500);
      });

      function hide() {
        card.classList.remove('is-visible');
        setTimeout(() => card.remove(), 400);
      }
    }
  }

  // ===== UTIL =====
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s); }

})();
