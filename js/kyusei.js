// 九星気学：本命星（生まれ年）・月命星（生まれ月）と、今年の運勢（年盤で本命星がどの宮に回るか）
// ・年と月の区切りは節入り（年は立春）。js/shichu.js の fourPillars が返す太陽の黄経（sunLongitude）を使う
// ・本命星 = (11 − 年 % 9) % 9（0なら9）。確認：2000=九紫、2001=八白、1990=一白、2024=三碧、2025=二黒、2026=一白
// ・月命星：一白・四緑・七赤の年は寅月(2月)が八白、三碧・六白・九紫の年は五黄、二黒・五黄・八白の年は二黒。毎月1つずつ減る

const KYUSEI = [
  null,
  { name: "一白水星", el: "water", text: "水のように柔軟で、どんな環境にもなじめる人といわれます。人当たりがやわらかく聞き上手。内に秘めた芯の強さで、困難もしなやかに乗り越えます。" },
  { name: "二黒土星", el: "earth", text: "大地のようにおおらかで、まじめにこつこつ努力する人といわれます。面倒見がよく、人を支える縁の下の力持ち。時間をかけて大きく実るタイプ。" },
  { name: "三碧木星", el: "wood", text: "若葉のように元気で、思い立ったらすぐ動く行動派といわれます。明るく前向きで、新しいことを始める力の持ち主。せっかちな一面も。" },
  { name: "四緑木星", el: "wood", text: "風のようにさわやかで、人との調和を大切にする人といわれます。人づきあいが上手で信用されやすく、縁を広げていく力があります。" },
  { name: "五黄土星", el: "earth", text: "九星の中心にある帝王の星。強い意志と存在感で、人の上に立つ力があるといわれます。面倒見がよい親分肌ですが、こうと決めたら譲らない頑固さも。" },
  { name: "六白金星", el: "metal", text: "天のように気高く、責任感の強いリーダー気質といわれます。正義感と向上心があり、人の役に立つことに力を注ぎます。プライドの高さが出ることも。" },
  { name: "七赤金星", el: "metal", text: "社交的で話し上手、人を楽しませる華やかさを持つ人といわれます。センスがよく、楽しいことやおいしいものが大好き。人気者のタイプ。" },
  { name: "八白土星", el: "earth", text: "山のようにどっしりとして、粘り強く目標に向かう人といわれます。変化をきっかけに大きく伸びる力があり、蓄える才能にも恵まれています。" },
  { name: "九紫火星", el: "fire", text: "太陽のように明るく、美的センスと直感に優れた人といわれます。華やかで人目を引き、知性も高い情熱家。気分の浮き沈みが大きいことも。" },
];
const KYUSEI_EL_NAME = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };

// 年盤で星が飛ぶ順の宮（中宮→乾→兌→艮→離→坎→坤→震→巽）と、その年の運勢
const KYUSEI_PALACES = [
  { name: "中宮", theme: "変化と見直しの年", text: "運気の真ん中に入り、周りから注目される一方で、八方ふさがりともいわれる年。大きな勝負より、これまでを見直して整えるのが吉。" },
  { name: "乾宮（北西）", theme: "充実と活躍の年", text: "これまでの努力が形になり、責任ある立場を任されやすい年といわれます。目上の人の引き立ても期待できるので、積極的に動いて吉。" },
  { name: "兌宮（西）", theme: "収穫と喜びの年", text: "実りを受け取る、楽しみの多い年といわれます。人との交流や金運に恵まれやすい一方、使いすぎ・遊びすぎには注意。" },
  { name: "艮宮（北東）", theme: "変化と改革の年", text: "流れが大きく切り替わる年といわれます。転職や引っ越しなど、変化のきっかけが訪れやすいとき。古いものを手放すと新しい道が開けます。" },
  { name: "離宮（南）", theme: "頂点と注目の年", text: "運気が最も高まり、才能が光って注目を集める年といわれます。目立つぶん、隠していたことも表に出やすいので、誠実さを大切に。" },
  { name: "坎宮（北）", theme: "休息と準備の年", text: "運気の冬にあたり、無理をせず力をたくわえる年といわれます。勉強や体づくりなど、目立たない準備が次の飛躍につながります。" },
  { name: "坤宮（南西）", theme: "基礎固めの年", text: "冬が明け、土台をつくる年といわれます。派手さはなくても、こつこつ努力した分だけ、あとで大きく実ります。家庭や身近な人を大切に。" },
  { name: "震宮（東）", theme: "スタートと発展の年", text: "芽が出るように、新しいことを始めるのにぴったりの年といわれます。勢いがあるぶん、言葉や行動が先走らないように。" },
  { name: "巽宮（南東）", theme: "信用と縁の年", text: "人との縁が広がり、信用が積み重なる年といわれます。仕事の話や恋愛・結婚のご縁にも恵まれやすいとき。約束を大切に。" },
];

const kyuseiYearStar = (year) => (11 - (((year % 9) + 9) % 9)) % 9 || 9;

// 年・月を節入りで区切る。lambda は太陽の黄経（fourPillars の sunLongitude）
function kyuseiYearMonth(birthday, lambda) {
  const [y, m] = birthday.split("-").map(Number);
  const year = m <= 2 && lambda >= 270 && lambda < 315 ? y - 1 : y; // 立春より前は前の年
  const monthIndex = Math.floor((((lambda - 315) % 360) + 360) % 360 / 30); // 0 = 寅月（2月）
  return { year, monthIndex };
}

// birthday と、その日の fourPillars の結果 → { honmei, getsumei, year }
function kyuseiOf(birthday, fp) {
  const { year, monthIndex } = kyuseiYearMonth(birthday, fp.sunLongitude);
  const honmei = kyuseiYearStar(year);
  const start = [1, 4, 7].includes(honmei) ? 8 : [3, 6, 9].includes(honmei) ? 5 : 2;
  const getsumei = (((start - monthIndex - 1) % 9) + 9) % 9 + 1;
  return { honmei, getsumei, year };
}

// 今年（立春で区切る）の年盤で、本命星が回っている宮
function kyuseiThisYear(honmei) {
  const today = todayString();
  const { year } = kyuseiYearMonth(today, fourPillars(today, "").sunLongitude);
  const center = kyuseiYearStar(year);
  return { year, center, palace: KYUSEI_PALACES[(((honmei - center) % 9) + 9) % 9] };
}

// 本命星どうしの五行の関係で、相性のいい星
function kyuseiGoodMatches(honmei) {
  const order = ["wood", "fire", "earth", "metal", "water"];
  const me = order.indexOf(KYUSEI[honmei].el);
  const gen = (a, b) => (order.indexOf(a) + 1) % 5 === order.indexOf(b);
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => n !== honmei).filter((n) => {
    const el = KYUSEI[n].el;
    return el === KYUSEI[honmei].el || gen(el, KYUSEI[honmei].el) || gen(KYUSEI[honmei].el, el);
  }).map((n) => KYUSEI[n].name);
}

function kyuseiCardHTML(birthday, fp) {
  const k = kyuseiOf(birthday, fp), H = KYUSEI[k.honmei], G = KYUSEI[k.getsumei];
  const t = kyuseiThisYear(k.honmei);
  return `<div class="card kyusei-card">
    <h3>⭐ 九星気学 ── 生まれ年から見たあなた</h3>
    <p><a href="articles/kyusei.html">本命星・月命星・今年の運勢の読み方</a></p>
    <p class="ks-label">本命星（生まれ持った性質）</p>
    <p class="ks-name">${H.name}</p>
    <p>${H.text}</p>
    <p class="ks-sub">月命星（内面・子どもの頃の性質）：<b>${G.name}</b></p>
    <div class="ks-year">
      <p class="ks-label">${t.year}年のあなた（${KYUSEI[t.center].name}の年）</p>
      <p class="ks-theme">${t.palace.name}・${t.palace.theme}</p>
      <p>${t.palace.text}</p>
    </div>
    <p class="ks-sub">相性のいい星：${kyuseiGoodMatches(k.honmei).join("、")}</p>
    <p class="note">九星の「${KYUSEI_EL_NAME[H.el]}」は生まれ年から見た性質で、診断のはじめの属性（生まれた日の日干から出したもの）とは別の見方です。違っていても、どちらもあなたの一面です。</p>
    <p class="note">九星気学の年は立春（2月4日ごろ）、月は節入りで切り替わります。${k.year}年の立春〜翌年の節分までに生まれた人として計算しています。</p>
  </div>`;
}
