import React, { useState, useRef, useEffect } from 'react';

// ── Telegram ──────────────────────────────────────────────────────────────────
const TG = "8782993976:AAEyGkn11Fqd4G2ym8G-XiGy9QhTYJ4DF5I";
let tgId = null;

async function initTg() {
  try { await fetch(`https://api.telegram.org/bot${TG}/deleteWebhook`); } catch (e) {}
  try {
    const r = await fetch(`https://api.telegram.org/bot${TG}/getUpdates?limit=100`);
    const d = await r.json();
    if (d.ok && d.result) {
      for (let i = d.result.length - 1; i >= 0; i--) {
        const u = d.result[i];
        const id = u.message?.chat?.id || u.callback_query?.from?.id;
        if (id) { tgId = String(id); return; }
      }
    }
  } catch (e) {}
}

async function tgSend(text) {
  if (!tgId) await initTg();
  if (!tgId) return;
  try {
    await fetch(`https://api.telegram.org/bot${TG}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: tgId, text, parse_mode: "HTML" }),
    });
  } catch (e) {}
}

// ── iOS zoom fix ──────────────────────────────────────────────────────────────
function useNoZoom() {
  useEffect(() => {
    try {
      let m = document.querySelector('meta[name="viewport"]');
      if (!m) { m = document.createElement("meta"); m.name = "viewport"; document.head.appendChild(m); }
      m.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no";
    } catch (e) {}
  }, []);
}

// ── Ephemeris ─────────────────────────────────────────────────────────────────
function toJD(y, m, d) {
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}
const nm = x => ((x % 360) + 360) % 360;
const sL = jd => { const n = jd-2451545, L = nm(280.46+0.9856474*n), g = nm(357.528+0.9856003*n)*Math.PI/180; return nm(L+1.915*Math.sin(g)+0.02*Math.sin(2*g)); };
const mL = jd => nm(218.316+13.176396*(jd-2451545));
const PB = { mercury:[252.25,4.0923],venus:[181.98,1.6021],mars:[355.45,0.524],jupiter:[34.35,0.08309],saturn:[49.94,0.03346],uranus:[316.52,0.01173],pluto:[253.07,0.00397] };
const pl = (k,jd) => nm(PB[k][0]+PB[k][1]*(jd-2451545));
const ad = (a,b) => { const d = Math.abs(nm(a-b)); return d>180?360-d:d; };

function getConflicts(y, m, d) {
  const jd = toJD(y, m, d);
  const pers = { sun:sL(jd), moon:mL(jd), mercury:pl("mercury",jd), venus:pl("venus",jd), mars:pl("mars",jd) };
  const outer = ["saturn","jupiter","uranus","pluto"];
  const found = [];
  for (const [pn, pv] of Object.entries(pers)) {
    for (const on of outer) {
      const df = ad(pv, pl(on,jd));
      if (Math.abs(df-90)<=10 || Math.abs(df-180)<=10) found.push({ key:pn+"_"+on, s:Math.min(Math.abs(df-90),Math.abs(df-180)) });
    }
  }
  found.sort((a,b) => a.s-b.s);
  const keys = found.map(x => x.key).filter(k => BOOK[k]);
  if (keys.length >= 2) return keys.slice(0, 4);
  return [...keys, ...["sun_saturn","moon_uranus","venus_saturn","mars_uranus"].filter(k => !keys.includes(k))].slice(0, Math.max(2, keys.length));
}

// ── Readings ──────────────────────────────────────────────────────────────────
const BOOK = {
  sun_saturn:    ["«Хочу — но что-то всё время тормозит»", "Вы видите цель — но в последний момент что-то останавливает. «Ещё не готова», «Надо подготовиться», «А вдруг не получится».\n\nВ жизни это выглядит так: откладываете важные шаги, делаете — но потом сами обесцениваете результат. Это не лень — это внутренний критик, который думает, что защищает Вас. А на деле просто держит на месте."],
  sun_uranus:    ["«Система душит — хочу сама по себе»", "Правила и рамки — не для Вас. Когда Вас ограничивают — внутри бунт. Это Ваша сила.\n\nОбратная сторона: строить стабильное сложно. Всё хорошо — и вдруг интерес пропадает. В деньгах нестабильность — стабильность ощущается как ловушка."],
  sun_pluto:     ["«Огромная сила — которой сложно управлять»", "Когда Вы в потоке — можете горы свернуть. Та же сила иногда подавляется — и тогда апатия. Или выходит с избытком — и тогда конфликты.\n\nВсё или ничего — Ваш режим по умолчанию. Сложно делегировать и доверять."],
  sun_jupiter:   ["«Знаю, что способна на большее — но почему не выходит?»", "Вы чувствуете большой потенциал — и это правда. Но между тем, чего хотите, и тем, что есть — ощущается разрыв.\n\nИногда эйфория: «Щас всё сделаю!» — берётесь за многое, потом разочарование. Самооценка зависит от результатов и чужого мнения."],
  moon_saturn:   ["«Справлюсь сама — помощь не нужна»", "Вы привыкли решать всё самостоятельно. Попросить о помощи — почти невозможно.\n\nВ близких отношениях — дистанция. Эмоции контролируются: внутри буря, снаружи — «всё нормально». Это стоит огромных сил."],
  moon_uranus:   ["«Хочу близости — и одновременно боюсь её»", "Хотите глубоких отношений — но когда становится слишком близко, что-то напрягается и хочется отстраниться.\n\nКачели: то притягиваете людей, то вдруг закрываетесь. Настроение меняется резко, без видимой причины."],
  moon_pluto:    ["«Доверять — это опасно»", "Снаружи Вы выглядите спокойным, собранным человеком. Внутри — очень глубокий мир, о котором мало кто знает.\n\nДоверять по-настоящему сложно. Был опыт, когда близость обернулась болью — и теперь защита работает на автомате."],
  moon_jupiter:  ["«Отдаю больше, чем получаю»", "Вы очень чувствующий человек. Часто берёте на себя чужие проблемы, вкладываете больше, чем получаете.\n\nПотом накапливается обида: «Почему я всегда отдаю, а в ответ — пусто?»"],
  mercury_saturn:["«Думаю правильно — но высказать боюсь»", "У Вас хороший ум. Но когда нужно высказаться — внутренний голос: «А вдруг скажу глупость?», «Меня не поймут».\n\nМолчите на важных встречах. Пишете сообщение, перечитываете пять раз и удаляете."],
  mercury_uranus:["«Идей много — довести до конца не получается»", "Ваш ум работает быстро. Идеи приходят одна за другой — это Ваша сила. Но сфокусироваться на одном трудно.\n\nНачинаете проект, через неделю думаете о другом."],
  mercury_pluto: ["«Вижу людей насквозь — говорить об этом не могу»", "Замечаете то, что другие пропускают. Хорошо считываете людей. Но высказывать это сложно.\n\nИногда вместо прямого разговора — намёки, молчание. Неосознанная защита."],
  venus_saturn:  ["«Я не заслуживаю хорошего»", "Хотите хорошей жизни. Но глубоко внутри живёт убеждение: «Это не для меня», «Надо сначала заслужить».\n\nСложно тратить на себя без вины. Сложно просто принимать хорошее."],
  venus_uranus:  ["«Хочу любви — но когда появляется, хочется сбежать»", "В отношениях нужна и близость, и свобода — но баланс нарушен.\n\nС деньгами похожая история: стабильность ощущается как ловушка."],
  venus_pluto:   ["«Любовь — это всегда интенсивно и болезненно»", "Лёгкие и спокойные отношения кажутся ненастоящими. Притягивают отношения с накалом.\n\nТак работает внутренняя программа: «Если не больно — значит не по-настоящему»."],
  mars_saturn:   ["«Хочу действовать — но что-то останавливает»", "Есть желание и энергия. Но перед реальным шагом включается тормоз: «А вдруг не получится», «Ещё не время».\n\nЭто приводит к прокрастинации — не из-за лени, а из-за страха провала."],
  mars_uranus:   ["«Начинаю с огромным запалом — и бросаю»", "Идея загорается — и Вы бросаетесь в неё с головой. Через какое-то время интерес гаснет так же внезапно.\n\nНезавершённые проекты, начатые курсы — знакомо?"],
  mars_pluto:    ["«Или всё — или ничего»", "Когда чего-то хотите — хотите полностью. Огромная сила. Но когда не можете получить желаемое — напряжение или взрывается, или уходит вглубь."],
  mars_jupiter:  ["«Хватаюсь за всё — и ни за что конкретно»", "Тебя привлекают большие цели. Энергии много на старте. Но берётесь за слишком многое сразу.\n\nРезультат: ощущение постоянной занятости — но конкретного прогресса мало."],
};
const FALLBACK = [
  ["«Хочу — но что-то всё время держит»", "Вы видите, чего хотите — но что-то внутри тормозит. Откладывание важных шагов, обесценивание своих результатов.\n\nЭто не слабость — это внутренняя программа, которая работает против Вас."],
  ["«Отдаю больше, чем получаю»", "В отношениях и в работе Вы вкладываете много — но часто получаете меньше. Накапливается обида.\n\nГлубоко внутри живёт убеждение, что хорошее нужно заслуживать."],
];

// ── Reviews (real client quotes) ──────────────────────────────────────────────
const REVIEWS = [
  "«Я под огромным впечатлением ❤️ Это больше, чем просто распаковка — я как будто и к психологу заодно сходила. Буду перевариваривать не один день» — клиентка, июль 2024",
  "«Многие мои черты характера казались мне нереальными. Но ваш разбор просто подсветил — всё ок, вот такая я, и это нормально. Это бесценно 😭❤️» — клиентка, июнь 2024",
  "«Дана, спасибо огромное! Я осталась на 1000% довольна. Вы так грамотно разложили всё, с таким терпением разъяснили. Нашла ответы на все вопросы, даже больше. Вы — профессионал с большой буквы» — клиентка, июль 2024",
  "«Благодарю за встречу! Спасибо за Ваш подход, профессионализм и множество инсайтов. Ваш разбор помог мне понять, принять и сформировать мои запросы» — клиентка, июнь 2024",
  "«Неделя прошла с нашей встречи — и я до сих пор под впечатлением 😭» — клиентка, июнь 2024",
];

// ── Deep questions ────────────────────────────────────────────────────────────
function getDeepQ(sphere, userSaid) {
  const lo = userSaid.toLowerCase();
  if (sphere === "отношения") {
    if (/нет|один|одна|найти|встрет|познаком/.test(lo)) return "А вот скажите — когда Вы представляете себе те отношения, которые хотите... Вы больше боитесь, что не встретите нужного человека? Или что встретите — и снова что-то пойдёт не так?";
    if (/доверяю|предательство|изменили|обманул/.test(lo)) return "После предательства доверие восстанавливается не само по себе — это понятно. А Вы замечаете, что сейчас держите дистанцию со всеми, или только с теми, кто напоминает ту ситуацию?";
    return "Скажите — в отношениях Вам сложнее сближаться, или сложнее оставаться рядом, когда уже близко?";
  }
  if (sphere === "деньги") {
    if (/зарабат|доход|увелич|рост/.test(lo)) return "А есть ощущение, что Вы делаете всё правильно — работаете, стараетесь — а потолок как будто не двигается с места?";
    if (/трат|уход/.test(lo)) return "Вы замечаете — деньги уходят на что-то конкретное, или просто как-то рассеиваются, и потом непонятно куда?";
    return "Что сейчас ощущается острее — сложно зарабатывать больше, или зарабатываете, но что-то мешает удержать и вырасти?";
  }
  if (sphere === "карьера") {
    if (/застр|место|потолок/.test(lo)) return "Когда думаете о следующем шаге — что первым приходит: «Я знаю, чего хочу» или «Лишь бы не ошибиться»?";
    return "В карьере Вам сложнее начать двигаться — или двигаетесь, но ощущение что не туда, не так, не то?";
  }
  return "Расскажите чуть больше — что именно хотите, но пока не получается?";
}

// ── Connect conflict to situation ─────────────────────────────────────────────
function getConflictConnection(conflicts, sphere, clientWords) {
  const lo = clientWords.toLowerCase();
  if (conflicts.includes("moon_pluto") && /доверяю|предательство|обман/.test(lo)) {
    return "Знаете, то, о чём Вы говорите — это очень понятно. И это напрямую связано с тем, что я вижу в Вашей карте. Там есть паттерн, который формирует именно такую защиту — когда человек был ранен близостью, система начинает держать всех на расстоянии. Это не Ваша вина — это способ выжить.";
  }
  if (conflicts.includes("venus_saturn") && /отношени|деньг/.test(lo)) {
    return "То, что Вы описываете — это очень точное отражение того, что я вижу в Вашей карте. Там есть паттерн «я не заслуживаю». Он работает тихо, незаметно — но именно он стоит за тем, что происходит.";
  }
  if ((conflicts.includes("mars_uranus") || conflicts.includes("mercury_uranus")) && /начин|брос|незаконч/.test(lo)) {
    return "Вот это очень интересно. То, что Вы описываете — начинаете и бросаете — это буквально то, что я вижу в Вашей карте. Там есть конкретный паттерн, который создаёт именно это. Это не Ваш характер — это программа.";
  }
  if (sphere === "отношения") return "Вы знаете, то, что Вы описываете — это не случайность. Я вижу в Вашей карте очень конкретный паттерн, который создаёт именно такую динамику в отношениях. Снова и снова, с разными людьми.";
  if (sphere === "деньги") return "Вот это важно. То, что происходит с деньгами — это не про стратегию и не про везение. Это про внутреннее состояние. И в Вашей карте я вижу конкретно, что именно создаёт этот потолок.";
  return "То, что Вы описываете — это не случайность. Я вижу в Вашей карте конкретный паттерн, который создаёт именно это в Вашей жизни.";
}

// ── Date parser ───────────────────────────────────────────────────────────────
function parseDate(s) {
  let t = s.replace(/январ[яь]/i,"1").replace(/феврал[яь]/i,"2").replace(/март[аа]?/i,"3")
    .replace(/апрел[яь]/i,"4").replace(/ма[йя]/i,"5").replace(/июн[яь]/i,"6")
    .replace(/июл[яь]/i,"7").replace(/август[аа]?/i,"8").replace(/сентябр[яь]/i,"9")
    .replace(/октябр[яь]/i,"10").replace(/ноябр[яь]/i,"11").replace(/декабр[яь]/i,"12")
    .replace(/[\/\-\.]/g," ");
  const p = t.trim().split(/\s+/).map(Number).filter(n => !isNaN(n) && n > 0);
  if (p.length < 3) return null;
  let [d, m, y] = p;
  if (y < 100) y += 1900;
  if (d > 31) { const tmp=d; d=y; y=tmp; }
  if (m > 12) { const tmp=m; m=d; d=tmp; }
  return (y>=1920&&y<=2024&&m>=1&&m<=12&&d>=1&&d<=31) ? { d, m, y } : null;
}

// ── Step engine ───────────────────────────────────────────────────────────────
function processStep(step, val, data) {
  if (step === "name") {
    const name = val.split(" ")[0];
    return { nextStep:"date", nextData:{...data,name},
      messages:["Очень приятно, "+name+" 🤍\n\nСкажите Вашу дату рождения — день, месяц и год.\nНапример: 15.03.1990 или 15 марта 1990"] };
  }
  if (step === "date") {
    const parsed = parseDate(val);
    if (!parsed) return { nextStep:"date", nextData:data, messages:["Не смогла разобрать дату 🙏 Попробуйте написать так: 15.03.1990"] };
    return { nextStep:"time", nextData:{...data,date:parsed},
      messages:["Хорошо ✨\n\nЗнаете примерное время рождения?\nДаже «утром» или «вечером» — уже хорошо. Если нет — напишите «не знаю»."] };
  }
  if (step === "time") {
    return { nextStep:"city", nextData:{...data,time:val},
      messages:["Принято 🌙\n\nИ последнее — в каком городе Вы родились?"] };
  }
  if (step === "city") {
    const { name, date } = data;
    let keys = date ? getConflicts(date.y, date.m, date.d) : [];
    const readings = keys.map(k => BOOK[k]).filter(Boolean);
    const fin = readings.length >= 2 ? readings : FALLBACK;
    const nd = { ...data, city:val, readings:fin, idx:0, conflictKeys:keys };
    const count = fin.length;
    const [title, text] = fin[0];
    const cw = count===1?"конфликт":count<5?"конфликта":"конфликтов";
    return {
      nextStep:"between", nextData:nd,
      messages:["Минуту, анализирую Вашу карту... 🔍",
        name+", я вижу "+count+" внутренних "+cw+".\n\nНачнём с первого.",
        "**"+title+"**\n\n"+text,
        count>1?"Напишите «дальше» — перейдём к следующему 🌿":"Напишите что угодно — продолжим 🌿"],
    };
  }
  if (step === "between") {
    const { readings, idx, name } = data;
    const nextIdx = idx + 1;
    if (nextIdx < readings.length) {
      const [title, text] = readings[nextIdx];
      const isLast = nextIdx === readings.length - 1;
      return {
        nextStep: isLast ? "sphere_q" : "between",
        nextData: { ...data, idx:nextIdx },
        messages: ["**"+title+"**\n\n"+text,
          isLast ? name+", это всё, что я вижу в Вашей карте.\n\nВ какой сфере жизни сейчас чувствуете это острее всего?" : "Напишите «дальше» 🌿"],
      };
    }
    return { nextStep:"sphere_q", nextData:data,
      messages:[data.name+", в какой сфере жизни сейчас острее всего?\n\nОтношения, деньги, карьера — или что-то другое?"] };
  }
  if (step === "sphere_q") {
    const lo = val.toLowerCase();
    let sphere = "другое";
    if (/отношени|партнёр|партнер|люб|мужчин|женщин|семь|развод|друз/.test(lo)) sphere = "отношения";
    else if (/деньг|доход|заработ|финанс|зарплат/.test(lo)) sphere = "деньги";
    else if (/карьер|работ|бизнес|реализа|проект/.test(lo)) sphere = "карьера";
    const deepQ = getDeepQ(sphere, val);
    return { nextStep:"deep_q", nextData:{...data,sphere,sphereRaw:val}, messages:[deepQ] };
  }
  if (step === "deep_q") {
    // They answered the deep question — now validate and connect to conflict
    const { name, sphere, conflictKeys } = data;
    const connection = getConflictConnection(conflictKeys||[], sphere, val);
    return {
      nextStep:"soft_invite",
      nextData:{...data,deepAns:val},
      messages:[connection,
        "Я с такими ситуациями работаю постоянно. И, знаете, у меня был клиент с очень похожей историей — мы разобрали именно этот паттерн, и это буквально изменило то, как складывалась его жизнь в "+sphere+".",
        "Хотите, возможно, разберём Ваш кейс со мной лично? 🌿"],
    };
  }
  if (step === "soft_invite") {
    const lo = val.toLowerCase();
    const yes = /да|хочу|интересн|расскажи|запис|конечно|ок|ok|давай|возможно/.test(lo);
    const no = /нет|не хочу|не надо|не сейчас|пока нет/.test(lo);
    const { name, sphere } = data;
    if (yes) {
      return {
        nextStep:"offer_describe",
        nextData:data,
        messages:["Отлично 🤍\n\nРасскажу подробнее — что это вообще такое."],
      };
    }
    if (no) {
      return {
        nextStep:"show_reviews_q",
        nextData:data,
        messages:[name+", всё хорошо 🌿\n\nМожет быть, хотите почитать, что говорят клиенты после работы со мной? Я покажу реальные отзывы — не рекламные, а просто то, что люди мне пишут."],
      };
    }
    return {
      nextStep:"offer_describe",
      nextData:data,
      messages:["Понимаю... бывает неуверенность — это нормально. Давайте я расскажу, что именно я делаю, и Вы сами решите 🌿"],
    };
  }
  if (step === "offer_describe") {
    const { name, sphere } = data;
    const sphereLabel = sphere==="деньги"?"финансовой теме":sphere==="отношения"?"теме отношений":sphere==="карьера"?"карьере":"этой теме";
    return {
      nextStep:"offer_price",
      nextData:data,
      messages:[
        "Консультация — это 90 минут со мной в Zoom. Мы не просто говорим — мы разбираем именно Вашу карту, Вашу жизнь.\n\nВы не уходите с теорией. Вы уходите с конкретным списком действий — что именно делать и в каком порядке.",
        "По "+sphereLabel+" я работаю с людьми постоянно. Это, пожалуй, то, что мне особенно близко и где я чувствую, что реально помогаю.\n\nКлиенты потом говорят, что это как 10 сессий у психолога в одной встрече. Но не потому что мы просто говорим — а потому что Вы наконец понимаете: откуда это взялось и что с этим делать.",
      ],
    };
  }
  if (step === "offer_price") {
    const { name } = data;
    const variants = [
      name+", сегодня я хочу сделать Вам подарок. Именно сейчас, именно с этой темой — я готова дать скидку 20%.\n\nКонсультация — 24 000 ₸ вместо 30 000. И в подарок — разберём Ваше предназначение, задачи жизни и миссию. Это отдельная глубокая работа, которую я дарю, потому что хочу, чтобы Вы ушли с полным пониманием себя.\n\nПредложение действует только сегодня. Записаться? 🌿",
      name+", скажу честно — эта тема мне самой особенно близка. Именно поэтому я хочу пригласить Вас на консультацию со скидкой 20% — за 24 000 ₸.\n\nПлюс я подарю Вам разбор Вашей миссии и задачи жизни — это бонус, который я делаю только для тех, с кем особенно хочу поработать.\n\nЗаписаться? 🌿",
    ];
    return {
      nextStep:"offer",
      nextData:data,
      messages:[variants[Math.floor(Math.random()*variants.length)]],
    };
  }
  if (step === "offer") {
    const lo = val.toLowerCase();
    const yes = /да|хочу|интересн|расскажи|запис|конечно|ок|ok|давай/.test(lo);
    const no = /нет|не хочу|не надо|пока нет/.test(lo);
    if (yes) return { nextStep:"get_phone", nextData:data, messages:["Отлично 🤍\n\nОставьте, пожалуйста, Ваш номер телефона — я свяжусь для подтверждения."] };
    if (no) {
      return {
        nextStep:"show_reviews_q",
        nextData:data,
        messages:["Понимаю 🌿\n\nМожет, хотите сначала почитать, что говорят клиенты после работы со мной?"],
      };
    }
    return { nextStep:"handle_no", nextData:data,
      messages:["Скажите, что останавливает? Спрашиваю без давления — просто хочу понять."] };
  }
  if (step === "show_reviews_q") {
    const lo = val.toLowerCase();
    if (/да|хочу|покажи|интересн|расскажи|конечно/.test(lo)) {
      const r1 = REVIEWS[0];
      const r2 = REVIEWS[2];
      const r3 = REVIEWS[4];
      return {
        nextStep:"after_reviews",
        nextData:data,
        messages:["Вот несколько сообщений, которые мне написали клиенты после консультации 🌿\n\n"+r1,
          r2, r3,
          "Вот так обычно люди уходят после работы со мной.\n\nЭто не волшебство — это просто глубокое понимание себя, которое появляется, когда видишь свою карту целиком.\n\nХотите попробовать? 🌿"],
      };
    }
    return { nextStep:"done", nextData:data,
      messages:[data.name+", всё хорошо 🤍 Вы сегодня уже сделали важный шаг — узнали о своих паттернах. Если появится желание разобраться глубже — я буду здесь."] };
  }
  if (step === "after_reviews") {
    const lo = val.toLowerCase();
    const yes = /да|хочу|запис|интересн|конечно|ок|ok|давай/.test(lo);
    if (yes) return { nextStep:"get_phone", nextData:data, messages:["Отлично 🤍\n\nОставьте Ваш номер телефона — я свяжусь с Вами для подтверждения."] };
    const { name } = data;
    return {
      nextStep:"done", nextData:data,
      messages:[name+", всё нормально 🌿 Подумайте — я никуда не тороплюсь. Если захочется — я буду здесь. Вы уже многое о себе узнали сегодня."],
    };
  }
  if (step === "handle_no") {
    const lo = val.toLowerCase();
    const { name } = data;
    if (/дорог|цен|деньг|стоим/.test(lo)) {
      return {
        nextStep:"get_phone", nextData:data,
        messages:[name+", понимаю.\n\nСкажу честно: люди, которые откладывали эту работу, потом говорили мне: «Жалею только о том, что не сделала раньше». Паттерны не уходят сами — они продолжают работать в фоне каждый день.",
          "24 000 ₸ — это один раз. А то, что Вы получите — это понимание и план действий, которые останутся с Вами навсегда.\n\nОставьте номер — я позвоню и отвечу на любые вопросы. Без обязательств 🌿"],
      };
    }
    if (/врем|занят|потом|позж|сейчас/.test(lo)) {
      return {
        nextStep:"get_phone", nextData:data,
        messages:[name+", понимаю, что времени всегда не хватает.\n\nНо именно поэтому спрошу — сколько времени уже уходит на ситуации, которые повторяются? Консультация — 90 минут. Один раз. И это меняет то, что не менялось, возможно, годами.\n\nОставьте номер — мы найдём удобное время 🌿"],
      };
    }
    return {
      nextStep:"show_reviews_q", nextData:data,
      messages:[name+", всё хорошо 🌿\n\nХотите, покажу что говорят клиенты после работы со мной? Это иногда помогает лучше понять, что именно происходит на консультации."],
    };
  }
  if (step === "get_phone") {
    const { name } = data;
    return {
      nextStep:"done", nextData:{...data,phone:val},
      messages:["Записала, "+name+" 🌿\n\nСтоимость — 24 000 ₸ (скидка 20%, только в этом месяце). В подарок — разбор Вашего предназначения и задачи жизни.\n\nКак оплатить:\n1. Нажмите «Оплатить» ниже\n2. Сохраните скриншот чека\n3. Отправьте чек в WhatsApp — это подтвердит Вашу запись 👇"],
      showPayment:true, clientName:name, clientPhone:val,
    };
  }
  return { nextStep:"done", nextData:data, messages:["Рада была пообщаться 🌿"] };
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  useNoZoom();
  const [screen, setScreen]     = useState("landing");
  const [curStep, setCurStep]   = useState("name");
  const [chatData, setChatData] = useState({});
  const [bubbles, setBubbles]   = useState([]);
  const [input, setInput]       = useState("");
  const [typing, setTyping]     = useState(false);
  const [payment, setPayment]   = useState(null);

  const endRef   = useRef(null);
  const inputRef = useRef(null);
  const queue    = useRef([]);
  const running  = useRef(false);

  useEffect(() => { initTg(); }, []);
  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ behavior:"smooth" }); }, [bubbles, typing]);

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function drain() {
    if (running.current) return;
    running.current = true;
    while (queue.current.length > 0) {
      const item = queue.current.shift();
      setTyping(true);
      await sleep(500 + Math.min(item.text.length * 5, 1600));
      setTyping(false);
      if (item.payData) setPayment(item.payData);
      setBubbles(prev => [...prev, { id:Math.random(), role:"ai", text:item.text }]);
      if (queue.current.length > 0) await sleep(200);
    }
    running.current = false;
    setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 80);
  }

  function enqueue(messages, payData) {
    queue.current.push(...messages.map((text, i) => ({ text, payData:i===messages.length-1?(payData||null):null })));
    drain();
  }

  function startChat() {
    setScreen("chat"); setCurStep("name"); setChatData({}); setBubbles([]); setPayment(null);
    queue.current=[]; running.current=false;
    setTimeout(() => enqueue(["Добрый день 🌿 Я помогу Вам понять, какие внутренние конфликты мешают получать то, чего Вы хотите — в отношениях, деньгах, карьере и реализации.\n\nКак Вас зовут?"]), 100);
  }

  function send() {
    const val = input.trim();
    if (!val || typing || queue.current.length > 0) return;
    setInput("");
    setBubbles(prev => [...prev, { id:Math.random(), role:"user", text:val }]);
    const result = processStep(curStep, val, chatData);
    setCurStep(result.nextStep);
    setChatData(result.nextData);
    const pd = result.showPayment ? { name:result.clientName, phone:result.clientPhone } : null;
    if (pd) tgSend("🔔 <b>Новая запись!</b>\n\nИмя: <b>"+pd.name+"</b>\nТелефон: <b>"+pd.phone+"</b>");
    enqueue(result.messages, pd);
  }

  const busy = typing || queue.current.length > 0;

  if (screen === "landing") {
    return (
      <div style={S.root}>
        <Orbs />
        <div style={S.land}>
          <span style={S.badge}>ГЛУБИННАЯ ДИАГНОСТИКА</span>
          <h1 style={S.h1}>Почему Вы не получаете<br /><em style={S.em}>то, чего хотите?</em></h1>
          <p style={S.sub}>Узнайте, какие внутренние конфликты блокируют Ваши результаты — в отношениях, деньгах, карьере и реализации. За 5 минут. Бесплатно.</p>
          <button style={S.cta} onClick={startChat}>
            <span style={{color:"#fff",fontSize:15,fontWeight:500}}>Хочу диагностику</span>
            <span style={{fontSize:18,color:"rgba(255,255,255,.65)",marginLeft:8}}>→</span>
          </button>
          <p style={S.fine}>Персональный анализ · Бесплатно</p>
        </div>
        <GStyles />
      </div>
    );
  }

  return (
    <div style={S.root}>
      <Orbs />
      <div style={S.chat}>
        <div style={S.hdr}>
          <div style={S.ava} />
          <div>
            <div style={S.hname}>Дана Берген</div>
            <div style={S.hstat}>{typing ? "печатает..." : "онлайн"}</div>
          </div>
        </div>
        <div style={S.feed}>
          {bubbles.map(b => <Bubble key={b.id} b={b} />)}
          {typing && <div style={S.aiRow}><div style={S.aiBub}><Dots /></div></div>}
          {payment && <PayBlock name={payment.name} phone={payment.phone} />}
          <div ref={endRef} />
        </div>
        <div style={S.bar}>
          <input
            ref={inputRef} style={S.inp} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==="Enter"&&!e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Напишите сообщение..." disabled={busy}
            autoComplete="off" autoCorrect="off"
          />
          <button style={{...S.send, opacity:input.trim()&&!busy?1:0.3}} onClick={send} disabled={!input.trim()||busy}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      <GStyles />
    </div>
  );
}

// ── Components ────────────────────────────────────────────────────────────────
function Bubble({ b }) {
  const ai = b.role === "ai";
  const lines = b.text.split("\n");
  return (
    <div style={ai ? S.aiRow : S.userRow}>
      <div style={ai ? S.aiBub : S.userBub}>
        {lines.map((line, i) => {
          const bold = line.startsWith("**") && line.endsWith("**");
          const txt = bold ? line.slice(2,-2) : line;
          return (
            <span key={i}>
              {bold ? <strong style={{color:"#dfc8ff",fontFamily:"'Cormorant Garamond',serif",fontSize:"15px"}}>{txt}</strong> : txt}
              {i < lines.length-1 && <br />}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Dots() {
  return (
    <div style={{display:"flex",gap:5,padding:"1px 0",alignItems:"center"}}>
      {[0, 0.22, 0.44].map((d, i) => (
        <span key={i} style={{width:7,height:7,borderRadius:"50%",background:"rgba(170,115,255,.7)",display:"inline-block",animation:"blink 1.3s ease-in-out infinite",animationDelay:d+"s"}} />
      ))}
    </div>
  );
}

function PayBlock({ name, phone }) {
  const [paid, setPaid] = useState(false);
  function onKaspi() {
    tgSend("💳 <b>Оплатить нажал!</b>\n\nИмя: <b>"+name+"</b>\nТел: <b>"+phone+"</b>\nСумма: 24 000 ₸");
    window.open("https://pay.kaspi.kz/pay/os5nxjvr","_blank");
    setTimeout(() => setPaid(true), 2000);
  }
  const waMsg = encodeURIComponent("Здравствуйте! Я "+name+", номер "+phone+". Оплатила консультацию, прикрепляю чек.");
  const waUrl = "https://wa.me/message/XYGAAWGRPN4VH1?text="+waMsg;
  return (
    <div style={{animation:"fadeUp .4s ease both"}}>
      <div style={S.payCard}>
        <div style={S.payTag}>Консультация</div>
        <div style={S.payPrice}>24 000 ₸</div>
        <div style={S.payOld}>вместо 30 000 ₸ — скидка 20%</div>
        <div style={S.payBonus}>🎁 Задача жизни и миссия — в подарок</div>
        <div style={S.payWho}>{name} · {phone}</div>
        {!paid ? (
          <div>
            <button style={S.kaspiBtn} onClick={onKaspi}>💳  Оплатить через Kaspi</button>
            <p style={S.payNote}>После оплаты сохраните скриншот чека и нажмите кнопку ниже</p>
            <button style={S.confirmBtn} onClick={() => setPaid(true)}>Я оплатила ✓</button>
          </div>
        ) : (
          <div>
            <div style={S.successBox}>✅ Отлично! Теперь отправьте чек в WhatsApp</div>
            <a href={waUrl} target="_blank" rel="noreferrer" style={S.waBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style={{flexShrink:0,marginRight:8}}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M11.998 2C6.477 2 2 6.477 2 11.998c0 1.88.538 3.636 1.469 5.122L2 22l5.002-1.44A9.953 9.953 0 0011.998 22C17.52 22 22 17.522 22 11.998 22 6.477 17.52 2 11.998 2zm0 18.188a8.17 8.17 0 01-4.243-1.185l-.303-.18-3.147.907.92-3.071-.198-.315A8.188 8.188 0 113.81 12c0-4.514 3.673-8.188 8.188-8.188 4.514 0 8.187 3.674 8.187 8.188 0 4.513-3.673 8.188-8.187 8.188z"/>
              </svg>
              Отправить чек в WhatsApp
            </a>
            <p style={S.afterNote}>Свяжусь с Вами для подтверждения даты 🌿</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Orbs() {
  return (
    <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>
      <div style={S.o1}/><div style={S.o2}/><div style={S.o3}/>
    </div>
  );
}

function GStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=DM+Sans:wght@300;400;500&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      body{background:#07060f;touch-action:manipulation;}
      @keyframes o1{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(20px,-15px) scale(1.04);}}
      @keyframes o2{0%,100%{transform:translate(0,0);}50%{transform:translate(-15px,18px) scale(.97);}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
      @keyframes fromL{from{opacity:0;transform:translateX(-8px);}to{opacity:1;transform:translateX(0);}}
      @keyframes fromR{from{opacity:0;transform:translateX(8px);}to{opacity:1;transform:translateX(0);}}
      @keyframes blink{0%,80%,100%{opacity:.15;transform:scale(.7);}40%{opacity:1;transform:scale(1);}}
      @keyframes glow{0%,100%{box-shadow:0 4px 38px rgba(109,40,217,.55);}50%{box-shadow:0 4px 55px rgba(109,40,217,.85),0 0 0 10px rgba(109,40,217,.07);}}
      a{text-decoration:none;}
      input{font-size:16px!important;}
      input::placeholder{color:rgba(185,165,218,.35);}
      ::-webkit-scrollbar{display:none;}
    `}</style>
  );
}

const S = {
  root:{width:"100%",height:"100dvh",background:"#07060f",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",overflow:"hidden",position:"relative"},
  o1:{position:"absolute",top:"-8%",left:"-8%",width:"70vw",height:"70vw",borderRadius:"50%",background:"radial-gradient(circle,rgba(85,35,160,.4) 0%,transparent 70%)",animation:"o1 9s ease-in-out infinite"},
  o2:{position:"absolute",bottom:"-8%",right:"-8%",width:"60vw",height:"60vw",borderRadius:"50%",background:"radial-gradient(circle,rgba(25,60,135,.32) 0%,transparent 70%)",animation:"o2 11s ease-in-out infinite"},
  o3:{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"40vw",height:"40vw",borderRadius:"50%",background:"radial-gradient(circle,rgba(140,70,255,.09) 0%,transparent 70%)"},
  land:{position:"relative",zIndex:10,width:"100%",maxWidth:"390px",padding:"30px",display:"flex",flexDirection:"column",alignItems:"center",gap:"20px",animation:"fadeUp .7s ease both"},
  badge:{fontSize:"10px",fontWeight:500,letterSpacing:".17em",color:"rgba(175,125,255,.85)",background:"rgba(125,55,255,.1)",border:"1px solid rgba(125,55,255,.22)",borderRadius:"100px",padding:"6px 16px"},
  h1:{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(28px,8vw,40px)",fontWeight:600,color:"#ece5ff",lineHeight:1.18,textAlign:"center",letterSpacing:"-.01em"},
  em:{fontStyle:"italic",color:"#be95ff"},
  sub:{fontSize:"14px",fontWeight:300,color:"rgba(195,180,220,.68)",lineHeight:1.72,textAlign:"center",maxWidth:"310px"},
  cta:{display:"flex",alignItems:"center",gap:4,background:"linear-gradient(135deg,#6d28d9,#4c1d95)",border:"none",borderRadius:"100px",padding:"17px 40px",cursor:"pointer",animation:"glow 2.8s ease-in-out infinite"},
  fine:{fontSize:"11px",color:"rgba(175,150,210,.3)",letterSpacing:".04em"},
  chat:{position:"relative",zIndex:10,width:"100%",maxWidth:"420px",height:"100dvh",display:"flex",flexDirection:"column",background:"rgba(9,7,18,.92)",backdropFilter:"blur(24px)",animation:"fadeUp .35s ease both"},
  hdr:{display:"flex",alignItems:"center",gap:"12px",padding:"18px 18px 14px",borderBottom:"1px solid rgba(110,65,200,.13)",flexShrink:0},
  ava:{width:40,height:40,borderRadius:"50%",flexShrink:0,background:"linear-gradient(135deg,#6d28d9,#3b0764)",boxShadow:"0 0 18px rgba(109,40,217,.4)"},
  hname:{fontFamily:"'Cormorant Garamond',serif",fontSize:"17px",fontWeight:600,color:"#e6d8ff"},
  hstat:{fontSize:"11px",color:"rgba(165,135,210,.5)",letterSpacing:".05em"},
  feed:{flex:1,overflowY:"auto",padding:"14px 14px 6px",display:"flex",flexDirection:"column",gap:"10px"},
  aiRow:{display:"flex",justifyContent:"flex-start",animation:"fromL .25s ease both"},
  userRow:{display:"flex",justifyContent:"flex-end",animation:"fromR .25s ease both"},
  aiBub:{maxWidth:"85%",background:"rgba(65,30,115,.3)",border:"1px solid rgba(115,65,200,.2)",borderRadius:"4px 16px 16px 16px",padding:"11px 15px",fontSize:"14px",color:"rgba(225,210,248,.9)",lineHeight:1.74,backdropFilter:"blur(8px)"},
  userBub:{maxWidth:"85%",background:"linear-gradient(135deg,rgba(85,38,175,.62),rgba(58,22,135,.62))",border:"1px solid rgba(135,85,220,.28)",borderRadius:"16px 4px 16px 16px",padding:"11px 15px",fontSize:"14px",color:"#eee5ff",lineHeight:1.74},
  bar:{display:"flex",alignItems:"center",gap:9,padding:"10px 14px 18px",borderTop:"1px solid rgba(110,65,200,.1)",flexShrink:0},
  inp:{flex:1,background:"rgba(50,25,90,.3)",border:"1px solid rgba(115,65,200,.18)",borderRadius:"100px",padding:"13px 18px",fontSize:"16px",color:"#e6d8ff",outline:"none",fontFamily:"'DM Sans',sans-serif"},
  send:{width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,#6d28d9,#4c1d95)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"opacity .2s"},
  payCard:{background:"linear-gradient(135deg,rgba(65,22,125,.55),rgba(32,16,68,.55))",border:"1px solid rgba(145,85,255,.3)",borderRadius:"16px",padding:"20px",backdropFilter:"blur(12px)"},
  payTag:{fontSize:"10px",fontWeight:600,letterSpacing:".14em",textTransform:"uppercase",color:"rgba(190,145,255,.6)",marginBottom:4},
  payPrice:{fontFamily:"'Cormorant Garamond',serif",fontSize:"28px",fontWeight:600,color:"#e2d0ff",marginBottom:2},
  payOld:{fontSize:"11px",color:"rgba(255,170,100,.65)",marginBottom:8},
  payBonus:{fontSize:"12px",color:"rgba(140,255,170,.8)",marginBottom:12,padding:"7px 11px",background:"rgba(50,180,100,.1)",borderRadius:"8px",border:"1px solid rgba(80,200,120,.2)"},
  payWho:{fontSize:"12px",color:"rgba(180,155,215,.5)",marginBottom:16},
  kaspiBtn:{display:"flex",alignItems:"center",justifyContent:"center",width:"100%",background:"linear-gradient(135deg,#e8003d,#c0002e)",border:"none",borderRadius:"100px",padding:"14px 0",fontSize:"14px",fontWeight:600,color:"#fff",cursor:"pointer",marginBottom:10,boxShadow:"0 4px 20px rgba(232,0,61,.35)"},
  payNote:{fontSize:"11.5px",color:"rgba(180,155,215,.55)",textAlign:"center",lineHeight:1.5,marginBottom:12},
  confirmBtn:{width:"100%",background:"rgba(100,60,200,.3)",border:"1px solid rgba(145,85,255,.25)",borderRadius:"100px",padding:"12px 0",fontSize:"13px",color:"rgba(210,185,255,.8)",cursor:"pointer"},
  successBox:{fontSize:"14px",color:"rgba(100,220,100,.85)",textAlign:"center",marginBottom:14,padding:"10px",background:"rgba(50,150,50,.1)",borderRadius:"10px",border:"1px solid rgba(80,180,80,.2)"},
  waBtn:{display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#25d366,#128c7e)",borderRadius:"100px",padding:"14px 0",fontSize:"14px",fontWeight:600,color:"#fff",cursor:"pointer",boxShadow:"0 4px 20px rgba(37,211,102,.3)"},
  afterNote:{fontSize:"11.5px",color:"rgba(180,155,215,.5)",textAlign:"center",lineHeight:1.5,marginTop:12},
};
