// 紫微斗数：旧暦の計算 → 命宮・身宮・五行局 → 紫微星の位置 → 14主星の配置 → 命宮の主星
// 旧暦は紫微斗数の本場に合わせて中国の標準時（UTC+8）の農暦で計算する。
// 新月（朔）を月の始まり、冬至を含む月を11月とし、中気（太陽黄経が30度の倍数になる時）を含まない月を閏月とする。
// （日本の旧暦とは、新月が深夜0時前後になる月で1日ずれることがある）
// 天体の位置は Astronomy Engine を使う。

const ZW_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const ZW_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];

// 中国標準時の日付番号（1970-01-01 = 0）
const ZW_TZ = 8;
const jstDay = (date) => Math.floor((date.getTime() + ZW_TZ * 3600000) / 86400000);
const jstMidnight = (dayNum) => new Date(dayNum * 86400000 - ZW_TZ * 3600000);
const sunLon = (date) => Astronomy.SunPosition(date).elon;

const zwCache = {};
function winterSolsticeDay(year) {
  const k = "ws" + year;
  if (!(k in zwCache)) zwCache[k] = jstDay(Astronomy.SearchSunLongitude(270, new Date(Date.UTC(year, 11, 10)), 20).date);
  return zwCache[k];
}
function newMoonDays(fromDay, toDay) {
  const out = [];
  let t = jstMidnight(fromDay);
  while (true) {
    const nm = Astronomy.SearchMoonPhase(0, t, 40);
    const dn = jstDay(nm.date);
    if (dn > toDay) break;
    out.push(dn);
    t = new Date(nm.date.getTime() + 86400000);
  }
  return out;
}
// 冬至を含む月（11月）の始まりの日
function month11Start(year, moons) {
  const ws = winterSolsticeDay(year);
  return moons.filter((d) => d <= ws).pop();
}

// 新暦（日本時間の年月日）→ 旧暦 { year, month, day, isLeap }
function toLunar(y, m, d) {
  const target = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  const moons = newMoonDays(target - 800, target + 400);
  let Y = y;
  if (target < month11Start(Y - 1, moons)) Y -= 1;
  else if (target >= month11Start(Y, moons)) Y += 1;
  const a = month11Start(Y - 1, moons), b = month11Start(Y, moons);
  const months = moons.filter((dn) => dn >= a && dn < b);
  const hasZhongqi = (i) => {
    const s = months[i], e = i + 1 < months.length ? months[i + 1] : b;
    return Math.floor(sunLon(jstMidnight(s)) / 30) !== Math.floor(sunLon(jstMidnight(e)) / 30);
  };
  let leapIndex = -1;
  if (months.length === 13) for (let i = 1; i < months.length; i++) if (!hasZhongqi(i)) { leapIndex = i; break; }

  let num = 11, seenNewYear = false, result = null;
  for (let i = 0; i < months.length; i++) {
    let isLeap = false;
    if (i > 0) {
      if (i === leapIndex) isLeap = true;
      else num = (num % 12) + 1;
    }
    if (num === 1 && !isLeap) seenNewYear = true;
    if (months[i] <= target) result = { year: seenNewYear ? Y : Y - 1, month: num, day: target - months[i] + 1, isLeap };
  }
  return result;
}

// 納音の五行 → 五行局（水二局・木三局・金四局・土五局・火六局）
const NAYIN = "金火木土金火水土金木水土火木水金火木土金火水土金木水土火木水";
const BUREAU = { "水": [2, "水二局"], "木": [3, "木三局"], "金": [4, "金四局"], "土": [5, "土五局"], "火": [6, "火六局"] };

const MAJOR_STARS = {
  紫微: { el: "土", text: "帝王の星。気品と統率力があり、自然と人の上に立つ存在。プライドが高く、人に頭を下げるのは少し苦手。" },
  天機: { el: "木", text: "知恵と企画の星。頭の回転が速く、計画を立てるのが得意な参謀タイプ。考えすぎて迷うことも。" },
  太陽: { el: "火", text: "博愛と発信の星。明るく面倒見がよく、人のために動ける人。頑張りすぎて疲れやすい一面も。" },
  武曲: { el: "金", text: "財と決断の星。意志が強く、お金を生み出す実行力の持ち主。白黒はっきりさせすぎて、冷たく見られることも。" },
  天同: { el: "水", text: "福と楽しみの星。おおらかで人当たりがよく、自然と幸運に恵まれる人。のんびりしすぎるのが玉にきず。" },
  廉貞: { el: "火", text: "情熱と規律の星。白黒をはっきりつける潔さと、内に秘めた強い情熱の持ち主。感情の振れ幅が大きいことも。" },
  天府: { el: "土", text: "財庫と安定の星。包容力と管理能力があり、蓄える力に優れた人。保守的になりすぎることも。" },
  太陰: { el: "水", text: "月と美の星。繊細でやさしく、美意識と細やかな感性に恵まれた人。気持ちが表に出にくいことも。" },
  貪狼: { el: "木", text: "欲望と多才の星。好奇心と魅力にあふれ、何でもこなす人気者。あれこれ手を出しすぎるのに注意。" },
  巨門: { el: "水", text: "言葉と探究の星。物事を深く掘り下げ、鋭い言葉で本質を突く人。口が災いのもとになることも。" },
  天相: { el: "水", text: "調和と補佐の星。誠実で面倒見がよく、人と人をつなぐ名サポーター。人に流されやすいことも。" },
  天梁: { el: "土", text: "庇護と長老の星。正義感が強く、困った人を助ける頼れる存在。説教っぽくなりがちなことも。" },
  七殺: { el: "金", text: "将軍の星。決断が早く、困難を突破する行動力の持ち主。せっかちで衝突しやすいことも。" },
  破軍: { el: "水", text: "開拓と変革の星。古いものを壊して新しい道を切り開く人。飽きっぽく、波乱を好むことも。" },
};

// birthday "YYYY-MM-DD"、time "HH:MM"（必須）
function ziweiChart(birthday, time) {
  if (!time) return null;
  let [y, m, d] = birthday.split("-").map(Number);
  const hh = Number(time.split(":")[0]);
  // 23時台は翌日の子の刻として扱う
  if (hh === 23) {
    const nd = new Date(Date.UTC(y, m - 1, d + 1));
    y = nd.getUTCFullYear(); m = nd.getUTCMonth() + 1; d = nd.getUTCDate();
  }
  const hourBranch = Math.floor(((hh + 1) % 24) / 2); // 子=0 … 亥=11
  const lunar = toLunar(y, m, d);

  // 閏月は、15日までは前の月、16日以降は次の月として扱う
  let month = lunar.month;
  if (lunar.isLeap && lunar.day > 15) month = (month % 12) + 1;

  // 命宮：寅から月の数だけ時計回り → 生まれた時刻の数だけ反時計回り
  const ming = ((2 + (month - 1) - hourBranch) % 12 + 12) % 12;
  const shen = (2 + (month - 1) + hourBranch) % 12;

  // 命宮の干（年干から寅の干を決める「五虎遁」）
  const yearStem = ((lunar.year - 4) % 10 + 10) % 10;
  const yinStem = ((yearStem % 5) * 2 + 2) % 10;
  const stemOf = (b) => (yinStem + ((b - 2 + 12) % 12)) % 10;
  const mingStem = stemOf(ming);
  // 60干支の番号（干と支の組み合わせ）から納音 → 五行局
  let sexa = 0;
  while (sexa % 10 !== mingStem || sexa % 12 !== ming) sexa++;
  const [bureauNum, bureauName] = BUREAU[NAYIN[Math.floor(sexa / 2)]];

  // 紫微星の位置：旧暦の日を五行局で割り切れるように補う
  const day = lunar.day;
  let x = 0;
  while ((day + x) % bureauNum !== 0) x++;
  const q = (day + x) / bureauNum;
  let ziwei = (2 + q - 1) % 12;
  ziwei = x % 2 === 1 ? ((ziwei - x) % 12 + 12) % 12 : (ziwei + x) % 12;

  // 14主星の配置
  const pos = {};
  const put = (name, b) => (pos[name] = ((b % 12) + 12) % 12);
  put("紫微", ziwei); put("天機", ziwei - 1); put("太陽", ziwei - 3); put("武曲", ziwei - 4); put("天同", ziwei - 5); put("廉貞", ziwei - 8);
  const tianfu = (12 - ziwei + 4) % 12;
  put("天府", tianfu); put("太陰", tianfu + 1); put("貪狼", tianfu + 2); put("巨門", tianfu + 3); put("天相", tianfu + 4);
  put("天梁", tianfu + 5); put("七殺", tianfu + 6); put("破軍", tianfu + 10);

  const starsIn = (b) => Object.keys(pos).filter((s) => pos[s] === b);
  let mainStars = starsIn(ming), borrowed = false;
  if (!mainStars.length) { mainStars = starsIn((ming + 6) % 12); borrowed = true; } // 空宮は向かいの遷移宮の星を借りる

  return {
    lunar, month, hourBranch,
    ming: { branch: ming, kanji: ZW_STEMS[mingStem] + ZW_BRANCHES[ming] },
    shen: { branch: shen, kanji: ZW_BRANCHES[shen] },
    bureau: bureauName, positions: pos, mainStars, borrowed,
  };
}
