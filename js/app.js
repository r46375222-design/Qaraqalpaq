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

  // ===== INTERFACE LANGUAGE — EN / RU =====
  // Every interface string lives HERE, in STRINGS. Phase 1 (2026-10-09): the mechanics and
  // all the static strings of the five pages; the strings app.js builds itself (messages,
  // tour captions, Sózle, …) move in phase 2.
  // The html keeps the English text (what shows without JS, and what search engines read)
  // and names its key:
  //   data-i18n="key"                       → the element's text
  //   data-i18n-html="key"                  → its inner HTML (strings with <strong>, <kbd>…)
  //   data-i18n-attr="placeholder:key; …"   → attributes (placeholder, aria-label, title, alt)
  //   data-i18n-cat="Animal World"          → a category name, shown through catLabel()
  // In code: t('key') or t('key', { answer: 'Tie' }) for "{answer}" in the string.
  // CATEGORY NAMES ARE KEYS: words.json, the dictionary filter (data-cat), the quiz and
  // flashcards selects (option value) and wordId() all use the English name. Only what is
  // SHOWN goes through catLabel(cat) — never put a translated name into a value, a data-*
  // attribute, a filter or localStorage.
  // <title> and the meta description stay English on purpose (Musa, 2026-10-08).
  // PHASE 1: ru is a stand-in — "[RU] " + the English text — so a string that does not
  // switch is easy to spot. Phase 2 replaces STRINGS.ru and CATEGORY_NAMES.ru with Russian.
  const LANG_KEY = 'qaraqalpaq_lang';
  const STRINGS_EN = {
    // nav and footer (every page)
    'nav.home': 'Home', 'nav.dictionary': 'Dictionary', 'nav.flashcards': 'Flashcards', 'nav.quiz': 'Quiz',
    'a11y.logo': 'Qaraqalpaq Tili logo', 'a11y.help': 'How to use this site', 'a11y.menu': 'Menu',
    'a11y.toRu': 'Switch to Russian', 'a11y.toEn': 'Switch to English',
    'footer.tagline': 'Keeping the Karakalpak language alive, one word at a time.', 'footer.questions': 'Questions?',
    'footer.guide': 'Guide', 'footer.guideTitle': 'A quick tour of this page',
    // home
    'hero.tag': 'Tili — your gateway to Karakalpak',
    'hero.title': 'Learn <span class="hero-accent">Qaraqalpaq</span> the modern way.',
    'hero.sub': 'An instant translator, dictionary, flashcards and quizzes built for a new generation of learners — fast, bold, and actually fun.',
    'hero.try': 'Try the Translator', 'cta.exploreDict': 'Explore the Dictionary',
    'stat.words': 'Words', 'stat.categories': 'Categories', 'stat.languages': 'Languages',
    'home.exploreAll': 'Explore all 1,301 words in the dictionary →',
    'home.sozle': "<strong>New — Sózle:</strong> the Karakalpak word game. Guess today's word in 6 tries →",
    'proof.caption': 'Just launched — be among the <strong>first learners</strong> of Qaraqalpaq online',
    'proof.words': 'Real words, checked by a native speaker', 'proof.waiting': 'Waiting for your feedback', 'proof.tell': 'Tell us what you think —',
    'show.title': 'See it in action', 'show.sub': 'A quick look at the dictionary, flashcards and quiz.',
    'show.dictTitle': 'Dictionary & Translator', 'show.dictSub': '1,301 words — instant translation both ways',
    'show.flashTitle': 'Flashcards', 'show.flashSub': 'Flip to memorize faster', 'show.quizTitle': 'Quiz', 'show.quizSub': 'Test yourself instantly',
    'phone.flashTitle': 'Master words with smart Flashcards',
    'phone.flashText': 'Flip through real Karakalpak vocabulary and build recall with instant English & Russian translations.',
    'phone.quizTitle': 'Test yourself with instant Quiz',
    'phone.quizText': 'Four options, one right answer. Track your streak and score as you grow from beginner to fluent.',
    'feat.title': 'Everything you need to learn Qaraqalpaq', 'feat.sub': 'One simple toolkit, built for fast progress.',
    'feat.translator': 'Instant Translator', 'feat.translatorText': 'Auto-detects Qaraqalpaq, English or Russian.',
    'feat.words': '1,301 Words', 'feat.wordsText': 'Karakalpak, English and Russian in one place.',
    'feat.flash': 'Smart Flashcards', 'feat.flashText': 'Flip cards to memorize faster.',
    'feat.quiz': 'Quick Quiz', 'feat.quizText': 'Test your knowledge instantly.',
    'cta.title': 'Ready to start learning?',
    // the little mock-ups on the home page (their English words are part of the picture)
    'mock.hello': 'Hello', 'mock.heart': 'Heart', 'mock.whatIs': 'What is <strong>Suw</strong>?',
    'mock.water': 'Water', 'mock.fire': 'Fire', 'mock.earth': 'Earth', 'mock.air': 'Air',
    'mock.search': 'Search a word…', 'mock.all': 'All', 'mock.animals': 'Animals', 'mock.food': 'Food',
    'mock.sky': 'sky', 'mock.flower': 'flower', 'mock.sun': 'Sun', 'mock.moon': 'Moon', 'mock.star': 'Star', 'mock.skyCap': 'Sky',
    // translator (home + dictionary)
    'tr.title': 'Instant Translator',
    'tr.sub': 'Type any word in Qaraqalpaq, English or Russian — it detects the language and translates instantly, right in your browser.',
    'tr.detect': 'Detect language', 'tr.translation': 'Translation', 'tr.hint': 'Translation appears here',
    'tr.placeholder': 'Type in Qaraqalpaq, English or Russian…', 'a11y.clear': 'Clear',
    // a whole sentence was typed (v128): an honest note instead of a word salad
    'tr.sentence': 'Full sentences aren\u2019t translated yet.', 'tr.sentenceSub': 'Here are the words we found:',
    'tr.notFound': 'not found', 'tr.report': 'Missing a word? Tell us →',
    // word request (home + dictionary)
    'req.title': 'Missing a word? Spotted a mistake?', 'req.text': 'Tell us the word — we read every message and keep the dictionary growing.',
    'req.word': 'Word or phrase in any language', 'req.note': 'Correct spelling, meaning or context (optional)', 'req.send': 'Send it in',
    // dictionary
    'dict.title': 'Explore the Dictionary', 'dict.sub': 'Search across Karakalpak, English and Russian — instantly.',
    'dict.search': 'Search a word in any language...', 'dict.empty': 'No words found. Try a different search or category.',
    'a11y.scrollLeft': 'scroll left', 'a11y.scrollRight': 'scroll right',
    'cats.all': 'All Categories', 'cats.allPill': 'All',
    // word cards and flashcards
    'card.tapReveal': 'Tap to reveal', 'card.tapBack': 'Tap to go back', 'btn.markLearned': 'Mark as Learned', 'btn.learned': 'Learned',
    'flash.title': 'Flashcard Mode', 'flash.sub': 'Tap the card to flip. Swipe through and lock in new words.',
    'flash.shuffle': 'Shuffle', 'flash.flip': 'Flip Card', 'a11y.prev': 'previous', 'a11y.next': 'next',
    // quiz
    'quiz.title': 'Quiz Mode', 'quiz.sub': 'Pick the right translation. Four options, one correct answer.',
    'a11y.quizLang': 'Quiz answer language', 'quiz.ansEn': 'English', 'quiz.ansRu': 'Русский',
    'quiz.score': 'Score', 'quiz.streak': 'Streak', 'quiz.answered': 'Answered', 'quiz.start': 'Start Quiz',
    'quiz.whatMean': 'What does this mean?', 'quiz.next': 'Next Question',
    'quiz.correct': 'Correct!', 'quiz.wrong': 'Not quite — the answer is {answer}',
    // Sózle
    'game.how': "Guess the Karakalpak word in 6 tries. Green = right spot, yellow = wrong spot. New word every day — and you learn its meaning when you're done.",
    'sozle.hint': 'Hint', 'sozle.random': 'Random word', 'a11y.board': 'Game board', 'a11y.keyboard': 'Keyboard',
    'game.letters': "Letters á, ǵ, ı, ń, ó, ú are on the keyboard above — that's what makes it Qaraqalpaq",
    'game.kbd': "You can type on your own keyboard too, in any layout. For á ǵ ı ń ó ú type the letter, then <kbd>'</kbd> — <kbd>a</kbd><kbd>'</kbd> gives á.",
  };
  // Russian, built in portion by portion after Musa's "ок" (tone «ты», gender-neutral wording).
  // A key that is not here yet shows "[RU] " + the English text — a portion still to come.
  const STRINGS_RU = {
    'nav.home': 'Главная',
    'nav.dictionary': 'Словарь',
    'nav.flashcards': 'Карточки',
    'nav.quiz': 'Квиз',
    'a11y.logo': 'Логотип Qaraqalpaq Tili',
    'a11y.help': 'Как пользоваться сайтом',
    'a11y.menu': 'Меню',
    'a11y.toRu': 'Переключить на русский',
    'a11y.toEn': 'Переключить на английский',
    'footer.tagline': 'Помогаем каракалпакскому языку жить — слово за словом.',
    'footer.questions': 'Есть вопросы?',
    'footer.guide': 'Подсказки',
    'footer.guideTitle': 'Короткая экскурсия по странице',
    'hero.tag': 'Tili — твой путь в каракалпакский',
    'hero.title': 'Учи <span class="hero-accent">каракалпакский</span> по-новому.',
    'hero.sub': 'Мгновенный переводчик, словарь, карточки и квизы для нового поколения — быстро, ярко и по-настоящему весело.',
    'hero.try': 'Попробуй переводчик',
    'cta.exploreDict': 'Открой словарь',
    'stat.words': 'Слова',
    'stat.categories': 'Категории',
    'stat.languages': 'Языки',
    'home.exploreAll': 'Открой все 1 301 слово в словаре →',
    'home.sozle': '<strong>Новое — Sózle:</strong> игра в каракалпакские слова. Угадай слово дня за 6 попыток →',
    'proof.caption': 'Мы только запустились — будь среди <strong>первых</strong>, кто учит каракалпакский онлайн',
    'proof.words': 'Настоящие слова, проверенные носителем языка',
    'proof.waiting': 'Ждём твою оценку',
    'proof.tell': 'Расскажи, что думаешь —',
    'show.title': 'Посмотри в деле',
    'show.sub': 'Коротко: словарь, карточки и квиз.',
    'show.dictTitle': 'Словарь и переводчик',
    'show.dictSub': '1 301 слово — мгновенный перевод в обе стороны',
    'show.flashTitle': 'Карточки',
    'show.flashSub': 'Переворачивай и запоминай быстрее',
    'show.quizTitle': 'Квиз',
    'show.quizSub': 'Проверь себя за минуту',
    'phone.flashTitle': 'Запоминай слова с умными карточками',
    'phone.flashText': 'Листай настоящие каракалпакские слова и тренируй память — с переводом на английский и русский.',
    'phone.quizTitle': 'Проверь себя в квизе',
    'phone.quizText': 'Четыре варианта, один верный. Следи за серией и счётом — и расти от новичка до знатока.',
    'feat.title': 'Всё, чтобы выучить каракалпакский',
    'feat.sub': 'Простой набор — для быстрого прогресса.',
    'feat.translator': 'Мгновенный переводчик',
    'feat.translatorText': 'Сам узнаёт каракалпакский, английский и русский.',
    'feat.words': '1 301 слово',
    'feat.wordsText': 'Каракалпакский, английский и русский в одном месте.',
    'feat.flash': 'Умные карточки',
    'feat.flashText': 'Переворачивай карточки и запоминай быстрее.',
    'feat.quiz': 'Быстрый квиз',
    'feat.quizText': 'Проверь знания за пару минут.',
    'cta.title': 'Ну что, начнём?',
    'tr.title': 'Мгновенный переводчик',
    'tr.sub': 'Напиши любое слово на каракалпакском, английском или русском — язык определится сам, а перевод появится сразу, прямо в браузере.',
    'tr.detect': 'Язык: авто',
    'tr.translation': 'Перевод',
    'tr.hint': 'Здесь появится перевод',
    'tr.placeholder': 'Пиши на каракалпакском, английском или русском…',
    'a11y.clear': 'Очистить',
    'req.title': 'Нет нужного слова? Нашлась ошибка?',
    'req.text': 'Напиши слово — мы читаем каждое сообщение и пополняем словарь.',
    'req.word': 'Слово или фраза на любом языке',
    'req.note': 'Правильное написание, значение или пример (по желанию)',
    'req.send': 'Отправить',
    'mock.whatIs': 'Что значит <strong>Suw</strong>?',
    'quiz.correct': 'Верно!',
    'mock.search': 'Найди слово…',
    'mock.all': 'Все',
    'mock.animals': 'Животные',
    'mock.food': 'Еда',
    'card.tapReveal': 'Нажми, чтобы открыть',
    'quiz.whatMean': 'Что это значит?',
    'mock.hello': 'Привет',
    'mock.water': 'Вода',
    'mock.fire': 'Огонь',
    'mock.earth': 'Земля',
    'mock.air': 'Воздух',
    'mock.sky': 'небо',
    'mock.flower': 'цветок',
    'mock.sun': 'Солнце',
    'mock.moon': 'Луна',
    'mock.star': 'Звезда',
    'mock.skyCap': 'Небо',
    'mock.heart': 'Heart',
  };
  const stub = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, '[RU] ' + v]));   // until all portions are in
  const STRINGS = { en: STRINGS_EN, ru: Object.assign(stub(STRINGS_EN), STRINGS_RU) };
  // display names of the 48 categories, by their English key; a missing one shows the key
  const CATEGORY_NAMES = { en: {}, ru: null };   // ru: null = phase 1, "[RU] " + the key
  // THE SWITCH IS HIDDEN FROM VISITORS until all four portions of Russian are in (Musa,
  // 2026-10-09: "[RU] Home" on the live site looks like a broken site). Until then the site is
  // English for everybody — also for whoever pressed RU on v124 and has "ru" stored.
  // To see the switch anyway (Musa, Claude): open any page once with ?i18n=1 — this browser
  // remembers it; ?i18n=0 forgets. WHEN THE TRANSLATIONS ARE DONE: I18N_READY = true.
  const I18N_READY = false;
  let I18N_ON = I18N_READY;
  try {
    const q = new URLSearchParams(location.search).get('i18n');
    if (q === '1') localStorage.setItem('qaraqalpaq_i18n_preview', '1');
    if (q === '0') localStorage.removeItem('qaraqalpaq_i18n_preview');
    if (localStorage.getItem('qaraqalpaq_i18n_preview') === '1') I18N_ON = true;
  } catch (e) {}
  document.documentElement.classList.toggle('i18n-on', I18N_ON);   // shows the switch (CSS)
  let LANG = 'en';
  if (I18N_ON) try { const v = localStorage.getItem(LANG_KEY); if (STRINGS[v]) LANG = v; } catch (e) {}

  function t(key, vars) {
    let s = STRINGS[LANG][key] ?? STRINGS.en[key] ?? key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return s;
  }
  function catLabel(cat) {
    const names = CATEGORY_NAMES[LANG];
    if (names === null) return '[RU] ' + cat;
    return (names && names[cat]) || cat;
  }
  // write the strings into the static markup (all of it, or one part of the page)
  function applyStrings(root = document) {
    $$('[data-i18n]', root).forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-html]', root).forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
    $$('[data-i18n-cat]', root).forEach(el => { el.textContent = catLabel(el.dataset.i18nCat); });
    $$('[data-i18n-attr]', root).forEach(el => {
      el.dataset.i18nAttr.split(';').forEach(pair => {
        const [attr, key] = pair.split(':').map(s => s.trim());
        if (attr && key) el.setAttribute(attr, t(key));
      });
    });
    document.documentElement.lang = LANG;   // also moves the light of the EN / RU switch (CSS)
    const sw = $('#uiLang');
    if (sw) sw.setAttribute('aria-label', t(LANG === 'en' ? 'a11y.toRu' : 'a11y.toEn'));
  }
  // the parts of a page that app.js draws itself register here and are redrawn on a switch
  const LANG_REDRAW = [];
  function setLang(lang) {
    if (!I18N_ON || !STRINGS[lang] || lang === LANG) return;
    LANG = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    applyStrings();
    LANG_REDRAW.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  }
  // the EN / RU switch: a click anywhere on it (Enter / Space too — it is a button) flips the
  // language; ← and → pick a side
  document.addEventListener('click', e => {
    if (e.target.closest && e.target.closest('#uiLang')) setLang(LANG === 'en' ? 'ru' : 'en');
  });
  document.addEventListener('keydown', e => {
    if (!e.target.closest || !e.target.closest('#uiLang')) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); setLang('en'); }
    if (e.key === 'ArrowRight') { e.preventDefault(); setLang('ru'); }
  });
  // first thing on every page, before words.json arrives, so a Russian page does not
  // stay English for a moment (for English it rewrites the same text and lights "EN")
  applyStrings();

  // ===== SMALL MOTIONS (Musa, 2026-10-09) =====
  // Each one tells something: a block arrived, a number went up, a guess was too short.
  // Only transform and opacity, 150–400 ms, nothing waits for them, and none at all under
  // prefers-reduced-motion. The CSS is block "MOTION" in styles.css (all inside one media
  // query); MOTION_OK only spares app.js the work of adding classes nobody would see.
  const MOTION_OK = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  // start a one-shot animation class again, even if it is still on the element
  function replay(el, cls) {
    if (!el || !MOTION_OK) return;
    el.classList.remove(cls);
    void el.offsetWidth; // a style flush in between, or the browser sees no change
    el.classList.add(cls);
  }
  // one-shot classes leave again when their animation ends (keyed by keyframes name, so a
  // button's sheen ending never cuts a pop short) — keep in step with the mo- names in the CSS
  const ONE_SHOT = { 'mo-bump': 'bump', 'mo-pop': 'pop', 'mo-badge': 'pop', 'mo-q-in': 'q-in', 'mo-opt-in': 'opt-in', 'mo-card-in': 'card-in', 'mo-in-next': 'in-next', 'mo-in-prev': 'in-prev', 'mo-shuffle': 'shuffled', 'mo-typed': 'just-typed', 'mo-shake': 'shake', 'mo-msg-in': 'msg-in', 'mo-panel-in': 'panel-in', 'mo-tr-new': 'tr-new' };
  document.addEventListener('animationend', e => {
    const cls = ONE_SHOT[e.animationName];
    if (cls && !e.pseudoElement && e.target.classList) e.target.classList.remove(cls);
  });
  // iOS Safari shows :active (the press on pills, quiz answers, Sózle keys) only when the
  // page listens to touchstart
  document.addEventListener('touchstart', () => {}, { passive: true });

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
    const nums = [wordsLearnedToday(), totalWordsLearned(), currentStreak(), PROGRESS.quizBestScore || 0];
    // a number that went up since the last drawing gets a short bump (never on page load)
    const prev = renderProgressWidget.last;
    renderProgressWidget.last = nums;
    const num = i => `<span class="pw-num${MOTION_OK && prev && nums[i] > prev[i] ? ' bump' : ''}">${nums[i]}</span>`;
    el.innerHTML = `
      <div class="progress-widget-grid">
        <div class="pw-stat"><span class="pw-icon pw-icon-check" aria-hidden="true">${TILE_ICONS.check}</span>${num(0)}<span class="pw-label">Learned Today</span></div>
        <div class="pw-stat"><span class="pw-icon pw-icon-brain" aria-hidden="true">${TILE_ICONS.brain}</span>${num(1)}<span class="pw-label">Total Learned</span></div>
        <div class="pw-stat"><span class="pw-icon pw-icon-flame" aria-hidden="true">${TILE_ICONS.flame}</span>${num(2)}<span class="pw-label">Day Streak</span></div>
        <div class="pw-stat"><span class="pw-icon pw-icon-trophy" aria-hidden="true">${TILE_ICONS.trophy}</span>${num(3)}<span class="pw-label">Quiz Best</span></div>
      </div>`;
  }

  function renderProgressBar() {
    const el = $('#progressBarWrap');
    if (!el) return;
    const total = WORDS.length;
    const learned = totalWordsLearned();
    const frac = total ? Math.min(1, learned / total) : 0;
    // built once; after that only the label and the fill change. The fill is scaled
    // (transform), so a newly learned word slides it forward instead of redrawing the bar
    if (!el.querySelector('.progress-bar-fill')) {
      el.innerHTML = `<div class="progress-bar-label"></div><div class="progress-bar-track"><div class="progress-bar-fill"></div></div>`;
    }
    el.querySelector('.progress-bar-label').textContent = `${learned.toLocaleString()} / ${total.toLocaleString()} words learned`;
    el.querySelector('.progress-bar-fill').style.transform = `scaleX(${frac})`;
  }

  // ===== CATEGORY ICONS & ACCENT COLORS =====
  // ===== ICONS — one set for the whole site =====
  // Tabler Icons 3.49 (https://tabler.io/icons), outline style, MIT licence. The paths are
  // copied from that set unchanged; nothing is loaded from the network (the site has no
  // build step and must work without outside requests).
  // Every icon is an inline <svg> drawn in currentColor, so it takes the colour of the
  // text around it — or the accent colour of its category on a word card.
  // Sizes and the line thickness live in the stylesheet (block "ICONS").
  // The icons that sit in the html files are the same svgs pasted into the markup.
  // EMOJI ARE KEPT IN ONE PLACE ONLY: the Sózle result that is copied as text
  // (sozleShareText) — a chat message cannot carry an svg.
  const ICON_PATHS = {
    'sparkles': '<path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2m-7 12a6 6 0 0 1 6 -6a6 6 0 0 1 -6 -6a6 6 0 0 1 -6 6a6 6 0 0 1 6 6"/>',
    'flame': '<path d="M12 10.941c2.333 -3.308 .167 -7.823 -1 -8.941c0 3.395 -2.235 5.299 -3.667 6.706c-1.43 1.408 -2.333 3.294 -2.333 5.588c0 3.704 3.134 6.706 7 6.706c3.866 0 7 -3.002 7 -6.706c0 -1.712 -1.232 -4.403 -2.333 -5.588c-2.084 3.353 -3.257 3.353 -4.667 2.235"/>',
    'bulb': '<path d="M3 12h1m8 -9v1m8 8h1m-15.4 -6.4l.7 .7m12.1 -.7l-.7 .7"/><path d="M9 16a5 5 0 1 1 6 0a3.5 3.5 0 0 0 -1 3a2 2 0 0 1 -4 0a3.5 3.5 0 0 0 -1 -3"/><path d="M9.7 17l4.6 0"/>',
    'heart': '<path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572"/>',
    'north-star': '<path d="M3 12h18"/><path d="M12 21v-18"/><path d="M7.5 7.5l9 9"/><path d="M7.5 16.5l9 -9"/>',
    'arrows-exchange': '<path d="M7 10h14l-4 -4"/><path d="M17 14h-14l4 4"/>',
    'search': '<path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"/><path d="M21 21l-6 -6"/>',
    'dice-5': '<path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14"/><path d="M8 8.5a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0" fill="currentColor"/><path d="M15 8.5a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0" fill="currentColor"/><path d="M15 15.5a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0" fill="currentColor"/><path d="M8 15.5a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0" fill="currentColor"/><path d="M11.5 12a.5 .5 0 1 0 1 0a.5 .5 0 1 0 -1 0" fill="currentColor"/>',
    'keyboard': '<path d="M2 8a2 2 0 0 1 2 -2h16a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2l0 -8"/><path d="M6 10l0 .01"/><path d="M10 10l0 .01"/><path d="M14 10l0 .01"/><path d="M18 10l0 .01"/><path d="M6 14l0 .01"/><path d="M18 14l0 .01"/><path d="M10 14l4 .01"/>',
    'confetti': '<path d="M4 5h2"/><path d="M5 4v2"/><path d="M11.5 4l-.5 2"/><path d="M18 5h2"/><path d="M19 4v2"/><path d="M15 9l-1 1"/><path d="M18 13l2 -.5"/><path d="M18 19h2"/><path d="M19 18v2"/><path d="M14 16.518l-6.518 -6.518l-4.39 9.58a1 1 0 0 0 1.329 1.329l9.579 -4.39"/>',
    'thumb-up': '<path d="M7 11v8a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1v-7a1 1 0 0 1 1 -1h3a4 4 0 0 0 4 -4v-1a2 2 0 0 1 4 0v5h3a2 2 0 0 1 2 2l-1 5a2 3 0 0 1 -2 2h-7a3 3 0 0 1 -3 -3"/>',
    'mood-smile': '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M9 10l.01 0"/><path d="M15 10l.01 0"/><path d="M9.5 15a3.5 3.5 0 0 0 5 0"/>',
    'mood-crazy-happy': '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M7 8.5l3 3"/><path d="M7 11.5l3 -3"/><path d="M14 8.5l3 3"/><path d="M14 11.5l3 -3"/><path d="M9.5 15a3.5 3.5 0 0 0 5 0"/>',
    'mood-nervous': '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M8 16l2 -2l2 2l2 -2l2 2"/>',
    'school': '<path d="M22 9l-10 -4l-10 4l10 4l10 -4v6"/><path d="M6 10.6v5.4a6 3 0 0 0 12 0v-5.4"/>',
    'arrows-shuffle': '<path d="M18 4l3 3l-3 3"/><path d="M18 20l3 -3l-3 -3"/><path d="M3 7h3a5 5 0 0 1 5 5a5 5 0 0 0 5 5h5"/><path d="M21 7h-5a4.978 4.978 0 0 0 -3 1m-4 8a4.984 4.984 0 0 1 -3 1h-3"/>',
    'backspace': '<path d="M20 6a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-11l-5 -5a1.5 1.5 0 0 1 0 -2l5 -5l11 0"/><path d="M12 10l4 4m0 -4l-4 4"/>',
    'x': '<path d="M18 6l-12 12"/><path d="M6 6l12 12"/>',
    'check': '<path d="M5 12l5 5l10 -10"/>',
    'star': '<path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873l-6.158 -3.245"/>',
    'rotate-clockwise': '<path d="M4.05 11a8 8 0 1 1 .5 4m-.5 5v-5h5"/>',
    'rotate': '<path d="M19.95 11a8 8 0 1 0 -.5 4m.5 5v-5h-5"/>',
  };
  const ICON_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"';
  function icon(name, cls) {
    return `<svg class="ico${cls ? ' ' + cls : ''}" ${ICON_ATTRS}>${ICON_PATHS[name] || ''}</svg>`;
  }
  // ===== BIG ICONS — Phosphor Icons 2.1 (MIT, phosphoricons.com), weight "duotone" =====
  // Where the icon IS the picture of a place — the progress tiles, the home counters and
  // features, Word of the Day, the category icon on a card or a translator match — it is a
  // coloured shape: Phosphor duotone — the outline over a 35% tint of the same shape. Grid 256, fill = currentColor.
  // Small icons inside buttons and text stay Tabler outline (ICON_PATHS above).
  const PH = {
    'bank': '<path d="M232,96H24L128,32Z" class="ph-tint"/><path d="M24,104H48v64H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16H208V104h24a8,8,0,0,0,4.19-14.81l-104-64a8,8,0,0,0-8.38,0l-104,64A8,8,0,0,0,24,104Zm40,0H96v64H64Zm80,0v64H112V104Zm48,64H160V104h32ZM128,41.39,203.74,88H52.26ZM248,208a8,8,0,0,1-8,8H16a8,8,0,0,1,0-16H240A8,8,0,0,1,248,208Z"/>',
    'book': '<path d="M208,32V192H72a24,24,0,0,0-24,24V56A24,24,0,0,1,72,32Z" class="ph-tint"/><path d="M208,24H72A32,32,0,0,0,40,56V224a8,8,0,0,0,8,8H192a8,8,0,0,0,0-16H56a16,16,0,0,1,16-16H208a8,8,0,0,0,8-8V32A8,8,0,0,0,208,24Zm-8,160H72a31.82,31.82,0,0,0-16,4.29V56A16,16,0,0,1,72,40H200Z"/>',
    'books': '<path d="M48,72h64V184H48ZM190.64,38.39a8,8,0,0,0-9.5-6.21l-46.81,10a8.07,8.07,0,0,0-6.15,9.57L139.79,107l62.46-13.42Z" class="ph-tint"/><path d="M231.65,194.55,198.46,36.75a16,16,0,0,0-19-12.39L132.65,34.42a16.08,16.08,0,0,0-12.3,19l33.19,157.8A16,16,0,0,0,169.16,224a16.25,16.25,0,0,0,3.38-.36l46.81-10.06A16.09,16.09,0,0,0,231.65,194.55ZM136,50.15c0-.06,0-.09,0-.09l46.8-10,3.33,15.87L139.33,66Zm6.62,31.47,46.82-10.05,3.34,15.9L146,97.53Zm6.64,31.57,46.82-10.06,13.3,63.24-46.82,10.06ZM216,197.94l-46.8,10-3.33-15.87L212.67,182,216,197.85C216,197.91,216,197.94,216,197.94ZM104,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V48A16,16,0,0,0,104,32ZM56,48h48V64H56Zm0,32h48v96H56Zm48,128H56V192h48v16Z"/>',
    'buildings': '<path d="M136,32V216H40V85.35a8,8,0,0,1,3.56-6.66l80-53.33A8,8,0,0,1,136,32Z" class="ph-tint"/><path d="M240,208H224V96a16,16,0,0,0-16-16H144V32a16,16,0,0,0-24.88-13.32L39.12,72A16,16,0,0,0,32,85.34V208H16a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM208,96V208H144V96ZM48,85.34,128,32V208H48ZM112,112v16a8,8,0,0,1-16,0V112a8,8,0,1,1,16,0Zm-32,0v16a8,8,0,0,1-16,0V112a8,8,0,1,1,16,0Zm0,56v16a8,8,0,0,1-16,0V168a8,8,0,0,1,16,0Zm32,0v16a8,8,0,0,1-16,0V168a8,8,0,0,1,16,0Z"/>',
    'chat-circle-dots': '<path d="M224,128A96,96,0,0,1,79.93,211.11h0L42.54,223.58a8,8,0,0,1-10.12-10.12l12.47-37.39h0A96,96,0,1,1,224,128Z" class="ph-tint"/><path d="M128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-4-1.08,7.85,7.85,0,0,0-2.53.42L40,216,52.47,178.6a8,8,0,0,0-.66-6.54A88,88,0,1,1,128,216Zm12-88a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm-44,0a12,12,0,1,1-12-12A12,12,0,0,1,96,128Zm88,0a12,12,0,1,1-12-12A12,12,0,0,1,184,128Z"/>',
    'clock': '<path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" class="ph-tint"/><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z"/>',
    'cloud-sun': '<path d="M139.84,84.41v0a68.22,68.22,0,0,0-41.65,46v-.11a44.08,44.08,0,0,0-38.54,5h0a48,48,0,1,1,80.19-50.94Z" class="ph-tint"/><path d="M164,72a76.2,76.2,0,0,0-20.26,2.73,55.63,55.63,0,0,0-9.41-11.54l9.51-13.57a8,8,0,1,0-13.11-9.18L121.22,54A55.9,55.9,0,0,0,96,48c-.58,0-1.16,0-1.74,0L91.37,31.71a8,8,0,1,0-15.75,2.77L78.5,50.82A56.1,56.1,0,0,0,55.23,65.67L41.61,56.14a8,8,0,1,0-9.17,13.11L46,78.77A55.55,55.55,0,0,0,40,104c0,.57,0,1.15,0,1.72L23.71,108.6a8,8,0,0,0,1.38,15.88,8.24,8.24,0,0,0,1.39-.12l16.32-2.88a55.74,55.74,0,0,0,5.86,12.42A52,52,0,0,0,84,224h80a76,76,0,0,0,0-152ZM56,104a40,40,0,0,1,72.54-23.24,76.26,76.26,0,0,0-35.62,40,52.14,52.14,0,0,0-31,4.17A40,40,0,0,1,56,104ZM164,208H84a36,36,0,1,1,4.78-71.69c-.37,2.37-.63,4.79-.77,7.23a8,8,0,0,0,16,.92,58.91,58.91,0,0,1,1.88-11.81c0-.16.09-.32.12-.48A60.06,60.06,0,1,1,164,208Z"/>',
    'folders': '<path d="M232,80v88.89a7.11,7.11,0,0,1-7.11,7.11H200V112a8,8,0,0,0-8-8H120L90.13,81.6a8,8,0,0,0-4.8-1.6H64V56a8,8,0,0,1,8-8h45.33a8,8,0,0,1,4.8,1.6L152,72h72A8,8,0,0,1,232,80Z" class="ph-tint"/><path d="M224,64H154.67L126.93,43.2a16.12,16.12,0,0,0-9.6-3.2H72A16,16,0,0,0,56,56V72H40A16,16,0,0,0,24,88V200a16,16,0,0,0,16,16H192.89A15.13,15.13,0,0,0,208,200.89V184h16.89A15.13,15.13,0,0,0,240,168.89V80A16,16,0,0,0,224,64ZM192,200H40V88H85.33l29.87,22.4A8,8,0,0,0,120,112h72Zm32-32H208V112a16,16,0,0,0-16-16H122.67L94.93,75.2a16.12,16.12,0,0,0-9.6-3.2H72V56h45.33L147.2,78.4A8,8,0,0,0,152,80h72Z"/>',
    'globe-hemisphere-west': '<path d="M213.09,172.48a96,96,0,0,1-80.41,51.41l3.17-16.44a8,8,0,0,0-2-6.95l-19.74-20.33a8,8,0,0,1-1.44-8.69l13.7-30.74a8,8,0,0,1,8.38-4.67l22.82,3.08a8.11,8.11,0,0,1,3.12,1.11ZM116.71,95,129,88.24a7.46,7.46,0,0,0,1.5-1.07l26.91-24.33A8,8,0,0,0,159,53l-10.5-18.81A96.62,96.62,0,0,0,128,32,95.61,95.61,0,0,0,67.78,53.23L56,81.08A8,8,0,0,0,55.88,87l11.5,30.67a8,8,0,0,0,5.81,5l2.69.58L89.2,100a8,8,0,0,1,6.94-4h16.71A7.9,7.9,0,0,0,116.71,95Z" class="ph-tint"/><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.62,87.62,0,0,1-6.4,32.94l-44.7-27.49a15.92,15.92,0,0,0-6.24-2.23l-22.82-3.08a16.11,16.11,0,0,0-16,7.86h-8.72l-3.8-7.86a15.91,15.91,0,0,0-11-8.67l-8-1.73L96.14,104h16.71a16.06,16.06,0,0,0,7.73-2l12.25-6.76a16.62,16.62,0,0,0,3-2.14l26.91-24.34A15.93,15.93,0,0,0,166,49.1l-.36-.65A88.11,88.11,0,0,1,216,128ZM143.31,41.34,152,56.9,125.09,81.24,112.85,88H96.14a16,16,0,0,0-13.88,8l-8.73,15.23L63.38,84.19,74.32,58.32a87.87,87.87,0,0,1,69-17ZM40,128a87.53,87.53,0,0,1,8.54-37.8l11.34,30.27a16,16,0,0,0,11.62,10l21.43,4.61L96.74,143a16.09,16.09,0,0,0,14.4,9h1.48l-7.23,16.23a16,16,0,0,0,2.86,17.37l.14.14L128,205.94l-1.94,10A88.11,88.11,0,0,1,40,128Zm102.58,86.78,1.13-5.81a16.09,16.09,0,0,0-4-13.9,1.85,1.85,0,0,1-.14-.14L120,174.74,133.7,144l22.82,3.08,45.72,28.12A88.18,88.18,0,0,1,142.58,214.78Z"/>',
    'house': '<path d="M216,120v96H152V152H104v64H40V120a8,8,0,0,1,2.34-5.66l80-80a8,8,0,0,1,11.32,0l80,80A8,8,0,0,1,216,120Z" class="ph-tint"/><path d="M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V160h32v56a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z"/>',
    'laptop': '<path d="M216,72V176H40V72A16,16,0,0,1,56,56H200A16,16,0,0,1,216,72Z" class="ph-tint"/><path d="M232,168h-8V72a24,24,0,0,0-24-24H56A24,24,0,0,0,32,72v96H24a8,8,0,0,0-8,8v16a24,24,0,0,0,24,24H216a24,24,0,0,0,24-24V176A8,8,0,0,0,232,168ZM48,72a8,8,0,0,1,8-8H200a8,8,0,0,1,8,8v96H48ZM224,192a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8v-8H224ZM152,88a8,8,0,0,1-8,8H112a8,8,0,0,1,0-16h32A8,8,0,0,1,152,88Z"/>',
    'lightbulb': '<path d="M208,104a79.86,79.86,0,0,1-30.59,62.92A24.29,24.29,0,0,0,168,186v6a8,8,0,0,1-8,8H96a8,8,0,0,1-8-8v-6a24.11,24.11,0,0,0-9.3-19A79.87,79.87,0,0,1,48,104.45C47.76,61.09,82.72,25,126.07,24A80,80,0,0,1,208,104Z" class="ph-tint"/><path d="M176,232a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,232Zm40-128a87.55,87.55,0,0,1-33.64,69.21A16.24,16.24,0,0,0,176,186v6a16,16,0,0,1-16,16H96a16,16,0,0,1-16-16v-6a16,16,0,0,0-6.23-12.66A87.59,87.59,0,0,1,40,104.49C39.74,56.83,78.26,17.14,125.88,16A88,88,0,0,1,216,104Zm-16,0a72,72,0,0,0-73.74-72c-39,.92-70.47,33.39-70.26,72.39a71.65,71.65,0,0,0,27.64,56.3A32,32,0,0,1,96,186v6h64v-6a32.15,32.15,0,0,1,12.47-25.35A71.65,71.65,0,0,0,200,104Zm-16.11-9.34a57.6,57.6,0,0,0-46.56-46.55,8,8,0,0,0-2.66,15.78c16.57,2.79,30.63,16.85,33.44,33.45A8,8,0,0,0,176,104a9,9,0,0,0,1.35-.11A8,8,0,0,0,183.89,94.66Z"/>',
    'list-numbers': '<path d="M216,64V192H104V64Z" class="ph-tint"/><path d="M224,128a8,8,0,0,1-8,8H104a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM104,72H216a8,8,0,0,0,0-16H104a8,8,0,0,0,0,16ZM216,184H104a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16ZM43.58,55.16,48,52.94V104a8,8,0,0,0,16,0V40a8,8,0,0,0-11.58-7.16l-16,8a8,8,0,0,0,7.16,14.32ZM79.77,156.72a23.73,23.73,0,0,0-9.6-15.95,24.86,24.86,0,0,0-34.11,4.7,23.63,23.63,0,0,0-3.57,6.46,8,8,0,1,0,15,5.47,7.84,7.84,0,0,1,1.18-2.13,8.76,8.76,0,0,1,12-1.59A7.91,7.91,0,0,1,63.93,159a7.64,7.64,0,0,1-1.57,5.78,1,1,0,0,0-.08.11L33.59,203.21A8,8,0,0,0,40,216H72a8,8,0,0,0,0-16H56l19.08-25.53A23.47,23.47,0,0,0,79.77,156.72Z"/>',
    'mask-happy': '<path d="M216,48v55.77C216,174.6,176.6,232,128,232S40,174.6,40,103.79V48a8,8,0,0,1,10.89-7.47C66,46.41,95.11,55.71,128,55.71s62-9.3,77.11-15.16A8,8,0,0,1,216,48Z" class="ph-tint"/><path d="M217,34.8a15.94,15.94,0,0,0-14.82-1.71C188.15,38.55,159.82,47.71,128,47.71S67.84,38.55,53.79,33.09A16,16,0,0,0,32,48v55.77c0,35.84,9.65,69.65,27.18,95.18,18.16,26.46,42.6,41,68.82,41s50.66-14.57,68.82-41C214.35,173.44,224,139.63,224,103.79V48A16,16,0,0,0,217,34.8Zm-9,69c0,32.64-8.66,63.23-24.37,86.13C168.54,211.9,148.79,224,128,224s-40.54-12.1-55.63-34.08C56.66,167,48,136.43,48,103.79V48c15.11,5.87,45.58,15.71,80,15.71S192.9,53.87,208,48v55.81Zm-18,18.87A8,8,0,1,1,178,133.33c-2.68-3-8.85-5.33-14-5.33s-11.36,2.34-14,5.33A8,8,0,1,1,138,122.66c5.71-6.38,16.14-10.66,26-10.66S184.25,116.28,190,122.66ZM92,128c-5.19,0-11.36,2.34-14,5.33A8,8,0,1,1,66,122.66C71.75,116.28,82.18,112,92,112s20.25,4.28,26,10.66A8,8,0,1,1,106,133.33C103.36,130.34,97.19,128,92,128Zm76.45,45.19a52.9,52.9,0,0,1-80.9,0A8,8,0,1,1,99.72,162.8a36.89,36.89,0,0,0,56.56,0,8,8,0,0,1,12.17,10.39Z"/>',
    'orange': '<path d="M208,152a80,80,0,1,1-80-80A80,80,0,0,1,208,152Z" class="ph-tint"/><path d="M165.87,72.58A64.06,64.06,0,0,0,200,16a8,8,0,0,0-8-8h-8a64,64,0,0,0-56,33.06A64,64,0,0,0,72,8H64a8,8,0,0,0,0,16h8a48.08,48.08,0,0,1,47.4,40.42,88,88,0,1,0,46.47,8.16ZM183.33,24a48.09,48.09,0,0,1-46.66,40A48.09,48.09,0,0,1,183.33,24ZM128,224a72,72,0,1,1,72-72A72.08,72.08,0,0,1,128,224Zm55.89-62.68a57.5,57.5,0,0,1-46.57,46.57A8.52,8.52,0,0,1,136,208a8,8,0,0,1-1.31-15.89,41.29,41.29,0,0,0,33.43-33.43,8,8,0,0,1,15.78,2.64Z"/>',
    'palette': '<path d="M224,127.17a96.48,96.48,0,0,1-2.39,22.18A24,24,0,0,1,198.21,168H152a24,24,0,0,0-24,24,24,24,0,0,1-32,22.61C58.73,201.44,32,169.81,32,128a96,96,0,0,1,95-96C179.84,31.47,223.55,74.35,224,127.17Z" class="ph-tint"/><path d="M200.77,53.89A103.27,103.27,0,0,0,128,24h-1.07A104,104,0,0,0,24,128c0,43,26.58,79.06,69.36,94.17A32,32,0,0,0,136,192a16,16,0,0,1,16-16h46.21a31.81,31.81,0,0,0,31.2-24.88,104.43,104.43,0,0,0,2.59-24A103.28,103.28,0,0,0,200.77,53.89Zm13,93.71A15.89,15.89,0,0,1,198.21,160H152a32,32,0,0,0-32,32,16,16,0,0,1-21.31,15.07C62.49,194.3,40,164,40,128a88,88,0,0,1,87.09-88h.9a88.35,88.35,0,0,1,88,87.25A88.86,88.86,0,0,1,213.81,147.6ZM140,76a12,12,0,1,1-12-12A12,12,0,0,1,140,76ZM96,100A12,12,0,1,1,84,88,12,12,0,0,1,96,100Zm0,56a12,12,0,1,1-12-12A12,12,0,0,1,96,156Zm88-56a12,12,0,1,1-12-12A12,12,0,0,1,184,100Z"/>',
    'paw-print': '<path d="M232,108a20,20,0,1,1-20-20A20,20,0,0,1,232,108ZM64,108a20,20,0,1,0-20,20A20,20,0,0,0,64,108ZM92,80A20,20,0,1,0,72,60,20,20,0,0,0,92,80Zm72,0a20,20,0,1,0-20-20A20,20,0,0,0,164,80Zm19.24,75.85A43.46,43.46,0,0,1,162.57,130a36,36,0,0,0-69.14,0,43.49,43.49,0,0,1-20.67,25.9,32,32,0,0,0,27.73,57.62,72.49,72.49,0,0,1,55,0,32,32,0,0,0,27.73-57.62Z" class="ph-tint"/><path d="M212,80a28,28,0,1,0,28,28A28,28,0,0,0,212,80Zm0,40a12,12,0,1,1,12-12A12,12,0,0,1,212,120ZM72,108a28,28,0,1,0-28,28A28,28,0,0,0,72,108ZM44,120a12,12,0,1,1,12-12A12,12,0,0,1,44,120ZM92,88A28,28,0,1,0,64,60,28,28,0,0,0,92,88Zm0-40A12,12,0,1,1,80,60,12,12,0,0,1,92,48Zm72,40a28,28,0,1,0-28-28A28,28,0,0,0,164,88Zm0-40a12,12,0,1,1-12,12A12,12,0,0,1,164,48Zm23.12,100.86a35.3,35.3,0,0,1-16.87-21.14,44,44,0,0,0-84.5,0A35.25,35.25,0,0,1,69,148.82,40,40,0,0,0,88,224a39.48,39.48,0,0,0,15.52-3.13,64.09,64.09,0,0,1,48.87,0,40,40,0,0,0,34.73-72ZM168,208a24,24,0,0,1-9.45-1.93,80.14,80.14,0,0,0-61.19,0,24,24,0,0,1-20.71-43.26,51.22,51.22,0,0,0,24.46-30.67,28,28,0,0,1,53.78,0,51.27,51.27,0,0,0,24.53,30.71A24,24,0,0,1,168,208Z"/>',
    'person-simple-run': '<path d="M176,56a24,24,0,1,1-24-24A24,24,0,0,1,176,56Z" class="ph-tint"/><path d="M152,88a32,32,0,1,0-32-32A32,32,0,0,0,152,88Zm0-48a16,16,0,1,1-16,16A16,16,0,0,1,152,40Zm67.31,100.68c-.61.28-7.49,3.28-19.67,3.28-13.85,0-34.55-3.88-60.69-20a169.31,169.31,0,0,1-15.41,32.34,104.29,104.29,0,0,1,31.31,15.81C173.92,186.65,184,207.35,184,232a8,8,0,0,1-16,0c0-41.7-34.69-56.71-54.14-61.85-.55.7-1.12,1.41-1.69,2.1-19.64,23.8-44.25,36.18-71.63,36.18A92.29,92.29,0,0,1,31.2,208,8,8,0,0,1,32.8,192c25.92,2.59,48.47-7.49,67-30,12.49-15.14,21-33.61,25.25-47C86.13,92.34,61.27,111.63,61,111.84A8,8,0,1,1,51,99.36c1.5-1.2,37.22-29,89.51,6.57,45.47,30.91,71.93,20.31,72.18,20.19a8,8,0,1,1,6.63,14.56Z"/>',
    'rocket': '<path d="M94.81,192,65.36,214.24a8,8,0,0,1-12.81-4.51L40.19,154.1a8,8,0,0,1,1.66-6.86l30.31-36.33C71,134.25,76.7,161.43,94.81,192Zm119.34-44.76-30.31-36.33c1.21,23.34-4.54,50.52-22.65,81.09l29.45,22.24a8,8,0,0,0,12.81-4.51l12.36-55.63A8,8,0,0,0,214.15,147.24Z" class="ph-tint"/><path d="M152,224a8,8,0,0,1-8,8H112a8,8,0,0,1,0-16h32A8,8,0,0,1,152,224ZM128,112a12,12,0,1,0-12-12A12,12,0,0,0,128,112Zm95.62,43.83-12.36,55.63a16,16,0,0,1-25.51,9.11L158.51,200h-61L70.25,220.57a16,16,0,0,1-25.51-9.11L32.38,155.83a16.09,16.09,0,0,1,3.32-13.71l28.56-34.26a123.07,123.07,0,0,1,8.57-36.67c12.9-32.34,36-52.63,45.37-59.85a16,16,0,0,1,19.6,0c9.34,7.22,32.47,27.51,45.37,59.85a123.07,123.07,0,0,1,8.57,36.67l28.56,34.26A16.09,16.09,0,0,1,223.62,155.83ZM99.43,184h57.14c21.12-37.54,25.07-73.48,11.74-106.88C156.55,47.64,134.49,29,128,24c-6.51,5-28.57,23.64-40.33,53.12C74.36,110.52,78.31,146.46,99.43,184Zm-15,5.85Q68.28,160.5,64.83,132.16L48,152.36,60.36,208l.18-.13ZM208,152.36l-16.83-20.2q-3.42,28.28-19.56,57.69l23.85,18,.18.13Z"/>',
    'sparkle': '<path d="M194.82,151.43l-55.09,20.3-20.3,55.09a7.92,7.92,0,0,1-14.86,0l-20.3-55.09-55.09-20.3a7.92,7.92,0,0,1,0-14.86l55.09-20.3,20.3-55.09a7.92,7.92,0,0,1,14.86,0l20.3,55.09,55.09,20.3A7.92,7.92,0,0,1,194.82,151.43Z" class="ph-tint"/><path d="M197.58,129.06,146,110l-19-51.62a15.92,15.92,0,0,0-29.88,0L78,110l-51.62,19a15.92,15.92,0,0,0,0,29.88L78,178l19,51.62a15.92,15.92,0,0,0,29.88,0L146,178l51.62-19a15.92,15.92,0,0,0,0-29.88ZM137,164.22a8,8,0,0,0-4.74,4.74L112,223.85,91.78,169A8,8,0,0,0,87,164.22L32.15,144,87,123.78A8,8,0,0,0,91.78,119L112,64.15,132.22,119a8,8,0,0,0,4.74,4.74L191.85,144ZM144,40a8,8,0,0,1,8-8h16V16a8,8,0,0,1,16,0V32h16a8,8,0,0,1,0,16H184V64a8,8,0,0,1-16,0V48H152A8,8,0,0,1,144,40ZM248,88a8,8,0,0,1-8,8h-8v8a8,8,0,0,1-16,0V96h-8a8,8,0,0,1,0-16h8V72a8,8,0,0,1,16,0v8h8A8,8,0,0,1,248,88Z"/>',
    'stethoscope': '<path d="M240,160a32,32,0,1,1-32-32A32,32,0,0,1,240,160Z" class="ph-tint"/><path d="M220,160a12,12,0,1,1-12-12A12,12,0,0,1,220,160Zm-4.55,39.29A48.08,48.08,0,0,1,168,240H144a48.05,48.05,0,0,1-48-48V151.49A64,64,0,0,1,40,88V40a8,8,0,0,1,8-8H72a8,8,0,0,1,0,16H56V88a48,48,0,0,0,48.64,48c26.11-.34,47.36-22.25,47.36-48.83V48H136a8,8,0,0,1,0-16h24a8,8,0,0,1,8,8V87.17c0,32.84-24.53,60.29-56,64.31V192a32,32,0,0,0,32,32h24a32.06,32.06,0,0,0,31.22-25,40,40,0,1,1,16.23.27ZM232,160a24,24,0,1,0-24,24A24,24,0,0,0,232,160Z"/>',
    't-shirt': '<path d="M247.11,78.77l-19.27,36.81a8.44,8.44,0,0,1-7.5,4.42H192V40l51.78,28.25A7.81,7.81,0,0,1,247.11,78.77Zm-238.22,0,19.27,36.81a8.44,8.44,0,0,0,7.5,4.42H64V40L12.22,68.25A7.81,7.81,0,0,0,8.89,78.77Z" class="ph-tint"/><path d="M247.59,61.22,195.83,33A8,8,0,0,0,192,32H160a8,8,0,0,0-8,8,24,24,0,0,1-48,0,8,8,0,0,0-8-8H64a8,8,0,0,0-3.84,1L8.41,61.22A15.76,15.76,0,0,0,1.82,82.48l19.27,36.81A16.37,16.37,0,0,0,35.67,128H56v80a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16V128h20.34a16.37,16.37,0,0,0,14.58-8.71l19.27-36.81A15.76,15.76,0,0,0,247.59,61.22ZM35.67,112a.62.62,0,0,1-.41-.13L16.09,75.26,56,53.48V112ZM184,208H72V48h16.8a40,40,0,0,0,78.38,0H184Zm36.75-96.14a.55.55,0,0,1-.41.14H200V53.48l39.92,21.78Z"/>',
    'text-aa': '<path d="M232,164c0,15.46-14.33,28-32,28s-32-12.54-32-28,14.33-28,32-28S232,148.54,232,164ZM34.82,152h90.36L80,56Z" class="ph-tint"/><path d="M87.24,52.59a8,8,0,0,0-14.48,0l-64,136a8,8,0,1,0,14.48,6.81L39.9,160h80.2l16.66,35.4a8,8,0,1,0,14.48-6.81ZM47.43,144,80,74.79,112.57,144ZM200,96c-12.76,0-22.73,3.47-29.63,10.32a8,8,0,0,0,11.26,11.36c3.8-3.77,10-5.68,18.37-5.68,13.23,0,24,9,24,20v3.22A42.76,42.76,0,0,0,200,128c-22.06,0-40,16.15-40,36s17.94,36,40,36a42.73,42.73,0,0,0,24-7.25,8,8,0,0,0,16-.75V132C240,112.15,222.06,96,200,96Zm0,88c-13.23,0-24-9-24-20s10.77-20,24-20,24,9,24,20S213.23,184,200,184Z"/>',
    'users': '<path d="M136,108A52,52,0,1,1,84,56,52,52,0,0,1,136,108Z" class="ph-tint"/><path d="M117.25,157.92a60,60,0,1,0-66.5,0A95.83,95.83,0,0,0,3.53,195.63a8,8,0,1,0,13.4,8.74,80,80,0,0,1,134.14,0,8,8,0,0,0,13.4-8.74A95.83,95.83,0,0,0,117.25,157.92ZM40,108a44,44,0,1,1,44,44A44.05,44.05,0,0,1,40,108Zm210.14,98.7a8,8,0,0,1-11.07-2.33A79.83,79.83,0,0,0,172,168a8,8,0,0,1,0-16,44,44,0,1,0-16.34-84.87,8,8,0,1,1-5.94-14.85,60,60,0,0,1,55.53,105.64,95.83,95.83,0,0,1,47.22,37.71A8,8,0,0,1,250.14,206.7Z"/>',
    'wrench': '<path d="M224,96a64,64,0,0,1-94.94,56L73,217A24,24,0,0,1,39,183L104,126.94a64,64,0,0,1,80-90.29L144,80l5.66,26.34L176,112l43.35-40A63.8,63.8,0,0,1,224,96Z" class="ph-tint"/><path d="M226.76,69a8,8,0,0,0-12.84-2.88l-40.3,37.19-17.23-3.7-3.7-17.23,37.19-40.3A8,8,0,0,0,187,29.24,72,72,0,0,0,88,96,72.34,72.34,0,0,0,94,124.94L33.79,177c-.15.12-.29.26-.43.39a32,32,0,0,0,45.26,45.26c.13-.13.27-.28.39-.42L131.06,162A72,72,0,0,0,232,96,71.56,71.56,0,0,0,226.76,69ZM160,152a56.14,56.14,0,0,1-27.07-7,8,8,0,0,0-9.92,1.77L67.11,211.51a16,16,0,0,1-22.62-22.62L109.18,133a8,8,0,0,0,1.77-9.93,56,56,0,0,1,58.36-82.31l-31.2,33.81a8,8,0,0,0-1.94,7.1L141.83,108a8,8,0,0,0,6.14,6.14l26.35,5.66a8,8,0,0,0,7.1-1.94l33.81-31.2A56.06,56.06,0,0,1,160,152Z"/>',
  };
  function bigIcon(name, cls) {
    return `<svg class="ph${cls ? ' ' + cls : ''}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${PH[name] || ''}</svg>`;
  }
  // The four progress tiles: the same Phosphor icons plus the layers their hover show needs
  // (all invisible at rest: the ring, the core of the flame, the glint on the cup).
  // The show itself is CSS (styles.css, "progress tiles: each icon has its own little show").
  const TILE_SVG = inner => `<svg class="ph" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false">${inner}</svg>`;
  const TILE_ICONS = {
    check: TILE_SVG('<circle class="ph-tint" cx="128" cy="128" r="96"/><path d="M232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z"/><circle class="tk-ripple" cx="128" cy="128" r="104"/><path class="tk-mark" d="M88 136l24 24 56-56" pathLength="1"/>'),
    brain: TILE_SVG('<path d="M240,124a48,48,0,0,1-32,45.27h0V176a40,40,0,0,1-80,0,40,40,0,0,1-80,0v-6.73h0a48,48,0,0,1,0-90.54V72a40,40,0,0,1,80,0,40,40,0,0,1,80,0v6.73A48,48,0,0,1,240,124Z" class="ph-tint"/><path d="M248,124a56.11,56.11,0,0,0-32-50.61V72a48,48,0,0,0-88-26.49A48,48,0,0,0,40,72v1.39a56,56,0,0,0,0,101.2V176a48,48,0,0,0,88,26.49A48,48,0,0,0,216,176v-1.41A56.09,56.09,0,0,0,248,124ZM88,208a32,32,0,0,1-31.81-28.56A55.87,55.87,0,0,0,64,180h8a8,8,0,0,0,0-16H64A40,40,0,0,1,50.67,86.27,8,8,0,0,0,56,78.73V72a32,32,0,0,1,64,0v68.26A47.8,47.8,0,0,0,88,128a8,8,0,0,0,0,16,32,32,0,0,1,0,64Zm104-44h-8a8,8,0,0,0,0,16h8a55.87,55.87,0,0,0,7.81-.56A32,32,0,1,1,168,144a8,8,0,0,0,0-16,47.8,47.8,0,0,0-32,12.26V72a32,32,0,0,1,64,0v6.73a8,8,0,0,0,5.33,7.54A40,40,0,0,1,192,164Zm16-52a8,8,0,0,1-8,8h-4a36,36,0,0,1-36-36V80a8,8,0,0,1,16,0v4a20,20,0,0,0,20,20h4A8,8,0,0,1,208,112ZM60,120H56a8,8,0,0,1,0-16h4A20,20,0,0,0,80,84V80a8,8,0,0,1,16,0v4A36,36,0,0,1,60,120Z"/>'),
    flame: TILE_SVG('<g class="fl-sway"><g class="fl-flick"><path class="ph-tint" d="M208,144a80,80,0,0,1-160,0c0-30.57,14.42-58.26,31-80l33,32,26.27-72C159.86,41.92,208,88.15,208,144Z"/><path d="M216,144a88,88,0,0,1-176,0c0-27.92,11-56.47,32.66-84.85a8,8,0,0,1,11.93-.89l24.12,23.41,22-60.41a8,8,0,0,1,12.63-3.41C165.21,36,216,84.55,216,144Zm-16,0c0-46.09-35.79-85.92-58.21-106.33L119.52,98.74a8,8,0,0,1-13.09,3L80.06,76.16C64.09,99.21,56,122,56,144a72,72,0,0,0,144,0Z"/><path d="M183.89,153.34a57.6,57.6,0,0,1-46.56,46.55A8.75,8.75,0,0,1,136,200a8,8,0,0,1-1.32-15.89c16.57-2.79,30.63-16.85,33.44-33.45a8,8,0,0,1,15.78,2.68Z"/></g><g class="fl-core"><path transform="translate(64 112) scale(0.5)" d="M208,144a80,80,0,0,1-160,0c0-30.57,14.42-58.26,31-80l33,32,26.27-72C159.86,41.92,208,88.15,208,144Z"/></g></g>'),
    trophy: TILE_SVG('<path d="M200,48v63.1c0,39.7-31.75,72.6-71.45,72.9A72,72,0,0,1,56,112V48Z" class="ph-tint"/><path d="M232,64H208V48a8,8,0,0,0-8-8H56a8,8,0,0,0-8,8V64H24A16,16,0,0,0,8,80V96a40,40,0,0,0,40,40h3.65A80.13,80.13,0,0,0,120,191.61V216H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16H136V191.58c31.94-3.23,58.44-25.64,68.08-55.58H208a40,40,0,0,0,40-40V80A16,16,0,0,0,232,64ZM48,120A24,24,0,0,1,24,96V80H48v32q0,4,.39,8Zm144-8.9c0,35.52-29,64.64-64,64.9a64,64,0,0,1-64-64V56H192ZM232,96a24,24,0,0,1-24,24h-.5a81.81,81.81,0,0,0,.5-8.9V80h24Z"/><defs><clipPath id="pwCupClip"><path d="M200,48v63.1c0,39.7-31.75,72.6-71.45,72.9A72,72,0,0,1,56,112V48Z"/></clipPath><linearGradient id="pwShine"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><g clip-path="url(#pwCupClip)"><rect class="tq-shine" x="-30" y="0" width="64" height="256" fill="url(#pwShine)"/></g>'),
  };
  // The show runs only where its numbers can ease (CSS @property); it restarts from the
  // beginning each time the mouse comes onto a tile. Nothing here for touch or reduced motion:
  // the CSS media query keeps those still.
  if (window.CSS && CSS.registerProperty) {
    document.documentElement.classList.add('tiles-motion');
    document.addEventListener('pointerover', e => {
      if (e.pointerType !== 'mouse' || !e.target.closest) return;
      const tile = e.target.closest('.pw-stat');
      if (!tile || (e.relatedTarget && tile.contains(e.relatedTarget))) return;
      tile.getAnimations({ subtree: true }).forEach(a => { if (a.animationName) a.currentTime = 0; });
    });
  }

  // category name → icon name (a key of PH below — Phosphor). First match wins.
  const ICON_RULES = [
    [/phrase/i, 'chat-circle-dots'],
    [/verb/i, 'person-simple-run'],
    [/adjective/i, 'palette'],
    [/anatomy|health|medicine|body/i, 'stethoscope'],
    [/animal/i, 'paw-print'],
    [/food|drink|fruit|vegetable/i, 'orange'],
    [/family|people|relationship|profession/i, 'users'],
    [/number/i, 'list-numbers'],
    [/time|calendar|season|measurement/i, 'clock'],
    [/weather|nature|geography|agriculture/i, 'cloud-sun'],
    [/city|transport|place|direction|location/i, 'buildings'],
    [/clothing|footwear/i, 't-shirt'],
    [/home|furniture|household|decor/i, 'house'],
    [/tech|gadget|\bit\b|analytics|business|economy|money/i, 'laptop'],
    [/tool|material|mineral|stationery|object/i, 'wrench'],
    [/space|science/i, 'rocket'],
    [/society|government/i, 'bank'],
    [/culture|entertainment/i, 'mask-happy'],
    [/abstract|feeling|concept/i, 'lightbulb'],
    [/basic/i, 'book'],
    [/world/i, 'globe-hemisphere-west'],
  ];
  const FALLBACK_ICONS = ['books', 'sparkle', 'text-aa', 'folders'];
  const ACCENT_PALETTE = ['#2dd4bf', '#8b7af2', '#5b9df0', '#f472b6', '#fbbf24', '#34d399', '#f97316', '#60a5fa', '#c084fc', '#f87171'];

  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }
  // → the NAME of the icon; draw it with bigIcon(categoryIcon(cat))
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
    setupReveal();
    setupBannerTiles();
    appReady = true;
  }

  // ===== REVEAL ON SCROLL =====
  // Blocks below the first screen rise in once as they scroll into view (IntersectionObserver,
  // no scroll handler). They are hidden ONLY from here on — data-reveal on each block and
  // html.reveal-on, set by this function: if app.js fails to load or stops before this point,
  // nothing is ever hidden (Musa's condition). Blocks already on screen are left alone.
  const REVEAL_SEL = '.section-head, .translator-more, .game-banner, .progress-widget .pw-stat, .avatar-row, .proof-stat, .showcase-card, .phone-text, .phone-frame, .feature-card, .wordreq, .cta-box';
  function setupReveal() {
    if (!MOTION_OK || !('IntersectionObserver' in window)) return;
    const fold = innerHeight * 0.92;
    const els = $$(REVEAL_SEL).filter(el => { const r = el.getBoundingClientRect(); return r.height > 0 && r.top > fold; });
    if (!els.length) return;
    const io = new IntersectionObserver(entries => {
      // blocks that come in together follow one another by 40 ms (at most 3 steps)
      entries.filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
        .forEach((e, i) => {
          io.unobserve(e.target);
          e.target.style.setProperty('--d', Math.min(i, 3) * 40 + 'ms');
          e.target.classList.add('is-in');
        });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    els.forEach(el => { el.setAttribute('data-reveal', ''); io.observe(el); });
    document.documentElement.classList.add('reveal-on');
  }

  // The five letter tiles of the home Sózle banner turn over once, the first time the
  // banner is fully on screen — the game's own reveal, in small
  function setupBannerTiles() {
    const tiles = $('.game-banner-tiles');
    if (!tiles || !MOTION_OK || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      tiles.classList.add('is-flipping');
    }, { rootMargin: '0px 0px -10% 0px', threshold: 1 });
    io.observe(tiles);
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
    LANG_REDRAW.push(returnToActive);   // the links change width with the language
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
  // WORD FORMS (Musa, 2026-10-10) — NO GRAMMAR, only the way from a form back to a word the
  // dictionary has. en: base verb ("go") → the "To go" entries; ru: infinitive ("любить") →
  // the entries of that verb. Filled by buildTranslatorIndex(); see lookupForm().
  let FORM_INDEX = null;    // { en: Map(base → {lemma, words}), ru: Map(infinitive → {lemma, words}) }

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
    FORM_INDEX = { en: new Map(), ru: new Map() };
    const addForm = (map, key, lemma, w) => {
      const e = map.get(key);
      if (!e) map.set(key, { lemma, words: [w] });
      else if (!e.words.includes(w)) e.words.push(w);
    };
    // "Excuse me / Sorry (polite)" → ["Excuse me", "Sorry"], as written
    const shownVariants = s => String(s || '').replace(/\([^)]*\)/g, ' ').split(/[\/,;]/).map(x => x.trim()).filter(Boolean);
    WORDS.forEach(w => {
      textVariants(w.kk).forEach(k => add(TRANS_INDEX.kk, k, w));
      textVariants(w.en).forEach(k => add(TRANS_INDEX.en, k, w));
      textVariants(w.ru).forEach(k => add(TRANS_INDEX.ru, k, w));
      SEARCH_KEYS.push({ w, kk: foldKey(w.kk), en: foldKey(w.en), ru: foldKey(w.ru) });
      // a verb = an entry whose English is "To …" (147 of them); only verbs get forms,
      // nouns never (too many false hits)
      const enVerbs = shownVariants(w.en).filter(v => /^to\s/i.test(v));
      if (!enVerbs.length) return;
      enVerbs.forEach(v => addForm(FORM_INDEX.en, foldKey(v).slice(3), v.charAt(0).toLowerCase() + v.slice(1), w));
      shownVariants(w.ru).forEach(v => {
        const k = foldKey(v);
        if (/(ть|ти|чь)(ся|сь)?$/.test(k) && !/\s/.test(k)) addForm(FORM_INDEX.ru, k, v.toLowerCase(), w);
      });
    });
  }

  // Pronouns. Russian case forms lead back to the pronoun the dictionary has
  // (тебя → ты → Sen); English object forms the same way (me → I → Men). Ambiguous forms
  // ("ним": him or them) are left out on purpose.
  const RU_PRON_FORMS = {
    'я': 'меня мне мной мною', 'ты': 'тебя тебе тобой тобою', 'он': 'его ему него нему нём',
    'она': 'её ей неё ней ею нею', 'мы': 'нас нам нами', 'вы': 'вас вам вами', 'они': 'их им них ими ними',
  };
  const EN_PRON_FORMS = { i: 'me', he: 'him', she: 'her', we: 'us', they: 'them' };
  const PRON_BASE = { ru: new Map(), en: new Map() };   // folded form → pronoun as written
  Object.entries(RU_PRON_FORMS).forEach(([base, forms]) => forms.split(' ').forEach(f => PRON_BASE.ru.set(foldKey(f), base)));
  Object.entries(EN_PRON_FORMS).forEach(([base, form]) => PRON_BASE.en.set(form, base === 'i' ? 'I' : base));
  const PRONOUNS = {   // after one of these the next word is looked up as a verb first
    ru: new Set(['я', 'ты', 'он', 'она', 'оно', 'мы', 'вы', 'они', ...PRON_BASE.ru.keys()].map(foldKey)),
    en: new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they', ...PRON_BASE.en.keys()]),
  };
  // English words that carry no meaning of their own here: never shown as "not found"
  const EN_SKIP = new Set(['to', 'a', 'an', 'the']);

  // goes / loved / going → go / love — only when the base verb is in the dictionary
  function enVerbLookup(k) {
    const map = FORM_INDEX.en;
    if (map.has(k)) return map.get(k);
    const c = [];
    if (k.endsWith('ies')) c.push(k.slice(0, -3) + 'y');                  // tries → try
    if (k.endsWith('es')) c.push(k.slice(0, -2));                         // goes → go
    if (k.endsWith('s') && !k.endsWith('ss')) c.push(k.slice(0, -1));     // loves → love
    if (k.endsWith('ied')) c.push(k.slice(0, -3) + 'y');                  // tried → try
    if (k.endsWith('ed')) { const st = k.slice(0, -2); c.push(st + 'e', st); if (/([^aeiou])\1$/.test(st)) c.push(st.slice(0, -1)); }
    if (k.endsWith('ing')) { const st = k.slice(0, -3); c.push(st, st + 'e'); if (/([^aeiou])\1$/.test(st)) c.push(st.slice(0, -1)); if (st.endsWith('y')) c.push(st.slice(0, -1) + 'ie'); }
    for (const b of c) if (b.length >= 2 && map.has(b)) return map.get(b);
    return null;
  }

  // люблю / любишь / любит / любим / любят / любил / любила → любить; идём → идти.
  // Candidate infinitives are built from the ending and kept only if the dictionary has
  // that verb. Text is folded (ё → е, й → и), like everything in the index.
  function ruVerbLookup(k) {
    const map = FORM_INDEX.ru;
    if (map.has(k)) return map.get(k);
    let s = k, refl = '';
    if (/(ся|сь)$/.test(s) && s.length > 4) { refl = 'ся'; s = s.slice(0, -2); }
    const c = [];
    const past = s.match(/^(.{2,}?)(л|ла|ло|ли)$/);                      // любил, любила
    if (past) c.push(past[1] + 'ть');
    for (const end of ['ите', 'ете', 'ишь', 'ешь', 'ют', 'ут', 'ят', 'ат', 'ит', 'ет', 'им', 'ем', 'ю', 'у']) {
      if (!s.endsWith(end) || s.length - end.length < 2) continue;
      const st = s.slice(0, -end.length);
      if (/[аеиоуыэюя]$/.test(st)) c.push(st + 'ть', st + 'ять', st + 'вать');   // знаю, стою, даю
      else c.push(st + 'ить', st + 'еть', st + 'ать', st + 'ти', st + 'ять');    // любит, видит, слышит, идёт
      if (/[бвмпф]л$/.test(st)) c.push(st.slice(0, -1) + 'ить');                // люблю → любить
      if (/у$/.test(st)) c.push(st.slice(0, -1) + 'овать', st.slice(0, -1) + 'евать'); // рисую → рисовать
      if (end === 'у' || end === 'ю') {                                          // вижу → видеть, прошу → просить
        const alt = { 'ж': ['д', 'з'], 'ч': ['т'], 'ш': ['с'], 'щ': ['ст', 'ск'] }[st.slice(-1)];
        if (alt) alt.forEach(a => c.push(st.slice(0, -1) + a + 'еть', st.slice(0, -1) + a + 'ить', st.slice(0, -1) + a + 'ать'));
      }
    }
    for (const cand of c) if (map.has(cand + refl)) return map.get(cand + refl);
    return null;
  }

  // one word that is not in the dictionary as typed, but whose dictionary word we can name.
  // → { src, matches, lemma } or null. lang: detectLang() of the whole input (null = plain Latin).
  function lookupForm(k, lang) {
    if (lang === 'ru') {
      const v = ruVerbLookup(k);
      if (v) return { src: 'ru', matches: v.words, lemma: v.lemma };
      const base = PRON_BASE.ru.get(k);
      const hit = base && TRANS_INDEX.ru.get(foldKey(base));
      if (hit) return { src: 'ru', matches: hit, lemma: base };
      return null;
    }
    if (lang === 'kk') return null;
    const v = enVerbLookup(k);
    if (v) return { src: 'en', matches: v.words, lemma: v.lemma };
    const base = PRON_BASE.en.get(k);
    const hit = base && TRANS_INDEX.en.get(foldKey(base));
    if (hit) return { src: 'en', matches: hit, lemma: base };
    return null;
  }

  // the words of a sentence, one by one. Plain Latin is read as English when more of its
  // words are English than Qaraqalpaq ("I love it": "it" is the pronoun, not It = dog).
  // Right after a pronoun a word is looked up as a VERB first ("I love you": Súyiw, not Muhabbat).
  function phraseParts(rawTokens, lang) {
    const keys = rawTokens.map(foldKey);
    let order = lang;
    if (!lang) {
      const en = keys.filter(k => EN_SKIP.has(k) || PRONOUNS.en.has(k) || TRANS_INDEX.en.has(k) || enVerbLookup(k)).length;
      const kk = keys.filter(k => TRANS_INDEX.kk.has(k)).length;
      order = en > kk ? 'en' : null;
    }
    const pron = lang === 'ru' ? PRONOUNS.ru : PRONOUNS.en;
    let prevPron = false;
    return rawTokens.map((raw, i) => {
      const k = keys[i];
      if (order === 'en' && EN_SKIP.has(k)) return { raw, skip: true };
      const verbFirst = prevPron && lang !== 'kk';
      prevPron = lang !== 'kk' && pron.has(k);
      let part = null;
      if (verbFirst) {
        const v = lang === 'ru' ? ruVerbLookup(k) : enVerbLookup(k);
        if (v) part = { src: lang === 'ru' ? 'ru' : 'en', matches: v.words, lemma: v.lemma };
      }
      if (!part && order === 'en') {
        const en = TRANS_INDEX.en.get(k);
        part = en ? { src: 'en', matches: en } : lookupForm(k, null);
        if (!part && TRANS_INDEX.kk.get(k)) part = { src: 'kk', matches: TRANS_INDEX.kk.get(k) };
      }
      if (!part) {
        const ex = lookupExact(k, lang);
        part = ex.matches.length ? ex : (lookupForm(k, lang) || ex);
      }
      return Object.assign({ raw }, part);
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
    // not in the dictionary as typed — maybe a form of a word that is ("go", "люблю", "тебя")
    const form = lookupForm(key, lang);
    if (form) return { type: 'exact', src: form.src, matches: form.matches.slice(0, 4), lemma: form.lemma };
    const rawTokens = raw.split(/\s+/).filter(t => foldKey(t));
    if (rawTokens.length > 1) {
      const parts = phraseParts(rawTokens, lang);
      if (parts.some(p => p.matches && p.matches.length)) return { type: 'phrase', parts };
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
    srcEl.textContent = src ? LANG_NAMES[src] : t('tr.detect');
    dstEl.textContent = src ? TARGET_LABELS[src] : t('tr.translation');
  }

  function trMatchHtml(w) {
    return `
      <div class="tr-match" style="--accent:${categoryColor(w.category)}">
        <span class="tr-match-icon">${bigIcon(categoryIcon(w.category))}</span>
        <div class="tr-match-text">
          <span class="tr-match-kk">${escapeHtml(w.kk)}</span>
          <span class="tr-match-en">${escapeHtml(w.en)}</span>
          <span class="tr-match-ru">${escapeHtml(w.ru)}</span>
        </div>
        <div class="tr-match-side">
          <span class="tr-cat">${escapeHtml(catLabel(w.category))}</span>
          <button class="tr-find" data-kk="${escapeAttr(w.kk)}">Find in dictionary →</button>
        </div>
      </div>`;
  }

  // the dictionary word a form was found by: "люблю → Súyiw (любить)"
  const lemmaHtml = lemma => lemma ? ` <span class="tr-lemma">(${escapeHtml(lemma)})</span>` : '';

  function trPhraseRowHtml(part) {
    const m = part.matches[0];
    const target = !m
      ? `<span class="tr-note">${escapeHtml(t('tr.notFound'))}</span>`
      : part.src === 'kk'
        ? `<span class="tr-phrase-en">${escapeHtml(m.en)}</span><span class="tr-phrase-ru">${escapeHtml(m.ru)}</span>`
        : `<span class="tr-phrase-kk">${escapeHtml(m.kk)}${lemmaHtml(part.lemma)}</span>`;
    return `
      <div class="tr-phrase-row${m ? '' : ' is-missing'}">
        <span class="tr-phrase-token">${escapeHtml(part.raw)}</span>
        <span class="tr-phrase-arrow">→</span>
        <div class="tr-phrase-target">${target}</div>
      </div>`;
  }

  const trOutputHint = () => `<span class="tr-output-hint" data-i18n="tr.hint">${t('tr.hint')}</span>`;

  function renderTranslation(raw) {
    const results = $('#translatorResults');
    const out = $('#translatorOutput');
    const res = translateQuery(raw);
    if (!res || res.type !== 'exact') renderTranslation.last = null;
    if (!res) {
      results.hidden = true; results.innerHTML = '';
      out.innerHTML = trOutputHint();
      trSetLangs(null);
      return;
    }

    let html = '';

    if (res.type === 'exact') {
      const m = res.matches[0];
      trSetLangs(res.src);
      const big = res.src === 'kk' ? primaryText(m.en) : m.kk;
      const sub = res.src === 'kk' ? m.ru : (res.src === 'ru' ? primaryText(m.en) : m.ru);
      // a NEW translation rises in; typing on while the answer stays the same moves nothing
      const isNew = MOTION_OK && big !== renderTranslation.last;
      renderTranslation.last = big;
      out.innerHTML = `
        <div class="tr-output-main${isNew ? ' tr-new' : ''}">
          <span class="tr-output-big">${escapeHtml(big)}${lemmaHtml(res.lemma)}</span>
          <span class="tr-output-sub">${escapeHtml(sub)}</span>
          <div class="tr-output-meta">
            <span class="tr-cat">${escapeHtml(catLabel(m.category))}</span>
            <button class="tr-find" data-kk="${escapeAttr(m.kk)}">Find in dictionary →</button>
          </div>
        </div>`;
      const rest = res.matches.slice(1);
      html = rest.length ? `<p class="tr-note">More matches:</p>` + rest.map(trMatchHtml).join('') : '';
    } else if (res.type === 'phrase') {
      // Musa, 2026-10-10: a row of looked-up words in big type ("Men want to go home") read
      // like a translation and was not one. Now the big line says so plainly, the words come
      // below one by one, and the report button hands the WHOLE sentence to the form.
      const firstFound = res.parts.find(p => p.matches && p.matches.length);
      trSetLangs(firstFound ? firstFound.src : null);
      out.innerHTML = `
        <div class="tr-output-main">
          <span class="tr-output-big tr-output-note">${escapeHtml(t('tr.sentence'))}</span>
          <span class="tr-output-sub">${escapeHtml(t('tr.sentenceSub'))}</span>
        </div>`;
      html = `<div class="tr-phrase">${res.parts.filter(p => !p.skip).map(trPhraseRowHtml).join('')}</div>
        <button class="tr-report" data-q="${escapeAttr(raw)}">${escapeHtml(t('tr.report'))}</button>`;
    } else {
      trSetLangs(res.lang);
      out.innerHTML = `<span class="tr-output-hint">No exact match — this word isn't in the dictionary yet (1,301 words and growing).</span>
        <button class="tr-report" data-q="${escapeAttr(raw)}">${escapeHtml(t('tr.report'))}</button>`;
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
        out.innerHTML = trOutputHint();
        trSetLangs(null);
        return;
      }
      if (!TRANS_INDEX) buildTranslatorIndex();
      renderTranslation(raw);
    };

    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 160); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); run(); } });
    clearBtn.addEventListener('click', () => { input.value = ''; run(); input.focus(); });
    LANG_REDRAW.push(run);

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

  // what the next drawing of the board should animate: 'type' (the letter just typed lands)
  // or { row, win } (that guess turns over; on a win the tiles hop after it). One drawing only.
  let sozleAnim = null;
  function sozleRenderBoard() {
    const board = $('#sozleBoard');
    const anim = MOTION_OK ? sozleAnim : null;
    sozleAnim = null;
    let html = '';
    for (let r = 0; r < 6; r++) {
      html += '<div class="sozle-row">';
      for (let c = 0; c < 5; c++) {
        let ch = '', cls = '';
        let style = '';
        if (r < sozle.guesses.length) {
          ch = sozle.guesses[r][c];
          cls = ' is-' + sozle.evals[r][c];
          if (anim && anim.row === r) { cls += anim.win ? ' flip-in win-hop' : ' flip-in'; style = ` style="--i:${c}"`; }
        } else if (r === sozle.guesses.length && !sozle.done) {
          ch = sozle.cur[c] || '';
          if (ch) cls = ' is-filled';
          if (ch && anim === 'type' && c === sozle.cur.length - 1) cls += ' just-typed';
        }
        html += `<div class="sozle-tile${cls}"${style}>${escapeHtml(ch)}</div>`;
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
        if (k === 'back') return `<button class="sozle-key sozle-key-wide" data-key="back" aria-label="Backspace">${icon('backspace')}</button>`;
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
      <span class="sozle-stat sozle-stat-streak">${icon('flame')} <strong>${streak}</strong> streak</span>`;
  }

  function sozleMsg(text, sticky) {
    const el = $('#sozleMsg');
    el.textContent = text;
    if (text) replay(el, 'msg-in');
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
    // [the cheer, its icon] by the number of guesses it took
    const cheer = [null, ['Genius!', 'mood-crazy-happy'], ['Ájayıp!', 'confetti'], ['Great!', 'confetti'], ['Nice!', 'thumb-up'], ['Good!', 'mood-smile'], ['Phew!', 'mood-nervous']][sozle.guesses.length];
    const head = sozle.win ? `${cheer[0]} ${icon(cheer[1])}` : 'The word was:';
    $('#sozlePanel').innerHTML = `
      <p class="sozle-panel-head">${head}</p>
      <div class="sozle-answer">
        <span class="sozle-answer-kk">${escapeHtml(w.kk)}</span>
        <span class="sozle-answer-en">${escapeHtml(w.en)}</span>
        <span class="sozle-answer-ru">${escapeHtml(w.ru)}</span>
        <span class="tr-cat">${escapeHtml(catLabel(w.category))}</span>
      </div>
      <p class="sozle-learned">You just learned a Karakalpak word ${icon('school')}</p>
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
      const done = () => { copyBtn.innerHTML = `Copied ${icon('check')}`; replay(copyBtn, 'pop'); setTimeout(() => { copyBtn.textContent = 'Copy result'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(sozleShareText()).then(done, done);
      else done();
    });
  }

  LANG_REDRAW.push(() => { if (typeof sozle !== 'undefined' && sozle && sozle.done && $('#sozlePanel') && !$('#sozlePanel').hidden) sozleEndPanel(); });

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
    replay($('#sozlePanel'), 'panel-in'); // only for a game finished now — not for a board restored on load
  }

  function sozleSubmit() {
    if (sozle.done) return;
    if (sozle.cur.length < 5) {
      sozleMsg('Not enough letters');
      replay($$('#sozleBoard .sozle-row')[sozle.guesses.length], 'shake'); // the row itself says "not yet"
      return;
    }
    const guess = sozle.cur;
    const ev = sozleEval(guess, sozle.answer);
    sozle.guesses.push(guess);
    sozle.evals.push(ev);
    sozle.cur = '';
    sozleAnim = { row: sozle.guesses.length - 1, win: guess === sozle.answer };
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
    el.innerHTML = `${icon('bulb')} It means: <strong>${escapeHtml(w.en)}</strong> · ${escapeHtml(w.ru)}`;
    el.hidden = false;
  }

  function sozleKey(k) {
    if (!sozle || sozle.done) return;
    if (k === 'enter') { sozleSubmit(); return; }
    if (k === 'back') { sozle.cur = sozle.cur.slice(0, -1); sozleRenderBoard(); return; }
    if (sozle.cur.length >= 5 || !SOZLE_ALLOWED.has(k)) return;
    sozle.cur += k;
    sozleAnim = 'type';
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
    sozleAnim = 'type';
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
      if (e.target && e.target.closest && e.target.closest('#navHelp, #tourCard, #tourAsk, #footerGuide, #uiLang')) return; // the guide or the EN / RU switch, not the game
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
    LANG_REDRAW.push(() => { buildCategoryPills(); renderDictionary(); });
  }

  function buildCategoryPills() {
    const wrap = $('#categoryPills');
    const all = ['All', ...CATEGORIES];
    wrap.innerHTML = all.map(cat =>
      `<button class="pill ${cat === state.category ? 'active' : ''}" data-cat="${escapeAttr(cat)}">${escapeHtml(cat === 'All' ? t('cats.allPill') : catLabel(cat))}</button>`
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
        <span class="wotd-label">${icon('sparkles')} Word of the Day</span>
        <div class="wotd-body">
          <span class="wotd-icon">${bigIcon(categoryIcon(w.category))}</span>
          <div class="wotd-text">
            <span class="wotd-kk">${escapeHtml(w.kk)}</span>
            <span class="wotd-en">${escapeHtml(w.en)}</span>
            <span class="wotd-ru">${escapeHtml(w.ru)}</span>
          </div>
        </div>
        <span class="wotd-cat">${escapeHtml(catLabel(w.category))}</span>
      </div>`;
  }

  function handleLearnToggle(btn) {
    const id = btn.dataset.id;
    toggleLearned(id);
    const learned = isLearned(id);
    const card = btn.closest('.word-card');
    card.classList.toggle('is-learned', learned);
    $$('.learn-btn', card).forEach(b => { b.innerHTML = learned ? `${icon('check')} ${t('btn.learned')}` : t('btn.markLearned'); });
    if (learned) $$('.learned-badge', card).forEach(b => replay(b, 'pop'));
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
      renderDictionary.lastKey = '';
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
    // other cards than before (search, category, page) → they come in as a quick cascade.
    // Not on page load, not when the same cards are drawn again (language switch). Only the
    // cards on screen (12 at most): the rest are out of sight, and 48 moving cards cost a slow
    // phone a long first frame (measured at 6× CPU slowdown). Read all, then write.
    const pageKey = pageItems.map(wordId).join('|');
    if (MOTION_OK && renderDictionary.lastKey !== undefined && pageKey !== renderDictionary.lastKey) {
      const inView = $$('.word-card', grid).slice(0, 12).filter(c => c.getBoundingClientRect().top < innerHeight);
      inView.forEach((c, i) => { c.style.setProperty('--i', i); c.classList.add('card-in'); });
    }
    renderDictionary.lastKey = pageKey;
    renderPagination(totalPages);
  }

  function wordCardHtml(w) {
    const accent = categoryColor(w.category);
    const catIcon = bigIcon(categoryIcon(w.category));
    const id = wordId(w);
    const learned = isLearned(id);
    const learnBtnHtml = `<button class="learn-btn" data-id="${escapeAttr(id)}">${learned ? `${icon('check')} ${t('btn.learned')}` : t('btn.markLearned')}</button>`;
    // The ✓ badge lives INSIDE each face, so it turns with the card (as a child of
    // .word-card it stayed put in the corner while the card rotated under it), and it
    // is the LAST ITEM OF THE TOP ROW, so a long category pill shortens with "…"
    // instead of sliding under the badge.
    const badgeHtml = `<span class="learned-badge" aria-hidden="true">${icon('check')}</span>`;
    return `
      <div class="word-card${learned ? ' is-learned' : ''}" style="--accent:${accent}">
        <div class="word-card-inner">
          <div class="word-card-face word-card-front">
            <div class="word-card-top">
              <span class="word-card-icon">${catIcon}</span>
              <span class="word-cat-badge" title="${escapeAttr(catLabel(w.category))}">${escapeHtml(catLabel(w.category))}</span>
              ${badgeHtml}
            </div>
            <span class="word-kk">${escapeHtml(w.kk)}</span>
            <span class="word-flip-hint">${t('card.tapReveal')} ${icon('rotate-clockwise')}</span>
            ${learnBtnHtml}
          </div>
          <div class="word-card-face word-card-back">
            <div class="word-card-top"><span class="word-card-icon">${catIcon}</span>${badgeHtml}</div>
            <div class="word-card-trans">
              <span class="word-en">${escapeHtml(w.en)}</span>
              <span class="word-ru">${escapeHtml(w.ru)}</span>
            </div>
            <span class="word-flip-hint">${t('card.tapBack')} ${icon('rotate')}</span>
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
    const keep = select.value;
    select.innerHTML = ['All Categories', ...CATEGORIES]
      .map(cat => `<option value="${escapeAttr(cat === 'All Categories' ? 'All' : cat)}">${escapeHtml(cat === 'All Categories' ? t('cats.all') : catLabel(cat))}</option>`)
      .join('');
    if (keep) select.value = keep;
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
      if (e.target.closest && e.target.closest('#uiLang')) return; // ← → on the EN / RU switch pick a language
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
      replay($('#flashcard'), 'shuffled');
    });
    const learnBtn = $('#flashLearnBtn');
    if (learnBtn) learnBtn.addEventListener('click', () => {
      const { list, index } = state.flash;
      if (list.length === 0) return;
      toggleLearned(wordId(list[index]));
      // Only the button and the badge change — showFlashcard() would also turn the
      // card back to its front while you are reading the translation
      renderFlashLearned(list[index]);
      if (isLearned(wordId(list[index]))) $$('#flashcard .learned-badge').forEach(b => replay(b, 'pop'));
      renderProgressBar();
    });
    renderProgressBar();
    refreshFlashList();
    LANG_REDRAW.push(() => {
      buildSelectOptions($('#flashCategory'));
      const w = state.flash.list[state.flash.index];
      if (w) { $('#flashCatBadge').textContent = catLabel(w.category); renderFlashLearned(w); }
    });
  }

  function renderFlashLearned(w) {
    const learnBtn = $('#flashLearnBtn');
    const learned = isLearned(wordId(w));
    if (learnBtn) {
      learnBtn.hidden = false;
      learnBtn.innerHTML = `${icon('check')} ${learned ? t('btn.learned') : t('btn.markLearned')}`;
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
    $('#flashCatBadge').textContent = catLabel(w.category);
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
    // the next word comes in from the right, the previous one from the left
    const card = $('#flashcard');
    card.classList.remove('in-next', 'in-prev');
    replay(card, dir > 0 ? 'in-next' : 'in-prev');
  }

  // ===== QUIZ PAGE =====
  function initQuizPage() {
    buildSelectOptions($('#quizCategory'));
    $('#quizStart').addEventListener('click', startQuiz);
    $('#quizNext').addEventListener('click', nextQuizQuestion);
    setupQuizLangToggle();
    LANG_REDRAW.push(() => { buildSelectOptions($('#quizCategory')); renderQuizFeedback(); });
  }

  // The language of the ANSWERS (not of the interface). Musa, 2026-10-09: with the Russian
  // interface the answers are Russian too, unless the person picked English (or Russian)
  // themselves — that pick is remembered (qaraqalpaq_quiz_lang) and always wins.
  const QUIZ_LANG_KEY = 'qaraqalpaq_quiz_lang';
  function quizLangPicked() { try { const v = localStorage.getItem(QUIZ_LANG_KEY); return v === 'en' || v === 'ru' ? v : null; } catch (e) { return null; } }
  function setQuizLang(lang) {
    state.quiz.lang = lang;
    $$('#quizLangToggle .lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
    if (!$('#quizStage').hidden && state.quiz.current && !state.quiz.locked) renderQuizOptions(state.quiz.current.correct);
  }
  function setupQuizLangToggle() {
    const wrap = $('#quizLangToggle');
    if (!wrap) return;
    setQuizLang(quizLangPicked() || LANG);
    $$('.lang-btn', wrap).forEach(btn => {
      btn.addEventListener('click', () => {
        try { localStorage.setItem(QUIZ_LANG_KEY, btn.dataset.lang); } catch (e) {}
        setQuizLang(btn.dataset.lang);
      });
    });
    LANG_REDRAW.push(() => { if (!quizLangPicked()) setQuizLang(LANG); });   // follows the interface until picked
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
    replay($('#quizQuestionWord'), 'q-in');
    $('#quizNext').hidden = true;
    state.quiz.feedback = null;
    renderQuizFeedback();
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
    optWrap.innerHTML = options.map((opt, i) =>
      `<button class="quiz-option${MOTION_OK ? ' opt-in' : ''}" style="--i:${i}" data-val="${escapeAttr(opt)}">${escapeHtml(opt)}</button>`
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

    // Musa, 2026-10-09: an answer must READ as an answer. The right option turns green with a
    // tick (and plays a short pop, see .quiz-option.correct), a wrong pick turns red with a
    // cross, the right one is shown green anyway, the other two step back; a line under the
    // options says it in words.
    $$('.quiz-option').forEach(b => {
      b.disabled = true;
      b.classList.remove('opt-in'); // a quick answer must not keep the entrance over the green pop
      if (b.dataset.val === correctVal) { b.classList.add('correct'); b.insertAdjacentHTML('afterbegin', icon('check') + ' '); }
      else if (b === btn) { b.classList.add('wrong'); b.insertAdjacentHTML('afterbegin', icon('x') + ' '); }
      else b.classList.add('is-other');
    });
    state.quiz.feedback = { ok: isCorrect, answer: correctVal };
    renderQuizFeedback();

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
    // on a phone the line and "Next Question" can sit under the fold: bring them up, but only
    // as far as needed, and only right after the tap (never by itself)
    const next = $('#quizNext');
    if (next.getBoundingClientRect().bottom > innerHeight) {
      next.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }

  // "Correct!" or "Not quite — the answer is Tie" under the options
  function renderQuizFeedback() {
    const el = $('#quizFeedback');
    if (!el) return;
    const f = state.quiz.feedback;
    if (!f) { el.hidden = true; el.innerHTML = ''; return; }
    const [before, after = ''] = t('quiz.wrong').split('{answer}');
    el.className = 'quiz-feedback ' + (f.ok ? 'is-ok' : 'is-wrong');
    el.innerHTML = f.ok
      ? `${icon('check')} <span>${escapeHtml(t('quiz.correct'))}</span>`
      : `${icon('x')} <span>${escapeHtml(before)}<strong>${escapeHtml(f.answer)}</strong>${escapeHtml(after)}</span>`;
    el.hidden = false;
  }

  function updateQuizScoreboard() {
    $('#quizScore').textContent = state.quiz.score;
    $('#quizStreak').textContent = state.quiz.streak;
    $('#quizTotal').textContent = state.quiz.answered;
    $('#quizScoreLive').textContent = state.quiz.score;
    $('#quizStreakLive').textContent = state.quiz.streak;
    // a point / a longer streak: the number bumps
    const prev = updateQuizScoreboard.last;
    if (prev && state.quiz.score > prev.score) replay($('#quizScoreLive'), 'bump');
    if (prev && state.quiz.streak > prev.streak) replay($('#quizStreakLive'), 'bump');
    updateQuizScoreboard.last = { score: state.quiz.score, streak: state.quiz.streak };
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

    const say = (text, ok, tail) => { // tail: an icon after the text
      msg.hidden = false;
      msg.textContent = text;
      if (tail) msg.insertAdjacentHTML('beforeend', ' ' + tail);
      replay(msg, 'msg-in');
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
      say('Raxmet! Got it — we\'ll review this word soon.', true, icon('heart', 'ico-love'));
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
        <button class="feedback-close" aria-label="Close">${icon('x')}</button>
        <p class="feedback-title">Enjoying Qaraqalpaq Tili?</p>
        <p class="feedback-sub">Rate the site — it takes 5 seconds and helps a lot.</p>
        <div class="feedback-stars" role="radiogroup" aria-label="Rating">
          ${[1, 2, 3, 4, 5].map(n => `<button class="feedback-star" data-val="${n}" aria-label="${n} star${n > 1 ? 's' : ''}">${icon('star')}</button>`).join('')}
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
        $('.feedback-title', card).innerHTML = `Raxmet! Thank you ${icon('heart', 'ico-love')}`;
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
      ['#sozleBoard', 'Six tries to guess the 5-letter word: <i class="tour-swatch is-correct"></i> right spot, <i class="tour-swatch is-present"></i> wrong spot.'],
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
