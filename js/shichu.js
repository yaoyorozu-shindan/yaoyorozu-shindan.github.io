// 四柱推命：年柱・月柱・日柱・時柱と五行バランス
//
// ・年の区切りは立春、月の区切りは二十四節気の「節」（立春・啓蟄・清明…）で決まる。
//   どちらも太陽の黄経（太陽が空のどこにあるか）で判定する。
// ・出生時刻がわからないときは正午として計算し、時柱は出さない。
// ・時刻は生まれた場所の時計の時刻。節入りの判定だけ、時差（offset、日本はUTC+9）で世界時に直して比べる。
// ・23時台は「子の刻」とし、時柱の干は翌日の日干から求める。

const SC_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const SC_STEM_READ = ["きのえ", "きのと", "ひのえ", "ひのと", "つちのえ", "つちのと", "かのえ", "かのと", "みずのえ", "みずのと"];
const SC_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const SC_BRANCH_READ = ["ね", "うし", "とら", "う", "たつ", "み", "うま", "ひつじ", "さる", "とり", "いぬ", "い"];
const SC_ELEMENTS = ["wood", "fire", "earth", "metal", "water"];
// 十干の五行：甲乙=木、丙丁=火、戊己=土、庚辛=金、壬癸=水
const stemElement = (i) => SC_ELEMENTS[Math.floor(i / 2)];
// 十二支の五行（本気）：子=水、丑=土、寅=木、卯=木、辰=土、巳=火、午=火、未=土、申=金、酉=金、戌=土、亥=水
const BRANCH_ELEMENT = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"];

// 現地の日時 → ユリウス日（世界時）。offset は UTC との時差（時間）
function julianDay(y, m, d, hourLocal, offset = 9) {
  const ms = Date.UTC(y, m - 1, d, 0, 0, 0) + (hourLocal - offset) * 3600000;
  return ms / 86400000 + 2440587.5;
}

// 太陽の視黄経（度）。Meeus の簡易式で、誤差は0.01度程度（時間にして15分程度）
function sunLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  const rad = Math.PI / 180;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * rad;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
  const omega = (125.04 - 1934.136 * T) * rad;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega);
  return ((lambda % 360) + 360) % 360;
}

const pillar = (stem, branch) => ({
  stem, branch,
  kanji: SC_STEMS[stem] + SC_BRANCHES[branch],
  read: SC_STEM_READ[stem] + SC_BRANCH_READ[branch],
  stemElement: stemElement(stem),
  branchElement: BRANCH_ELEMENT[branch],
});

// birthday: "YYYY-MM-DD"、time: "HH:MM" または空、offset: 出生地の UTC との時差（時間）
function fourPillars(birthday, time, offset = 9) {
  const [y, m, d] = birthday.split("-").map(Number);
  const hasTime = !!time;
  const [hh, mm] = hasTime ? time.split(":").map(Number) : [12, 0];
  const hour = hh + mm / 60;
  const lambda = sunLongitude(julianDay(y, m, d, hour, offset));

  // 年柱：立春（黄経315度）より前なら前の年として数える
  const beforeRisshun = m <= 2 && lambda >= 270 && lambda < 315;
  const yy = beforeRisshun ? y - 1 : y;
  const yearStem = (((yy - 4) % 10) + 10) % 10;
  const yearBranch = (((yy - 4) % 12) + 12) % 12;

  // 月柱：寅月（立春〜）から30度ごと。月干は年干から決まる（甲・己の年は丙寅から始まる）
  const monthIndex = Math.floor((((lambda - 315) % 360) + 360) % 360 / 30); // 0 = 寅月
  const monthBranch = (monthIndex + 2) % 12;
  const monthStem = ((yearStem % 5) * 2 + 2 + monthIndex) % 10;

  // 日柱：2000年1月1日 = 戊午（60干支の54番目）を基準に数える
  const days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2000, 0, 1)) / 86400000);
  const daySexagenary = (((54 + days) % 60) + 60) % 60;
  const dayStem = daySexagenary % 10, dayBranch = daySexagenary % 12;

  // 時柱：子の刻（23〜1時）から2時間ごと。時干は日干から決まる（甲・己の日は甲子から始まる）
  let hourPillar = null;
  if (hasTime) {
    const hourBranch = Math.floor(((hh + 1) % 24) / 2);
    const baseDayStem = hh === 23 ? (dayStem + 1) % 10 : dayStem;
    const hourStem = ((baseDayStem % 5) * 2 + hourBranch) % 10;
    hourPillar = pillar(hourStem, hourBranch);
  }

  const pillars = {
    year: pillar(yearStem, yearBranch),
    month: pillar(monthStem, monthBranch),
    day: pillar(dayStem, dayBranch),
    hour: hourPillar,
  };

  // 五行バランス：各柱の天干と地支（本気）を1つずつ数える
  const balance = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (const p of Object.values(pillars)) {
    if (!p) continue;
    balance[p.stemElement]++;
    balance[p.branchElement]++;
  }
  return { pillars, balance, total: hasTime ? 8 : 6, hasTime, dayMaster: dayStem, sunLongitude: lambda };
}
