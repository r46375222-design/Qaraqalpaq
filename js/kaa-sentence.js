// Sentence builder: simple Russian / English sentences → Karakalpak (advisor, 2026-10-15; v135: book constructions, §27).
// Needs kaa-morph.js and kaa-lexicon.js loaded first, and the dictionary (words.json array).
// KaaSentence.init(WORDS); KaaSentence.translate('Я иду в школу', 'ru') →
//   { kk: 'Men mektepke baratırman.', words: [...] }  or null when the sentence is not covered.
// null is the honest answer: the site then shows its word-by-word list as before.
(function (root) {
  'use strict';
  const M = root.KaaMorph || (typeof require !== 'undefined' && require('./kaa-morph.js'));
  const L = root.KaaLexicon || (typeof require !== 'undefined' && require('./kaa-lexicon.js'));

  // same folding as the site's foldKey: lower case, ı → i, accents off (ё → е, й → и)
  function fold(s) {
    return String(s || '').toLowerCase().replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
  }
  // the 2016 alphabet pairs Í with ı (and I with i): Íssı → ıssı, ıssı → Íssı (kaa.wikipedia, «Qaraqalpaq tili»)
  const cap = s => (s.charAt(0) === 'ı' ? 'Í' : s.charAt(0).toUpperCase()) + s.slice(1);
  const lowFirst = s => (s.charAt(0) === 'Í' ? 'ı' : s.charAt(0).toLowerCase()) + s.slice(1);

  // ---------------------------------------------------------------- dictionary index
  const NUM_KK = {   // overrides: the dictionary has Alı / Jıyırma, the corpus says Altı (230) / Jigirma (150); Jeti is missing
    'один': 'bir', 'одна': 'bir', 'одно': 'bir', 'два': 'eki', 'две': 'eki', 'три': 'úsh', 'четыре': 'tórt', 'пять': 'bes', 'шесть': 'altı', 'семь': 'jeti',
    'восемь': 'segiz', 'девять': 'toǵız', 'десять': 'on', 'двадцать': 'jigirma', 'тридцать': 'otız', 'сто': 'júz',
    'one': 'bir', 'two': 'eki', 'three': 'úsh', 'four': 'tórt', 'five': 'bes', 'six': 'altı', 'seven': 'jeti', 'eight': 'segiz',
    'nine': 'toǵız', 'ten': 'on', 'twenty': 'jigirma', 'thirty': 'otız', 'hundred': 'júz',
  };
  const PROPER_CATS = /countr|cit(y|ies)|name/i;
  let NOM = null;      // { ru: Map(form → [{kk, cases:Set, pl, pos}]), en: Map }
  let VERB = null;     // { ru: Map(form → [{v, tense, p, num, pf, habit, study, inf}]), en: Map(form → [{v, form}]) }

  const shown = s => String(s || '').replace(/\([^)]*\)/g, ' ').split(/[\/,;]/).map(x => x.trim()).filter(Boolean);
  function kkHead(entry) {
    let k = shown(entry.kk)[0] || entry.kk;
    k = k.replace(/[!?.]+$/, '').trim();
    return lowFirst(k);
  }

  // Russian noun forms from the nominative (no stress, no exceptions beyond the list below)
  const IRREG_RU = {
    'мать': 'мать матери матери мать матерью матери | матери матерей матерям матерей матерями матерях',
    'дочь': 'дочь дочери дочери дочь дочерью дочери | дочери дочерей дочерям дочерей дочерьми дочерях',
    'брат': 'брат брата брату брата братом брате | братья братьев братьям братьев братьями братьях',
    'друг': 'друг друга другу друга другом друге | друзья друзей друзьям друзей друзьями друзьях',
    'сын': 'сын сына сыну сына сыном сыне | сыновья сыновей сыновьям сыновей сыновьями сыновьях',
    'человек': 'человек человека человеку человека человеком человеке | люди людей людям людей людьми людях',
    'ребёнок': 'ребёнок ребёнка ребёнку ребёнка ребёнком ребёнке | дети детей детям детей детьми детях',
    'ребенок': 'ребенок ребенка ребенку ребенка ребенком ребенке | дети детей детям детей детьми детях',
    'день': 'день дня дню день днём дне | дни дней дням дни днями днях',
    'отец': 'отец отца отцу отца отцом отце | отцы отцов отцам отцов отцами отцах',
    'имя': 'имя имени имени имя именем имени | имена имён именам имена именами именах',
    'время': 'время времени времени время временем времени | времена времён временам времена временами временах',
    'дом': 'дом дома дому дом домом доме | дома домов домам дома домами домах',
    'город': 'город города городу город городом городе | города городов городам города городами городах',
    'глаз': 'глаз глаза глазу глаз глазом глазе | глаза глаз глазам глаза глазами глазах',
    'деньги': '- - - - - - | деньги денег деньгам деньги деньгами деньгах',
  };
  const CASES = ['nom', 'gen', 'dat', 'acc', 'ins', 'prep'];
  function ruNounForms(w) {
    if (IRREG_RU[w]) {
      const [sg, pl] = IRREG_RU[w].split('|').map(s => s.trim().split(' '));
      return { sg, pl };
    }
    const soft = /[гкхжшщч]$/;
    let sg, pl;
    if (/а$/.test(w)) {
      const s = w.slice(0, -1), y = soft.test(s) ? 'и' : 'ы';
      sg = [w, s + y, s + 'е', s + 'у', s + 'ой', s + 'е']; pl = [s + y, s, s + 'ам', s + y, s + 'ами', s + 'ах'];
    } else if (/ия$/.test(w)) {
      const s = w.slice(0, -1);
      sg = [w, s + 'и', s + 'и', s + 'ю', s + 'ей', s + 'и']; pl = [s + 'и', s + 'й', s + 'ям', s + 'и', s + 'ями', s + 'ях'];
    } else if (/я$/.test(w)) {
      const s = w.slice(0, -1);
      sg = [w, s + 'и', s + 'е', s + 'ю', s + 'ей', s + 'е']; pl = [s + 'и', s + 'ь', s + 'ям', s + 'и', s + 'ями', s + 'ях'];
    } else if (/о$/.test(w)) {
      const s = w.slice(0, -1);
      sg = [w, s + 'а', s + 'у', w, s + 'ом', s + 'е']; pl = [s + 'а', s, s + 'ам', s + 'а', s + 'ами', s + 'ах'];
    } else if (/е$/.test(w)) {
      const s = w.slice(0, -1);
      sg = [w, s + 'я', s + 'ю', w, s + 'ем', s + 'е']; pl = [s + 'я', s + 'ей', s + 'ям', s + 'я', s + 'ями', s + 'ях'];
    } else if (/й$/.test(w)) {
      const s = w.slice(0, -1);
      sg = [w, s + 'я', s + 'ю', w, s + 'ем', s + 'е']; pl = [s + 'и', s + 'ев', s + 'ям', s + 'и', s + 'ями', s + 'ях'];
    } else if (/ь$/.test(w)) {          // masculine and feminine both
      const s = w.slice(0, -1);
      sg = [w, s + 'я', s + 'ю', w, s + 'ем', s + 'е'];
      const f = [w, s + 'и', s + 'и', w, w + 'ю', s + 'и'];
      pl = [s + 'и', s + 'ей', s + 'ям', s + 'и', s + 'ями', s + 'ях'];
      return { sg, pl, alt: f };
    } else if (/[бвгджзклмнпрстфхцчшщ]$/.test(w)) {
      const y = soft.test(w) ? 'и' : 'ы', ov = /[жшщч]$/.test(w) ? 'ей' : 'ов';
      sg = [w, w + 'а', w + 'у', w, w + 'ом', w + 'е']; pl = [w + y, w + ov, w + 'ам', w + y, w + 'ами', w + 'ах'];
      const alt = [w, w + 'а', w + 'у', w + 'а', w + 'ем', w + 'е'];   // animate accusative = genitive; -ем after ж ш ч щ ц
      return { sg, pl, alt };
    } else {
      sg = [w, w, w, w, w, w]; pl = sg;       // кафе, метро, кино: indeclinable
    }
    return { sg, pl };
  }
  const ADJ_END = ['ый', 'ий', 'ой', 'ая', 'яя', 'ое', 'ее', 'ые', 'ие', 'ого', 'его', 'ому', 'ему', 'ую', 'юю', 'ым', 'им', 'ых', 'их', 'ом', 'ем', 'ыми', 'ими'];

  function addTo(map, key, val) {
    key = fold(key);
    if (!key) return;
    const a = map.get(key);
    const same = x => x.v === val.v && x.tense === val.tense && x.form === val.form && x.p === val.p && x.num === val.num && x.tail === val.tail;
    if (a) { if (!a.some(same)) a.push(val); } else map.set(key, [val]);
  }
  const LOW_CATS = /analytic|business|economy/i;
  function addNom(map, key, kk, cases, pl, pos, cat) {
    key = fold(key);
    const a = map.get(key) || [];
    let e = a.find(x => x.kk === kk && x.pl === pl);
    if (!e) { e = { kk, cases: new Set(), pl, pos, low: LOW_CATS.test(cat || '') }; a.push(e); map.set(key, a); }
    cases.forEach(c => e.cases.add(c));
  }

  const foldKeys = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [fold(k), v]));
  let FK = null;
  function init(WORDS) {
    FK = { TIME: foldKeys(L.TIME), PLACE_ADV: foldKeys(L.PLACE_ADV), ADV: foldKeys(L.ADV), LANG_ADV: foldKeys(L.LANG_ADV), QWORD: foldKeys(L.QWORD), RU_LANG_ADJ: foldKeys(L.RU_LANG_ADJ),
      IMP_RU: foldKeys(L.IMP_RU), RU_PRON: foldKeys(RU_PRON), RU_POSS: foldKeys(RU_POSS), RU_POSS3: foldKeys(RU_POSS3), RU_DEM: foldKeys(RU_DEM), RU_PREP: foldKeys(RU_PREP), RU_QCASE: foldKeys(RU_QCASE) };
    NOM = { ru: new Map(), en: new Map() };
    VERB = { ru: new Map(), en: new Map() };
    (WORDS || []).forEach(entry => {
      const enShown = shown(entry.en);
      if (enShown.some(v => /^to\s/i.test(v))) return;                  // verbs come from the lexicon
      if (entry.category === 'Basic Phrases' && !/^(jaqsı|jaman|durıs|qáte|járdem)$/i.test(entry.kk)) return;   // interjections and pronouns stay out
      if (entry.category === 'Directions & Places') return;                                                        // за, слева: postpositions, not nouns
      const kk = kkHead(entry);
      if (!kk || /\s/.test(kk) && kk.split(' ').length > 2) return;
      const isNum = entry.category === 'Numbers';
      const isAdj = /adjective/i.test(entry.category || '') || shown(entry.ru).some(r => /(ый|ий|ой)$/.test(r.toLowerCase().trim()));
      shown(entry.ru).forEach(r => {
        const raw = String(r).toLowerCase().replace(/[!?.]/g, '').trim();
        const w = fold(r);
        if (!w || /\s/.test(w) || w.length < 3) return;
        if (/(ый|ий|ой)$/.test(raw) && raw.length > 3) {                // adjective: all endings lead to it
          const st = raw.slice(0, -2);
          ADJ_END.forEach(e => addNom(NOM.ru, st + e, kk, ['adj'], false, 'adj'));
          ['', 'а', 'о', 'ы'].forEach(e => { if (!NOM.ru.has(fold(st + e))) addNom(NOM.ru, st + e, kk, ['adj'], false, 'adj'); });   // short forms: счастлив, красива
          return;
        }
        if (isNum) { addNom(NOM.ru, w, NUM_KK[w] || kk.toLowerCase(), ['nom', 'acc'], false, 'num'); return; }
        const f = ruNounForms(raw);
        const put = (forms, pl) => forms.forEach((form, i) => { if (form !== '-') addNom(NOM.ru, form, kk, [CASES[i]], pl, 'n', entry.category); });
        put(f.sg, false); put(f.pl, true); if (f.alt) put(f.alt, false);
      });
      enShown.forEach(e => {
        const w = fold(e).replace(/^(a|an|the) /, '');
        if (!w || w.split(' ').length > 2) return;
        if (isNum) { addNom(NOM.en, w, NUM_KK[w] || kk.toLowerCase(), ['nom'], false, 'num'); return; }
        if (isAdj) { addNom(NOM.en, w, kk, ['adj'], false, 'adj'); return; }
        addNom(NOM.en, w, kk, ['nom'], false, 'n', entry.category);
        const pl = EN_PL_IRREG[w] || (/(s|x|z|ch|sh)$/.test(w) ? w + 'es' : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : w + 's');
        addNom(NOM.en, pl, kk, ['nom'], true, 'n', entry.category);
      });
    });
    Object.entries(L.PLACES).forEach(([w, kk]) => {
      if (/[a-z]/.test(w)) { addNom(NOM.en, w, kk, ['nom'], false, 'place'); return; }
      const f = ruNounForms(w);
      f.sg.forEach((form, i) => addNom(NOM.ru, form, kk, [CASES[i]], false, 'place'));
    });
    Object.entries(NUM_KK).forEach(([w, kk]) => { NOM[/[a-z]/.test(w) ? 'en' : 'ru'].set(fold(w), [{ kk, cases: new Set(['nom', 'acc']), pl: false, pos: 'num' }]); });
    // verbs
    L.VERBS.forEach(v => {
      v.ru.forEach(([inf, o = {}]) => {
        const { pres, past } = L.ruForms(inf, o);
        addTo(VERB.ru, inf, { v, tense: 'inf', pf: o.pf, habit: o.habit, study: o.study, speak: o.speak, eat: o.eat });
        const P = ['1s', '2s', '3s', '1p', '2p', '3p'];
        pres.forEach((f, i) => { if (f !== '-') addTo(VERB.ru, f, { v, tense: o.pf ? 'fut' : 'pres', p: P[i], pf: o.pf, habit: o.habit, study: o.study, speak: o.speak, eat: o.eat, act: o.act, k: f }); });
        past.forEach((f, i) => addTo(VERB.ru, f, { v, tense: 'past', num: i === 3 ? 'pl' : 'sg', pf: o.pf, habit: o.habit, study: o.study, speak: o.speak, k: f }));
      });
      v.en.forEach(([base, pst, part]) => {
        const words = base.split(' ');
        const head = words[0], tail = words.slice(1).join(' ');
        const reg = head.endsWith('e') ? head + 'd' : /[^aeiou]y$/.test(head) ? head.slice(0, -1) + 'ied' : head + 'ed';
        const s3 = /(s|x|z|ch|sh|o)$/.test(head) ? head + 'es' : /[^aeiou]y$/.test(head) ? head.slice(0, -1) + 'ies' : head + 's';
        const ing = head.endsWith('ie') ? head.slice(0, -2) + 'ying' : /[^e]e$/.test(head) ? head.slice(0, -1) + 'ing' : /^(run|swim|sit|get|win|put|stop|hit|cut|begin)$/.test(head) ? head + head.slice(-1) + 'ing' : head + 'ing';
        const pastHead = pst ? pst.split(' ')[0] : (/^(stop|plan)$/.test(head) ? head + head.slice(-1) + 'ed' : reg);
        const partHead = part ? part.split(' ')[0] : pastHead;
        const add = (form, tag) => addTo(VERB.en, form, { v, form: tag, tail, k: form });
        add(head, 'base'); add(s3, 's'); add(pastHead, 'past'); add(partHead, 'part'); add(ing, 'ing');
      });
    });
  }
  const EN_PL_IRREG = { child: 'children', man: 'men', woman: 'women', person: 'people', tooth: 'teeth', foot: 'feet', mouse: 'mice', leaf: 'leaves', knife: 'knives', wife: 'wives', fish: 'fish', sheep: 'sheep' };

  // ---------------------------------------------------------------- closed classes
  const RU_PRON = {
    'я': ['1s', 'nom'], 'ты': ['2s', 'nom'], 'он': ['3s', 'nom'], 'она': ['3s', 'nom'], 'оно': ['3s', 'nom'], 'мы': ['1p', 'nom'], 'вы': ['2p', 'nom'], 'они': ['3p', 'nom'],
    'меня': ['1s', 'acc gen'], 'тебя': ['2s', 'acc gen'], 'его': ['3s', 'acc gen'], 'него': ['3s', 'acc gen'], 'ее': ['3s', 'acc gen'], 'нее': ['3s', 'acc gen'], 'нас': ['1p', 'acc gen'], 'вас': ['2p', 'acc gen'], 'их': ['3p', 'acc gen'], 'них': ['3p', 'acc gen'],
    'мне': ['1s', 'dat prep'], 'тебе': ['2s', 'dat prep'], 'ему': ['3s', 'dat'], 'нему': ['3s', 'dat'], 'ей': ['3s', 'dat ins'], 'неи': ['3s', 'dat ins prep'], 'нам': ['1p', 'dat'], 'вам': ['2p', 'dat'], 'им': ['3p', 'dat'], 'ним': ['3p', 'dat ins'],
    'мнои': ['1s', 'ins'], 'тобои': ['2s', 'ins'], 'нами': ['1p', 'ins'], 'вами': ['2p', 'ins'], 'ими': ['3p', 'ins'], 'ними': ['3p', 'ins'], 'нем': ['3s', 'prep'], 'ней': ['3s', 'dat ins prep'],
  };
  const RU_POSS = {};
  [['мои', '1s'], ['мой', '1s'], ['моя', '1s'], ['мое', '1s'], ['мою', '1s'], ['моего', '1s'], ['моеи', '1s'], ['моему', '1s'], ['моим', '1s'], ['моих', '1s'], ['моем', '1s'], ['моими', '1s'],
    ['твой', '2s'], ['твои', '2s'], ['твоя', '2s'], ['твое', '2s'], ['твою', '2s'], ['твоего', '2s'], ['твоеи', '2s'], ['твоему', '2s'], ['твоим', '2s'], ['твоих', '2s'], ['твоем', '2s'],
    ['наш', '1p'], ['наша', '1p'], ['наше', '1p'], ['нашу', '1p'], ['нашего', '1p'], ['нашеи', '1p'], ['нашему', '1p'], ['нашим', '1p'], ['наших', '1p'], ['наши', '1p'], ['нашем', '1p'],
    ['ваш', '2p'], ['ваша', '2p'], ['ваше', '2p'], ['вашу', '2p'], ['вашего', '2p'], ['вашеи', '2p'], ['вашему', '2p'], ['вашим', '2p'], ['ваших', '2p'], ['ваши', '2p'], ['вашем', '2p'],
    ['свой', 'self'], ['свою', 'self'], ['своего', 'self'], ['своеи', 'self'], ['свои', 'self'], ['своих', 'self'], ['своим', 'self'], ['своему', 'self'], ['свое', 'self']].forEach(([k, p]) => { RU_POSS[k] = p; });
  const RU_POSS3 = { 'его': '3s', 'ее': '3s', 'их': '3p' };     // possessive only when a noun follows
  const RU_DEM = {};
  ['этот', 'эта', 'это', 'эту', 'этого', 'этои', 'этому', 'этим', 'этих', 'эти', 'этом'].forEach(k => { RU_DEM[k] = 'bul'; });
  ['тот', 'та', 'то', 'ту', 'того', 'тои', 'тому', 'тем', 'тех', 'те', 'том'].forEach(k => { RU_DEM[k] = 'sol'; });
  const RU_PREP = { 'в': 'in', 'во': 'in', 'на': 'in', 'из': 'from', 'от': 'from', 'с': 'with', 'со': 'with', 'к': 'to', 'ко': 'to', 'у': 'at', 'для': 'for', 'о': 'about', 'об': 'about', 'про': 'about', 'без': 'without', 'до': 'until', 'после': 'after' };
  const RU_BE_PAST = { 'был': 'sg', 'была': 'sg', 'было': 'sg', 'были': 'pl' };
  const RU_BE_FUT = { 'буду': '1s', 'будешь': '2s', 'будет': '3s', 'будем': '1p', 'будете': '2p', 'будут': '3p' };
  const RU_NEED = new Set(['надо', 'нужно', 'необходимо', 'должен', 'должна', 'должно', 'должны']);
  const RU_QCASE = { 'кого': ['kim', 'acc'], 'кому': ['kim', 'dat'], 'кем': ['kim', 'with'], 'чем': ['ne', 'with'], 'что': ['ne', 'acc'], 'кто': ['kim', 'nom'] };

  const EN_PRON = { i: ['1s', 'nom'], you: ['2s', 'nom acc'], he: ['3s', 'nom'], she: ['3s', 'nom'], it: ['3s', 'nom acc'], we: ['1p', 'nom'], they: ['3p', 'nom'], me: ['1s', 'acc'], him: ['3s', 'acc'], her: ['3s', 'acc'], us: ['1p', 'acc'], them: ['3p', 'acc'] };
  const EN_POSS = { my: '1s', your: '2s', his: '3s', her: '3s', its: '3s', our: '1p', their: '3p' };
  const EN_DEM = { this: 'bul', these: 'bul', that: 'sol', those: 'sol' };
  const EN_PREP = { in: 'in_loc', at: 'in_loc', on: 'in_loc', to: 'to', into: 'to', from: 'from', with: 'with', for: 'for', about: 'about', without: 'without', until: 'until', after: 'after' };
  const EN_CONTR = [[/\bi'm\b/g, 'i am'], [/\b(you|we|they)'re\b/g, '$1 are'], [/\b(he|she|it|that)'s\b/g, '$1 is'], [/\bcan't\b/g, 'can not'], [/\bcannot\b/g, 'can not'], [/\bwon't\b/g, 'will not'], [/\b(\w+)n't\b/g, '$1 not'], [/\b(\w+)'ll\b/g, '$1 will'], [/\b(\w+)'ve\b/g, '$1 have'], [/\bi'd like\b/g, 'i want'], [/\bwould like\b/g, 'want'], [/\bwanna\b/g, 'want to'], [/\bgonna\b/g, 'going to'], [/\blet's\b/g, "let us"]];

  // ---------------------------------------------------------------- noun phrase → Karakalpak
  // np = { words: [kk...], head: kk, pl, poss: person|null, possExplicit, dem, def, num }
  function npText(np, kase) {
    if (np.conj && np.conj.length) {
      np.conj.forEach(x => { if (np.poss && !x.poss && !x.dem && !x.pron) { x.poss = np.poss; x.possExplicit = false; } });
      const parts = [Object.assign({}, np, { conj: null, pl: np.plOwn })].concat(np.conj);
      return parts.map(x => npText(x, kase)).join(' hám ');
    }
    if (np.pron) {
      const P = M.PRON[np.pron];
      return { nom: P.nom, acc: P.acc, gen: P.gen, dat: P.dat, loc: P.loc, abl: P.abl, with: P.with, for: P.for, about: P.about, without: P.nom + (np.pron === '1s' || np.pron === '2s' || np.pron === '1p' || np.pron === '2p' ? 'siz' : 'sız') }[kase] || P.nom;
    }
    if (np.fixed) return np.fixed;                       // úyde, bul jerde
    if (!np.head) return np.mods.join(' ');              // an adjective alone (predicate): baxıtlı
    let head = np.head;
    if (np.pl && !np.num) head = M.PL(head);
    let p3 = false, p12 = false;
    if (np.poss) { head = M.poss(head, np.poss); p3 = np.poss === '3s' || np.poss === '3p'; p12 = np.poss === '1s' || np.poss === '2s'; }
    let tail;
    switch (kase) {
      case 'with': tail = M.withP(head); break;
      case 'for': tail = M.forP(head); break;
      case 'about': tail = M.aboutP(head); break;
      case 'without': tail = M.without(head); break;
      case 'until': tail = M.kase(head, 'dat', p3, p12) + ' shekem'; break;
      case 'after': tail = M.kase(head, 'abl', p3) + ' keyin'; break;
      default: tail = M.kase(head, kase, p3, p12);
    }
    const pre = [];
    if (np.possExplicit && np.poss) pre.push(M.PRON[np.poss].gen);
    if (np.dem) pre.push(np.dem);
    if (np.num) pre.push(np.num);
    np.mods.forEach(m => pre.push(m));
    return pre.concat([tail]).join(' ');
  }

  // ---------------------------------------------------------------- verb phrase → Karakalpak
  function splitKk(kk) { const w = kk.split(' '); return { pre: w.slice(0, -1).join(' '), st: w[w.length - 1] }; }
  function vp(f) {
    const p = f.person, o = { tense: f.tense, neg: f.neg, q: f.yesno };
    if (f.modal === 'want' || f.modal === 'can' || f.modal === 'need' || f.modal === 'like') {
      const { pre, st } = splitKk(f.verb.kk);
      const fn = { want: M.want, can: M.can, need: M.need, like: M.likeDoing }[f.modal];
      const mo = { tense: f.modalTense, neg: f.neg, q: f.yesno, prog: f.modalProg && f.neg, now: f.now };
      return (pre ? pre + ' ' : '') + fn(st, p, mo);
    }
    const { pre, st } = splitKk(f.verb.kk);
    return (pre ? pre + ' ' : '') + M.conj(st, p, o);
  }

  // ---------------------------------------------------------------- tokenizer
  function tokenize(raw, lang) {
    let s = String(raw || '').trim();
    const q = /\?\s*$/.test(s), excl = /!\s*$/.test(s);
    s = s.replace(/[’`]/g, "'");
    if (lang === 'en') { s = s.toLowerCase(); EN_CONTR.forEach(([re, to]) => { s = s.replace(re, to); }); }
    const out = [];
    s.split(/\s+/).forEach((t, i) => {
      const clean = t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
      if (!clean) return;
      const capital = i > 0 && /^\p{Lu}/u.test(clean);
      out.push({ raw: clean, k: fold(clean).replace(/'/g, ''), capital });
    });
    // по-английски / по английски / in English
    for (let i = 0; i < out.length; i++) {
      if ((out[i].k === 'по' || out[i].k === 'in') && out[i + 1]) {
        const key = out[i].k === 'по' ? 'по-' + out[i + 1].k.replace(/^-/, '') : out[i + 1].k;
        if (FK.LANG_ADV[key]) { out.splice(i, 2, { raw: key, k: key, lang: FK.LANG_ADV[key] }); }
      }
      if (/^по-/.test(out[i].k) && FK.LANG_ADV[out[i].k]) out[i].lang = FK.LANG_ADV[out[i].k];
    }
    return { toks: out, q, excl };
  }

  // ---------------------------------------------------------------- Russian
  function parseRu(toks) {
    const items = [];
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i], k = t.k, next = toks[i + 1] && toks[i + 1].k;
      if (t.lang) { items.push({ t: 'adv', kk: t.lang }); continue; }
      const la = Object.keys(FK.RU_LANG_ADJ).find(st => k.startsWith(st) && k.length - st.length <= 3);
      if (la) { items.push({ t: 'adv', kk: FK.RU_LANG_ADJ[la] }); if (next === 'язык' || next === 'языку' || next === 'языка') i++; continue; }
      // «давай пойдём домой» → Úyge barayıq; «пусть он придёт» → Ol kelsin (book: kireyik, asıqpayıq, kelsin, qorqpasın)
      if ((k === 'даваи' || k === 'даваите') && i === 0 && toks[i + 1]) {          // folded: й → и
        const vk = toks[i + 1].k === 'не' && toks[i + 2] ? toks[i + 2].k : toks[i + 1].k;
        const vc = VERB.ru.get(vk) || [];
        if (vc.some(c => c.p === '1p' || c.tense === 'inf')) { items.push({ t: 'lets' }); continue; }
      }
      if (k === 'пусть' && i === 0) { items.push({ t: 'let3' }); continue; }
      if (k === 'по' && next && items.some(x => x.t === 'verb' && x.cands.some(c => c.v && c.v.po))) { items.push({ t: 'prep', rel: 'po', w: k }); continue; }
      if (k === 'не') { items.push({ t: 'neg' }); continue; }
      if (k === 'ли') { items.push({ t: 'li' }); continue; }
      if (k === 'и') { items.push({ t: 'and' }); continue; }
      if (k === 'нет') { items.push({ t: 'net' }); continue; }
      if (k === 'есть' && items.some(x => x.t === 'owner')) { items.push({ t: 'est' }); continue; }
      if (FK.RU_QCASE[k] && !(k === 'что' && items.length > 0 && items[items.length - 1].t !== 'prep')) {
        const [kk, c] = FK.RU_QCASE[k]; items.push({ t: 'qw', kk, kase: c }); continue;
      }
      if (FK.QWORD[k]) { items.push({ t: 'qw', kk: FK.QWORD[k], kase: null }); continue; }
      if (FK.TIME[k]) { items.push({ t: 'time', kk: FK.TIME[k], now: k === 'сейчас', never: k === 'никогда' }); continue; }
      if (FK.PLACE_ADV[k]) { items.push({ t: 'place', kk: FK.PLACE_ADV[k] }); continue; }
      if (FK.ADV[k]) { items.push({ t: FK.ADV[k] === '@also' ? 'also' : 'adv', kk: FK.ADV[k] }); continue; }
      if (RU_BE_PAST[k]) { items.push({ t: 'bepast', num: RU_BE_PAST[k] }); continue; }
      if (RU_BE_FUT[k]) { items.push({ t: 'befut', p: RU_BE_FUT[k] }); continue; }
      if (RU_NEED.has(k)) { items.push({ t: 'need' }); continue; }
      if (FK.RU_PREP[k] && next) {
        if (k === 'у' && (FK.RU_PRON[next] || NOM.ru.get(next))) { items.push({ t: 'owner' }); continue; }
        items.push({ t: 'prep', rel: FK.RU_PREP[k], w: k }); continue;
      }
      if (FK.RU_POSS[k]) { items.push({ t: 'poss', p: FK.RU_POSS[k] }); continue; }
      if (FK.RU_POSS3[k] && next && (NOM.ru.get(next) || FK.RU_POSS[next]) && !VERB.ru.get(next)) { items.push({ t: 'poss', p: FK.RU_POSS3[k], explicit: true }); continue; }
      if (k === 'это' && (i === 0 || items.every(x => x.t === 'qw' || x.t === 'neg'))) { items.push({ t: 'eto' }); continue; }
      if (FK.RU_DEM[k] && next && NOM.ru.get(next)) { items.push({ t: 'dem', kk: FK.RU_DEM[k] }); continue; }
      if (FK.RU_PRON[k]) { const [p, cs] = FK.RU_PRON[k]; items.push({ t: 'pron', p, cases: new Set(cs.split(' ')) }); continue; }
      const imp = FK.IMP_RU[k];
      const vs = VERB.ru.get(k);
      if (imp || vs) {
        // "говорите" is both "you speak" and "speak!": with a subject it is the present
        const cands = (vs || []).slice();
        if (imp) {
          const ic = { v: L.VERBS.find(x => x.kk === imp), tense: 'imp', p: /(те|тесь)$/.test(k) ? '2p' : '2s' };
          if (items.some(x => x.t === 'pron' && x.cases.has('nom'))) cands.push(ic); else cands.unshift(ic);
        }
        items.push({ t: 'verb', cands }); continue;
      }
      const ns = NOM.ru.get(k);
      if (ns) { items.push({ t: 'nom', cands: ns, capital: t.capital, raw: t.raw }); continue; }
      return null;                                         // unknown word (or an unknown Russian name): not covered
    }
    return items;
  }

  // ---------------------------------------------------------------- English
  function parseEn(toks) {
    const items = [];
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i], k = t.k, next = toks[i + 1] && toks[i + 1].k, n2 = toks[i + 2] && toks[i + 2].k;
      if (t.lang) { items.push({ t: 'adv', kk: t.lang }); continue; }
      if (FK.LANG_ADV[k]) { items.push({ t: 'adv', kk: FK.LANG_ADV[k] }); if (next === 'language') i++; continue; }
      if (k === 'please') { items.push({ t: 'please' }); continue; }
      if (k === 'a' || k === 'an') { items.push({ t: 'art', def: false }); continue; }
      if (k === 'the') { items.push({ t: 'art', def: true }); continue; }
      if (k === 'not' || k === 'no' && items.length && items[items.length - 1].t === 'have') { items.push({ t: 'neg' }); continue; }
      if (k === 'and') { items.push({ t: 'and' }); continue; }
      if ((k === 'how') && (next === 'much' || next === 'many')) { items.push({ t: 'qw', kk: FK.QWORD['how ' + next] }); i++; continue; }
      if (k === 'what' && (next === 'a' || next === 'an')) return null;      // "what a …!" is an exclamation
      if (FK.QWORD[k]) { items.push({ t: 'qw', kk: FK.QWORD[k], kase: k === 'who' ? 'nom' : k === 'what' ? 'acc' : null }); continue; }
      if (FK.TIME[k]) { items.push({ t: 'time', kk: FK.TIME[k], now: k === 'now', never: k === 'never' }); continue; }
      if (k === 'right' && next === 'now') { items.push({ t: 'time', kk: 'házir', now: true }); i++; continue; }
      if (k === 'at' && next === 'home') { items.push({ t: 'place', kk: 'úyde' }); i++; continue; }
      if ((k === 'a' && (next === 'lot' || next === 'little'))) { items.push({ t: 'adv', kk: FK.ADV['a ' + next] }); i++; continue; }
      if (FK.PLACE_ADV[k]) { items.push({ t: 'place', kk: FK.PLACE_ADV[k] }); continue; }
      if (FK.ADV[k] && !(NOM.en.get(k) && items.length && items[items.length - 1].t === 'art')) { items.push({ t: FK.ADV[k] === '@also' ? 'also' : 'adv', kk: FK.ADV[k] }); continue; }
      if (['am', 'is', 'are'].includes(k)) { items.push({ t: 'be', tense: 'pres', w: k }); continue; }
      if (['was', 'were'].includes(k)) { items.push({ t: 'be', tense: 'past', w: k }); continue; }
      if (k === 'be' || k === 'been') { items.push({ t: 'bebase' }); continue; }
      if (['do', 'does', 'did'].includes(k) && !items.some(x => x.t === 'do') && !(items.some(x => x.t === 'pron' || x.t === 'nom') && !items.some(x => x.t === 'verb') && !next)) {
        // auxiliary unless it is the main verb ("I do it")
        if (next && !FK.TIME[next] && (next === 'not' || EN_PRON[next] || VERB.en.get(next) || NOM.en.get(next) || EN_POSS[next] || next === 'the')) { items.push({ t: 'do', tense: k === 'did' ? 'past' : 'pres' }); continue; }
      }
      if (k === 'will' || k === 'shall') { items.push({ t: 'will' }); continue; }
      if (k === 'going' && next === 'to' && n2 && VERB.en.get(n2)) { items.push({ t: 'will' }); i++; continue; }
      if (k === 'can' || k === 'could') { items.push({ t: 'can', tense: k === 'could' ? 'past' : 'pres' }); continue; }
      if (k === 'able' && next === 'to') { items.push({ t: 'can', tense: 'pres' }); i++; continue; }
      if ((k === 'need' || k === 'must' || k === 'should' || ((k === 'have' || k === 'has') && next === 'to')) && (next === 'to' || VERB.en.get(next))) { items.push({ t: 'need', tense: 'pres' }); if (next === 'to') i++; continue; }
      if (k === 'had' && next === 'to') { items.push({ t: 'need', tense: 'past' }); i++; continue; }
      if ((k === 'want' || k === 'wants' || k === 'wanted') && next === 'to') { items.push({ t: 'want', tense: k === 'wanted' ? 'past' : 'pres' }); i++; continue; }
      if ((k === 'like' || k === 'likes' || k === 'love' || k === 'loves' || k === 'liked' || k === 'loved') && next === 'to') { items.push({ t: 'like', tense: /d$/.test(k) ? 'past' : 'pres' }); i++; continue; }
      if (['have', 'has', 'had'].includes(k) && !(next === 'got')) {
        const isAux = next && VERB.en.get(next) && VERB.en.get(next).some(x => x.form === 'part' || x.form === 'past');
        if (isAux && !NOM.en.get(next)) { items.push({ t: 'perf' }); continue; }
        items.push({ t: 'have', tense: k === 'had' ? 'past' : 'pres' }); continue;
      }
      if (k === 'let' && next === 'us') { items.push({ t: 'lets' }); i++; continue; }
      if (k === 'let' && i === 0 && (next === 'him' || next === 'her' || next === 'them')) { items.push({ t: 'let3' }); items.push({ t: 'pron', p: EN_PRON[next][0], cases: new Set(['nom']) }); i++; continue; }
      if (/^(like|likes|love|loves|liked|loved|enjoy|enjoys)$/.test(k) && next && (VERB.en.get(next) || []).some(x => x.form === 'ing')) { items.push({ t: 'like', tense: /d$/.test(k) ? 'past' : 'pres' }); continue; }
      if ((k === 'afraid' || k === 'scared') && items.some(x => x.t === 'be')) {
        items.push({ t: 'verb', cands: [{ v: L.VERBS.find(v => v.kk === 'qorq'), form: 'base' }] });
        if (next === 'of') { items.push({ t: 'prep', rel: 'from' }); i++; }
        continue;
      }
      if (EN_PREP[k] && next) {
        if (k === 'to' && VERB.en.get(next) && items.length && ['want', 'like', 'need', 'can'].includes(items[items.length - 1].t)) continue;
        items.push({ t: 'prep', rel: EN_PREP[k] }); continue;
      }
      if (EN_POSS[k] && next && !(k === 'her' && !NOM.en.get(next) && !FK.ADV[next])) {
        if (NOM.en.get(next) || (toks[i + 2] && NOM.en.get(toks[i + 2].k))) { items.push({ t: 'poss', p: EN_POSS[k], explicit: true }); continue; }
      }
      if (EN_DEM[k] && next && NOM.en.get(next)) { items.push({ t: 'dem', kk: EN_DEM[k], pl: k === 'these' || k === 'those' }); continue; }
      if ((k === 'this' || k === 'that' || k === 'it') && items.length === 0) { items.push({ t: 'eto' }); continue; }
      if (EN_PRON[k]) { const [p, cs] = EN_PRON[k]; items.push({ t: 'pron', p, cases: new Set(cs.split(' ')) }); continue; }
      // two-word verbs (look for, wake up, come back)
      if (next) {
        const two = VERB.en.get(k + ' ' + next) || null;
        const multi = (VERB.en.get(k) || []).filter(x => x.tail && x.tail === next);
        if (multi.length) { items.push({ t: 'verb', cands: multi }); i++; continue; }
        if (two) { items.push({ t: 'verb', cands: two }); i++; continue; }
      }
      const vs = (VERB.en.get(k) || []).filter(x => !x.tail);
      const ns = NOM.en.get(k);
      if (vs.length && !(ns && items.length && ['art', 'poss', 'dem', 'prep'].includes(items[items.length - 1].t))) { items.push({ t: 'verb', cands: vs }); continue; }
      if (ns) { items.push({ t: 'nom', cands: ns, capital: t.capital, raw: t.raw }); continue; }
      if (t.capital || (i > 0 && /^[A-Z]/.test(t.raw))) { items.push({ t: 'name', raw: t.raw }); continue; }
      return null;
    }
    return items;
  }

  // ---------------------------------------------------------------- shared: items → frame → Karakalpak
  // Collect noun phrases: [prep] [poss|dem|art|num|adj]* head (noun / name / pronoun)
  function buildNPs(items, lang) {
    const out = [];
    let cur = null;
    const flush = () => { if (cur && (cur.head || cur.pron || cur.mods.length)) out.push(cur); cur = null; };
    const start = () => { if (!cur) cur = { mods: [], head: null, prep: null, poss: null, possExplicit: false, dem: null, def: false, num: null, pl: false, cases: null }; };
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.t === 'prep') { flush(); start(); cur.prep = it.rel; cur.prepW = it.w; cur.idx = i; continue; }
      if (it.t === 'poss') { if (cur && cur.head) flush(); start(); cur.poss = it.p; cur.possExplicit = it.explicit !== false; cur.def = true; if (cur.idx == null) cur.idx = i; continue; }
      if (it.t === 'dem') { if (cur && cur.head) flush(); start(); cur.dem = it.kk; cur.def = true; if (it.pl) cur.pl = true; if (cur.idx == null) cur.idx = i; continue; }
      if (it.t === 'art') { if (cur && cur.head) flush(); start(); cur.def = it.def; if (cur.idx == null) cur.idx = i; continue; }
      if (it.t === 'pron') { if (cur && (cur.head || cur.mods.length)) flush(); start(); cur.pron = it.p; cur.pcases = it.cases; if (cur.idx == null) cur.idx = i; cur.end = i; flush(); continue; }
      if (it.t === 'name') { if (cur && cur.head) flush(); start(); cur.head = cap(it.raw); cur.name = true; cur.def = true; cur.cases = null; if (cur.idx == null) cur.idx = i; cur.end = i; continue; }
      if (it.t === 'nom') {
        const cands = it.cands;
        const num = cands.find(c => c.pos === 'num');
        const adj = cands.find(c => c.pos === 'adj');
        const noun = cands.filter(c => c.pos === 'n' || c.pos === 'place');
        if (cur && cur.head) flush();
        start(); if (cur.idx == null) cur.idx = i;
        if (num && !noun.length) { cur.num = num.kk; continue; }
        // an adjective modifies the next noun; at the end it is a predicate
        const nextIsNoun = items[i + 1] && items[i + 1].t === 'nom' && items[i + 1].cands.some(c => c.pos === 'n');
        if (adj && (nextIsNoun || !noun.length)) { cur.mods.push(adj.kk); cur.adjOnly = !nextIsNoun; cur.end = i; if (!nextIsNoun) flush(); continue; }
        // pick the noun reading: prefer singular, then the one whose cases fit the preposition
        const pick = noun.slice().sort((a, b) => (a.pl - b.pl) || (a.low - b.low))[0];
        cur.head = pick.kk; cur.pl = cur.pl || noun.every(c => c.pl); cur.cases = new Set(); noun.forEach(c => c.cases.forEach(x => cur.cases.add(x)));
        cur.rawHead = it.raw; cur.end = i; cur.adjOnly = false;
        if (pick.pos === 'place') { cur.name = true; cur.def = true; }
        continue;
      }
      if (it.t === 'and' && cur && cur.head && items[i + 1] && (items[i + 1].t === 'nom' || items[i + 1].t === 'poss')) { cur.and = true; flush(); continue; }
      flush();
    }
    flush();
    // "хлеб и молоко" → one group: nan hám sút (each part takes the case)
    const merged = [];
    for (const n of out) {
      const prev = merged[merged.length - 1];
      if (prev && prev.and && !n.prep && !prev.pron && !n.pron) { if (prev.plOwn === undefined) prev.plOwn = prev.pl; (prev.conj = prev.conj || []).push(n); prev.and = !!n.and; prev.pl = true; prev.end = n.end; }
      else merged.push(n);
    }
    return merged;
  }

  function personOfRuPast(num, subj) { return subj || (num === 'pl' ? '3p' : null); }

  function compose(items, lang, flags) {
    const f = { person: null, subj: null, tense: 'pres', neg: false, yesno: false, qw: null, verb: null, modal: null, modalTense: 'pres', times: [], advs: [], also: false, place: null, copula: false, have: null, never: false, now: false, explicitSubj: false };
    // closed items
    items.forEach(it => {
      if (it.t === 'time') { f.times.push(it.kk); if (it.now || it.kk === 'házir') f.now = true; if (it.never || it.kk === 'hesh qashan') f.never = true; }
      if (it.t === 'adv') f.advs.push(it.kk);
      if (it.t === 'also') f.also = true;
      if (it.t === 'qw') f.qw = it;
    });
    if (f.never) f.neg = true;
    const nps = buildNPs(items, lang);
    const verbIdx = items.findIndex(it => it.t === 'verb');
    const negIdx = items.findIndex(it => it.t === 'neg');
    // ---- verb, modal, tense
    const pick = (cands, pred) => cands.find(pred) || cands[0];
    if (lang === 'ru') {
      const vItems = items.map((it, i) => ({ it, i })).filter(x => x.it.t === 'verb');
      const need = items.find(it => it.t === 'need');
      const fut = items.find(it => it.t === 'befut');
      const lets = items.some(it => it.t === 'lets'), let3 = items.some(it => it.t === 'let3');
      if (lets || let3) {
        // «давай поиграем / давай играть» → oynayıq; «пусть он придёт» → ol kelsin
        if (vItems.length !== 1 || fut) return null;
        const cs = vItems[0].it.cands;
        const c = lets ? (cs.find(x => x.p === '1p' && (x.tense === 'fut' || x.tense === 'pres')) || cs.find(x => x.tense === 'inf'))
          : cs.find(x => (x.p === '3s' || x.p === '3p') && (x.tense === 'fut' || x.tense === 'pres'));
        if (!c) return null;
        f.verb = c.v;
        if (lets) { f.imperative1p = true; f.person = '1p'; } else { f.tense = 'imp'; f.imp3 = true; f.person = c.p; }
      } else if (vItems.length === 0) {
        f.copula = true;
        if (items.find(it => it.t === 'bepast')) f.tense = 'past';
        if (fut) f.tense = 'fut', f.person = fut.p;
      } else {
        const first = vItems[0].it, second = vItems[1] && vItems[1].it;
        const fin = first.cands.find(c => c.tense !== 'inf');
        const inf2 = second && second.cands.find(c => c.tense === 'inf');
        if (need && first.cands.find(c => c.tense === 'inf')) {
          f.modal = 'need'; f.verb = first.cands.find(c => c.tense === 'inf').v;
          if (items.find(it => it.t === 'bepast')) f.modalTense = 'past';
        } else if (fin && inf2 && (fin.v.want || fin.v.can || fin.v.like)) {
          f.modal = fin.v.want ? 'want' : fin.v.can ? 'can' : 'like';
          f.verb = inf2.v; f.person = fin.p || null; f.modalTense = fin.tense === 'past' ? 'past' : 'pres';
          if (f.modal === 'can' && fin.tense === 'pres' && inf2.v.situ) f.modalProg = true;
          if (fin.tense === 'past') f.pastNum = fin.num;
          if (vItems.length > 2) return null;
        } else if (fut && first.cands.find(c => c.tense === 'inf')) {
          f.verb = first.cands.find(c => c.tense === 'inf').v; f.tense = 'pres'; f.person = fut.p; f.futAux = true;
        } else if (fin && fin.tense === 'imp') {
          if (vItems.length > 1 || items.some(it => it.t === 'pron' && it.cases.has('nom'))) return null;
          f.verb = fin.v; f.tense = 'imp'; f.person = fin.p; f.imperative = true;
        } else if (fin) {
          if (vItems.length > 1) return null;
          f.verb = fin.v; f.ruVerb = fin;
          if (fin.tense === 'past') { f.tense = 'past'; f.pastNum = fin.num; } else { f.person = fin.p; f.tense = 'pres'; if (fin.tense === 'pres' && fin.v.motion && !fin.habit) f.tense = 'prog'; }
          if (fin.tense === 'pres' && f.now) f.tense = 'prog';
          // Musa (15.10): "Я думаю о тебе" → oylap atırman, "Дети играют" → oynap atır. The plain -man
          // form reads as future or habit, so a Russian present of an activity verb becomes -ıp atır,
          // unless it is a habit (всегда, часто, иногда), a skill (говорю по-английски) or studying.
          const habitual = items.some(it => it.t === 'time' && ['bárha', 'jiyi', 'geyde', 'hesh qashan'].includes(it.kk));
          const skill = items.some(it => it.t === 'adv' && L.LANG_NOUN[it.kk]);
          if (fin.tense === 'pres' && (fin.v.act || fin.act) && !fin.study && !habitual && !(skill && fin.v.kk === 'sóyle')) {
            if (!(fin.v.kk === 'kór' && !fin.act)) f.tense = 'prog';
          }
          // «я скучаю по тебе» → Seni saǵındım (book): the feeling is said in the past
          if (fin.v.pastNow && fin.tense === 'pres' && !habitual) f.tense = 'past';
          if (fin.v.can && !inf2) return null;
        } else return null;
      }
    } else {
      const vItems = items.map((it, i) => ({ it, i })).filter(x => x.it.t === 'verb');
      const be = items.find(it => it.t === 'be');
      const has = items.find(it => it.t === 'have');
      const will = items.some(it => it.t === 'will'), doo = items.find(it => it.t === 'do');
      const mod = items.find(it => ['want', 'can', 'need', 'like'].includes(it.t));
      const lets = items.some(it => it.t === 'lets');
      const head = items.filter(it => it.t !== 'please');
      const impStart = head[0] && (head[0].t === 'verb' && head[0].cands.some(c => c.form === 'base') ||
        head[0].t === 'do' && head[1] && head[1].t === 'neg' && head[2] && head[2].t === 'verb');
      if (items.some(it => it.t === 'let3')) {
        // "let him come" → Ol kelsin
        const b = vItems.length === 1 && vItems[0].it.cands.find(x => x.form === 'base');
        if (!b) return null;
        f.verb = b.v; f.tense = 'imp'; f.imp3 = true;
      } else
      if (impStart && !items.some(it => it.t === 'pron' && it.cases.has('nom') && it.p !== '2s') && !items.some(it => ['be', 'will', 'can', 'want', 'need', 'like', 'have'].includes(it.t))) {
        const vi = head.find(it => it.t === 'verb');
        f.verb = vi.cands[0].v; f.tense = 'imp'; f.person = items.some(it => it.t === 'please') ? '2p' : '2s'; f.imperative = true;
        if (items.some(it => it.t === 'neg')) f.neg = true;
        if (head.filter(it => it.t === 'verb').length > 1) return null;
      } else
      if (lets && vItems.length) { f.imperative1p = true; f.verb = vItems[0].it.cands[0].v; f.person = '1p'; }
      else if (mod && vItems.length) {
        f.modal = mod.t; f.verb = vItems[0].it.cands[0].v; f.modalTense = mod.tense || 'pres';
        if (vItems.length > 1) return null;
      } else if (vItems.length) {
        if (vItems.length > 1) return null;
        const c = vItems[0].it.cands;
        const ing = c.find(x => x.form === 'ing');
        if (be && ing) { f.verb = ing.v; f.tense = be.tense === 'past' ? 'past' : 'prog'; }
        else if (doo) { f.verb = c[0].v; f.tense = doo.tense === 'past' ? 'past' : 'pres'; }
        else if (will) { f.verb = c[0].v; f.tense = 'pres'; }
        else if (items.some(it => it.t === 'perf')) { f.verb = c[0].v; f.tense = 'past'; }
        else {
          const past = c.find(x => x.form === 'past'), s = c.find(x => x.form === 's'), base = c.find(x => x.form === 'base');
          if (past && (!base || f.times.includes('keshe'))) { f.verb = past.v; f.tense = 'past'; }
          else if (s) { f.verb = s.v; f.tense = 'pres'; f.s3 = true; }
          else if (base) { f.verb = base.v; f.tense = 'pres'; }
          else return null;
        }
        if (f.now && f.tense === 'pres') f.tense = 'prog';
        if (f.verb && f.verb.pastNow && (f.tense === 'pres' || f.tense === 'prog') && !will) f.tense = 'past';    // I miss you → Seni saǵındım
      } else if (has) { f.have = { neg: items.some(it => it.t === 'neg'), past: has.tense === 'past' }; }
      else if (be) { f.copula = true; if (be.tense === 'past') f.tense = 'past'; }
      else if (will && items.some(it => it.t === 'bebase')) { f.copula = true; f.tense = 'fut'; }
      else return null;
      if (items.some(it => it.t === 'neg')) f.neg = true;
      // question: aux first, or "?" with aux before the subject
      const firstT = items[0] && items[0].t;
      if (!f.imperative && (['be', 'do', 'will', 'can', 'need', 'have'].includes(firstT) || (firstT === 'qw' && items[1] && ['be', 'do', 'will', 'can'].includes(items[1].t)))) flags.q = true;
    }
    if (lang === 'ru') {
      // negation: не right before the verb / modal / predicate
      if (negIdx >= 0) f.neg = true;
      if (items.some(it => it.t === 'li')) flags.q = true;
    }
    // ---- RU "у меня есть / нет"
    const ownerIdx = items.findIndex(it => it.t === 'owner');
    if (lang === 'ru' && ownerIdx >= 0) {
      const ownerNp = nps.find(n => n.idx === ownerIdx + 1 || n.idx === ownerIdx);
      const rest = nps.filter(n => n !== ownerNp && n.idx > ownerIdx + 1);
      if (!ownerNp || rest.length !== 1) return null;
      f.have = { owner: ownerNp, thing: rest[0], neg: items.some(it => it.t === 'net' || it.t === 'neg'), past: items.some(it => it.t === 'bepast') };
      if (f.verb) return null;
    }
    // ---- subject
    let subj = null;
    if (!f.have || lang === 'en') {
      const eto = items.some(it => it.t === 'eto');
      const placeOrQ = items.some(it => it.t === 'place' || it.t === 'qw') || nps.some(n => n.prep);
      subj = nps.find(n => !n.prep && n.pron && n.pcases.has('nom') && (verbIdx < 0 || n.idx < verbIdx || lang === 'en' && flags.q)) ||
             (eto ? null : nps.find(n => !n.prep && !n.pron && (n.head || n.mods.length) && (lang === 'en' || !n.cases || n.cases.has('nom')) && (verbIdx < 0 || n.idx < verbIdx || lang === 'en' && flags.q) &&
               (!f.copula || n !== nps.filter(x => !x.prep).slice(-1)[0] || placeOrQ)));
    }
    if (lang === 'en' && f.have) { subj = nps.find(n => n.pron && n.pcases.has('nom')) || nps.find(n => !n.prep && !n.pron); }
    // "мне надо идти": the one who needs is in the dative → Men barıwım kerek
    if (!subj && f.modal === 'need' && lang === 'ru') {
      subj = nps.find(n => !n.prep && n.pron && n.pcases.has('dat')) || nps.find(n => !n.prep && !n.pron && n.cases && n.cases.has('dat'));
    }
    if (subj) {
      f.subj = subj; f.explicitSubj = true;
      f.person = subj.pron ? subj.pron : (subj.pl ? '3p' : '3s');
    }
    if (items.some(it => it.t === 'eto') && !subj) { f.subj = { fixed: 'bul', mods: [] }; f.person = '3s'; f.explicitSubj = true; f.eto = true; }
    if (!f.person && f.tense === 'past' && lang === 'ru') f.person = personOfRuPast(f.pastNum, null);
    if (!f.person && lang === 'en' && f.imperative1p) f.person = '1p';
    if (!f.person && lang === 'ru' && f.verb && f.ruVerb && f.ruVerb.p) f.person = f.ruVerb.p;
    // English "you" defaults to sen (2s); Russian "вы" is siz (2p)
    if (!f.person) {
      if (f.copula || f.have) f.person = '3s';
      else return null;
    }
    // ---- question
    f.yesno = !!flags.q && !f.qw;
    if (f.qw && !flags.q) flags.q = true;
    return { f, nps, subj };
  }

  function kinPoss(np, person) {
    if (np.poss || np.pron || np.name || np.dem || np.fixed) return;
    if (np.rawLang === 'ru' && np.kin) np.poss = person === '3p' ? '3s' : person;
  }

  function generate(items, lang, flags) {
    const c = compose(items, lang, flags);
    if (!c) return null;
    const { f, nps, subj } = c;
    const words = [];
    // mark kinship nouns (Russian implies "my")
    const markKin = n => { if (lang === 'ru' && n.rawHead) n.kin = L.KIN_RU.some(kn => fold(n.rawHead).startsWith(fold(kn).slice(0, Math.max(3, fold(kn).length - 1)))); };
    nps.forEach(n => {
      n.rawLang = lang;
      markKin(n);
      (n.conj || []).forEach(x => { markKin(x); x.rawLang = lang; });
      if (n.poss === 'self') { n.poss = f.person === '3p' ? '3s' : f.person; n.possExplicit = false; }
    });
    const subjText = s => {
      if (s.fixed) return s.fixed;
      if (s.pron) return M.PRON[s.pron].nom;
      if (lang === 'ru' && s.kin && !s.poss) s.poss = '1s';
      (s.conj || []).forEach(x => { if (lang === 'ru' && x.kin && !x.poss) x.poss = '1s'; });
      return npText(s, 'nom');
    };
    // "also": men de, sen de, ol da (da / de / ta / te by the last letter)
    const alsoP = w => (M.cls(w) === 'T' ? 't' : 'd') + (M.front(w) ? 'e' : 'a');
    const pushSubj = () => {
      if (!f.subj || !f.explicitSubj) return;
      const s = subjText(f.subj);
      words.push(f.also ? s + ' ' + alsoP(s) : s);
    };

    // ---------- HAVE: (meniń) X-ım bar / joq
    if (f.have) {
      let owner = f.have.owner, thing = f.have.thing;
      if (lang === 'en') {
        owner = subj; thing = nps.find(n => n !== subj && !n.prep);
        if (!owner || !thing) return null;
      }
      if (!thing || thing.pron) return null;
      const op = owner.pron ? owner.pron : (owner.pl ? '3p' : '3s');
      const ownerTxt = owner.pron ? M.PRON[owner.pron].gen : npText(Object.assign({}, owner, { poss: owner.kin && !owner.poss ? '1s' : owner.poss }), 'gen');
      thing.poss = op === '3p' ? '3s' : op; thing.possExplicit = false;
      const neg = f.have.neg || f.neg;
      let tail = neg ? 'joq' : 'bar';
      if (f.have.past) tail += ' edi';
      let out = ownerTxt + ' ' + npText(thing, 'nom') + ' ' + tail;
      if (flags.q && !f.qw) out += ' ' + M.qp(tail);
      return finish([out], flags);
    }

    if (f.never && f.copula) return null;                 // "никогда не был": needs a perfect form, not covered
    // every "и / and" must have joined two noun phrases ("я и мой брат" has no verb to share)
    const ands = items.filter(it => it.t === 'and').length;
    const joins = nps.reduce((a, n) => a + (n.conj ? n.conj.length : 0), 0);
    if (ands !== joins) return null;
    // "мы с братом" means "my brother and I": not covered
    if (lang === 'ru' && f.subj && f.subj.pron === '1p' && nps.some(n => n.prep === 'with' && n.idx === f.subj.idx + 1)) return null;
    // "хочу домой", "не хочу в школу": a want with only a place → not covered
    if (f.verb && f.verb.want && !f.modal && !nps.some(n => n !== f.subj && !n.prep && !n.pron)) return null;
    // "кто это сделал": это is the object (bunı), кто the subject
    if (f.eto && f.verb) { f.subj = null; f.explicitSubj = false; nps.push({ fixed: 'bunı', mods: [], langNp: true }); if (!f.person) f.person = '3s'; }
    // a language after learn / know / read is an object: qaraqalpaq tilin úyrenemen
    if (f.verb && f.verb.langObj) {
      const li = items.find(it => it.t === 'adv' && L.LANG_NOUN[it.kk]);
      if (li) { f.advs = f.advs.filter(a => a !== li.kk); nps.push({ fixed: M.kase(L.LANG_NOUN[li.kk], 'acc', true), mods: [], langNp: true }); }
    }
    // "мой" when the subject is "я": the suffix is enough (Biz shaxarımızdı jaqsı kóremiz)
    nps.forEach(n => { if (n.poss && n.poss === f.person && n !== f.subj) n.possExplicit = false; });

    if (f.verb && f.verb.kk === 'kór' && nps.some(n => n.prepW === 'на')) f.verb = L.VERBS.find(v => v.kk === 'qara');
    // ---------- the other noun phrases: role and case
    const others = nps.filter(n => n !== f.subj);
    const roleTexts = [];
    let predicate = null;
    const DOUBLE = ['ber', 'jiber', 'ayt', 'ákel', 'jaz', 'satıp al'];
    if (lang === 'en' && f.verb && DOUBLE.includes(f.verb.kk)) {
      const bare = others.filter(n => !n.prep && (n.head || n.pron));
      if (bare.length === 2) bare[0].recipient = true;
    }
    for (const n of others) {
      let kase = null;
      if (n.langNp) { roleTexts.push({ text: n.fixed, rank: 2 }); continue; }
      if (n.recipient) { roleTexts.push({ text: npText(n, 'dat'), rank: 1 }); continue; }
      // "играть в футбол" → futbol oynaw (a game is a plain object)
      if (f.verb && f.verb.kk === 'oyna' && n.prepW === 'в' && n.cases && n.cases.has('acc')) { roleTexts.push({ text: npText(n, 'nom'), rank: 2 }); continue; }
      if (f.verb && f.verb.kk === 'bol' && !n.prep && !n.pron) { roleTexts.push({ text: npText(n, 'nom'), rank: 2 }); continue; }   // стать врачом → shıpaker bolıw
      if (lang === 'ru' && !n.prep && !n.pron && n.cases && n.cases.size === 1 && n.cases.has('ins') && !f.copula) return null;   // работает врачом: not covered
      if (n.prep) {
        if (n.prep === 'in') {
          const cs = n.cases || new Set();
          const motion = f.verb && (f.verb.motion || f.verb.gov === 'dat' && f.verb.kk !== 'járdem ber');
          if (n.pron) kase = n.pcases.has('acc') ? 'dat' : 'loc';
          else if (cs.has('acc') && !cs.has('prep')) kase = 'dat';
          else if (cs.has('prep') && !cs.has('acc')) kase = 'loc';
          else kase = motion ? 'dat' : 'loc';
          if (f.verb && f.verb.gov === 'loc') kase = 'loc';
          if (f.verb && f.verb.motion && cs.has('acc')) kase = 'dat';
          if (kase === 'loc' && f.verb && f.verb.placeCase) kase = f.verb.placeCase;      // buy in a shop → dúkennen
        } else if (n.prep === 'in_loc') kase = f.verb && f.verb.placeCase ? f.verb.placeCase : (f.verb && f.verb.motion ? 'dat' : 'loc');
        else if (n.prep === 'to') kase = 'dat';
        else if (n.prep === 'from') kase = 'abl';
        else if (n.prep === 'with') {
          if (lang === 'ru' && n.cases && !n.cases.has('ins') && (n.cases.has('gen'))) kase = 'abl';
          else if (lang === 'ru' && n.pron && !n.pcases.has('ins')) kase = 'abl';
          else kase = 'with';
        } else if (n.prep === 'at') kase = 'loc';
        else if (n.prep === 'po') kase = 'acc';            // скучать по маме → anamdı saǵındım
        else kase = n.prep;              // for, about, without, until, after
      } else if (n.pron) {
        if (f.verb && f.verb.experiencer) kase = 'dat';
        else if (n.pcases.has('dat') && lang === 'ru') kase = 'dat';
        else kase = (f.verb && f.verb.gov && f.verb.gov !== 'loc') ? f.verb.gov : 'acc';
        if (f.verb && f.verb.gov === 'acc' && n.pcases.has('dat') && lang === 'ru') kase = 'dat';     // дать мне
      } else if (f.copula) {
        predicate = n; continue;
      } else if (f.modal === 'need' && lang === 'ru' && n.cases && n.cases.has('dat') && !n.cases.has('acc')) {
        // "маме надо идти": the person who needs — becomes the subject
        f.subj = n; f.explicitSubj = true; f.person = n.pl ? '3p' : '3s'; continue;
      } else {
        // a bare noun: object (or recipient when Russian dative)
        const cs = n.cases || new Set(['acc']);
        if (lang === 'ru' && f.verb && f.verb.motion && f.verb.gov === 'dat') return null;    // «идёт дождь»: a noun after идти is its subject, not a goal
        if (lang === 'ru' && !n.conj && !(f.verb && f.verb.experiencer) && cs.has('nom') && !cs.has('acc') && !cs.has('gen') && !cs.has('dat')) return null;   // "мама, я тебя люблю": a vocative
        if (lang === 'ru' && cs.has('dat') && !cs.has('acc') && !cs.has('nom')) kase = 'dat';
        else if (f.verb && f.verb.gov && f.verb.gov !== 'acc' && f.verb.gov !== 'loc') kase = f.verb.gov;
        else {
          if (lang === 'ru' && n.kin && !n.poss) { n.poss = f.person === '3p' ? '3s' : f.person; n.possExplicit = false; }
          // definite object → accusative. Markers: the/этот/мой, names, verbs that always take it
          // (love, see, wait). Russian has no articles: a singular object is definite unless the verb
          // usually takes a bare one (eat, drink, read, write, buy: Men kitap oqıyman).
          let definite = n.def || n.poss || n.dem || n.name || (f.verb && f.verb.def && !f.modal);
          if (!definite && lang === 'ru' && f.verb && !f.verb.bare && !n.pl && !n.num) definite = true;
          if (!definite && n.pl && !n.num && !n.conj) definite = true;
          if (f.modal === 'want' && !n.def && !n.poss && !n.dem) definite = false;
          kase = definite ? 'acc' : 'nom';
        }
      }
      if (lang === 'ru' && n.kin && !n.poss && !n.pron) { n.poss = f.person === '3p' ? '3s' : (f.person || '1s'); n.possExplicit = false; }
      roleTexts.push({ text: npText(n, kase), rank: kase === 'acc' || kase === 'nom' ? 2 : 1 });
    }
    // places and people first, the direct object last, right before the verb
    roleTexts.sort((a, b) => a.rank - b.rank);
    for (let i = 0; i < roleTexts.length; i++) roleTexts[i] = roleTexts[i].text;
    // a question word in a case (кого → kimdi)
    let qwText = null;
    if (f.qw) {
      const qk = f.qw.kase;
      if (f.qw.kk === 'kim' || f.qw.kk === 'ne') {
        if (qk === 'acc') qwText = f.verb && f.verb.gov && !['acc', 'loc'].includes(f.verb.gov) ? M.kase(f.qw.kk, f.verb.gov === 'with' ? 'nom' : f.verb.gov) + (f.verb.gov === 'with' ? ' menen' : '') : (f.qw.kk === 'kim' ? 'kimdi' : 'ne');
        else if (qk === 'dat') qwText = f.qw.kk === 'kim' ? 'kimge' : 'nege';
        else if (qk === 'with') qwText = f.qw.kk + ' menen';
        else qwText = f.qw.kk;
      } else qwText = f.qw.kk;
    }

    // ---------- COPULA
    if (f.copula) {
      if (nps.some(n => n.pron && n !== f.subj && n.pcases && n.pcases.has('dat') && !n.prep)) return null;   // "мне холодно", "тебе сколько лет"
      if (f.qw && (f.qw.kk === 'neshe' || f.qw.kk === 'qansha')) return null;
      pushSubj();
      f.times.forEach(t => words.push(t));
      roleTexts.forEach(t => words.push(t));
      const placeIt = items.find(it => it.t === 'place');
      let pred = null;
      if (predicate) pred = npText(predicate, 'nom');
      else if (placeIt) pred = placeIt.kk;
      else if (qwText) pred = qwText;
      else if (roleTexts.length && !predicate) { pred = words.pop(); }     // "Я в школе" → Men mektepte+men
      if (!pred) return null;
      if (f.advs.length && !qwText) pred = f.advs.join(' ') + ' ' + pred;
      if (qwText && pred !== qwText) words.push(qwText);
      if (f.tense === 'fut') {
        if (lang === 'ru' && predicate && !predicate.adjOnly && !(predicate.cases && predicate.cases.has('ins'))) return null;   // "ты будешь чай?"
        words.push(pred + ' ' + M.conj('bol', f.person, { tense: 'pres', neg: f.neg, q: f.yesno })); return finish(words, flags);
      }
      const hasPronSubj = f.subj && f.subj.pron;
      const p = hasPronSubj || f.eto ? f.person : '3s';
      words.push(M.copula(pred, f.subj && f.subj.pron ? p : '3s', { neg: f.neg, q: f.yesno, past: f.tense === 'past' }));
      return finish(words, flags);
    }

    // ---------- VERB
    if (!f.verb) return null;
    if (f.verb.experiencer) {
      // нравиться: "Мне нравится X" → Maǵan X unaydı
      const exp = nps.find(n => n.pron && n.pcases && n.pcases.has('dat'));
      const thing = nps.find(n => n !== exp);
      if (!exp || !thing) return null;
      words.push(M.PRON[exp.pron].dat);
      f.times.forEach(t => words.push(t));
      words.push(npText(thing, 'nom'));
      words.push(M.conj('una', '3s', { tense: f.tense === 'prog' ? 'pres' : f.tense, neg: f.neg, q: f.yesno }));
      return finish(words, flags);
    }
    pushSubj();
    f.times.forEach(t => { if (!(t === 'hesh qashan')) words.push(t); });
    if (f.never) words.push('hesh qashan');
    roleTexts.forEach(t => words.push(t));
    const placeIt = items.find(it => it.t === 'place');
    if (placeIt) words.push(placeIt.kk);
    f.advs.forEach(a => words.push(a));
    if (qwText) words.push(qwText);
    if (f.imperative1p) { words.push(M.imp(splitKk(f.verb.kk).st, '1p', { neg: f.neg })); return finish(words, flags); }
    words.push(vp(f));
    return finish(words, flags);
  }

  function finish(words, flags) {
    let s = words.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    if (!s) return null;
    s = cap(s) + (flags.q ? '?' : flags.excl ? '!' : '.');
    return s;
  }

  // ---------------------------------------------------------------- public
  function translate(raw, lang) {
    if (!NOM) return null;
    if (lang !== 'ru' && lang !== 'en') return null;
    const { toks, q, excl } = tokenize(raw, lang);
    if (toks.length < 2 || toks.length > 9) return null;
    const items = lang === 'ru' ? parseRu(toks) : parseEn(toks);
    if (!items) return null;
    const flags = { q, excl };
    try {
      const kk = generate(items, lang, flags);
      return kk ? { kk } : null;
    } catch (e) {
      return null;
    }
  }

  const api = { init, translate, fold, _parseRu: parseRu, _parseEn: parseEn, _tokenize: tokenize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KaaSentence = api;
})(typeof window !== 'undefined' ? window : this);
