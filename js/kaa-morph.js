// Karakalpak morphology for the Qaraqalpaq Tili sentence builder.
// Written by the advisor (Claude) from the Dilmash corpus (200k sentence pairs) and
// kaa.wikipedia counts; every rule below has its evidence in KARAKALPAK_GRAMMAR.md §3–§8, §20.
// Pure functions, no DOM. Works in the browser (window.KaaMorph) and in Node (module.exports).
(function (root) {
  'use strict';

  const FRONT = 'áeióú';
  const BACK = 'aıou';
  const VOWELS = FRONT + BACK;
  const VOICELESS = 'ptkqsfxhc';        // + "sh", "ch" (end in h)
  const NASAL = 'mnń';
  const SONOR = 'lrwy';
  const isVowel = c => VOWELS.includes(c);

  // the letter that decides the suffix: last letter, lower case, digraphs sh/ch count as voiceless
  function last(w) { return String(w).toLowerCase().replace(/[^a-záǵıńóúí']+$/i, '').slice(-1); }
  // 'V' vowel · 'N' m n ń · 'S' l r w y · 'Z' other voiced (z j v b d g ǵ) · 'T' voiceless
  function cls(w) {
    const c = last(w);
    if (isVowel(c)) return 'V';
    if (NASAL.includes(c)) return 'N';
    if (SONOR.includes(c)) return 'S';
    if (VOICELESS.includes(c)) return 'T';
    return 'Z';
  }
  // vowel harmony: the last vowel of the word decides (front á e i ó ú / back a ı o u)
  function front(w) {
    const s = String(w).toLowerCase();
    for (let i = s.length - 1; i >= 0; i--) {
      if (FRONT.includes(s[i])) return true;
      if (BACK.includes(s[i])) return false;
    }
    return false;
  }
  const A = w => (front(w) ? 'e' : 'a');
  const I = w => (front(w) ? 'i' : 'ı');

  // ---------------------------------------------------------------- nouns
  // k q p at the end turn voiced before a vowel: kitap → kitabı, júrek → júregi, ayaq → ayaǵı.
  // Only after a vowel (park, dost stay as they are).
  function voice(w) {
    const m = String(w).match(/^(.*[aıouáeióú])([pkq])$/i);
    if (!m) return w;
    return m[1] + { p: 'b', k: 'g', q: 'ǵ' }[m[2].toLowerCase()];
  }
  const PL = w => w + (front(w) ? 'ler' : 'lar');

  // possessive: p = '1s' | '2s' | '3s' | '1p' | '2p' | '3p'
  function poss(w, p) {
    const v = cls(w) === 'V';
    const i = I(w);
    const base = v ? w : voice(w);
    switch (p) {
      case '1s': return base + (v ? 'm' : i + 'm');
      case '2s': return base + (v ? 'ń' : i + 'ń');
      case '1p': return base + (v ? 'm' + i + 'z' : i + 'm' + i + 'z');
      case '2p': return base + (v ? 'ń' + i + 'z' : i + 'ń' + i + 'z');
      default: return base + (v ? 's' + i : i);          // 3s, 3p
    }
  }

  // case endings. afterPoss3 = the word ends in the 3rd-person possessive (anası, ákesi):
  // then the "pronominal n" comes in: anasına, anasın, anasında, anasınan (corpus 20 / 4 / 2 / 14).
  function kase(w, c, afterPoss3, afterPoss12) {
    if (!c || c === 'nom') return w;
    const f = front(w), k = cls(w);
    if (afterPoss12 && c === 'dat') return w + (f ? 'e' : 'a');      // anama 3 / anamǵa 0, kózime 11, anańa
    if (afterPoss3) {
      return w + ({ gen: f ? 'niń' : 'nıń', acc: 'n', dat: f ? 'ne' : 'na', loc: f ? 'nde' : 'nda', abl: f ? 'nen' : 'nan' }[c]);
    }
    switch (c) {
      case 'gen': return w + (k === 'V' || k === 'N' ? 'n' : k === 'T' ? 't' : 'd') + (f ? 'iń' : 'ıń');   // adamnıń 299 / adamdıń 6
      case 'acc': return w + (k === 'V' ? 'n' : k === 'T' ? 't' : 'd') + (f ? 'i' : 'ı');                // adamdı 4 441 / adamnı 0
      case 'dat': return w + (k === 'T' ? (f ? 'ke' : 'qa') : (f ? 'ge' : 'ǵa'));
      case 'loc': return w + (k === 'T' ? 't' : 'd') + (f ? 'e' : 'a');
      case 'abl': return w + (k === 'T' ? 't' : k === 'N' ? 'n' : 'd') + (f ? 'en' : 'an');           // adamnan 62 / adamdan 0
      default: return w;
    }
  }
  // "with": menen after vowels and m n ń l r w y, benen after z, penen after a voiceless (corpus)
  function withP(w) {
    const k = cls(w);
    return w + ' ' + (k === 'T' ? 'penen' : k === 'Z' ? 'benen' : 'menen');
  }
  const forP = w => w + ' ushın';
  const aboutP = w => w + ' haqqında';
  const without = w => w + (front(w) ? 'siz' : 'sız');

  // personal pronouns
  const PRON = {
    '1s': { nom: 'men', gen: 'meniń', acc: 'meni', dat: 'maǵan', loc: 'mende', abl: 'mennen', with: 'meniń menen', for: 'men ushın', about: 'men haqqında' },
    '2s': { nom: 'sen', gen: 'seniń', acc: 'seni', dat: 'saǵan', loc: 'sende', abl: 'sennen', with: 'seniń menen', for: 'sen ushın', about: 'sen haqqında' },
    '3s': { nom: 'ol', gen: 'onıń', acc: 'onı', dat: 'oǵan', loc: 'onda', abl: 'onnan', with: 'onıń menen', for: 'onıń ushın', about: 'ol haqqında' },
    '1p': { nom: 'biz', gen: 'biziń', acc: 'bizdi', dat: 'bizge', loc: 'bizde', abl: 'bizden', with: 'biz benen', for: 'biz ushın', about: 'biz haqqında' },
    '2p': { nom: 'siz', gen: 'siziń', acc: 'sizdi', dat: 'sizge', loc: 'sizde', abl: 'sizden', with: 'siz benen', for: 'siz ushın', about: 'siz haqqında' },
    '3p': { nom: 'olar', gen: 'olardıń', acc: 'olardı', dat: 'olarǵa', loc: 'olarda', abl: 'olardan', with: 'olar menen', for: 'olar ushın', about: 'olar haqqında' },
  };

  // ---------------------------------------------------------------- particles
  // question particle, a separate word (corpus): vowel, l r w y → ma/me; m n ń z (+ other voiced) → ba/be;
  // voiceless → pa/pe. bar ma? 41 · bilesiz be? 34 · kórdiń be? 13 · joq pa? 29 · emes pe? 39
  function qp(w) {
    const k = cls(w), f = front(w);
    const c = k === 'V' || k === 'S' ? 'm' : k === 'T' ? 'p' : 'b';
    return c + (f ? 'e' : 'a');
  }
  // the {M} consonant for negation -ma and for 1st-person-plural copula -mız
  function mbp(w) { const k = cls(w); return k === 'T' ? 'p' : (k === 'N' || k === 'Z') ? 'b' : 'm'; }

  // ---------------------------------------------------------------- copula (noun or adjective as predicate)
  // 1s: -pan/-pen after a voiceless, otherwise -man/-men — also after n (ekenmen 22, ekenben 0).
  // 1p: {M}: ekenbiz 30, kelgenbiz 8. 2s -sań/-seń, 2p -sız/-siz, 3 nothing.
  function copSuffix(w, p) {
    const f = front(w), k = cls(w);
    switch (p) {
      case '1s': return (k === 'T' ? 'p' : 'm') + (f ? 'en' : 'an');
      case '2s': return f ? 'seń' : 'sań';
      case '1p': return mbp(w) + (f ? 'iz' : 'ız');
      case '2p': return f ? 'siz' : 'sız';
      default: return '';
    }
  }
  // copula('student', '1s') → 'studentpen'; neg → 'student emespen'; past → 'student edim'; q → adds the particle
  function copula(pred, p, o = {}) {
    let out;
    if (o.past) out = pred + ' ' + (o.neg ? 'emes edi' : 'edi') + ({ '1s': 'm', '2s': 'ń', '1p': 'k', '2p': 'ńiz' }[p] || '');
    else if (o.neg) out = pred + ' emes' + copSuffix('emes', p);
    else out = pred + copSuffix(pred, p);
    return o.q ? out + ' ' + qp(out) : out;
  }

  // ---------------------------------------------------------------- verbs
  // stem: what is left after -ıw / -iw / -w. Only a few stems end in ı/i (oqıydı 30, eriydi 36).
  const VOWEL_STEMS = { 'oqıw': 'oqı', 'eriw': 'eri', 'tanıw': 'tanı' };     // tanıydı 17, tanıdım 7
  // A stem ends in p / q / k; the infinitive shows it voiced: tabıw → tap (taptı 62, tabadı 30,
  // tapqan 61), shıǵıw → shıq (shıqtı 458, shıǵadı 166), aǵıw → aq, tigiw → tik, jabıw → jap.
  function stemOf(inf) {
    const s = String(inf).toLowerCase().trim().split(/\s+/).pop();
    if (VOWEL_STEMS[s]) return VOWEL_STEMS[s];
    let st = s;
    if (/(ıw|iw)$/.test(s)) st = s.slice(0, -2);
    else if (/w$/.test(s)) st = s.slice(0, -1);
    return st.replace(/([aıouáeióú])([bǵg])$/, (m, v, c) => v + { b: 'p', 'ǵ': 'q', g: 'k' }[c]);
  }
  const vstem = st => isVowel(last(st));
  // before a vowel the p q k of a stem turn voiced again (tap → taba-, shıq → shıǵa-); verbs
  // with a consonant before it stay (qorq → qorqadı, qorqıp)
  const vv = st => voice(st);
  // two converbs are irregular: tap → tawıp (88, tabıp 0), jap → jawıp (37)
  const CONVERB = { tap: 'tawıp', jap: 'jawıp' };
  // before a consonant some stems take a vowel: qorq → qorıq- (qorıqpa 6 / qorqpa 0, qorıqtı 8 / qorqtı 0),
  // but qorqadı, qorqıp, qorqaman before a vowel
  const CSTEM = { qorq: 'qorıq' };
  const cs = st => CSTEM[st] || st;
  const negOf = st => cs(st) + mbp(cs(st)) + A(st);               // bar→barma, túsin→túsinbe, ayt→aytpa (corpus: aytpaydı 3 / aytmaydı 0)

  // present-future ("aorist"): bar → bara-, oyla → oylay-; negative barmay-.
  // personal endings: 1s -man/-men 2s -sań/-seń 3 -dı/-di 1p -mız/-miz 2p -sız/-siz 2pl -sızlar/-sizler
  // yes/no question in the 3rd person drops -dı: bola ma? 47 / boladı ma? 4, kele me? 5 / keledi me? 0
  function aoristBase(st, neg) {
    if (neg) return negOf(st) + 'y';
    return vstem(st) ? st + 'y' : vv(st) + A(st);
  }
  const PRES_END = { '1s': ['man', 'men'], '2s': ['sań', 'seń'], '3s': ['dı', 'di'], '1p': ['mız', 'miz'], '2p': ['sız', 'siz'], '2pl': ['sızlar', 'sizler'], '3p': ['dı', 'di'] };
  function pres(st, p, o = {}) {
    const base = aoristBase(st, o.neg);
    const f = front(base);
    if (o.q && (p === '3s' || p === '3p')) return base + ' ' + qp(base);
    const out = base + PRES_END[p][f ? 1 : 0];
    return o.q ? out + ' ' + qp(out) : out;
  }

  // past: -dı/-di, -tı/-ti after a voiceless; persons m ń – q/k ńız ńızlar
  function past(st, p, o = {}) {
    const base = o.neg ? negOf(st) : cs(st);
    const f = front(base);
    const d = cls(base) === 'T' ? 't' : 'd';
    const pe = { '1s': 'm', '2s': 'ń', '3s': '', '3p': '', '1p': f ? 'k' : 'q', '2p': f ? 'ńiz' : 'ńız', '2pl': f ? 'ńizler' : 'ńızlar' }[p];
    const out = base + d + (f ? 'i' : 'ı') + pe;
    return o.q ? out + ' ' + qp(out) : out;
  }

  // converb -ıp/-ip/-p (jazıp, kelip, oqıp, islep) — verbs do not voice k q (qorqıp)
  const converb = st => CONVERB[st] || (vstem(st) ? st + 'p' : vv(st) + I(st) + 'p');
  // "doing right now": -ıp atır + person. bar → baratır (54), kel → kiyatır (69).
  const PROG_END = { '1s': 'man', '2s': 'sań', '3s': '', '3p': '', '1p': 'mız', '2p': 'sız', '2pl': 'sızlar' };
  // negative: -may atır (almay atır 19, bermey atır 13, islemey atır 12) — Musa: "taba almay atırman"
  function prog(st, p, o = {}) {
    const head = o.neg ? negOf(st) + 'y atır' : st === 'bar' ? 'baratır' : st === 'kel' ? 'kiyatır' : converb(st) + ' atır';
    const out = head + PROG_END[p];
    return o.q ? out + ' ' + qp(out) : out;
  }

  // imperative: sen → stem (ayt, kel, qorıqpa); siz → -ıń/-iń (aytıń, keliń, barmań); let's → -ayıq/-eyik
  // (book: kireyik, asıqpayıq; corpus: barayıq 7, kóreyik 13, baslayıq 3, bolmayıq 2);
  // let him / them → -sın/-sin (book: kelsin, shıdasın, oylamasın; corpus: kelsin 17, bolsın 193)
  function imp(st, p, o = {}) {
    const base = o.neg ? negOf(st) : st;
    if (p === '2s') return base;
    if (p === '3s' || p === '3p') return base + (front(base) ? 'sin' : 'sın');
    if (p === '1p') return vstem(base) ? base + (front(base) ? 'yik' : 'yıq') : vv(base) + (front(base) ? 'eyik' : 'ayıq');
    const head = vstem(base) ? base + 'ń' : vv(base) + I(base) + 'ń';
    return head + (p === '2pl' ? (front(base) ? 'ler' : 'lar') : '');
  }

  // conjugate one verb stem: o = { tense: 'pres'|'past'|'prog'|'imp', neg, q }
  function conj(st, p, o = {}) {
    switch (o.tense) {
      case 'past': return past(st, p, o);
      case 'prog': return prog(st, p, o);
      case 'imp': return imp(st, p, o);
      default: return pres(st, p, o);
    }
  }

  // ---------------------------------------------------------------- modal constructions
  // want to: -ǵı/-gi/-qı/-ki + possessive + keledi (kórgim 2, ketkim, qaytqısı, barǵım). 3p = 3s (ǵıları 0).
  function want(st, p, o = {}) {
    const k = cls(st), f = front(st);
    const g = k === 'T' ? (f ? 'ki' : 'qı') : (f ? 'gi' : 'ǵı');
    const ps = { '1s': 'm', '2s': 'ń', '3s': f ? 'si' : 'sı', '3p': f ? 'si' : 'sı', '1p': f ? 'miz' : 'mız', '2p': f ? 'ńiz' : 'ńız', '2pl': f ? 'ńiz' : 'ńız' }[p];
    // "right now" (Musa): barǵım kelip tur / kelmey tur (ketkim kelmey tur — corpus); otherwise keledi
    if (o.now && o.tense !== 'past') {
      const t = o.neg ? 'kelmey tur' : 'kelip tur';
      return cs(st) + g + ps + ' ' + t + (o.q ? ' ma' : '');
    }
    return cs(st) + g + ps + ' ' + conj('kel', '3s', { tense: o.tense === 'past' ? 'past' : 'pres', neg: o.neg, q: o.q });
  }
  // can: -a/-e/-y + al- (ayta alaman 14, isley aladı 9, bere alasız 6)
  function can(st, p, o = {}) {
    const cv = vstem(st) ? st + 'y' : vv(st) + A(st);
    // "can't find it (right now)": taba almay atırman (paydalana almay atır 4, bere almay atır 2)
    return cv + ' ' + conj('al', p, { tense: o.tense === 'past' ? 'past' : o.prog ? 'prog' : 'pres', neg: o.neg, q: o.q });
  }
  const infOf = st => (vstem(st) ? st + 'w' : vv(st) + I(st) + 'w');
  // need to: -ıw + possessive + kerek (sóylesiwimiz kerek, barıwıń kerek)
  function need(st, p, o = {}) {
    const inf = infOf(st);
    const head = p === '3s' || p === '3p' ? inf + I(inf) : poss(inf, p);
    let tail = o.neg ? 'kerek emes' : 'kerek';
    if (o.tense === 'past') tail += ' edi';
    const out = head + ' ' + tail;
    return o.q ? out + ' ' + qp(out) : out;
  }
  // like doing: -ıwdı jaqsı kóremen (jasawdı jaqsı kóredi, basqarıwdı jaqsı kóresiz)
  function likeDoing(st, p, o = {}) {
    return kase(infOf(st), 'acc') + ' jaqsı ' + conj('kór', p, o);
  }

  const api = { front, cls, voice, PL, poss, kase, withP, forP, aboutP, without, PRON, qp, copula, copSuffix, stemOf, vstem, negOf, pres, past, prog, imp, conj, converb, want, can, need, likeDoing, infOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KaaMorph = api;
})(typeof window !== 'undefined' ? window : this);
