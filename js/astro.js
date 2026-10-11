// 西洋占星術：太陽・月・惑星の星座、アセンダント（ASC）、MC、4元素のバランス
// 天体の位置は Astronomy Engine（js/vendor/astronomy.browser.min.js、MITライセンス）で計算する。
// ・出生時刻がないときは正午で計算し、ASC・MCは出さない（月は1日で星座が変わることがあるので注意書きを出す）。
// ・出生地は都道府県庁の所在地の緯度・経度を使う。海外の場合はASC・MCを出さない。

const ZODIAC = [
  { name: "牡羊座", glyph: "♈", el: "fire",  text: "情熱的で行動が早い開拓者。思い立ったらすぐ動き、先頭に立つ勇気があります。" },
  { name: "牡牛座", glyph: "♉", el: "earth", text: "穏やかで粘り強い人。五感が鋭く、心地よさと本物を大切にします。" },
  { name: "双子座", glyph: "♊", el: "air",   text: "好奇心旺盛で頭の回転が速い人。会話と情報集めが得意な、軽やかな知性の持ち主です。" },
  { name: "蟹座",   glyph: "♋", el: "water", text: "情が深く、身内を大切にする人。共感力が高く、守るもののためなら強くなれます。" },
  { name: "獅子座", glyph: "♌", el: "fire",  text: "華やかで誇り高い人。自分らしく輝くことで、周りまで明るくするリーダーです。" },
  { name: "乙女座", glyph: "♍", el: "earth", text: "細やかで几帳面な人。分析力と気配りで、人の役に立つことに喜びを感じます。" },
  { name: "天秤座", glyph: "♎", el: "air",   text: "バランス感覚と美意識に優れた人。人との調和を大切にする社交家です。" },
  { name: "蠍座",   glyph: "♏", el: "water", text: "深い集中力と洞察力の持ち主。一度決めたことは徹底的に突き詰める、情熱を秘めた人です。" },
  { name: "射手座", glyph: "♐", el: "fire",  text: "自由と冒険を愛する楽天家。広い視野で、理想を追いかけ続けます。" },
  { name: "山羊座", glyph: "♑", el: "earth", text: "責任感の強い努力家。目標に向かって着実に登り続ける実力派です。" },
  { name: "水瓶座", glyph: "♒", el: "air",   text: "独創的で自由な発想の持ち主。常識にとらわれず、未来を見すえます。" },
  { name: "魚座",   glyph: "♓", el: "water", text: "感受性豊かでやさしい人。想像力と共感力で、人の心に寄り添います。" },
];

const WEST_ELEMENTS = {
  fire:  { name: "火", color: "#e0523a", text: "情熱・行動力" },
  earth: { name: "地", color: "#8a6d3b", text: "安定・現実感覚" },
  air:   { name: "風", color: "#4bb3d6", text: "知性・コミュニケーション" },
  water: { name: "水", color: "#3b6fc4", text: "感情・共感力" },
};

const PLANETS = [
  { key: "Sun", name: "太陽", glyph: "☉", role: "表の自分・人生の目的" },
  { key: "Moon", name: "月", glyph: "☽", role: "心の内・素の自分" },
  { key: "Mercury", name: "水星", glyph: "☿", role: "知性・話し方" },
  { key: "Venus", name: "金星", glyph: "♀", role: "愛し方・好み" },
  { key: "Mars", name: "火星", glyph: "♂", role: "行動力・闘争心" },
  { key: "Jupiter", name: "木星", glyph: "♃", role: "幸運・成長" },
  { key: "Saturn", name: "土星", glyph: "♄", role: "試練・責任" },
  { key: "Uranus", name: "天王星", glyph: "♅", role: "改革・独創性" },
  { key: "Neptune", name: "海王星", glyph: "♆", role: "夢・直感" },
  { key: "Pluto", name: "冥王星", glyph: "♇", role: "変容・底力" },
];

// 都道府県庁の所在地（緯度・経度）
const PREF_COORDS = {
  "北海道": [43.06, 141.35], "青森県": [40.82, 140.74], "岩手県": [39.70, 141.15], "宮城県": [38.27, 140.87],
  "秋田県": [39.72, 140.10], "山形県": [38.24, 140.36], "福島県": [37.75, 140.47], "茨城県": [36.34, 140.45],
  "栃木県": [36.57, 139.88], "群馬県": [36.39, 139.06], "埼玉県": [35.86, 139.65], "千葉県": [35.61, 140.12],
  "東京都": [35.69, 139.69], "神奈川県": [35.45, 139.64], "新潟県": [37.90, 139.02], "富山県": [36.70, 137.21],
  "石川県": [36.59, 136.63], "福井県": [36.07, 136.22], "山梨県": [35.66, 138.57], "長野県": [36.65, 138.18],
  "岐阜県": [35.39, 136.72], "静岡県": [34.98, 138.38], "愛知県": [35.18, 136.91], "三重県": [34.73, 136.51],
  "滋賀県": [35.00, 135.87], "京都府": [35.02, 135.76], "大阪府": [34.69, 135.52], "兵庫県": [34.69, 135.18],
  "奈良県": [34.69, 135.83], "和歌山県": [34.23, 135.17], "鳥取県": [35.50, 134.24], "島根県": [35.47, 133.05],
  "岡山県": [34.66, 133.93], "広島県": [34.40, 132.46], "山口県": [34.19, 131.47], "徳島県": [34.07, 134.56],
  "香川県": [34.34, 134.04], "愛媛県": [33.84, 132.77], "高知県": [33.56, 133.53], "福岡県": [33.61, 130.42],
  "佐賀県": [33.25, 130.30], "長崎県": [32.74, 129.87], "熊本県": [32.79, 130.74], "大分県": [33.24, 131.61],
  "宮崎県": [31.91, 131.42], "鹿児島県": [31.56, 130.56], "沖縄県": [26.21, 127.68],
};

const norm360 = (x) => ((x % 360) + 360) % 360;
const signOf = (lon) => Math.floor(norm360(lon) / 30);

function bodyLongitude(key, date) {
  if (key === "Sun") return Astronomy.SunPosition(date).elon;
  if (key === "Moon") return Astronomy.EclipticGeoMoon(date).lon;
  return Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body[key], date, true)).elon;
}

// アセンダントとMC（黄経、度）
function angles(date, lat, lon) {
  const rad = Math.PI / 180;
  const gast = Astronomy.SiderealTime(date); // グリニッジ視恒星時（時間）
  const ramc = norm360((gast + lon / 15) * 15) * rad;
  const T = (Astronomy.MakeTime(date).tt) / 36525;
  const eps = (23.4392911 - 0.0130042 * T) * rad;
  const phi = lat * rad;
  const asc = Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))) / rad;
  const mc = Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)) / rad;
  return { asc: norm360(asc), mc: norm360(mc) };
}

// birthday "YYYY-MM-DD"、time "HH:MM" または空、place 都道府県名・"海外"・空
function westernChart(birthday, time, place) {
  const [y, m, d] = birthday.split("-").map(Number);
  const [hh, mm] = time ? time.split(":").map(Number) : [12, 0];
  const jst = (h, mi) => new Date(Date.UTC(y, m - 1, d, h - 9, mi));
  const date = jst(hh, mm);

  const planets = PLANETS.map((p) => {
    const lon = norm360(bodyLongitude(p.key, date));
    return { ...p, lon, sign: signOf(lon), deg: Math.floor(lon % 30) };
  });

  // 時刻がないときの月：その日の0時と24時で星座が変わるか
  let moonUncertain = null;
  if (!time) {
    const a = signOf(bodyLongitude("Moon", jst(0, 0))), b = signOf(bodyLongitude("Moon", jst(23, 59)));
    if (a !== b) moonUncertain = [a, b];
  }

  let asc = null, mc = null;
  const coords = PREF_COORDS[place];
  if (time && coords) {
    const ag = angles(date, coords[0], coords[1]);
    asc = { lon: ag.asc, sign: signOf(ag.asc), deg: Math.floor(ag.asc % 30) };
    mc = { lon: ag.mc, sign: signOf(ag.mc), deg: Math.floor(ag.mc % 30) };
  }

  // 4元素のバランス：太陽・月・ASCは2点、そのほかの天体は1点
  const balance = { fire: 0, earth: 0, air: 0, water: 0 };
  planets.forEach((p) => (balance[ZODIAC[p.sign].el] += p.key === "Sun" || p.key === "Moon" ? 2 : 1));
  if (asc) balance[ZODIAC[asc.sign].el] += 2;

  return { planets, sun: planets[0], moon: planets[1], asc, mc, moonUncertain, balance, hasTime: !!time, hasPlace: !!coords };
}
