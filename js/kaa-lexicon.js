// Verb and closed-class lexicon for the Qaraqalpaq Tili sentence builder (advisor, 2026-10-15).
// Karakalpak stems follow the corpus spelling (KARAKALPAK_GRAMMAR.md §19–§22); several fix the
// dictionary's infinitive (Kiriw, not Kırısıw; Iseniw, not Seniw — see §23).
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- Russian conjugation helper
  const HUSH = /[жшчщ]$/;
  function ruForms(inf, o = {}) {
    let base = inf, refl = '';
    if (/(ся|сь)$/.test(base)) { refl = 'ся'; base = base.slice(0, -2); }
    let pres;
    if (o.pres) pres = o.pres.split(' ');
    else if (/(ать|ять)$/.test(base) || (o.c1 && /еть$/.test(base))) {
      const st = base.slice(0, -2);
      pres = [st + 'ю', st + 'ешь', st + 'ет', st + 'ем', st + 'ете', st + 'ют'];
    } else {                                         // 2nd conjugation -ить / -еть
      const st = base.slice(0, -3);
      const h = HUSH.test(st);
      pres = [o.s1 || st + (h ? 'у' : 'ю'), st + 'ишь', st + 'ит', st + 'им', st + 'ите', st + (h ? 'ат' : 'ят')];
    }
    let past = o.past ? o.past.split(' ') : ['л', 'ла', 'ло', 'ли'].map(e => base.slice(0, -2) + e);
    if (refl) {
      const r = f => (/(ся|сь)$/.test(f) ? f : f + (/[аеёиоуыэюя]$/.test(f) ? 'сь' : 'ся'));
      pres = pres.map(r); past = past.map(r);
    }
    return { pres, past };
  }

  // ---------------------------------------------------------------- verbs
  // kk: Karakalpak stem (with fixed words before it, e.g. 'jumıs isle'); gov: case of the object
  // (acc, dat, abl, with); def: the object always takes the accusative (love, wait, understand);
  // motion: present tense = "going right now" (Men mektepke baratırman);
  // ru: [infinitive, options] — pf: perfective (its present forms mean future);
  // en: [base, past, participle] (regular forms are built when missing).
  const VERBS = [
    { kk: 'bar', gov: 'dat', motion: 1, ru: [['идти', { pres: 'иду идёшь идёт идём идёте идут', past: 'шёл шла шло шли' }], ['ехать', { pres: 'еду едешь едет едем едете едут' }], ['пойти', { pf: 1, pres: 'пойду пойдёшь пойдёт пойдём пойдёте пойдут', past: 'пошёл пошла пошло пошли' }], ['поехать', { pf: 1, pres: 'поеду поедешь поедет поедем поедете поедут' }], ['ходить', { s1: 'хожу', habit: 1 }], ['ездить', { s1: 'езжу', habit: 1 }]], en: [['go', 'went', 'gone']] },
    { kk: 'kel', gov: 'dat', motion: 1, ru: [['приходить', { s1: 'прихожу' }], ['прийти', { pf: 1, pres: 'приду придёшь придёт придём придёте придут', past: 'пришёл пришла пришло пришли' }], ['приезжать'], ['приехать', { pf: 1, pres: 'приеду приедешь приедет приедем приедете приедут' }]], en: [['come', 'came', 'come']] },
    { kk: 'ket', gov: 'abl', ru: [['уходить', { s1: 'ухожу' }], ['уйти', { pf: 1, pres: 'уйду уйдёшь уйдёт уйдём уйдёте уйдут', past: 'ушёл ушла ушло ушли' }], ['уезжать'], ['уехать', { pf: 1, pres: 'уеду уедешь уедет уедем уедете уедут' }]], en: [['leave', 'left', 'left'], ['go away', 'went away', 'gone away']] },
    { kk: 'qaytıp kel', gov: 'dat', ru: [['возвращаться'], ['вернуться', { pf: 1, pres: 'вернусь вернёшься вернётся вернёмся вернётесь вернутся' }]], en: [['return'], ['come back', 'came back', 'come back']] },
    { kk: 'kir', gov: 'dat', ru: [['входить', { s1: 'вхожу' }], ['войти', { pf: 1, pres: 'войду войдёшь войдёт войдём войдёте войдут', past: 'вошёл вошла вошло вошли' }], ['заходить', { s1: 'захожу' }], ['зайти', { pf: 1, pres: 'зайду зайдёшь зайдёт зайдём зайдёте зайдут', past: 'зашёл зашла зашло зашли' }]], en: [['enter'], ['come in', 'came in', 'come in']] },
    { kk: 'shıq', gov: 'abl', ru: [['выходить', { s1: 'выхожу' }], ['выйти', { pf: 1, pres: 'выйду выйдешь выйдет выйдем выйдете выйдут', past: 'вышел вышла вышло вышли' }]], en: [['go out', 'went out', 'gone out'], ['get out', 'got out', 'got out'], ['come out', 'came out', 'come out']] },
    { kk: 'kór', gov: 'acc', def: 1, ru: [['видеть', { s1: 'вижу' }], ['увидеть', { pf: 1, s1: 'увижу' }], ['смотреть', { act: 1 }], ['посмотреть', { pf: 1 }]], en: [['see', 'saw', 'seen'], ['watch']] },
    { kk: 'qara', gov: 'dat', ru: [], en: [['look at', 'looked at', 'looked at'], ['look']] },
    { kk: 'esit', situ: 1, gov: 'acc', ru: [['слышать', { pres: 'слышу слышишь слышит слышим слышите слышат' }], ['услышать', { pf: 1, pres: 'услышу услышишь услышит услышим услышите услышат' }]], en: [['hear', 'heard', 'heard']] },
    { kk: 'tıńla', act: 1, gov: 'acc', bare: 1, ru: [['слушать'], ['послушать', { pf: 1 }]], en: [['listen to', 'listened to', 'listened to'], ['listen']] },
    { kk: 'sóyle', act: 1, gov: 'dat', ru: [['говорить', { speak: 1 }]], en: [['speak', 'spoke', 'spoken']] },
    { kk: 'sóyles', act: 1, gov: 'with', ru: [['разговаривать'], ['поговорить', { pf: 1 }]], en: [['talk']] },
    { kk: 'ayt', act: 1, gov: 'acc', ru: [['сказать', { pf: 1, pres: 'скажу скажешь скажет скажем скажете скажут' }], ['рассказывать'], ['рассказать', { pf: 1, pres: 'расскажу расскажешь расскажет расскажем расскажете расскажут' }]], en: [['say', 'said', 'said'], ['tell', 'told', 'told']] },
    { kk: 'bil', gov: 'acc', langObj: 1, ru: [['знать']], en: [['know', 'knew', 'known']] },
    { kk: 'túsin', situ: 1, gov: 'acc', def: 1, ru: [['понимать'], ['понять', { pf: 1, pres: 'пойму поймёшь поймёт поймём поймёте поймут' }]], en: [['understand', 'understood', 'understood']] },
    { kk: 'oyla', act: 1, gov: 'acc', ru: [['думать'], ['подумать', { pf: 1 }]], en: [['think', 'thought', 'thought']] },
    { kk: 'jaqsı kór', gov: 'acc', def: 1, like: 1, langObj: 1, ru: [['любить', { s1: 'люблю' }], ['полюбить', { pf: 1, s1: 'полюблю' }]], en: [['love'], ['like']] },
    { kk: 'una', gov: 'dat', experiencer: 1, ru: [['нравиться', { s1: 'нравлюсь' }], ['понравиться', { pf: 1, s1: 'понравлюсь' }]], en: [] },
    { kk: 'qále', gov: 'acc', want: 1, bare: 1, ru: [['хотеть', { pres: 'хочу хочешь хочет хотим хотите хотят' }], ['захотеть', { pf: 1, pres: 'захочу захочешь захочет захотим захотите захотят' }]], en: [['want']] },
    { kk: 'al', gov: 'acc', can: 1, ru: [['мочь', { pres: 'могу можешь может можем можете могут', past: 'мог могла могло могли' }], ['смочь', { pf: 1, pres: 'смогу сможешь сможет сможем сможете смогут', past: 'смог смогла смогло смогли' }], ['уметь', { c1: 1 }]], en: [] },
    { kk: 'ber', gov: 'acc', bare: 1, ru: [['давать', { pres: 'даю даёшь даёт даём даёте дают' }], ['дать', { pf: 1, pres: 'дам дашь даст дадим дадите дадут' }]], en: [['give', 'gave', 'given']] },
    { kk: 'al', gov: 'acc', ru: [['брать', { pres: 'беру берёшь берёт берём берёте берут' }], ['взять', { pf: 1, pres: 'возьму возьмёшь возьмёт возьмём возьмёте возьмут' }], ['получать'], ['получить', { pf: 1, s1: 'получу' }]], en: [['take', 'took', 'taken'], ['get', 'got', 'got']] },
    { kk: 'satıp al', gov: 'acc', bare: 1, placeCase: 'abl', ru: [['покупать'], ['купить', { pf: 1, s1: 'куплю' }]], en: [['buy', 'bought', 'bought']] },
    { kk: 'sat', gov: 'acc', bare: 1, ru: [['продавать', { pres: 'продаю продаёшь продаёт продаём продаёте продают' }], ['продать', { pf: 1, pres: 'продам продашь продаст продадим продадите продадут' }]], en: [['sell', 'sold', 'sold']] },
    { kk: 'jasa', gov: 'loc', ru: [['жить', { pres: 'живу живёшь живёт живём живёте живут' }]], en: [['live']] },
    { kk: 'isle', act: 1, gov: 'acc', bare: 1, ru: [['делать'], ['сделать', { pf: 1 }]], en: [['do', 'did', 'done'], ['make', 'made', 'made']] },
    { kk: 'jumıs isle', gov: 'loc', ru: [['работать'], ['поработать', { pf: 1 }]], en: [['work']] },
    { kk: 'oqı', act: 1, gov: 'acc', bare: 1, langObj: 1, ru: [['читать'], ['прочитать', { pf: 1 }], ['учиться', { s1: 'учусь', study: 1 }]], en: [['read', 'read', 'read'], ['study']] },
    { kk: 'úyren', act: 1, gov: 'acc', bare: 1, langObj: 1, ru: [['учить', { s1: 'учу' }], ['выучить', { pf: 1, s1: 'выучу' }], ['изучать']], en: [['learn']] },
    { kk: 'úyret', gov: 'acc', ru: [['обучать'], ['научить', { pf: 1, s1: 'научу' }], ['преподавать', { pres: 'преподаю преподаёшь преподаёт преподаём преподаёте преподают' }]], en: [['teach', 'taught', 'taught']] },
    { kk: 'jaz', act: 1, gov: 'acc', bare: 1, ru: [['писать', { pres: 'пишу пишешь пишет пишем пишете пишут' }], ['написать', { pf: 1, pres: 'напишу напишешь напишет напишем напишете напишут' }]], en: [['write', 'wrote', 'written']] },
    { kk: 'oyna', act: 1, gov: 'acc', bare: 1, ru: [['играть'], ['поиграть', { pf: 1 }]], en: [['play']] },
    { kk: 'je', act: 1, gov: 'acc', bare: 1, ru: [['есть', { pres: 'ем ешь ест едим едите едят', past: 'ел ела ело ели', eat: 1 }], ['съесть', { pf: 1, pres: 'съем съешь съест съедим съедите съедят', past: 'съел съела съело съели' }], ['кушать'], ['покушать', { pf: 1 }]], en: [['eat', 'ate', 'eaten']] },
    { kk: 'ish', act: 1, gov: 'acc', bare: 1, ru: [['пить', { pres: 'пью пьёшь пьёт пьём пьёте пьют' }], ['выпить', { pf: 1, pres: 'выпью выпьешь выпьет выпьем выпьете выпьют' }]], en: [['drink', 'drank', 'drunk']] },
    { kk: 'uyqıla', situ: 1, act: 1, ru: [['спать', { pres: 'сплю спишь спит спим спите спят' }], ['поспать', { pf: 1, pres: 'посплю поспишь поспит поспим поспите поспят' }]], en: [['sleep', 'slept', 'slept']] },
    { kk: 'oyan', situ: 1, ru: [['просыпаться'], ['проснуться', { pf: 1, pres: 'проснусь проснёшься проснётся проснёмся проснётесь проснутся' }]], en: [['wake up', 'woke up', 'woken up']] },
    { kk: 'tur', ru: [['вставать', { pres: 'встаю встаёшь встаёт встаём встаёте встают' }], ['встать', { pf: 1, pres: 'встану встанешь встанет встанем встанете встанут' }], ['стоять', { pres: 'стою стоишь стоит стоим стоите стоят' }]], en: [['stand', 'stood', 'stood'], ['get up', 'got up', 'got up']] },
    { kk: 'otır', ru: [['сидеть', { s1: 'сижу' }], ['садиться', { s1: 'сажусь' }], ['сесть', { pf: 1, pres: 'сяду сядешь сядет сядем сядете сядут', past: 'сел села село сели' }]], en: [['sit', 'sat', 'sat']] },
    { kk: 'júr', act: 1, ru: [['гулять'], ['погулять', { pf: 1 }]], en: [['walk']] },
    { kk: 'juwır', act: 1, ru: [['бегать'], ['бежать', { pres: 'бегу бежишь бежит бежим бежите бегут' }]], en: [['run', 'ran', 'run']] },
    { kk: 'ush', act: 1, ru: [['летать'], ['лететь', { s1: 'лечу' }]], en: [['fly', 'flew', 'flown']] },
    { kk: 'júz', act: 1, ru: [['плавать']], en: [['swim', 'swam', 'swum']] },
    { kk: 'kúl', act: 1, ru: [['смеяться', { pres: 'смеюсь смеёшься смеётся смеёмся смеётесь смеются' }]], en: [['laugh']] },
    { kk: 'jıla', act: 1, ru: [['плакать', { pres: 'плачу плачешь плачет плачем плачете плачут' }]], en: [['cry']] },
    { kk: 'kúlimsire', act: 1, ru: [['улыбаться'], ['улыбнуться', { pf: 1, pres: 'улыбнусь улыбнёшься улыбнётся улыбнёмся улыбнётесь улыбнутся' }]], en: [['smile']] },
    { kk: 'kút', act: 1, gov: 'acc', def: 1, enx: 1, ru: [['ждать', { pres: 'жду ждёшь ждёт ждём ждёте ждут' }], ['подождать', { pf: 1, pres: 'подожду подождёшь подождёт подождём подождёте подождут' }]], en: [['wait for', 'waited for', 'waited for'], ['wait']] },
    { kk: 'izle', act: 1, gov: 'acc', ru: [['искать', { pres: 'ищу ищешь ищет ищем ищете ищут' }]], en: [['look for', 'looked for', 'looked for'], ['search']] },
    { kk: 'tap', situ: 1, gov: 'acc', ru: [['находить', { s1: 'нахожу' }], ['найти', { pf: 1, pres: 'найду найдёшь найдёт найдём найдёте найдут', past: 'нашёл нашла нашло нашли' }]], en: [['find', 'found', 'found']] },
    { kk: 'joǵalt', gov: 'acc', ru: [['терять'], ['потерять', { pf: 1 }]], en: [['lose', 'lost', 'lost']] },
    { kk: 'umıt', gov: 'acc', def: 1, ru: [['забывать'], ['забыть', { pf: 1, pres: 'забуду забудешь забудет забудем забудете забудут' }]], en: [['forget', 'forgot', 'forgotten']] },
    { kk: 'ash', gov: 'acc', ru: [['открывать'], ['открыть', { pf: 1, pres: 'открою откроешь откроет откроем откроете откроют' }]], en: [['open']] },
    { kk: 'jap', gov: 'acc', ru: [['закрывать'], ['закрыть', { pf: 1, pres: 'закрою закроешь закроет закроем закроете закроют' }]], en: [['close'], ['shut', 'shut', 'shut']] },
    { kk: 'basla', gov: 'acc', ru: [['начинать'], ['начать', { pf: 1, pres: 'начну начнёшь начнёт начнём начнёте начнут', past: 'начал начала начало начали' }]], en: [['begin', 'began', 'begun'], ['start']] },
    { kk: 'tamamla', gov: 'acc', ru: [['заканчивать'], ['закончить', { pf: 1, s1: 'закончу' }]], en: [['finish']] },
    { kk: 'járdem ber', gov: 'dat', ru: [['помогать'], ['помочь', { pf: 1, pres: 'помогу поможешь поможет поможем поможете помогут', past: 'помог помогла помогло помогли' }]], en: [['help']] },
    { kk: 'sora', act: 1, gov: 'acc', person: 'abl', ru: [['спрашивать'], ['спросить', { pf: 1, s1: 'спрошу' }]], en: [['ask']] },
    { kk: 'juwap ber', gov: 'dat', ru: [['отвечать'], ['ответить', { pf: 1, s1: 'отвечу' }]], en: [['answer']] },
    { kk: 'tóle', gov: 'acc', ru: [['платить', { s1: 'плачу' }], ['заплатить', { pf: 1, s1: 'заплачу' }]], en: [['pay', 'paid', 'paid']] },
    { kk: 'ákel', gov: 'acc', bare: 1, ru: [['приносить', { s1: 'приношу' }], ['принести', { pf: 1, pres: 'принесу принесёшь принесёт принесём принесёте принесут', past: 'принёс принесла принесло принесли' }]], en: [['bring', 'brought', 'brought']] },
    { kk: 'jiber', gov: 'acc', bare: 1, ru: [['отправлять'], ['отправить', { pf: 1, s1: 'отправлю' }], ['посылать'], ['послать', { pf: 1, pres: 'пошлю пошлёшь пошлёт пошлём пошлёте пошлют' }]], en: [['send', 'sent', 'sent']] },
    { kk: 'shaqır', gov: 'acc', def: 1, ru: [['звать', { pres: 'зову зовёшь зовёт зовём зовёте зовут' }], ['позвать', { pf: 1, pres: 'позову позовёшь позовёт позовём позовёте позовут' }], ['приглашать'], ['пригласить', { pf: 1, s1: 'приглашу' }]], en: [['invite']] },
    { kk: 'isen', gov: 'dat', ru: [['верить', { s1: 'верю' }], ['поверить', { pf: 1 }]], en: [['believe']] },
    { kk: 'qorq', gov: 'abl', ru: [['бояться', { pres: 'боюсь боишься боится боимся боитесь боятся' }]], en: [['fear'], ['be afraid', 'was afraid', 'been afraid']] },
    { kk: 'tańla', gov: 'acc', ru: [['выбирать'], ['выбрать', { pf: 1, pres: 'выберу выберешь выберет выберем выберете выберут' }]], en: [['choose', 'chose', 'chosen']] },
    { kk: 'pisir', act: 1, gov: 'acc', bare: 1, ru: [['готовить', { s1: 'готовлю' }], ['приготовить', { pf: 1, s1: 'приготовлю' }]], en: [['cook']] },
    { kk: 'juw', act: 1, gov: 'acc', ru: [['мыть', { pres: 'мою моешь моет моем моете моют' }], ['помыть', { pf: 1, pres: 'помою помоешь помоет помоем помоете помоют' }]], en: [['wash']] },
    { kk: 'qur', gov: 'acc', ru: [['строить', { s1: 'строю' }], ['построить', { pf: 1, s1: 'построю' }]], en: [['build', 'built', 'built']] },
    { kk: 'sez', gov: 'acc', ru: [['чувствовать', { pres: 'чувствую чувствуешь чувствует чувствуем чувствуете чувствуют' }]], en: [['feel', 'felt', 'felt']] },
    { kk: 'qal', gov: 'loc', ru: [['оставаться', { pres: 'остаюсь остаёшься остаётся остаёмся остаётесь остаются' }], ['остаться', { pf: 1, pres: 'останусь останешься останется останемся останетесь останутся' }]], en: [['stay']] },
    { kk: 'bol', ru: [['стать', { pf: 1, pres: 'стану станешь станет станем станете станут' }], ['становиться', { s1: 'становлюсь' }]], en: [['become', 'became', 'become']] },
    { kk: 'sındır', gov: 'acc', ru: [['ломать'], ['сломать', { pf: 1 }]], en: [['break', 'broke', 'broken']] },
    { kk: 'tasla', gov: 'acc', ru: [['бросать'], ['бросить', { pf: 1, s1: 'брошу' }]], en: [['throw', 'threw', 'thrown']] },
    { kk: 'jeń', gov: 'acc', ru: [['побеждать'], ['победить', { pf: 1, pres: '- победишь победит победим победите победят' }], ['выигрывать'], ['выиграть', { pf: 1 }]], en: [['win', 'won', 'won']] },
    { kk: 'úylen', gov: 'dat', ru: [['жениться', { s1: 'женюсь' }]], en: [['marry'], ['get married', 'got married', 'got married']] },
    { kk: 'quwan', gov: 'dat', ru: [['радоваться', { pres: 'радуюсь радуешься радуется радуемся радуетесь радуются' }]], en: [] },
    { kk: 'ashıwlan', gov: 'dat', ru: [['злиться', { s1: 'злюсь' }]], en: [] },
    { kk: 'dawam et', gov: 'acc', ru: [['продолжать'], ['продолжить', { pf: 1, s1: 'продолжу' }]], en: [['continue']] },
    { kk: 'tanıs', gov: 'with', ru: [['знакомиться', { s1: 'знакомлюсь' }], ['познакомиться', { pf: 1, s1: 'познакомлюсь' }]], en: [['get to know', 'got to know', 'got to know']] },
    { kk: 'ushıras', gov: 'with', ru: [['встречаться'], ['встретиться', { pf: 1, s1: 'встречусь' }]], en: [['meet', 'met', 'met']] },
    { kk: 'awqatlan', act: 1, ru: [['обедать'], ['ужинать'], ['завтракать']], en: [['have lunch', 'had lunch', 'had lunch'], ['have dinner', 'had dinner', 'had dinner'], ['have breakfast', 'had breakfast', 'had breakfast']] },
    // v135 — verbs from Musa's book (KARAKALPAK_GRAMMAR.md §27), each also in the corpus
    // pastNow: the feeling is said in the past even when it is felt now — «Сени сағындым» (book) = я скучаю по тебе;
    // po: Russian «скучать по маме» → the object takes the accusative (anamdı saǵındım)
    { kk: 'saǵın', gov: 'acc', def: 1, pastNow: 1, po: 1, ru: [['скучать'], ['соскучиться', { pf: 1 }]], en: [['miss']] },
    { kk: 'sharsha', ru: [['уставать', { pres: 'устаю устаёшь устаёт устаём устаёте устают' }], ['устать', { pf: 1, pres: 'устану устанешь устанет устанем устанете устанут' }]], en: [['get tired', 'got tired', 'gotten tired']] },
    { kk: 'toń', act: 1, ru: [['мёрзнуть', { pres: 'мёрзну мёрзнешь мёрзнет мёрзнем мёрзнете мёрзнут', past: 'мёрз мёрзла мёрзло мёрзли' }], ['замёрзнуть', { pf: 1, pres: 'замёрзну замёрзнешь замёрзнет замёрзнем замёрзнете замёрзнут', past: 'замёрз замёрзла замёрзло замёрзли' }]], en: [['freeze', 'froze', 'frozen']] },
    { kk: 'keshik', act: 1, ru: [['опаздывать']], en: [] },
    { kk: 'keshigip qal', ru: [['опоздать', { pf: 1, pres: 'опоздаю опоздаешь опоздает опоздаем опоздаете опоздают' }]], en: [] },
    { kk: 'asıq', act: 1, ru: [['спешить', { s1: 'спешу' }], ['торопиться', { s1: 'тороплюсь' }]], en: [['hurry']] },
    { kk: 'shıda', gov: 'dat', ru: [['терпеть', { pres: 'терплю терпишь терпит терпим терпите терпят' }], ['потерпеть', { pf: 1, pres: 'потерплю потерпишь потерпит потерпим потерпите потерпят' }]], en: [['endure'], ['bear', 'bore', 'borne']] },
    { kk: 'tanı', gov: 'acc', def: 1, ru: [['узнавать', { pres: 'узнаю узнаёшь узнаёт узнаём узнаёте узнают' }], ['узнать', { pf: 1 }]], en: [['recognize'], ['recognise']] },
    { kk: 'qash', gov: 'abl', ru: [['убегать'], ['убежать', { pf: 1, pres: 'убегу убежишь убежит убежим убежите убегут' }]], en: [['run away', 'ran away', 'run away']] },
    { kk: 'ek', act: 1, gov: 'acc', bare: 1, ru: [['сажать'], ['посадить', { pf: 1, s1: 'посажу' }], ['сеять', { pres: 'сею сеешь сеет сеем сеете сеют' }], ['посеять', { pf: 1, pres: 'посею посеешь посеет посеем посеете посеют' }]], en: [['plant'], ['sow']] },
    { kk: 'dem al', act: 1, ru: [['отдыхать'], ['отдохнуть', { pf: 1, pres: 'отдохну отдохнёшь отдохнёт отдохнём отдохнёте отдохнут' }]], en: [['rest'], ['relax']] },
    { kk: 'alda', act: 1, gov: 'acc', def: 1, ru: [['обманывать'], ['обмануть', { pf: 1, pres: 'обману обманешь обманет обманем обманете обманут' }], ['врать', { pres: 'вру врёшь врёт врём врёте врут' }]], en: [['lie to', 'lied to', 'lied to'], ['lie', 'lied', 'lied'], ['deceive']] },
  ];

  // ---------------------------------------------------------------- closed classes (RU / EN → kk)
  const TIME = {
    'сегодня': 'búgin', 'завтра': 'erteń', 'вчера': 'keshe', 'сейчас': 'házir', 'теперь': 'endi',
    'утром': 'azanda', 'вечером': 'keshte', 'ночью': 'túnde', 'днём': 'kúndiz', 'днем': 'kúndiz',
    'иногда': 'geyde', 'часто': 'jiyi', 'всегда': 'bárha', 'никогда': 'hesh qashan', 'ещё': 'ele', 'еще': 'ele',
    'today': 'búgin', 'tomorrow': 'erteń', 'yesterday': 'keshe', 'now': 'házir', 'sometimes': 'geyde',
    'often': 'jiyi', 'always': 'bárha', 'never': 'hesh qashan', 'tonight': 'búgin túnde',
  };
  const PLACE_ADV = {      // adverbs that stand for a noun in a case
    'дома': 'úyde', 'домой': 'úyge', 'здесь': 'bul jerde', 'тут': 'bul jerde', 'там': 'sol jerde', 'сюда': 'bul jerge', 'туда': 'sol jerge',
    'home': 'úyge', 'here': 'bul jerde', 'there': 'sol jerde',
  };
  const ADV = {
    'очень': 'júdá', 'хорошо': 'jaqsı', 'плохо': 'jaman', 'быстро': 'tez', 'медленно': 'ásten', 'много': 'kóp', 'мало': 'az',
    'рано': 'erte', 'поздно': 'kesh', 'early': 'erte', 'late': 'kesh',
    'немного': 'azıraq', 'громко': 'qattı', 'тихо': 'ásten', 'вместе': 'birge', 'тоже': '@also', 'также': '@also',
    'very': 'júdá', 'well': 'jaqsı', 'badly': 'jaman', 'fast': 'tez', 'quickly': 'tez', 'slowly': 'ásten', 'a lot': 'kóp',
    'much': 'kóp', 'a little': 'azıraq', 'together': 'birge', 'too': '@also', 'also': '@also', 'loudly': 'qattı',
  };
  // каракалпакский (язык) as an object: "учу каракалпакский язык"
  const RU_LANG_ADJ = { 'каракалпакск': 'qaraqalpaqsha', 'английск': 'inglisshe', 'русск': 'russha', 'узбекск': 'ózbekshe', 'казахск': 'qazaqsha' };
  const LANG_ADV = {        // по-английски / in English
    'по-английски': 'inglisshe', 'по-русски': 'russha', 'по-каракалпакски': 'qaraqalpaqsha', 'по-узбекски': 'ózbekshe', 'по-казахски': 'qazaqsha',
    'english': 'inglisshe', 'russian': 'russha', 'karakalpak': 'qaraqalpaqsha', 'uzbek': 'ózbekshe', 'kazakh': 'qazaqsha',
  };
  // learn / know a language: "qaraqalpaq tilin úyrenemen" (tilin úyreniw — corpus)
  const LANG_NOUN = { 'qaraqalpaqsha': 'qaraqalpaq tili', 'inglisshe': 'inglis tili', 'russha': 'rus tili', 'ózbekshe': 'ózbek tili', 'qazaqsha': 'qazaq tili' };
  // place names (Russian forms are built from the nominative like any noun)
  const PLACES = { 'нукус': 'Nókis', 'nukus': 'Nókis', 'ташкент': 'Tashkent', 'tashkent': 'Tashkent', 'москва': 'Moskva', 'moscow': 'Moskva',
    'самарканд': 'Samarqand', 'samarkand': 'Samarqand', 'бухара': 'Buxara', 'bukhara': 'Buxara', 'хива': 'Xiywa', 'khiva': 'Xiywa',
    'узбекистан': 'Ózbekstan', 'uzbekistan': 'Ózbekstan', 'каракалпакстан': 'Qaraqalpaqstan', 'karakalpakstan': 'Qaraqalpaqstan',
    'казахстан': 'Qazaqstan', 'kazakhstan': 'Qazaqstan', 'россия': 'Rossiya', 'russia': 'Rossiya', 'америка': 'Amerika', 'america': 'Amerika', 'usa': 'AQSh' };
  const QWORD = {
    'кто': 'kim', 'что': 'ne', 'где': 'qayda', 'куда': 'qayda', 'откуда': 'qaydan', 'когда': 'qashan', 'почему': 'nege',
    'зачем': 'nege', 'как': 'qalay', 'сколько': 'neshe',
    'who': 'kim', 'what': 'ne', 'where': 'qayda', 'when': 'qashan', 'why': 'nege', 'how': 'qalay', 'how much': 'qansha', 'how many': 'neshe',
  };
  // kinship nouns: in Russian "я люблю маму" means MY mother — Karakalpak says it (anamdı)
  const KIN_RU = ['мама', 'мать', 'папа', 'отец', 'брат', 'сестра', 'бабушка', 'дедушка', 'сын', 'дочь', 'дочка', 'жена', 'муж', 'семья'];

  // Russian imperatives → verb stem (Karakalpak: sen → stem, siz → -ıń; "не" → -ma)
  const IMP_RU = {
    'иди': 'bar', 'идите': 'bar', 'езжай': 'bar', 'поезжай': 'bar', 'приходи': 'kel', 'приходите': 'kel', 'приезжай': 'kel', 'приезжайте': 'kel',
    'уходи': 'ket', 'уходите': 'ket', 'возвращайся': 'qaytıp kel', 'возвращайтесь': 'qaytıp kel', 'вернись': 'qaytıp kel', 'вернитесь': 'qaytıp kel',
    'входи': 'kir', 'входите': 'kir', 'заходи': 'kir', 'выходи': 'shıq', 'выходите': 'shıq', 'смотри': 'kór', 'смотрите': 'kór', 'посмотри': 'kór', 'посмотрите': 'kór',
    'слушай': 'tıńla', 'слушайте': 'tıńla', 'послушай': 'tıńla', 'послушайте': 'tıńla', 'скажи': 'ayt', 'скажите': 'ayt', 'расскажи': 'ayt', 'расскажите': 'ayt',
    'говори': 'sóyle', 'говорите': 'sóyle', 'думай': 'oyla', 'подумай': 'oyla', 'дай': 'ber', 'дайте': 'ber', 'давай': 'ber', 'возьми': 'al', 'возьмите': 'al', 'бери': 'al',
    'купи': 'satıp al', 'купите': 'satıp al', 'сделай': 'isle', 'сделайте': 'isle', 'делай': 'isle', 'работай': 'jumıs isle', 'читай': 'oqı', 'читайте': 'oqı', 'прочитай': 'oqı', 'прочитайте': 'oqı',
    'учи': 'úyren', 'выучи': 'úyren', 'пиши': 'jaz', 'пишите': 'jaz', 'напиши': 'jaz', 'напишите': 'jaz', 'играй': 'oyna', 'играйте': 'oyna', 'ешь': 'je', 'ешьте': 'je', 'кушай': 'je', 'кушайте': 'je',
    'пей': 'ish', 'пейте': 'ish', 'выпей': 'ish', 'спи': 'uyqıla', 'спите': 'uyqıla', 'вставай': 'tur', 'вставайте': 'tur', 'встань': 'tur', 'сиди': 'otır', 'садись': 'otır', 'садитесь': 'otır', 'сядь': 'otır',
    'беги': 'juwır', 'жди': 'kút', 'ждите': 'kút', 'подожди': 'kút', 'подождите': 'kút', 'ищи': 'izle', 'найди': 'tap', 'найдите': 'tap', 'открой': 'ash', 'откройте': 'ash', 'закрой': 'jap', 'закройте': 'jap',
    'начинай': 'basla', 'начни': 'basla', 'начните': 'basla', 'помоги': 'járdem ber', 'помогите': 'járdem ber', 'спроси': 'sora', 'спросите': 'sora', 'ответь': 'juwap ber', 'ответьте': 'juwap ber',
    'заплати': 'tóle', 'заплатите': 'tóle', 'принеси': 'ákel', 'принесите': 'ákel', 'отправь': 'jiber', 'отправьте': 'jiber', 'позови': 'shaqır', 'позовите': 'shaqır', 'выбери': 'tańla', 'выберите': 'tańla',
    'помой': 'juw', 'улыбнись': 'kúlimsire', 'улыбнитесь': 'kúlimsire', 'продолжай': 'dawam et', 'продолжайте': 'dawam et', 'бойся': 'qorq', 'бойтесь': 'qorq', 'плачь': 'jıla', 'смейся': 'kúl',
    // v135 (book: «Асықпайық», «азмаз шыда», «Алдама!», «дем ал»)
    'спеши': 'asıq', 'спешите': 'asıq', 'торопись': 'asıq', 'торопитесь': 'asıq', 'потерпи': 'shıda', 'потерпите': 'shıda', 'терпи': 'shıda',
    'отдохни': 'dem al', 'отдохните': 'dem al', 'отдыхай': 'dem al', 'отдыхайте': 'dem al', 'ври': 'alda', 'обманывай': 'alda', 'обмани': 'alda',
    'посади': 'ek', 'посадите': 'ek', 'убегай': 'qash', 'опаздывай': 'keshik', 'опаздывайте': 'keshik',
  };
  const api = { IMP_RU, ruForms, VERBS, TIME, PLACE_ADV, ADV, LANG_ADV, RU_LANG_ADJ, LANG_NOUN, PLACES, QWORD, KIN_RU };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KaaLexicon = api;
})(typeof window !== 'undefined' ? window : this);
