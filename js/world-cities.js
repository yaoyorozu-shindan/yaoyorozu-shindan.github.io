// 海外の出生地：国・都市ごとの緯度・経度とタイムゾーン
// 出生地は「海外:都市名」の形で保存する（例："海外:ニューヨーク"）
// 時差はブラウザが持っているタイムゾーンの情報で、生まれた日時のサマータイムまで含めて求める
// 日本生まれは、これまでどおり日本時間（UTC+9）で計算する（1948〜51年の日本のサマータイムは考慮しない）

const WORLD_CITIES = [
  // [国, 都市, 緯度, 経度, タイムゾーン]
  ["アメリカ", "ニューヨーク", 40.71, -74.01, "America/New_York"],
  ["アメリカ", "ボストン", 42.36, -71.06, "America/New_York"],
  ["アメリカ", "ワシントンD.C.", 38.91, -77.04, "America/New_York"],
  ["アメリカ", "マイアミ", 25.76, -80.19, "America/New_York"],
  ["アメリカ", "シカゴ", 41.88, -87.63, "America/Chicago"],
  ["アメリカ", "ヒューストン", 29.76, -95.37, "America/Chicago"],
  ["アメリカ", "ダラス", 32.78, -96.80, "America/Chicago"],
  ["アメリカ", "デンバー", 39.74, -104.99, "America/Denver"],
  ["アメリカ", "フェニックス", 33.45, -112.07, "America/Phoenix"],
  ["アメリカ", "ラスベガス", 36.17, -115.14, "America/Los_Angeles"],
  ["アメリカ", "ロサンゼルス", 34.05, -118.24, "America/Los_Angeles"],
  ["アメリカ", "サンフランシスコ", 37.77, -122.42, "America/Los_Angeles"],
  ["アメリカ", "シアトル", 47.61, -122.33, "America/Los_Angeles"],
  ["アメリカ", "アンカレッジ", 61.22, -149.90, "America/Anchorage"],
  ["アメリカ", "ホノルル", 21.31, -157.86, "Pacific/Honolulu"],
  ["アメリカ", "グアム", 13.44, 144.79, "Pacific/Guam"],
  ["カナダ", "トロント", 43.65, -79.38, "America/Toronto"],
  ["カナダ", "モントリオール", 45.50, -73.57, "America/Toronto"],
  ["カナダ", "バンクーバー", 49.28, -123.12, "America/Vancouver"],
  ["メキシコ", "メキシコシティ", 19.43, -99.13, "America/Mexico_City"],
  ["ブラジル", "サンパウロ", -23.55, -46.63, "America/Sao_Paulo"],
  ["ブラジル", "リオデジャネイロ", -22.91, -43.17, "America/Sao_Paulo"],
  ["アルゼンチン", "ブエノスアイレス", -34.60, -58.38, "America/Argentina/Buenos_Aires"],
  ["ペルー", "リマ", -12.05, -77.04, "America/Lima"],
  ["イギリス", "ロンドン", 51.51, -0.13, "Europe/London"],
  ["アイルランド", "ダブリン", 53.35, -6.26, "Europe/Dublin"],
  ["フランス", "パリ", 48.86, 2.35, "Europe/Paris"],
  ["ドイツ", "ベルリン", 52.52, 13.40, "Europe/Berlin"],
  ["ドイツ", "フランクフルト", 50.11, 8.68, "Europe/Berlin"],
  ["ドイツ", "ミュンヘン", 48.14, 11.58, "Europe/Berlin"],
  ["ドイツ", "デュッセルドルフ", 51.23, 6.77, "Europe/Berlin"],
  ["オランダ", "アムステルダム", 52.37, 4.90, "Europe/Amsterdam"],
  ["ベルギー", "ブリュッセル", 50.85, 4.35, "Europe/Brussels"],
  ["スイス", "チューリッヒ", 47.38, 8.54, "Europe/Zurich"],
  ["オーストリア", "ウィーン", 48.21, 16.37, "Europe/Vienna"],
  ["イタリア", "ローマ", 41.90, 12.50, "Europe/Rome"],
  ["イタリア", "ミラノ", 45.46, 9.19, "Europe/Rome"],
  ["スペイン", "マドリード", 40.42, -3.70, "Europe/Madrid"],
  ["スペイン", "バルセロナ", 41.39, 2.17, "Europe/Madrid"],
  ["ポルトガル", "リスボン", 38.72, -9.14, "Europe/Lisbon"],
  ["スウェーデン", "ストックホルム", 59.33, 18.07, "Europe/Stockholm"],
  ["デンマーク", "コペンハーゲン", 55.68, 12.57, "Europe/Copenhagen"],
  ["ノルウェー", "オスロ", 59.91, 10.75, "Europe/Oslo"],
  ["フィンランド", "ヘルシンキ", 60.17, 24.94, "Europe/Helsinki"],
  ["ポーランド", "ワルシャワ", 52.23, 21.01, "Europe/Warsaw"],
  ["チェコ", "プラハ", 50.08, 14.44, "Europe/Prague"],
  ["ギリシャ", "アテネ", 37.98, 23.73, "Europe/Athens"],
  ["ロシア", "モスクワ", 55.76, 37.62, "Europe/Moscow"],
  ["トルコ", "イスタンブール", 41.01, 28.98, "Europe/Istanbul"],
  ["アラブ首長国連邦", "ドバイ", 25.20, 55.27, "Asia/Dubai"],
  ["エジプト", "カイロ", 30.04, 31.24, "Africa/Cairo"],
  ["南アフリカ", "ヨハネスブルグ", -26.20, 28.05, "Africa/Johannesburg"],
  ["ケニア", "ナイロビ", -1.29, 36.82, "Africa/Nairobi"],
  ["インド", "デリー", 28.61, 77.21, "Asia/Kolkata"],
  ["インド", "ムンバイ", 19.08, 72.88, "Asia/Kolkata"],
  ["インド", "ベンガルール", 12.97, 77.59, "Asia/Kolkata"],
  ["ネパール", "カトマンズ", 27.72, 85.32, "Asia/Kathmandu"],
  ["タイ", "バンコク", 13.76, 100.50, "Asia/Bangkok"],
  ["ベトナム", "ハノイ", 21.03, 105.85, "Asia/Ho_Chi_Minh"],
  ["ベトナム", "ホーチミン", 10.82, 106.63, "Asia/Ho_Chi_Minh"],
  ["カンボジア", "プノンペン", 11.56, 104.92, "Asia/Phnom_Penh"],
  ["ミャンマー", "ヤンゴン", 16.87, 96.20, "Asia/Yangon"],
  ["マレーシア", "クアラルンプール", 3.14, 101.69, "Asia/Kuala_Lumpur"],
  ["シンガポール", "シンガポール", 1.35, 103.82, "Asia/Singapore"],
  ["インドネシア", "ジャカルタ", -6.21, 106.85, "Asia/Jakarta"],
  ["インドネシア", "バリ島（デンパサール）", -8.65, 115.22, "Asia/Makassar"],
  ["フィリピン", "マニラ", 14.60, 120.98, "Asia/Manila"],
  ["中国", "北京", 39.90, 116.41, "Asia/Shanghai"],
  ["中国", "上海", 31.23, 121.47, "Asia/Shanghai"],
  ["中国", "大連", 38.91, 121.61, "Asia/Shanghai"],
  ["中国", "広州", 23.13, 113.26, "Asia/Shanghai"],
  ["中国", "深セン", 22.54, 114.06, "Asia/Shanghai"],
  ["中国", "成都", 30.57, 104.07, "Asia/Shanghai"],
  ["香港", "香港", 22.32, 114.17, "Asia/Hong_Kong"],
  ["マカオ", "マカオ", 22.20, 113.54, "Asia/Macau"],
  ["台湾", "台北", 25.03, 121.57, "Asia/Taipei"],
  ["台湾", "高雄", 22.63, 120.30, "Asia/Taipei"],
  ["韓国", "ソウル", 37.57, 126.98, "Asia/Seoul"],
  ["韓国", "釜山", 35.18, 129.08, "Asia/Seoul"],
  ["モンゴル", "ウランバートル", 47.89, 106.91, "Asia/Ulaanbaatar"],
  ["オーストラリア", "シドニー", -33.87, 151.21, "Australia/Sydney"],
  ["オーストラリア", "メルボルン", -37.81, 144.96, "Australia/Melbourne"],
  ["オーストラリア", "ブリスベン", -27.47, 153.03, "Australia/Brisbane"],
  ["オーストラリア", "ケアンズ", -16.92, 145.77, "Australia/Brisbane"],
  ["オーストラリア", "パース", -31.95, 115.86, "Australia/Perth"],
  ["ニュージーランド", "オークランド", -36.85, 174.76, "Pacific/Auckland"],
];

// "海外:ニューヨーク" → 都市のデータ（見つからなければ null）
function worldCity(place) {
  if (!place || !place.startsWith("海外:")) return null;
  const name = place.slice(3);
  const c = WORLD_CITIES.find((x) => x[1] === name);
  return c ? { country: c[0], name: c[1], lat: c[2], lon: c[3], tz: c[4] } : null;
}

// 出生地の時差（UTCより何時間進んでいるか）。日本・不明はUTC+9
// time が空のときは正午で求める
function utcOffsetHours(place, birthday, time) {
  const city = worldCity(place);
  if (!city || typeof Intl === "undefined") return 9;
  const [y, m, d] = birthday.split("-").map(Number);
  const [hh, mm] = time ? time.split(":").map(Number) : [12, 0];
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: city.tz, hourCycle: "h23",
    year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric",
  });
  // ある瞬間（UTCのミリ秒）に、その都市の時計が何時を指していたか
  const wall = (t) => {
    const p = Object.fromEntries(fmt.formatToParts(new Date(t)).map((x) => [x.type, x.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
  };
  const local = Date.UTC(y, m - 1, d, hh, mm);
  let utc = local - (wall(local) - local);
  utc = local - (wall(utc) - utc); // サマータイムの切り替わり付近のために、もう一度合わせる
  return (local - utc) / 3600000;
}
