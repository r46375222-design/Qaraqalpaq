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

  let appReady = false; // true once words.json has arrived and init() has built the page

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

  // Days are LOCAL calendar days (same as Sózle). toISOString() is UTC: it moved
  // "today" at 05:00 in Nukus and in the middle of the afternoon in the US.
  function localDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function todayStr() { return localDateStr(new Date()); }
  function yesterdayStr() {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return localDateStr(y);
  }

  // The streak shown on screen: alive only if the last practice was today or
  // yesterday. The stored number itself is reset by recordPractice() on the next practice.
  function currentStreak() {
    const last = PROGRESS.lastPracticeDate;
    if (!last || last < yesterdayStr()) return 0;
    return PROGRESS.streak || 0;
  }

  function wordId(w) { return `${w.category}::${w.kk}`; }

  function isLearned(id) { return !!PROGRESS.learned[id]; }

  function recordPractice() {
    const today = todayStr();
    if (PROGRESS.lastPracticeDate !== today) {
      PROGRESS.streak = PROGRESS.lastPracticeDate === yesterdayStr() ? (PROGRESS.streak || 0) + 1 : 1;
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
      .filter(e => localDateStr(new Date(e.at)) === today).length;
  }

  function totalWordsLearned() { return Object.keys(PROGRESS.learned).length; }

  function renderProgressWidget() {
    const el = $('#progressWidget');
    if (!el) return;
    el.innerHTML = `
      <div class="progress-widget-grid">
        <div class="pw-stat"><span class="pw-icon" aria-hidden="true">✅</span><span class="pw-num">${wordsLearnedToday()}</span><span class="pw-label">Learned Today</span></div>
        <div class="pw-stat"><span class="pw-icon" aria-hidden="true">🧠</span><span class="pw-num">${totalWordsLearned()}</span><span class="pw-label">Total Learned</span></div>
        <div class="pw-stat"><span class="pw-icon" aria-hidden="true">🔥</span><span class="pw-num">${currentStreak()}</span><span class="pw-label">Day Streak</span></div>
        <div class="pw-stat"><span class="pw-icon" aria-hidden="true">🏆</span><span class="pw-num">${PROGRESS.quizBestScore || 0}</span><span class="pw-label">Quiz Best</span></div>
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
    // dictionary.html?q=word ("Find in dictionary" pressed on another page): search the
    // grid for it right away. Last on purpose — everything above the grid has its final
    // height by now, so the scroll lands on the search field.
    const q = new URLSearchParams(location.search).get('q');
    if (q && $('#wordGrid')) findInDictionary(q);
    appReady = true;
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
        // Home page has no word grid — hand the query over to the dictionary page
        if (!$('#searchInput')) location.href = 'dictionary.html?q=' + encodeURIComponent(find.dataset.kk);
        else findInDictionary(find.dataset.kk);
      }
    });

    // dictionary.html?q=word (from the home-page translator and from the Sózle result):
    // the home page has no grid, there the word goes into the translator.
    // On the dictionary page the grid takes it — see initDictionaryPage.
    const q = new URLSearchParams(location.search).get('q');
    if (q && !$('#searchInput')) {
      input.value = q;
      run();
      $('#translator').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // "Find in dictionary": the word goes into the grid's own search, the grid is filtered
  // (exact match first — see searchRank) and scrolled into view. Used by the button on
  // the dictionary page and by an arrival through dictionary.html?q=word, so both give
  // the same result. The grid must exist already (initDictionaryPage has run).
  function findInDictionary(word) {
    const search = $('#searchInput');
    if (!search) return;
    search.value = word;
    state.search = word;
    // The word may sit in a different category than the one being filtered —
    // without this reset the grid answered "0 results" for a word that exists
    setActiveCategory('All');
    const pillsRow = $('#categoryPills');
    if (pillsRow) pillsRow.scrollLeft = 0;
    renderDictionary();
    $('.search-wrap').scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    // lastGame = today's finished game; current = today's game still in progress
    return { played: 0, won: 0, streak: 0, maxStreak: 0, lastWonNum: 0, lastPlayedNum: 0, dist: [0, 0, 0, 0, 0, 0], lastGame: null, current: null };
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
    // A streak is alive only if the last win was today's or yesterday's puzzle —
    // otherwise show 0 instead of a number from weeks ago
    const streak = s.lastWonNum >= sozleDayNum() - 1 ? s.streak : 0;
    $('#sozleStats').innerHTML = `
      <span class="sozle-stat"><strong>${s.played}</strong> played</span>
      <span class="sozle-stat"><strong>${winPct}%</strong> won</span>
      <span class="sozle-stat">🔥 <strong>${streak}</strong> streak</span>`;
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
    sozle.doneAt = Date.now(); // the feedback card waits a moment after this (see initFeedbackWidget)
    if (sozle.mode === 'daily') {
      const s = loadSozleStats();
      s.current = null; // no longer in progress
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
      }
      saveSozleStats(s);
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
    sozleSaveCurrent();
  }

  // Today's unfinished game is saved after every guess, so a reload or a closed tab
  // brings the board back — instead of handing out six fresh tries at the same word.
  // Practice games are not saved.
  function sozleSaveCurrent() {
    if (!sozle || sozle.mode !== 'daily' || sozle.done) return;
    const s = loadSozleStats();
    s.current = { num: sozle.num, answer: sozle.answer, guesses: sozle.guesses, hintUsed: sozle.hintUsed };
    saveSozleStats(s);
  }

  function sozleShowHint() {
    const w = sozle.entry.w;
    const el = $('#sozleHintText');
    el.innerHTML = `💡 It means: <strong>${escapeHtml(w.en)}</strong> · ${escapeHtml(w.ru)}`;
    el.hidden = false;
  }

  function sozleKey(k) {
    if (!sozle || sozle.done) return;
    if (k === 'enter') { sozleSubmit(); return; }
    if (k === 'back') { sozle.cur = sozle.cur.slice(0, -1); sozleRenderBoard(); return; }
    if (sozle.cur.length >= 5 || !SOZLE_ALLOWED.has(k)) return;
    sozle.cur += k;
    sozleRenderBoard();
  }

  // á ǵ ı ń ó ú have no key on a physical keyboard: type the plain letter, then '.
  // Pressing ' again turns it back.
  const SOZLE_ACCENT = { a: 'á', g: 'ǵ', i: 'ı', n: 'ń', o: 'ó', u: 'ú', 'á': 'a', 'ǵ': 'g', 'ı': 'i', 'ń': 'n', 'ó': 'o', 'ú': 'u' };
  function sozleAccent() {
    if (!sozle || sozle.done || !sozle.cur) return;
    const swap = SOZLE_ACCENT[sozle.cur.slice(-1)];
    if (!swap) return;
    sozle.cur = sozle.cur.slice(0, -1) + swap;
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
      // Started today's puzzle earlier and left → put the guesses back.
      // Same day AND same answer only (the pool can change between deploys);
      // colours are recomputed from the answer, never read from storage.
      const c = s.current;
      if (c && c.num === num && c.answer === entry.key && Array.isArray(c.guesses)) {
        const valid = c.guesses
          .filter(g => typeof g === 'string' && g.length === 5 && [...g].every(ch => SOZLE_ALLOWED.has(ch)))
          .slice(0, 5);
        if (!valid.includes(entry.key)) {
          sozle.guesses = valid;
          sozle.evals = valid.map(g => sozleEval(g, entry.key));
        }
        sozle.hintUsed = !!c.hintUsed;
        if (sozle.hintUsed) sozleShowHint();
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
    // A mouse or touch press must not leave keyboard focus on an on-screen key:
    // otherwise the next physical Enter or Space "presses" that key a second time
    // (click ú, type the rest, hit Enter with 4 letters → a stray second ú).
    $('#sozleKeys').addEventListener('mousedown', e => {
      if (e.target.closest('.sozle-key')) e.preventDefault();
    });

    document.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName)) return; // don't steal typing from forms
      if (e.target && e.target.closest && e.target.closest('#navHelp, #tourCard, #tourAsk, #footerGuide')) return; // the guide, not the game
      if (e.key === 'Enter') {
        // Enter always submits the guess — it never "presses" a focused on-screen key
        if (e.target && e.target.closest && e.target.closest('.sozle-key')) e.preventDefault();
        sozleKey('enter');
        return;
      }
      if (e.key === 'Backspace') { sozleKey('back'); return; }
      // 1. The key already is a letter of the alphabet (Latin layouts, Turkish ı…)
      const k = e.key.length === 1 ? e.key.toLowerCase() : '';
      if (SOZLE_ALLOWED.has(k)) { sozleKey(k); return; }
      // 2. Apostrophe (or the ` key): turn the last letter into its Karakalpak
      //    variant — a' → á, g' → ǵ, i' → ı, n' → ń, o' → ó, u' → ú
      if (e.code === 'Quote' || e.code === 'Backquote' || (k && "'`’ʼ´".includes(k))) {
        e.preventDefault(); // Firefox opens quick-find on '
        sozleAccent();
        return;
      }
      // 3. A letter of another script (Russian layout: the Q key sends "й"): go by the
      //    key's POSITION, so typing works without switching the keyboard to English
      const pos = /^Key([A-Z])$/.exec(e.code || '');
      if (pos && k && /\p{L}/u.test(k) && SOZLE_ALLOWED.has(pos[1].toLowerCase())) sozleKey(pos[1].toLowerCase());
    });

    $('#sozleHint').addEventListener('click', () => {
      sozle.hintUsed = true;
      sozleShowHint();
      sozleSaveCurrent();
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
        setActiveCategory(pill.dataset.cat);
        renderDictionary();
      });
    });
  }

  function setActiveCategory(cat) {
    state.category = cat;
    state.page = 1;
    $$('#categoryPills .pill').forEach(p => p.classList.toggle('active', p.dataset.cat === cat));
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

  // 0 = the word itself (or one of its "a / b" variants), 1 = starts with the query, 2 = contains it
  function searchRank(item, q) {
    const isExact = map => { const hit = map.get(q); return !!hit && hit.includes(item.w); };
    if (isExact(TRANS_INDEX.kk) || isExact(TRANS_INDEX.en) || isExact(TRANS_INDEX.ru)) return 0;
    if (item.kk.startsWith(q) || item.en.startsWith(q) || item.ru.startsWith(q)) return 1;
    return 2;
  }

  // The grid search folds text exactly like the translator does (foldKey), so
  // "salem" finds "Sálem!" and "ıdıs" finds "Ídıs". Returns [{ w, rank }].
  function getFilteredWords() {
    const raw = norm(state.search).trim();
    const q = foldKey(state.search);
    const inCategory = w => state.category === 'All' || w.category === state.category;
    if (!raw) return WORDS.filter(inCategory).map(w => ({ w, rank: 0 }));
    if (!q) {
      // Only punctuation typed ("!", "?") — nothing to fold, match the raw text
      return WORDS
        .filter(w => inCategory(w) && (norm(w.kk).includes(raw) || norm(w.en).includes(raw) || norm(w.ru).includes(raw)))
        .map(w => ({ w, rank: 0 }));
    }
    if (!TRANS_INDEX) buildTranslatorIndex(); // also builds SEARCH_KEYS (folded copies of every word)
    const out = [];
    for (const item of SEARCH_KEYS) {
      if (!inCategory(item.w)) continue;
      if (item.kk.includes(q) || item.en.includes(q) || item.ru.includes(q)) out.push({ w: item.w, rank: searchRank(item, q) });
    }
    return out;
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

    // Best match first (only matters while searching — without a query every rank is 0),
    // then the usual order: category, then word
    const sorted = filtered
      .sort((a, b) => a.rank - b.rank || a.w.category.localeCompare(b.w.category) || a.w.kk.localeCompare(b.w.kk))
      .map(x => x.w);
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
    // The ✓ badge lives INSIDE each face, so it turns with the card (as a child of
    // .word-card it stayed put in the corner while the card rotated under it), and it
    // is the LAST ITEM OF THE TOP ROW, so a long category pill shortens with "…"
    // instead of sliding under the badge.
    const badgeHtml = '<span class="learned-badge" aria-hidden="true">✓</span>';
    return `
      <div class="word-card${learned ? ' is-learned' : ''}" style="--accent:${accent}">
        <div class="word-card-inner">
          <div class="word-card-face word-card-front">
            <div class="word-card-top">
              <span class="word-card-icon">${icon}</span>
              <span class="word-cat-badge" title="${escapeAttr(w.category)}">${escapeHtml(w.category)}</span>
              ${badgeHtml}
            </div>
            <span class="word-kk">${escapeHtml(w.kk)}</span>
            <span class="word-flip-hint">Tap to reveal ⟳</span>
            ${learnBtnHtml}
          </div>
          <div class="word-card-face word-card-back">
            <div class="word-card-top"><span class="word-card-icon">${icon}</span>${badgeHtml}</div>
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
        // Back to the category row, not to the top of the section: the heading, progress,
        // Word of the Day and translator sit above the grid (≈1,400px of them on a phone)
        $('.pills-wrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    const cardEl = $('#flashcard');
    let lastSwipeAt = 0;
    cardEl.addEventListener('click', () => {
      if (Date.now() - lastSwipeAt < 400) return; // the tail of a swipe is not a tap
      flipFlashcard();
    });
    $('#flashFlipBtn').addEventListener('click', flipFlashcard);

    // Swipe left / right on the card = next / previous word (the page says "Swipe through").
    // Mostly-vertical drags are ignored, so scrolling the page over the card still works.
    let touchStart = null;
    cardEl.addEventListener('touchstart', e => {
      const t = e.changedTouches[0];
      touchStart = e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
    }, { passive: true });
    cardEl.addEventListener('touchend', e => {
      if (!touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      lastSwipeAt = Date.now();
      stepFlashcard(dx < 0 ? 1 : -1);
    }, { passive: true });

    // Keyboard: ← → move between words, Space / Enter flip the card
    document.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target && e.target.tagName) || '';
      if (/^(input|textarea|select)$/i.test(tag)) return; // the category dropdown uses the arrows itself
      if (e.key === 'ArrowRight') stepFlashcard(1);
      else if (e.key === 'ArrowLeft') stepFlashcard(-1);
      else if ((e.key === ' ' || e.key === 'Enter') && !/^(button|a)$/i.test(tag)) {
        e.preventDefault(); // Space would scroll the page
        flipFlashcard();
      }
    });
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
      // Only the button and the badge change — showFlashcard() would also turn the
      // card back to its front while you are reading the translation
      renderFlashLearned(list[index]);
      renderProgressBar();
    });
    renderProgressBar();
    refreshFlashList();
  }

  function renderFlashLearned(w) {
    const learnBtn = $('#flashLearnBtn');
    const learned = isLearned(wordId(w));
    if (learnBtn) {
      learnBtn.hidden = false;
      learnBtn.textContent = learned ? '✓ Learned' : '✓ Mark as Learned';
      learnBtn.classList.toggle('is-learned', learned);
    }
    // one badge on each face of the card (see flashcards.html)
    $$('#flashcard .learned-badge').forEach(b => b.classList.toggle('is-visible', learned));
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
    if (list.length === 0) {
      $('#flashCatBadge').textContent = '—';
      $('#flashWordKK').textContent = 'No words in this category';
      $('#flashWordEN').textContent = '';
      $('#flashWordRU').textContent = '';
      $('#flashProgress').textContent = '0 / 0';
      if (learnBtn) learnBtn.hidden = true;
      $$('#flashcard .learned-badge').forEach(b => b.classList.remove('is-visible'));
      return;
    }
    const w = list[index];
    $('#flashCatBadge').textContent = w.category;
    $('#flashWordKK').textContent = w.kk;
    $('#flashWordEN').textContent = w.en;
    $('#flashWordRU').textContent = w.ru;
    $('#flashProgress').textContent = `${index + 1} / ${list.length}`;
    renderFlashLearned(w);
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
    afterGameMs: 15000,    // on the Sózle page: pause between the end of a game and the card
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
        // Never pop up over a Sózle game in progress: on phones the card covers half
        // the board and the keyboard. Wait until the game is over, plus a short pause
        // so the player can read the answer and share the result first.
        if (sozle && (!sozle.done || Date.now() - (sozle.doneAt || 0) < FEEDBACK.afterGameMs)) return;
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

  // ===== GUIDE — a spotlight tour of the page =====
  // The page dims and ONE real element at a time is lit, with a short caption next to
  // it and Next / Skip. THE TOUR NEVER STARTS BY ITSELF — on any page. (It did once, on
  // the very first visit: the page dimmed and scrolled away under a visitor who had not
  // asked for anything. Musa, 2026-10-07: "no auto-start at all".) What starts it:
  //   - the first visit to each page: a small note under "?" asks "Need a quick tour?"
  //     — shown ONCE per page, whatever the visitor does with it; the tour starts only
  //     on "Show me";
  //   - "?" in the nav and "Guide" in the footer: any time.
  // When the tours of all five pages have been opened, "?" leaves the nav for good
  // (the footer link stays).
  // Started right away (not in init), so "?" works before words.json has loaded.
  //
  // MEMORY, one localStorage key per page — qaraqalpaq_guide_<page>:
  //   (nothing) never offered here · 'asked' the note was shown · 'seen' the tour was opened
  // The same five page names are listed in the small <script> in the <head> of every
  // html file (it hides "?" before the first paint) — keep the two lists the same.
  const GUIDE_PAGES = ['index', 'dictionary', 'flashcards', 'quiz', 'game'];
  const HELP_MAX_STEPS = 3;
  const K = t => `<kbd>${t}</kbd>`;
  const HELP_TEXT = {
    next: 'Next', skip: 'Skip', done: 'Done',
    askTitle: 'Need a quick tour?',
    askSub: 'Three quick tips · 15 seconds',
    askYes: 'Show me', askNo: 'No thanks',
  };
  // One step = [selector of the element to light up, caption for a mouse and keyboard,
  //             caption for a touch screen].
  // - no third item: the same caption on both;  null: no such step for that input.
  // - a step whose element is missing or hidden is skipped silently, and only the first
  //   HELP_MAX_STEPS of what is left are shown. So a page may list the steps of several
  //   of its states (quiz: start screen / a question; Sózle: playing / finished).
  const HELP_TIPS = {
    index: [
      ['#translator .tr-pane-src', 'Type any word — the language is detected automatically.'],
      ['.game-banner', 'A new Karakalpak word to guess every day.'],
      ['#wordReq .wordreq', 'Missing a word or spotted a mistake? Tell us here.'],
    ],
    dictionary: [
      ['.search-wrap', 'Search in any of the 3 languages — plain letters work too: salem finds Sálem.'],
      ['#wordGrid .word-card', 'Click a card to see the translation.', 'Tap a card to see the translation.'],
      ['#wordGrid .word-card .learn-btn', 'Mark the words you know — your progress is saved on this device.'],
    ],
    flashcards: [
      ['#flashcard', `Click the card or press ${K('Space')} to flip it.`, 'Tap the card to flip it.'],
      ['#flashNext', `Next word: this arrow, or ${K('←')} ${K('→')} on your keyboard.`, null],
      ['.flash-stage', null, 'Swipe the card left or right — or tap the arrows — for another word.'],
      ['#flashLearnBtn', 'Mark the words you know — your progress is saved on this device.'],
    ],
    quiz: [
      ['#quizLangToggle', 'Choose the language of the answers: English or Русский.'],
      ['#quizCategory', 'Pick one topic — or keep all categories.'],
      ['#quizStart', 'Every question gives you 4 options, one of them is right.'],
      ['#quizOptions', 'Pick the right translation — one of the 4 is correct.'],
      ['.quiz-top', 'Your score, and your streak of right answers in a row.'],
    ],
    game: [
      ['#sozleBoard', 'Six tries to guess the 5-letter word: 🟩 right spot, 🟨 wrong spot.'],
      ['#sozleKeys', `Type on your own keyboard, in any layout — for á ǵ ı ń ó ú press the letter, then ${K("'")}.`,
        'Tap the letters — á ǵ ı ń ó ú have their own keys — then ENTER.'],
      ['#sozleHint', 'Stuck? The hint shows what the word means.'],
      ['#sozleFree', 'Done for today? Play a random word — it does not change your stats.'],
    ],
  };

  function initHelp() {
    const btn = $('#navHelp');
    if (!btn) return;
    const page = (location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
    const root = document.documentElement;
    const nav = $('.nav');
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    const ms = n => calm.matches ? 0 : n; // every wait below shrinks to nothing for "reduce motion"
    const PAD = 6;    // air between the element and the edge of the light
    const GAP = 12;   // between the light and the caption
    const EDGE = 12;  // the caption never comes closer to the side of the screen
    // The three phases every change is made of. They match the transition times in the
    // stylesheet (block "GUIDE"); a little is added so a phase is really over.
    const T_VEIL = 240, T_OFF = 170;

    // ---------- memory ----------
    const key = p => 'qaraqalpaq_guide_' + p;
    let canRemember = true;
    try {
      localStorage.setItem('qaraqalpaq_guide_test', '1');
      localStorage.removeItem('qaraqalpaq_guide_test');
      localStorage.removeItem('qaraqalpaq_help_seen'); // key of the first version of the guide
    } catch (e) { canRemember = false; }
    const recall = p => { try { return localStorage.getItem(key(p)); } catch (e) { return null; } };
    const remember = (p, v) => { try { localStorage.setItem(key(p), v); } catch (e) {} };
    const allSeen = () => canRemember && GUIDE_PAGES.every(p => recall(p) === 'seen');
    if (allSeen()) root.classList.add('guide-done'); // normally set by the script in <head>

    // ---------- the tour ----------
    let ui = null;            // the layers, built on first use
    let steps = [], at = 0;   // steps = [{ el, html }], at = the one on screen
    let mode = '';            // where the caption sits: below / above / over the element
    let goalY = 0;            // the scroll position this step was laid out for
    let drawn = null;         // where the light was last drawn — to notice the element moving
    let active = false;       // open() … close()
    let busy = false;         // between two steps: clicks on Next wait
    let seq = 0;              // every open / step / close gets a number; a late timer of an older one does nothing
    let raf = 0, lastW = 0, byKeyboard = false, opener = null;
    const isOpen = () => active;
    const later = (fn, t) => { const mine = seq; setTimeout(() => { if (mine === seq) fn(); }, ms(t)); };

    // On screen right now? (exists, not display:none / [hidden], has a size, not visibility:hidden)
    function visible(el) {
      if (!el || !el.getClientRects().length) return false;
      const r = el.getBoundingClientRect();
      return r.width >= 2 && r.height >= 2 && getComputedStyle(el).visibility !== 'hidden';
    }

    function collect() {
      const touch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
      const out = [];
      for (const [sel, mouse, finger = mouse] of (HELP_TIPS[page] || [])) {
        const html = touch ? finger : mouse;
        if (!html) continue;
        const el = $$(sel).find(visible);
        if (el) out.push({ el, html });
        if (out.length === HELP_MAX_STEPS) break;
      }
      return out;
    }

    // The layers, bottom to top:
    //   catcher  invisible, over the whole screen: takes every click outside the caption
    //   veil     the same dark colour over the whole screen — only while the tour fades
    //            in or out
    //   hole     lies over the lit element; its huge box-shadow dims the rest of the page.
    //            Inside it: shade (the same dark colour again — "the light is off") and
    //            ring (the bright edge).
    //   card     the caption
    // ONLY opacity and transform are ever animated (veil, shade, ring, card). The hole
    // never animates: it is moved in one go while the shade covers it, so the move
    // cannot be seen — and nothing has to be laid out again frame after frame.
    function build() {
      const mk = (cls, parent) => { const d = document.createElement('div'); d.className = cls; (parent || document.body).appendChild(d); return d; };
      const catcher = mk('tour-catch'), veil = mk('tour-veil'), hole = mk('tour-hole');
      const shade = mk('tour-shade', hole), ring = mk('tour-ring', hole);
      const card = mk('tour-card');
      card.id = 'tourCard';
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-modal', 'true');
      card.setAttribute('aria-label', 'How to use this page');
      card.innerHTML = `
        <p class="tour-text" aria-live="polite"></p>
        <div class="tour-row">
          <span class="tour-count"></span>
          <button class="tour-skip" type="button">${HELP_TEXT.skip}</button>
          <button class="tour-next" type="button"></button>
        </div>`;
      catcher.hidden = veil.hidden = hole.hidden = card.hidden = true;
      ui = { catcher, veil, hole, shade, ring, card, text: $('.tour-text', card), count: $('.tour-count', card), skip: $('.tour-skip', card), next: $('.tour-next', card) };
      catcher.addEventListener('click', close); // a click anywhere outside the caption
      ui.skip.addEventListener('click', close);
      ui.next.addEventListener('click', () => go(1));
    }

    function scrollPage(y) {
      if (!calm.matches) { window.scrollTo({ top: y, behavior: 'smooth' }); return; }
      const was = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto'; // <html> is scroll-behavior: smooth in the stylesheet
      window.scrollTo(0, y);
      root.style.scrollBehavior = was;
    }

    // Puts the hole over the current element and the caption next to it.
    // Everything is in DOCUMENT coordinates (position: absolute), so the browser moves
    // both with the page while it scrolls — nothing to keep in sync from a scroll event,
    // which on phones always runs a frame behind the finger.
    // rescroll = bring the element into view (a new step); false = only follow it.
    function place(rescroll) {
      const el = steps[at].el;
      const { hole, card } = ui;
      const vw = root.clientWidth, vh = window.innerHeight; // clientWidth: without the scrollbar
      const sx = window.pageXOffset, sy = window.pageYOffset;
      const docH = Math.max(root.scrollHeight, vh);
      const r = el.getBoundingClientRect();

      const left = Math.max(4, r.left - PAD), right = Math.min(vw - 4, r.right + PAD);
      const top = r.top + sy - PAD, height = r.height + PAD * 2, bottom = top + height;
      // corner rounding: the element's own, or that of a child that fills it
      // (the flashcard's rounding is on its faces, not on the card)
      let radius = 0;
      for (let n = el, i = 0; n && i < 3; n = n.firstElementChild, i++) {
        const nr = n.getBoundingClientRect();
        if (Math.abs(nr.width - r.width) > 2 || Math.abs(nr.height - r.height) > 2) break;
        radius = Math.max(radius, parseFloat(getComputedStyle(n).borderTopLeftRadius) || 0);
      }
      const w = Math.round(right - left), h = Math.round(height);
      hole.style.left = Math.round(left + sx) + 'px';
      hole.style.top = Math.round(top) + 'px';
      hole.style.width = w + 'px';
      hole.style.height = h + 'px';
      hole.style.borderRadius = Math.max(10, Math.min(radius + PAD, height / 2, (right - left) / 2)) + 'px';
      // the shadow that dims the page has to reach its far ends from wherever the light is
      hole.style.setProperty('--tour-spread', Math.ceil(Math.max(docH, vw)) + 'px');
      // the ring settles onto the element from 7px outside it, whatever the element's size
      hole.style.setProperty('--tour-rx', (1 + 14 / w).toFixed(4));
      hole.style.setProperty('--tour-ry', (1 + 14 / h).toFixed(4));
      drawn = { x: r.left + sx, y: r.top + sy, w: r.width, h: r.height, docH };

      const cw = card.offsetWidth, ch = card.offsetHeight;
      const navH = nav && /sticky|fixed/.test(getComputedStyle(nav).position) ? nav.offsetHeight : 0;
      const bandTop = navH + 10, bandBot = vh - 10; // the part of the screen that is free
      const maxScroll = Math.max(0, docH - vh);
      // Scroll position at which a block (the light + the caption) is fully on screen, or
      // null if it cannot be. Already on screen — stay where we are; otherwise centre it
      // (centred, the next step is usually on screen too, so the page jumps less often).
      const fit = (a, b) => {
        const spare = (bandBot - bandTop) - (b - a);
        if (spare < 0) return null;
        let y = sy;
        if (a < sy + bandTop || b > sy + bandBot) y = a - bandTop - spare / 2;
        y = Math.min(maxScroll, Math.max(0, Math.round(y)));
        return a >= y + bandTop - 1 && b <= y + bandBot + 1 ? y : null;
      };
      if (rescroll || !mode) {
        let y = sy;
        // The caption goes under the element; above it only when that spares a scroll
        // (or when there is no room under it at all).
        const below = fit(top, bottom + GAP + ch), above = fit(top - GAP - ch, bottom);
        if (below !== null && (below === sy || above !== sy)) { mode = 'below'; y = below; }
        else if (above !== null) { mode = 'above'; y = above; }
        else {
          // the element is too tall to share the screen with the caption:
          // the caption goes over its lower edge
          mode = 'over';
          const own = fit(top, bottom);
          y = own !== null ? own : Math.min(maxScroll, Math.max(0, Math.round(top - bandTop)));
        }
        goalY = y;
      }
      let cTop;
      if (mode === 'below') cTop = bottom + GAP;
      else if (mode === 'above') cTop = top - GAP - ch;
      else cTop = Math.max(top + 8, Math.min(bottom - ch - 8, goalY + bandBot - ch));
      const mid = r.left + r.width / 2;
      const cLeft = Math.min(Math.max(EDGE, vw - EDGE - cw), Math.max(EDGE, mid - cw / 2));
      card.style.left = Math.round(cLeft + sx) + 'px';
      card.style.top = Math.round(cTop) + 'px';
      card.style.setProperty('--tour-caret', Math.round(Math.min(cw - 24, Math.max(24, mid - cLeft))) + 'px');
      card.classList.toggle('is-below', mode === 'below');
      card.classList.toggle('is-above', mode === 'above');
      if (rescroll && goalY !== sy) scrollPage(goalY);
    }

    // Caption text and the place of everything for the current step. Always done while
    // the light is off (the shade covers the hole), so the move itself is never seen.
    function lay() {
      const last = at === steps.length - 1;
      ui.text.innerHTML = steps[at].html;
      ui.count.textContent = steps.length > 1 ? `${at + 1} / ${steps.length}` : '';
      ui.next.innerHTML = last ? HELP_TEXT.done : `${HELP_TEXT.next} <span aria-hidden="true">→</span>`;
      ui.skip.hidden = last; // nothing left to skip
      mode = '';
      place(true);
    }
    // Light on, caption in.
    function light() {
      void ui.card.offsetWidth; // commit "off" first, so "on" is a transition (no rAF: it never fires in a hidden tab)
      ui.hole.classList.add('is-lit');
      ui.card.classList.add('is-in');
      ui.next.focus({ preventScroll: true });
    }

    // dir = +1 / -1. Elements that have gone since the tour was opened are stepped over.
    function go(dir) {
      if (!active || busy) return;
      let i = at + dir;
      while (i >= 0 && i < steps.length && !visible(steps[i].el)) i += dir;
      if (i >= steps.length) { close(); return; }
      if (i < 0) return;
      // light off + caption out → move → light on + caption in
      busy = true;
      seq++;
      ui.hole.classList.remove('is-lit');
      ui.card.classList.remove('is-in');
      later(() => { at = i; busy = false; lay(); light(); }, T_OFF);
    }

    // While the tour is open: has the lit element moved (fonts or words arriving, a card
    // re-rendering) or gone? One measurement per frame; nothing runs when it is closed.
    function follow() {
      if (!active) return;
      raf = requestAnimationFrame(follow);
      if (busy || ui.hole.hidden) return;
      const el = steps[at].el;
      if (!visible(el)) { go(1); return; }
      const r = el.getBoundingClientRect();
      const x = r.left + window.pageXOffset, y = r.top + window.pageYOffset;
      if (Math.abs(x - drawn.x) > 1 || Math.abs(y - drawn.y) > 1 || Math.abs(r.width - drawn.w) > 1 ||
          Math.abs(r.height - drawn.h) > 1 || Math.max(root.scrollHeight, window.innerHeight) !== drawn.docH) place(false);
    }

    function open(viaKeyboard, from) {
      if (active) return;
      hideAsk();
      if (nav) nav.classList.remove('menu-open'); // the phone menu would cover the page
      steps = collect();
      if (!steps.length) return;
      if (!ui) build();
      seq++; // also cancels what is left of a close that is still fading out
      active = true; busy = true;
      byKeyboard = !!viaKeyboard;
      opener = from || btn;
      at = 0;
      lastW = root.clientWidth;
      remember(page, 'seen');
      // 1. the whole page dims evenly (and already scrolls to the first element)
      const dimmed = !ui.hole.hidden; // reopened before the last tour had faded out: it is dark already
      ui.catcher.hidden = ui.veil.hidden = ui.card.hidden = false;
      ui.hole.classList.remove('is-lit');
      ui.card.classList.remove('is-in');
      ui.card.classList.toggle('by-keys', byKeyboard); // focus rings only for keyboard users
      ui.veil.classList.toggle('is-cut', dimmed);
      if (dimmed) ui.veil.classList.add('is-on');
      ui.hole.hidden = true;
      if (nav) nav.classList.add('tour-on'); // lifts the nav above the tour and fades its links (see the stylesheet)
      btn.setAttribute('aria-expanded', 'true');
      lay();
      void ui.veil.offsetWidth;
      ui.veil.classList.remove('is-cut');
      ui.veil.classList.add('is-on');
      // 2. the veil is swapped for the hole with its shade down — the very same picture —
      //    and the light comes on
      later(() => {
        ui.veil.classList.add('is-cut');
        ui.veil.classList.remove('is-on');
        ui.hole.hidden = false;
        busy = false;
        light();
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(follow);
      }, dimmed ? 0 : T_VEIL);
    }

    function close() {
      if (!active) return;
      seq++;
      active = false; busy = false;
      cancelAnimationFrame(raf);
      const hadFocus = ui.card.contains(document.activeElement);
      ui.catcher.hidden = true; // the page can be used again at once
      btn.setAttribute('aria-expanded', 'false');
      // Keyboard users go back to where they started. After a mouse or a finger nothing
      // keeps the focus — on the Sózle page the next Enter must check the guess, not
      // reopen the guide.
      if (byKeyboard && opener && visible(opener)) opener.focus({ preventScroll: true });
      else if (hadFocus && document.activeElement) document.activeElement.blur();
      // 1. light off, caption out   2. hole swapped for the veil   3. the veil fades away
      const fadeOut = () => {
        ui.veil.classList.remove('is-cut');
        ui.veil.classList.remove('is-on');
        if (nav) nav.classList.remove('tour-on');
        later(() => {
          ui.veil.hidden = ui.card.hidden = true;
          // Every page's tour has been opened: "?" has done its job. It fades where it
          // stands, so the links do not move under the visitor's eyes; from the next
          // page on it is not there at all (see .guide-done in the stylesheet).
          if (allSeen()) { btn.classList.add('is-done'); btn.tabIndex = -1; btn.setAttribute('aria-hidden', 'true'); }
        }, T_VEIL);
      };
      ui.hole.classList.remove('is-lit');
      ui.card.classList.remove('is-in');
      if (ui.hole.hidden) { fadeOut(); return; } // closed while it was still fading in
      later(() => {
        ui.veil.classList.add('is-cut', 'is-on');
        ui.hole.hidden = true;
        void ui.veil.offsetWidth;
        fadeOut();
      }, T_OFF);
    }

    // ---------- "Need a quick tour?" — the note under "?" ----------
    let ask = null, askTimer = 0, askRaf = 0;
    function placeAsk() {
      if (!ask) return;
      const b = btn.getBoundingClientRect(), vw = root.clientWidth, w = ask.offsetWidth;
      const x = Math.round(Math.min(Math.max(EDGE, vw - EDGE - w), Math.max(EDGE, b.left - 10)));
      ask.style.transform = `translate3d(${x}px, ${Math.round(b.bottom + 12)}px, 0)`;
      ask.style.setProperty('--ask-caret', Math.round(Math.min(w - 20, Math.max(20, b.left + b.width / 2 - x))) + 'px');
    }
    // "?" slides sideways when the home / dictionary nav shrinks into its pill:
    // keep the note under it for the half second that takes
    function trackAsk() {
      if (!ask) return;
      const until = Date.now() + 500;
      cancelAnimationFrame(askRaf);
      (function tick() { placeAsk(); if (ask && Date.now() < until) askRaf = requestAnimationFrame(tick); })();
    }
    function showAsk() {
      remember(page, 'asked'); // from this moment it never comes back on this page
      ask = document.createElement('div');
      ask.className = 'tour-ask';
      ask.id = 'tourAsk';
      ask.setAttribute('role', 'region');
      ask.setAttribute('aria-label', 'Page tour');
      ask.innerHTML = `
        <div class="tour-ask-box">
          <p class="tour-ask-title">${HELP_TEXT.askTitle}</p>
          <p class="tour-ask-sub">${HELP_TEXT.askSub}</p>
          <div class="tour-ask-row">
            <button class="tour-ask-yes" type="button">${HELP_TEXT.askYes}</button>
            <button class="tour-ask-no" type="button">${HELP_TEXT.askNo}</button>
          </div>
        </div>`;
      document.body.appendChild(ask);
      placeAsk();
      void ask.offsetWidth;
      ask.classList.add('is-in');
      $('.tour-ask-yes', ask).addEventListener('click', e => open(e.detail === 0));
      $('.tour-ask-no', ask).addEventListener('click', hideAsk);
      // it leaves by itself after a while — but not from under the pointer
      const arm = t => { clearTimeout(askTimer); askTimer = setTimeout(hideAsk, t); };
      ask.addEventListener('mouseenter', () => clearTimeout(askTimer));
      ask.addEventListener('mouseleave', () => arm(4000));
      arm(15000);
    }
    function hideAsk() {
      if (!ask) return;
      const el = ask;
      ask = null;
      clearTimeout(askTimer);
      cancelAnimationFrame(askRaf);
      el.classList.remove('is-in');
      setTimeout(() => el.remove(), ms(220));
    }

    // Offered once the page has settled: after it has loaded, a good second later, and
    // only while somebody is looking at it.
    function whenSettled(run) {
      const go2 = () => setTimeout(function wait() {
        if (document.visibilityState === 'hidden') {
          document.addEventListener('visibilitychange', function back() {
            if (document.visibilityState === 'hidden') return;
            document.removeEventListener('visibilitychange', back);
            setTimeout(wait, 700);
          });
          return;
        }
        run();
      }, 1300);
      if (document.readyState === 'complete') { go2(); return; }
      let started = false;
      const start = () => { if (!started) { started = true; go2(); } };
      window.addEventListener('load', start, { once: true });
      setTimeout(start, 3000); // a slow image or font must not hold it back for ever
    }
    function offer(tries) {
      if (active || recall(page) || root.classList.contains('guide-done')) return; // "?" was pressed meanwhile
      if (!appReady) { if (tries > 0) setTimeout(() => offer(tries - 1), 250); return; } // words still loading
      if (nav && nav.classList.contains('menu-open')) return; // busy with the menu — next time
      if (visible(btn)) showAsk(); // only ever the note: the tour itself waits for a yes
    }
    if (canRemember && HELP_TIPS[page] && !recall(page)) whenSettled(() => offer(24));

    // ---------- wiring ----------
    // A mouse press must not leave keyboard focus on "?" (same Sózle reason as in close)
    btn.addEventListener('mousedown', e => e.preventDefault());
    btn.addEventListener('click', e => active ? close() : open(e.detail === 0, btn));
    const foot = $('#footerGuide');
    if (foot) foot.addEventListener('click', e => open(e.detail === 0, foot));
    // The nav stays above the tour, so the sheet that catches clicks does not cover it:
    // a click on the nav (anywhere but "?") closes the tour too, and does nothing else.
    if (nav) nav.addEventListener('click', e => {
      if (!active || e.target.closest('#navHelp')) return;
      e.preventDefault();
      e.stopPropagation();
      close();
    }, true);
    // The note goes away as soon as the visitor gets on with the page: a click or a tap
    // anywhere else, or typing. Scrolling does not count.
    document.addEventListener('click', e => {
      if (ask && !e.target.closest('#tourAsk, #navHelp')) hideAsk();
    }, true);
    // Capture phase + stopPropagation: while the tour is open the page under it
    // (Sózle typing, flashcard arrows and Space) must not react to the keyboard.
    document.addEventListener('keydown', e => {
      if (ask && !/^(Tab|Shift|Control|Alt|Meta)$/.test(e.key) && !(e.target.closest && e.target.closest('#tourAsk'))) hideAsk();
      if (!active) return;
      e.stopPropagation();
      if (/^(Tab|Arrow)/.test(e.key)) ui.card.classList.add('by-keys');
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      else if (e.key === 'Tab') { // only two things to tab between
        e.preventDefault();
        (document.activeElement === ui.next && !ui.skip.hidden ? ui.skip : ui.next).focus({ preventScroll: true });
      }
    }, true);
    window.addEventListener('scroll', trackAsk, { passive: true });
    // A new width (rotation, window resize) can hide or reveal elements and changes where
    // everything is. A new height alone is the phone's address bar sliding — ignore it,
    // or the page would be scrolled back under the visitor's finger.
    window.addEventListener('resize', () => {
      trackAsk();
      if (!active || busy || root.clientWidth === lastW) return;
      lastW = root.clientWidth;
      const el = steps[at].el;
      steps = collect();
      if (!steps.length) { close(); return; }
      at = Math.max(0, steps.findIndex(s => s.el === el));
      ui.hole.classList.remove('is-lit');
      ui.card.classList.remove('is-in');
      lay();
      light();
    }, { passive: true });
  }
  initHelp();

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
