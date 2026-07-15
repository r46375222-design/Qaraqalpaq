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
    }
    if ($('.stat-num')) setupStatsAnimation();
    if ($('.phone-screen')) initPhoneMockup();
    if ($('#wordGrid')) initDictionaryPage();
    if ($('#flashcard')) initFlashcardsPage();
    if ($('#quizIntro')) initQuizPage();
    if ($('#progressWidget')) renderProgressWidget();
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
