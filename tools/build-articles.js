// 読みもの（記事ページ）を生成するスクリプト
// 使い方: node tools/build-articles.js
// js/fortune-data.js・js/images.js・js/config.js のデータから articles/*.html と sitemap.xml を作り直します。

const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "articles");
const SITE = "https://yaoyorozu-shindan.github.io/";
const PUBLISHED = "2026-10-11";

// サイトのデータを読み込む
const src = ["js/config.js", "js/fortune-data.js", "js/images.js", "js/true-identity-a.js", "js/true-identity-b.js", "js/true-identity-c.js", "js/places.js", "js/compat-stems.js"]
  .map((f) => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
const D = new Function(src + "; return { amazonLink, valueCommercePixel, SITE_CONFIG, ELEMENTS, CATEGORIES, RESULTS, BIRTHSTONES, POWER_STONES, IMAGES, TRUE_IDENTITIES, PLACES, sjisPercent, STEM_PAIRS, ASPECT_TEXT, LEGEND_PAIRS, POWER_SPOTS };")();
const { amazonLink, valueCommercePixel, SITE_CONFIG, ELEMENTS, CATEGORIES, RESULTS, BIRTHSTONES, POWER_STONES, IMAGES, TRUE_IDENTITIES, PLACES, sjisPercent, STEM_PAIRS, ASPECT_TEXT, LEGEND_PAIRS, POWER_SPOTS } = D;
const ORDER = ["wood", "fire", "earth", "metal", "water"];
const VERSION = (fs.readFileSync(path.join(ROOT, "index.html"), "utf8").match(/style\.css\?v=(\d+)/) || [])[1] || "1";

// ---- リンク作成 ----
const rid = SITE_CONFIG.rakutenAffiliateId;
const vcSid = SITE_CONFIG.valueCommerceSid, vcPid = SITE_CONFIG.valueCommercePid;
const rakuten = (url) => (rid ? `https://hb.afl.rakuten.co.jp/hgc/${rid}/?pc=${encodeURIComponent(url)}` : url);
const relFor = (isAd) => (isAd ? "sponsored noopener" : "noopener");
const wikiUrl = (t) => `https://ja.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, "_"))}`;
const mapUrl = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

function priceButtons(keyword) {
  const q = encodeURIComponent(keyword);
  const amazon = amazonLink(`https://www.amazon.co.jp/s?k=${q}`);
  return `<div class="price-btns">
      <a class="aff-btn rakuten" href="${rakuten(`https://search.rakuten.co.jp/search/mall/${q}/`)}" target="_blank" rel="${relFor(rid)}">楽天で現在の価格を見る</a>
      <a class="aff-btn amazon" href="${amazon.href}" ${amazon.attributes} target="_blank" rel="${relFor(amazon.isAd)}">${amazon.pixel}Amazonで現在の価格を見る</a>
    </div>`;
}

function travelButtons(s) {
  const rUrl = `https://kw.travel.rakuten.co.jp/keyword/Search.do?charset=utf-8&f_query=${encodeURIComponent(s.stay)}`;
  const jUrl = `https://www.jalan.net/uw/uwp2011/uww2011init.do?keyword=${s.jalan || sjisPercent(s.stay)}`;
  const jHref = vcSid && vcPid ? `https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=${vcSid}&pid=${vcPid}&vc_url=${encodeURIComponent(jUrl)}` : jUrl;
  return `<p class="travel-title">🏨 ${s.stay}周辺の宿を探す</p>
    <div class="aff-btns">
      <a class="aff-btn rakuten" href="${rakuten(rUrl)}" target="_blank" rel="${relFor(rid)}">楽天トラベル</a>
      <a class="aff-btn jalan" href="${jHref}" target="_blank" rel="${relFor(vcSid && vcPid)}">${valueCommercePixel()}じゃらん</a>
    </div>`;
}

function overseasButtons(guide) {
  const bookUrl = `https://books.rakuten.co.jp/search?sitem=${encodeURIComponent("地球の歩き方 " + guide)}&g=001`;
  return `<p class="travel-title">✈️ ${guide}への旅を準備する</p>
    <div class="aff-btns">
      <a class="aff-btn rakuten" href="${rakuten(bookUrl)}" target="_blank" rel="${relFor(rid)}">ガイドブック</a>
      <a class="aff-btn rakuten" href="${rakuten("https://travel.rakuten.co.jp/kaigai/")}" target="_blank" rel="${relFor(rid)}">楽天トラベル 海外</a>
    </div>`;
}

// ---- ゆかりの地：同じ場所は1つにまとめ、記事内の番号（#pl-番号）を振る ----
const PLACE_LIST = [];
const placeIdOf = {};
for (const [name, p] of Object.entries(PLACES)) {
  const key = p.place + "|" + p.area;
  if (!(key in placeIdOf)) { placeIdOf[key] = PLACE_LIST.length; PLACE_LIST.push({ ...p, chars: [] }); }
  PLACE_LIST[placeIdOf[key]].chars.push(name);
}
// 図鑑の各キャラに付ける「📍 ゆかりの地」の1行（くわしくは places.html へ）
function placeLine(name) {
  const p = PLACES[name];
  if (!p) return "";
  return `<p class="z-place">📍 ゆかりの地：<a href="places.html#pl-${placeIdOf[p.place + "|" + p.area]}">${p.place}</a>（${p.area}）</p>`;
}

function figure(name, small) {
  const img = IMAGES[name];
  if (!img) return "";
  const up = (u) => (/^https?:/.test(u) ? u : "../" + u); // サイト内の画像は記事フォルダから1つ上
  return `<figure class="a-fig${small ? " small" : ""}"><img src="${up(img.src)}" alt="${name}" loading="lazy" referrerpolicy="no-referrer">
      <figcaption><a href="${up(img.page)}" target="_blank" rel="noopener">画像: ${img.credit}</a></figcaption></figure>`;
}

const label = (el, yang) => `${yang ? "陽" : "陰"}の${ELEMENTS[el].name}`;

// ---- 記事の一覧（タイトル・説明） ----
const ARTICLES = [
  {"file":"sukuyo.html","title":"宿曜の相性の読み方｜命・業胎・栄親・友衰・安壊・危成の6種類","short":"🌙 宿曜の相性の読み方","desc":"本命宿と6種類の相性をやさしく解説。五行の相性と違う結果が出たときの読み方や、関係を育てるヒントを紹介します。"},
  {"file":"kyusei.html","title":"九星気学の読み方｜本命星・月命星・今年の運勢とは","short":"⭐ 九星気学の読み方","desc":"本命星と月命星の違い、9つの星、立春と節入りの区切り、今年の運勢を日常の振り返りに使う方法を紹介します。"},
  {"file":"eki.html","title":"今日の易の読み方｜64卦・爻・変爻をやさしく解説","short":"☯ 今日の易の読み方","desc":"6本の線でできた卦と、金色に表示される変爻の読み方を解説。問いの立て方と、一日一回の易を振り返る具体例を紹介します。"},
  { file: "places.html", title: "神話・妖怪のゆかりの地めぐり｜日本と世界の伝説の場所と、近くの宿", short: "📍 神話・妖怪のゆかりの地めぐり",
    desc: "河童の遠野、天狗の鞍馬山、九尾の狐の殺生石から、ギリシャのデルフォイ、エジプトのフィラエ神殿まで。神話・妖怪・都市伝説の伝説の場所を、地域別に紹介します。" },
  { file: "true-identities.html", title: "本当の正体図鑑 — 100を超える正体｜神話・伝承の存在を一覧で紹介", short: "🌟 本当の正体図鑑 — 100を超える正体",
    desc: "八百万診断に登場する100を超える正体を、日干（甲〜癸）ごとに紹介。スサノオ、女媧、アヌビスなど、世界の神話の神や霊獣・妖怪の本質、長所・短所、恋愛、仕事の向き不向きがわかります。" },
  ...ORDER.map((el) => ({
    file: `element-${el}.html`,
    title: `「${ELEMENTS[el].name}」属性の性格と特徴｜正体・相性・開運スポット`,
    short: `${ELEMENTS[el].icon} 「${ELEMENTS[el].name}」属性の性格と特徴`,
    desc: `五行の「${ELEMENTS[el].name}」属性の人の性格、陽と陰の違い、インド・日本・ギリシャ・北欧神話の神や妖怪など「別の世界の姿」、相性のいい属性、おすすめの神社とパワーストーンを解説します。`,
  })),
  { file: "compatibility.html", title: "五行でわかる相性の仕組み｜相生・相剋・比和と10タイプの相性表", short: "💞 五行でわかる相性の仕組み",
    desc: "相生・相剋・比和とは？五行（木・火・土・金・水）の関係から相性を読み解く方法と、10タイプの相性早見表を紹介します。" },
  { file: "birthstones.html", title: "誕生石一覧（1月〜12月）｜それぞれの石の意味と選び方", short: "💎 誕生石一覧（1月〜12月）",
    desc: "1月のガーネットから12月のターコイズまで、日本で親しまれている誕生石と、それぞれの石に伝わる意味を一覧で紹介します。" },
  { file: "power-stones.html", title: "属性別・守護パワーストーンの選び方｜10タイプのおすすめ天然石", short: "🔮 守護パワーストーンの選び方",
    desc: "五行と陰陽の10タイプ別に、相性のいい守護パワーストーンを紹介。石の意味と、身につけ方のポイントも解説します。" },
  { file: "shrines.html", title: "属性別おすすめ神社ガイド｜全国15社と周辺の観光スポット", short: "⛩️ 属性別おすすめ神社ガイド",
    desc: "木・火・土・金・水の属性ごとに相性のいい全国の神社15社を、ご祭神・ご利益・周辺の観光スポットとあわせて紹介します。" },
  { file: "gods.html", title: "神話の神々図鑑｜インド・日本・ギリシャ・北欧神話の100柱", short: "🕉️ 神話の神々図鑑",
    desc: "ガネーシャ、アマテラス、ゼウス、オーディンなど、インド神話・日本神話・ギリシャ神話・北欧神話の神々100柱を、五行の属性別にわかりやすく紹介します。" },
  { file: "yokai.html", title: "妖怪・怪異・都市伝説図鑑｜河童から口裂け女まで75種", short: "👻 妖怪・怪異・都市伝説図鑑",
    desc: "河童・天狗などの妖怪、狐火・神隠しなどの怪異、口裂け女・きさらぎ駅などの都市伝説75種を、五行の属性別に紹介します。" },
  { file: "cthulhu.html", title: "クトゥルフ神話図鑑｜クトゥルフからショゴスまで25種", short: "🐙 クトゥルフ神話図鑑",
    desc: "クトゥルフ、ニャルラトホテプ、ヨグ＝ソトースなど、八百万診断に登場するクトゥルフ神話の神々と生き物25種を、五行の属性別に紹介します。" },
  { file: "americas.html", title: "アステカ神話・インカ神話の神々｜ケツァルコアトルからパチャママまで", short: "🌞 アステカ・インカ神話の神々",
    desc: "ケツァルコアトル、テスカトリポカ、インティ、パチャママなど、八百万診断の「本当の正体」に登場するアステカ神話・インカ神話の神々を紹介します。" },
  { file: "goetia.html", title: "ソロモン72柱の悪魔とは｜バエル・パイモン・アスモデウスなど8柱を紹介", short: "📜 ソロモン72柱の悪魔",
    desc: "ソロモン王が封じたという72の悪魔「ソロモン72柱」とは？八百万診断の「本当の正体」に登場するバエル、ストラス、アスモデウスなど8柱を紹介します。" },
  { file: "uma.html", title: "UMA（未確認生物）・オカルトの正体図鑑｜チュパカブラ、イエティ、クッシーなど", short: "🛸 UMA・オカルトの正体図鑑",
    desc: "チュパカブラ、イエティ、ジャージー・デビル、クッシー、ホムンクルスなど、八百万診断の「本当の正体」に登場するUMA（未確認生物）やオカルトの存在を紹介します。" },
  { file: "power-spots.html", title: "属性別パワースポットガイド｜五行でわかる相性のいい自然の名所20か所と近くの宿", short: "🌄 属性別パワースポットガイド",
    desc: "屋久島、阿蘇山、富士山、昇仙峡、那智の滝など、木・火・土・金・水の属性ごとに相性のいい自然の名所20か所を紹介。近くの宿の探し方も。" },
  { file: "how-it-works.html", title: "八百万診断の仕組み｜日干（にっかん）とは？生年月日から属性を出す方法", short: "📖 八百万診断の仕組みと日干",
    desc: "八百万診断が使っている「日干（にっかん）」とは何か、生年月日から五行の属性と陰陽を求める方法をわかりやすく解説します。" },
];
// 読みもの一覧の並び順（トップページの「読みもの」も同じ順にそろえる）
const ARTICLE_ORDER = ["true-identities.html", "gods.html", "yokai.html", "cthulhu.html", "americas.html", "goetia.html", "uma.html", "places.html",
  ...ORDER.map((el) => `element-${el}.html`), "compatibility.html", "sukuyo.html", "kyusei.html", "eki.html",
  "shrines.html", "power-spots.html", "power-stones.html", "birthstones.html", "how-it-works.html"];
ARTICLES.sort((a, b) => ARTICLE_ORDER.indexOf(a.file) - ARTICLE_ORDER.indexOf(b.file));

// ---- ページの共通部分 ----
function page({ file, title, desc, body, hasAd }) {
  const published = ["sukuyo.html", "kyusei.html", "eki.html"].includes(file) ? "2026-10-12" : PUBLISHED;
  if (["sukuyo.html", "kyusei.html", "eki.html"].includes(file)) {
    const entries = [];
    body = body.replace(/<h2>([^<]+)<\/h2>/g, (_, title) => {
      const id = `read-${entries.length + 1}`;
      entries.push(`<li><a href="#${id}">${title}</a></li>`);
      return `<h2 id="${id}">${title}</h2>`;
    });
    body = body.replace(/(<p>[\s\S]*?<\/p>)/, `$1<nav class="toc" aria-label="記事の目次"><p>目次</p><ol>${entries.join("")}</ol></nav>`);
  }
  const url = SITE + "articles/" + (file === "index.html" ? "" : file);
  // 検索エンジン向けの構造化データ（パンくずと記事の情報）
  const crumbList = [["トップ", SITE], ["読みもの", SITE + "articles/"], ...(file === "index.html" ? [] : [[title.split("｜")[0], url]])];
  const ld = [{ "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: crumbList.map(([name, item], i) => ({ "@type": "ListItem", position: i + 1, name, item })) }];
  if (file !== "index.html") ld.push({ "@context": "https://schema.org", "@type": "Article", headline: title.split("｜")[0], description: desc,
    datePublished: published, inLanguage: "ja", image: SITE + "img/ogp.png", mainEntityOfPage: url,
    publisher: { "@type": "Organization", name: "八百万診断", url: SITE }, author: { "@type": "Organization", name: "八百万診断", url: SITE } });
  const related = ARTICLES.filter((a) => a.file !== file).map((a) => `<li><a href="${a.file}">${a.short}</a></li>`).join("");
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}｜八百万診断</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="${url}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="八百万診断">
  <meta property="og:image" content="${SITE}img/ogp.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="../css/style.css?v=${VERSION}">
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
  <header class="site-header">
    <a href="../" class="logo">⛩️ 八百万診断</a>
    <nav class="site-nav"><a href="../">正体診断</a><a href="../#compat">相性診断</a><a href="./">読みもの</a></nav>
  </header>
  <main class="container">
    <p class="crumbs"><a href="../">トップ</a> › <a href="./">読みもの</a>${file === "index.html" ? "" : " › " + title.split("｜")[0]}</p>
    <article class="card article">
      <h1>${title.split("｜")[0]}</h1>
      ${title.includes("｜") ? `<p class="subtitle">${title.split("｜")[1]}</p>` : ""}
      <p class="a-meta">公開日：${published.replace(/-/g, "/")}${hasAd ? "　<span class=\"pr-note\">※この記事にはアフィリエイト広告（PR）が含まれます</span>" : ""}</p>
      ${body}
      <div class="cta">
        <p>あなたの属性と「正体」を、生年月日から無料で診断できます。</p>
        <a class="cta-btn" href="../">⛩️ 八百万診断で正体を診断する</a>
        <a class="cta-btn sub" href="../#compat">💞 ふたりの相性を診断する</a>
      </div>
    </article>
    ${file === "index.html" ? "" : `<section class="card related"><h2>ほかの読みもの</h2><ul>${related}</ul></section>`}
  </main>
  <footer class="site-footer">
    <p>当サイトはアフィリエイト広告を利用しています。</p>
    <p><a href="../privacy.html">プライバシーポリシー・免責事項</a> ／ <a href="https://forms.gle/FKe9d2JBb2UZRWUj6" target="_blank" rel="noopener">お問い合わせ</a></p>
    <p>診断結果や記事の内容は娯楽としてお楽しみください。</p>
    <p>© 2026 八百万診断</p>
  </footer>
  <script src="../js/config.js?v=${VERSION}"></script>
  <script src="../js/analytics.js?v=${VERSION}"></script>
</body>
</html>
`;
}

// ---- 属性ごとの解説文（オリジナル） ----
const ELEMENT_TEXT = {
  wood: {
    season: "春", dir: "東", color: "青（緑）", stems: "甲（きのえ）・乙（きのと）", symbol: "草木・樹木",
    intro: [
      "「木」は、春に芽を出し、上へ上へと伸びていく草木の気です。五行の中でもっとも「成長」と「始まり」を象徴する属性で、木属性の人は新しいことに挑戦するエネルギーと、まっすぐな向上心を持っています。",
      "好奇心が強く、学ぶことや人を育てることが得意。思いやりがあり、困っている人を放っておけないやさしさも木属性の特徴です。一方で、伸びたい方向を邪魔されると強いストレスを感じやすく、理想が高いぶん頑固になってしまうことも。",
      "恋愛では、一緒に成長できる相手を求めるタイプ。仕事では、企画や教育、ものごとの立ち上げなど「ゼロから育てる」場面で力を発揮します。",
    ],
  },
  fire: {
    season: "夏", dir: "南", color: "赤", stems: "丙（ひのえ）・丁（ひのと）", symbol: "炎・太陽",
    intro: [
      "「火」は、夏の太陽や燃え上がる炎の気です。明るさ・情熱・華やかさを象徴する属性で、火属性の人はその場にいるだけで周りを明るくする、天性のムードメーカーです。",
      "感情表現が豊かで、喜怒哀楽がはっきりしているのが魅力。直感とひらめきに優れ、思い立ったらすぐ行動できます。ただし燃え上がるのも早いぶん、熱が冷めるのも早いことがあるので、長く続けたいことは仲間と一緒に取り組むのがコツです。",
      "恋愛では情熱的でストレートなタイプ。仕事では、人前に立つ仕事や、表現・発信・営業など、人の心を動かす場面で輝きます。",
    ],
  },
  earth: {
    season: "土用（季節の変わり目）", dir: "中央", color: "黄", stems: "戊（つちのえ）・己（つちのと）", symbol: "大地・山",
    intro: [
      "「土」は、すべてを受け止め、作物を育てる大地の気です。五行の中心に位置し、「安定」と「信頼」を象徴する属性で、土属性の人はどっしりとした安心感で周囲から頼りにされます。",
      "面倒見がよく、人の話をじっくり聞ける包容力の持ち主。コツコツと積み重ねることが得意で、時間をかけたものほど大きな成果になります。反面、変化を好まず腰が重くなりがちなので、ときには思い切って環境を変えてみると運気が動きます。",
      "恋愛では誠実で一途なタイプ。仕事では、組織の調整役や管理、ものづくり、人を支える仕事で本領を発揮します。",
    ],
  },
  metal: {
    season: "秋", dir: "西", color: "白", stems: "庚（かのえ）・辛（かのと）", symbol: "金属・鉱物・刀",
    intro: [
      "「金」は、秋の澄んだ空気や、磨き上げられた金属・刀の気です。「決断」「正義」「美意識」を象徴する属性で、金属性の人は物事の白黒をはっきりさせる判断力と、筋の通った生き方を大切にします。",
      "責任感が強く、一度引き受けたことは最後までやり抜くタイプ。本物を見抜くセンスがあり、ファッションや道具選びにもこだわりがあります。ただ、正しさにこだわるあまり言葉が鋭くなりやすいので、伝え方をやわらかくすると人間関係がぐっと楽になります。",
      "恋愛では理想が高く、尊敬できる相手に惹かれるタイプ。仕事では、専門職や技術職、判断を任される立場、金融やお金を扱う分野で力を発揮します。",
    ],
  },
  water: {
    season: "冬", dir: "北", color: "黒", stems: "壬（みずのえ）・癸（みずのと）", symbol: "水・海・川",
    intro: [
      "「水」は、形を変えながらどこまでも流れていく水の気です。「知恵」「柔軟さ」「直感」を象徴する属性で、水属性の人は状況に合わせてしなやかに対応できる、頭の回転の速い人です。",
      "観察力と洞察力に優れ、人の気持ちや物事の本質を見抜くのが得意。どんな相手ともうまく付き合える柔らかさがあります。一方で、流されやすかったり、本音を見せずに一人で抱え込んだりしがち。信頼できる人に気持ちを話すことが開運のカギです。",
      "恋愛では相手に合わせるのが上手で、ミステリアスな魅力があるタイプ。仕事では、研究・企画・分析・コミュニケーションなど、知恵と柔軟さを生かせる場面で活躍します。",
    ],
  },
};

const GEN = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
const CTRL = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };
const genBy = (el) => ORDER.find((e) => GEN[e] === el);
const ctrlBy = (el) => ORDER.find((e) => CTRL[e] === el);
const elLink = (el) => `<a href="element-${el}.html">${ELEMENTS[el].icon}${ELEMENTS[el].name}</a>`;

function identityTable(el, keys) {
  return keys.map((key) => {
    const cat = CATEGORIES.find((c) => c.key === key);
    const rows = RESULTS[el][key].map((r) =>
      `<tr><td><a href="${wikiUrl(r.wiki)}" target="_blank" rel="noopener">${r.name}</a><br><small>${r.sub}</small></td><td>${r.desc}</td></tr>`).join("");
    return `<h3>${cat.label}</h3><table class="a-table"><tbody>${rows}</tbody></table>`;
  }).join("");
}

function shrineBlock(s, el) {
  const spots = s.spots.map((p) => `<li><a href="${mapUrl(p.name + " " + s.area)}" target="_blank" rel="noopener">${p.name}</a>：${p.desc}</li>`).join("");
  return `<div class="a-shrine">
      ${figure(s.name)}
      <h3>⛩️ ${s.name}</h3>
      <p class="shrine-meta">${s.area}／ご祭神：${s.deity}${el ? `／${ELEMENTS[el].icon}${ELEMENTS[el].name}属性` : ""}</p>
      <p>${s.desc}</p>
      <p><a href="${mapUrl(s.name + " " + s.area)}" target="_blank" rel="noopener">地図で見る</a> ／ <a href="${wikiUrl(s.wiki)}" target="_blank" rel="noopener">Wikipedia</a></p>
      <p class="travel-title">📍 周辺の観光スポット</p><ul>${spots}</ul>
      ${travelButtons(s)}
    </div>`;
}

function stoneBlock(st, labelText) {
  return `<div class="a-stone">
      <h3><span class="dot" style="background:${st.color}"></span>${st.name}${labelText ? `<small>（${labelText}）</small>` : ""}</h3>
      <p>${st.meaning}</p>
      ${priceButtons(st.keyword)}
    </div>`;
}

// ---- 各記事の本文 ----
function elementArticle(el) {
  const E = ELEMENTS[el], T = ELEMENT_TEXT[el];
  const toc = ["基本データ", "陽と陰の違い", "別の世界の姿（神話の神）", "別の世界の姿（妖怪・怪異・都市伝説・クトゥルフ神話）", "相性のいい属性", "おすすめの神社", "守護パワーストーン"];
  return `
    <div class="a-hero" style="--el:${E.color}"><span>${E.icon}</span><b>${E.name}</b></div>
    ${T.intro.map((p) => `<p>${p}</p>`).join("")}
    <nav class="toc"><p>目次</p><ol>${toc.map((t, i) => `<li><a href="#s${i + 1}">${t}</a></li>`).join("")}</ol></nav>

    <h2 id="s1">「${E.name}」属性の基本データ</h2>
    <table class="a-table kv"><tbody>
      <tr><th>象徴</th><td>${T.symbol}</td></tr>
      <tr><th>季節</th><td>${T.season}</td></tr>
      <tr><th>方角</th><td>${T.dir}</td></tr>
      <tr><th>色</th><td>${T.color}</td></tr>
      <tr><th>日干（十干）</th><td>${T.stems}</td></tr>
    </tbody></table>
    <p>生まれた日の「日干」が${T.stems}の人が、${E.name}属性になります。日干については<a href="how-it-works.html">八百万診断の仕組み</a>で詳しく解説しています。</p>

    <h2 id="s2">陽の${E.name}と陰の${E.name}の違い</h2>
    <p>同じ${E.name}属性でも、陰陽によって性格の出方が変わります。</p>
    <table class="a-table kv"><tbody>
      <tr><th>陽の${E.name}</th><td>${E.yang}</td></tr>
      <tr><th>陰の${E.name}</th><td>${E.yin}</td></tr>
    </tbody></table>

    <h2 id="s3">別の世界の姿（神話の神）</h2>
    <p>八百万診断の「別の世界に生まれていたら」では、${E.name}属性の人の姿を、${E.name}の気にゆかりのある神々の中から選びます（主役の「本当の正体」とは別の一覧です）。あなたはどの神に近いでしょうか。</p>
    ${identityTable(el, ["india", "japan", "greece", "norse"])}

    <h2 id="s4">別の世界の姿（妖怪・怪異・都市伝説・クトゥルフ神話）</h2>
    ${identityTable(el, ["yokai", "kaii", "legend", "cthulhu"])}

    <h2 id="s5">「${E.name}」属性と相性のいい属性</h2>
    <ul>
      <li><b>${elLink(genBy(el))}（相生）</b>：${ELEMENTS[genBy(el)].name}が${E.name}を生み育てる関係。あなたの力を引き出してくれる存在です。</li>
      <li><b>${elLink(GEN[el])}（相生）</b>：${E.name}が${ELEMENTS[GEN[el]].name}を育てる関係。あなたが自然と支えたくなる相手です。</li>
      <li><b>${elLink(el)}（比和）</b>：同じ属性どうし。価値観が近く、気をつかわずにいられます。</li>
      <li><b>${elLink(CTRL[el])}・${elLink(ctrlBy(el))}（相剋）</b>：ぶつかることもあるけれど、刺激し合って成長できる関係です。</li>
    </ul>
    <p>くわしくは<a href="compatibility.html">五行でわかる相性の仕組み</a>をどうぞ。</p>

    <h2 id="s6">「${E.name}」属性におすすめの神社</h2>
    ${RESULTS[el].shrine.map((s) => shrineBlock(s)).join("")}

    <h2 id="s7">「${E.name}」属性の守護パワーストーン</h2>
    ${stoneBlock(POWER_STONES[el].yang, `陽の${E.name}`)}
    ${stoneBlock(POWER_STONES[el].yin, `陰の${E.name}`)}
    <p class="note">※石の意味は古くからの言い伝えです。</p>`;
}

function compatibilityArticle() {
  const pts = ORDER.map((el, i) => {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    return { el, x: 160 + 115 * Math.cos(a), y: 160 + 115 * Math.sin(a) };
  });
  const arrow = (p, q, cls) => {
    const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    return `<line class="${cls}" x1="${(p.x + ux * 34).toFixed(1)}" y1="${(p.y + uy * 34).toFixed(1)}" x2="${(q.x - ux * 38).toFixed(1)}" y2="${(q.y - uy * 38).toFixed(1)}" marker-end="url(#ah-${cls})"/>`;
  };
  const byEl = Object.fromEntries(pts.map((p) => [p.el, p]));
  const svg = `<svg class="a-diagram" viewBox="0 0 320 320" role="img" aria-label="五行の相生と相剋の図">
    <defs>
      <marker id="ah-gen" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#3f9e5a"/></marker>
      <marker id="ah-ctrl" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="#c0392b"/></marker>
    </defs>
    ${ORDER.map((el) => arrow(byEl[el], byEl[GEN[el]], "gen")).join("")}
    ${ORDER.map((el) => arrow(byEl[el], byEl[CTRL[el]], "ctrl")).join("")}
    ${pts.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="30" fill="${ELEMENTS[p.el].color}"/><text x="${p.x.toFixed(1)}" y="${(p.y + 9).toFixed(1)}" text-anchor="middle" font-size="26" font-weight="700" fill="#fff">${ELEMENTS[p.el].name}</text>`).join("")}
  </svg>`;
  const base = { gen: 90, same: 78, ctrl: 62 };
  const types = [];
  ORDER.forEach((el) => [true, false].forEach((y) => types.push({ el, y })));
  const rel = (a, b) => a === b ? "same" : GEN[a] === b || GEN[b] === a ? "gen" : "ctrl";
  const head = types.map((t) => `<th>${ELEMENTS[t.el].icon}<br>${label(t.el, t.y)}</th>`).join("");
  const body = types.map((a) => `<tr><th>${ELEMENTS[a.el].icon} ${label(a.el, a.y)}</th>${types.map((b) => {
    const r = rel(a.el, b.el), v = base[r] + (a.y !== b.y ? 6 : 0);
    return `<td class="c-${r}">${v}</td>`;
  }).join("")}</tr>`).join("");
  return `
    <p>相性占いにはさまざまな方法がありますが、八百万診断では古代中国から伝わる「五行思想」をもとに相性を読み解いています。五行とは、世界のあらゆるものを<b>木・火・土・金・水</b>の5つの要素に分けて考える思想で、それぞれの要素の間には「育てる」「抑える」という決まった関係があります。</p>

    <h2>相生（そうじょう）：育て合う関係</h2>
    <p>ある要素が、次の要素を生み出す関係です。</p>
    <ul>
      <li><b>木生火</b>：木がこすれ合って火が生まれる</li>
      <li><b>火生土</b>：火が燃えたあとの灰が土になる</li>
      <li><b>土生金</b>：土の中から金属（鉱物）が生まれる</li>
      <li><b>金生水</b>：金属の表面に水滴が生まれる</li>
      <li><b>水生木</b>：水が木を育てる</li>
    </ul>
    <p>相生の関係にあるふたりは、片方がもう片方の力を自然に引き出す、もっとも相性のよい組み合わせとされます。</p>

    <h2>相剋（そうこく）：抑え合う関係</h2>
    <p>ある要素が、別の要素の勢いを抑える関係です。</p>
    <ul>
      <li><b>木剋土</b>：木は根を張って土を締めつける</li>
      <li><b>土剋水</b>：土は水をせき止める</li>
      <li><b>水剋火</b>：水は火を消す</li>
      <li><b>火剋金</b>：火は金属を溶かす</li>
      <li><b>金剋木</b>：金属（刃物）は木を切る</li>
    </ul>
    <p>相剋は「相性が悪い」と思われがちですが、実際にはお互いの行き過ぎを止め合う関係でもあります。ぶつかることはあっても、足りないものを補い合い、成長し合える組み合わせです。</p>

    <h2>比和（ひわ）：同じ属性どうし</h2>
    <p>同じ属性どうしの関係です。価値観やペースが近く、一緒にいて楽な相手。ただし、似ているぶん同じ失敗をしやすい面もあります。</p>

    <h2>五行の関係を図で見る</h2>
    ${svg}
    <p class="legend"><span class="lg gen"></span>緑の矢印：相生（育てる）　<span class="lg ctrl"></span>赤の矢印：相剋（抑える）</p>

    <h2>陰と陽の組み合わせ</h2>
    <p>五行の属性にはそれぞれ「陽」と「陰」があります。陽は外へ向かう積極的なエネルギー、陰は内に向かう穏やかなエネルギーです。陰と陽の組み合わせは凸凹がうまくかみ合いやすく、八百万診断では相性を少し高めに見ています。</p>

    <h2>10タイプの相性早見表</h2>
    <p>八百万診断で使っている、10タイプどうしの相性の目安（％）です。実際の診断では、ふたりの生年月日の組み合わせによって数％前後します。</p>
    <div class="table-scroll"><table class="a-table matrix"><thead><tr><th></th>${head}</tr></thead><tbody>${body}</tbody></table></div>
    <p class="legend"><span class="lg c-gen"></span>相生　<span class="lg c-same"></span>比和　<span class="lg c-ctrl"></span>相剋</p>

    <h2>属性ごとの詳しい解説</h2>
    <ul>${ORDER.map((el) => `<li>${elLink(el)}属性の性格と特徴</li>`).join("")}</ul>`;
}

function birthstonesArticle() {
  return `
    <p>誕生石は、生まれた月ごとに決められた宝石です。身につけると幸運を呼ぶお守りになるといわれ、誕生日の贈り物としても人気があります。日本では1958年に全国宝石卸商協同組合が定めた一覧が広く使われ、2021年には新たな石も追加されました。ここでは、日本で親しまれている代表的な誕生石と、その石に伝わる意味を紹介します。</p>
    ${Object.entries(BIRTHSTONES).map(([m, list]) => `
      <h2>${m}月の誕生石</h2>
      ${list.map((st) => stoneBlock(st)).join("")}`).join("")}
    <h2>誕生石の選び方のポイント</h2>
    <ul>
      <li><b>同じ月に複数の石がある場合</b>は、色や雰囲気で好きなものを選んで大丈夫です。</li>
      <li><b>贈り物にするなら</b>、相手の誕生月の石に、相手の属性の<a href="power-stones.html">守護パワーストーン</a>を組み合わせるのもおすすめです。</li>
      <li>宝石は高価なものも多いので、まずは天然石のブレスレットやアクセサリーから試してみるのもよいでしょう。</li>
    </ul>
    <p class="note">※石の意味は古くからの言い伝えです。</p>`;
}

function powerStonesArticle() {
  return `
    <p>八百万診断では、生年月日から求めた五行の属性と陰陽をもとに、10種類の「守護パワーストーン」を選んでいます。自分のタイプに合った石を知って、お守りとして身につけてみませんか。自分のタイプがわからない人は、<a href="../">八百万診断</a>で調べられます。</p>
    ${ORDER.map((el) => `
      <h2>${ELEMENTS[el].icon} ${ELEMENTS[el].name}属性の守護石</h2>
      <p>${ELEMENT_TEXT[el].intro[0]}</p>
      ${stoneBlock(POWER_STONES[el].yang, `陽の${ELEMENTS[el].name}`)}
      ${stoneBlock(POWER_STONES[el].yin, `陰の${ELEMENTS[el].name}`)}`).join("")}
    <h2>パワーストーンを身につけるときのポイント</h2>
    <ul>
      <li><b>直感を大切に</b>：実物を見て「きれい」「気になる」と感じた石は、今のあなたに合っているといわれます。</li>
      <li><b>ときどき休ませる</b>：月の光に当てたり、水晶のそばに置いたりして「浄化」するのが昔からの習わしです（日光や水に弱い石もあるので注意）。</li>
      <li><b>誕生石と組み合わせる</b>：<a href="birthstones.html">誕生石</a>と一緒に身につけるのも人気です。</li>
    </ul>
    <p class="note">※石の意味は古くからの言い伝えであり、効果を保証するものではありません。</p>`;
}

function shrinesArticle() {
  return `
    <p>八百万診断では、五行の属性ごとに「相性のいい神社」を紹介しています。ここでは全国15社を属性別にまとめました。ご祭神やご利益に加えて、参拝のついでに立ち寄りたい周辺の観光スポットも紹介します。旅行の計画にも役立ててください。</p>
    ${ORDER.map((el) => `
      <h2>${ELEMENTS[el].icon} ${ELEMENTS[el].name}属性の人におすすめの神社</h2>
      <p>${ELEMENTS[el].name}属性の性格については<a href="element-${el}.html">こちら</a>。</p>
      ${RESULTS[el].shrine.map((s) => shrineBlock(s, el)).join("")}`).join("")}
    <h2>参拝のマナー</h2>
    <ul>
      <li>鳥居をくぐる前に一礼し、参道の真ん中（神様の通り道）は避けて歩きます。</li>
      <li>手水舎で左手・右手・口の順に清めます。</li>
      <li>拝殿では「二拝二拍手一拝」が一般的です（出雲大社などは作法が異なります）。</li>
    </ul>
    <p class="note">※観光スポットの営業時間や季節の行事は変わることがあります。お出かけ前に公式情報をご確認ください。</p>`;
}

// ---- 出どころ別の正体図鑑（アステカ・インカ／ソロモン72柱／UMA）----
function originArticle(intro, groups, outro = "") {
  const entry = (t) => {
    const n = TRUE_IDENTITIES.indexOf(t);
    const [k, yomi] = STEM_INFO[t.stem];
    return `<section class="ti-entry" id="o-${n + 1}">
      ${figure(t.name, true)}
      <p class="ti-origin">${t.origin}・${t.type}</p>
      <h3>${t.kana ? `<ruby>${t.name}<rt>${t.kana}</rt></ruby>` : t.name}</h3>
      <p class="ti-catch">「${t.catch}」</p>
      <p>${t.essence}</p>
      <p class="ti-cond">日干が${k}（${yomi}）の人の正体の候補です。</p>
      ${placeLine(t.name)}
      <p><a href="true-identities.html#ti-${n + 1}">長所・短所・恋愛・仕事の傾向を見る →</a> ／ <a href="${wikiUrl(t.wiki)}" target="_blank" rel="noopener">Wikipedia ↗</a></p>
    </section>`;
  };
  return `<p>${intro}</p>` + groups.map((g) => {
    const list = TRUE_IDENTITIES.filter(g.filter);
    return `<h2>${g.title}</h2><p>${g.lead}</p>
      <p class="ti-index">${list.map((t) => `<a href="#o-${TRUE_IDENTITIES.indexOf(t) + 1}">${t.name}</a>`).join("／")}</p>
      ${list.map(entry).join("")}`;
  }).join("") + outro + `<p>あなたの正体がどれになるかは、<a href="../">トップページ</a>で生年月日を入れると診断できます。すべての正体は<a href="true-identities.html">本当の正体図鑑</a>で見られます。</p>`;
}
const UMA_NAMES = ["コティングリー妖精", "フラットウッズ・モンスター", "ジャージー・デビル", "イエティ", "チュパカブラ", "モケーレ・ムベンベ", "クッシー", "ホムンクルス"];

// ---- 属性別パワースポットガイド ----
function powerSpotsArticle() {
  return `
    <p>八百万診断では、五行の属性ごとに「相性のいいパワースポット」を紹介しています。ここでは、神社以外の自然の名所を属性別に20か所まとめました。生まれ持った気と響き合う場所に出かけると、心が整うといわれます。旅の目的地選びにどうぞ。</p>
    <p>自分の属性がわからない人は、<a href="../">トップページ</a>で生年月日を入れて診断してみてください。属性と相性のいい神社は<a href="shrines.html">属性別おすすめ神社ガイド</a>で紹介しています。</p>
    <nav class="toc"><p>目次</p><ol>${ORDER.map((el) => `<li><a href="#ps-${el}">${ELEMENTS[el].icon} ${ELEMENTS[el].name}属性のパワースポット</a></li>`).join("")}</ol></nav>
    ${ORDER.map((el) => `
      <h2 id="ps-${el}">${ELEMENTS[el].icon} ${ELEMENTS[el].name}属性の人と相性のいいパワースポット</h2>
      <p>${ELEMENTS[el].trait} ${ELEMENTS[el].name}属性の性格は<a href="element-${el}.html">こちら</a>。相性のいい「${ELEMENTS[genBy(el)].name}」属性の場所（<a href="#ps-${genBy(el)}">こちら</a>）もおすすめです。</p>
      ${POWER_SPOTS[el].map((p) => `<div class="a-shrine">
        <h3>🌄 ${p.name}</h3>
        <p class="shrine-meta">${p.area}／${ELEMENTS[el].icon}${ELEMENTS[el].name}属性</p>
        <p>${p.desc}</p>
        <p><a href="${mapUrl(p.name.replace(/（.*?）/g, "") + " " + p.area)}" target="_blank" rel="noopener">地図で見る</a></p>
        ${travelButtons(p)}
      </div>`).join("")}`).join("")}
    <h2>パワースポットを訪れるときに</h2>
    <ul>
      <li>自然の中の名所は、天候や季節で道や施設の状況が変わります。歩きやすい靴と、気温に合った服装で出かけましょう。</li>
      <li>立ち入り禁止の場所や、植物・岩などには手をふれず、その土地のルールを守りましょう。</li>
      <li>「パワースポット」の効果は言い伝えです。景色や空気を、ゆっくり味わうことがいちばんの楽しみ方です。</li>
    </ul>
    <p class="note">※営業時間・入場料・交通規制などは変わることがあります。お出かけ前に公式情報をご確認ください。</p>`;
}

function zukan(keys, intro) {
  return `<p>${intro}</p>` + keys.map((key) => {
    const cat = CATEGORIES.find((c) => c.key === key);
    return `<h2>${cat.label}</h2>` + ORDER.map((el) => `
      <h3>${ELEMENTS[el].icon} ${ELEMENTS[el].name}属性の${cat.label}</h3>
      <div class="zukan">${RESULTS[el][key].map((r) => `
        <div class="z-item">
          ${figure(r.name, true)}
          <h4>${r.name}</h4>
          <p class="z-sub">${r.sub}</p>
          <p>${r.desc}</p>
          ${r.weak ? `<p class="z-weak">⚠️ このキャラの弱点：${r.weak}</p>` : ""}
          ${placeLine(r.name)}
          <a href="${wikiUrl(r.wiki)}" target="_blank" rel="noopener">Wikipediaで詳しく ↗</a>
        </div>`).join("")}</div>`).join("");
  }).join("");
}

// ---- ゆかりの地めぐり ----
const PREFS = "北海道 青森県 岩手県 宮城県 秋田県 山形県 福島県 茨城県 栃木県 群馬県 埼玉県 千葉県 東京都 神奈川県 新潟県 富山県 石川県 福井県 山梨県 長野県 岐阜県 静岡県 愛知県 三重県 滋賀県 京都府 大阪府 兵庫県 奈良県 和歌山県 鳥取県 島根県 岡山県 広島県 山口県 徳島県 香川県 愛媛県 高知県 福岡県 佐賀県 長崎県 熊本県 大分県 宮崎県 鹿児島県 沖縄県".split(" ");
const REGIONS = [["北海道・東北", 0, 6], ["関東", 7, 13], ["中部", 14, 22], ["近畿", 23, 29], ["中国・四国", 30, 38], ["九州・沖縄", 39, 46]];

function placesArticle() {
  // キャラ名 → どの図鑑のキャラか
  const where = {};
  for (const v of Object.values(RESULTS)) for (const c of CATEGORIES) (v[c.key] || []).forEach((r) => (where[r.name] = { label: c.label, file: c.key === "cthulhu" ? "cthulhu.html" : ["yokai", "kaii", "legend"].includes(c.key) ? "yokai.html" : "gods.html" }));
  TRUE_IDENTITIES.forEach((t, n) => (where[t.name] = { label: "本当の正体", file: `true-identities.html#ti-${n + 1}` }));

  const card = (p) => `
    <section class="pl-entry" id="pl-${PLACE_LIST.indexOf(p)}">
      <h4>📍 ${p.place}</h4>
      <p class="pl-area">${p.area}　<a href="${mapUrl(p.place + " " + p.area)}" target="_blank" rel="noopener">地図で見る</a></p>
      <p>${p.note}</p>
      <p class="pl-chars">ゆかりのキャラ：${p.chars.map((n) => `<a href="${where[n].file}">${n}</a><small>（${where[n].label}）</small>`).join("、")}</p>
      <div class="travel">${p.stay ? travelButtons(p) : overseasButtons(p.guide)}</div>
    </section>`;

  const prefIndex = (p) => PREFS.findIndex((x) => p.area.startsWith(x));
  const domestic = PLACE_LIST.filter((p) => p.stay).sort((a, b) => prefIndex(a) - prefIndex(b));
  const overseas = PLACE_LIST.filter((p) => !p.stay);
  const countries = [...new Set(overseas.map((p) => p.area.split("・")[0]))];
  const japan = REGIONS.map(([label, from, to]) => {
    const list = domestic.filter((p) => prefIndex(p) >= from && prefIndex(p) <= to);
    return list.length ? `<h3>${label}</h3>${list.map(card).join("")}` : "";
  }).join("");
  const world = countries.map((c) => `<h3>${c}</h3>${overseas.filter((p) => p.area.split("・")[0] === c).map(card).join("")}`).join("");

  return `
    <p>八百万診断に登場する神さま・妖怪・怪異・都市伝説には、それぞれの伝説が生まれた場所や、祀られている場所があります。このページでは、日本と世界の「ゆかりの地」${PLACE_LIST.length}か所を、地域ごとに紹介します。あなたの正体ゆかりの地へ、旅に出てみませんか？</p>
    <p class="note">※特定の場所が伝わっていない妖怪などは、仲間に会えそうな場所を紹介しています。拝観時間や公開状況は変わることがあるので、お出かけ前に公式情報をご確認ください。</p>
    <h2>日本のゆかりの地</h2>
    ${japan}
    <h2>世界のゆかりの地</h2>
    ${world}`;
}

// ---- 本当の正体図鑑 — 100を超える正体 ----
const STEM_INFO = [
  ["甲", "きのえ", "天に向かって伸びる大樹"], ["乙", "きのと", "しなやかに広がる草花"],
  ["丙", "ひのえ", "天を照らす太陽"], ["丁", "ひのと", "闇を照らす灯火"],
  ["戊", "つちのえ", "どっしりそびえる山"], ["己", "つちのと", "作物を育てる田畑"],
  ["庚", "かのえ", "鍛えられた剣"], ["辛", "かのと", "磨かれた宝石"],
  ["壬", "みずのえ", "果てしない大海"], ["癸", "みずのと", "大地をうるおす雨"],
];
const WEST_NAME = { fire: "火", earth: "地", air: "風", water: "水" };

function trueIdentitiesArticle() {
  const toc = STEM_INFO.map(([k, yomi, img], i) =>
    `<li><a href="#stem-${i}">${k}（${yomi}）</a>：${label(ORDER[Math.floor(i / 2)], i % 2 === 0)}・${img}</li>`).join("");
  const sections = STEM_INFO.map(([k, yomi, img], i) => {
    const el = ORDER[Math.floor(i / 2)];
    const list = TRUE_IDENTITIES.map((t, n) => ({ t, n })).filter(({ t }) => t.stem === i);
    return `
    <h2 id="stem-${i}">${ELEMENTS[el].icon} ${k}（${yomi}）の正体${list.length}体</h2>
    <p>${k}は${label(el, i % 2 === 0)}。イメージは「${img}」です。日干が${k}の人は、次の${list.length}体のどれかが本当の正体になります。</p>
    <p class="ti-index">${list.map(({ t, n }) => `<a href="#ti-${n + 1}">${t.name}${t.kana ? `（${t.kana}）` : ""}</a>`).join("／")}</p>
    ${list.map(({ t, n }) => `
    <section class="ti-entry" id="ti-${n + 1}">
      ${figure(t.name, true)}
      <p class="ti-origin">${t.origin}・${t.type}</p>
      <h3>${t.kana ? `<ruby>${t.name}<rt>${t.kana}</rt></ruby>` : t.name}</h3>
      <p class="ti-catch">「${t.catch}」</p>
      <p>${t.essence}</p>
      <dl class="ti-dl">
        <dt>✨ 長所</dt><dd>${t.good}</dd>
        <dt>⚠️ 短所</dt><dd>${t.weak}</dd>
        <dt>💞 恋愛・人間関係</dt><dd>${t.love}</dd>
        <dt>💼 仕事・才能</dt><dd>${t.work}</dd>
      </dl>
      <p class="ti-cond">なりやすい条件：日干が${k}／西洋占星術で「${WEST_NAME[t.west]}」の星座が強い／紫微斗数の命宮に${t.stars.join("・")}</p>
      ${placeLine(t.name)}
      <a href="${wikiUrl(t.wiki)}" target="_blank" rel="noopener">Wikipediaで詳しく ↗</a>
    </section>`).join("")}
    <p class="back-top"><a href="#toc">▲ 目次へ戻る</a></p>`;
  }).join("");
  return `
    <p>八百万診断の主役「本当の正体」は、世界中の神話や伝承から選んだ<b>100を超える正体</b>。そのうち半分以上が神さまで、ほかに霊獣・精霊・妖怪・悪魔・未確認生物なども登場します。このページでは、100を超える正体すべての本質・長所・短所・恋愛・仕事の傾向を紹介します。</p>

    <h2>本当の正体の決まり方</h2>
    <ol>
      <li>生まれた日の<b>日干（にっかん）</b>で、100を超える正体から、十数体の候補にしぼります（<a href="how-it-works.html">日干とは？</a>）。</li>
      <li>その候補の中から、<b>西洋占星術</b>（太陽・月・アセンダントの星座の元素）と<b>紫微斗数</b>（命宮の主星）の結果がいちばん重なる存在を選びます。</li>
      <li>出生時刻と出生地も入れると、アセンダントや紫微斗数が加わり、より精密に判定できます。</li>
    </ol>

    <h2 id="toc">目次（日干ごと）</h2>
    <ul>${toc}</ul>
    ${sections}
    <p class="note">※八百万診断は、四柱推命・西洋占星術・紫微斗数をもとにした娯楽のためのオリジナル診断です。各キャラクターの性格は、神話や伝承のイメージから描いたものです。</p>`;
}

function howItWorksArticle() {
  const stems = ["甲（きのえ）", "乙（きのと）", "丙（ひのえ）", "丁（ひのと）", "戊（つちのえ）", "己（つちのと）", "庚（かのえ）", "辛（かのと）", "壬（みずのえ）", "癸（みずのと）"];
  const rows = stems.map((s, i) => {
    const el = ORDER[Math.floor(i / 2)];
    return `<tr><td>${s}</td><td>${ELEMENTS[el].icon} ${ELEMENTS[el].name}</td><td>${i % 2 === 0 ? "陽" : "陰"}</td></tr>`;
  }).join("");
  return `
    <p>八百万診断は、生年月日を入力するだけで、あなたの属性と「正体」を導き出すオリジナルの診断です。このページでは、診断の土台になっている「日干（にっかん）」と五行の考え方を解説します。</p>

    <h2>十干（じっかん）とは</h2>
    <p>十干は、古代中国で日付や年を数えるために使われた10の記号です。「甲・乙・丙・丁・戊・己・庚・辛・壬・癸」の10種類があり、それぞれが五行の属性と陰陽に対応しています。十干は十二支（子・丑・寅…）と組み合わせて「甲子（きのえね）」のように使われ、60日（60年）で一巡します。</p>
    <table class="a-table kv"><thead><tr><th>十干</th><th>五行</th><th>陰陽</th></tr></thead><tbody>${rows}</tbody></table>

    <h2>日干（にっかん）とは</h2>
    <p>生まれた「日」の十干を日干といいます。四柱推命という占いでは、日干がその人自身の本質を表すもっとも大切な要素とされています。たとえば2000年1月1日の日干は「戊（つちのえ）」、その6日後の1月7日は「甲（きのえ）」です。日干は10日ごとに一巡します。</p>

    <h2>八百万診断の流れ</h2>
    <ol>
      <li>生年月日から日干を計算し、<b>五行の属性</b>（木・火・土・金・水）と<b>陰陽</b>を決めます。</li>
      <li>日干で十数体の候補にしぼり、西洋占星術の太陽・月・アセンダント（ASC）・元素バランス、紫微斗数の命宮主星との一致を得点にして、最高点の候補を<b>「本当の正体」</b>に選びます。同点なら生年月日で決まる順番を使います。出生時刻や出生地を追加・訂正すると、使える情報が変わり、正体が変わる場合があります。同じ入力条件なら同じ結果になります。</li>
      <li>属性にゆかりのある<b>神社</b>・<b>パワースポット</b>と、属性・陰陽に合った<b>守護パワーストーン</b>、生まれ月の<b>誕生石</b>を紹介します。</li>
      <li>今日の運勢は、生年月日と今日の日付から計算するので、毎日変わります。</li>
      <li>今日のラッキーフードと身近なラッキーアイテムは、生年月日と日付から選びます。同じ日は同じ結果で、翌日は別の候補になります。</li>
      <li>通販で探せる「今月のラッキーアイテム」は、生年月日と年月で選びます。同じ月は同じ結果で、月が変わると切り替わります。</li>
    </ol>

    <h2>どの占いが正体に使われる？</h2>
    <p>本当の正体を選ぶ材料は、日干、西洋占星術、紫微斗数です。時刻が分からない場合などは、使える情報だけで判定します。月星座が確定できないときは月の加点を使いません。詳しくは結果の「あなたが〇〇になった理由」で確認できます。</p>
    <p>宿曜と九星気学は、正体を選ぶ点数には入れず、別の角度から見た性質として紹介します。また「別の世界の姿」の8カテゴリは、日干から出した五行の属性をもとに選ぶ、別の一覧です。</p>
    <table class="a-table kv"><thead><tr><th>表示</th><th>使う情報・仕組み</th><th>読み方</th></tr></thead><tbody>
      <tr><td>本当の正体</td><td>日干・西洋占星術・紫微斗数</td><td>生まれ持った性質を重ねたオリジナル診断</td></tr>
      <tr><td>宿曜</td><td>日本時間の旧暦の生年月日</td><td><a href="sukuyo.html">本命宿と6種類の相性</a></td></tr>
      <tr><td>九星気学</td><td>立春・節入りで区切った生まれ年と月</td><td><a href="kyusei.html">本命星・月命星・今年のテーマ</a></td></tr>
      <tr><td>今日の運勢</td><td>生年月日と今日の日付</td><td>毎日のオリジナルの目安</td></tr>
      <tr><td>今日の易</td><td>ボタンを押したときのランダムな抽選</td><td><a href="eki.html">今日の問いを考えるヒント</a></td></tr>
    </tbody></table>
    <h2>相性の点数と宿曜は別の見方</h2>
    <p>相性％は五行・日干の関係から作る当サイト独自の目安です。宿曜の関係、正体どうしの「伝説の組み合わせ」、九星の相性を足した点数ではありません。複数の見方が違う結果になっても、それぞれの説明を会話や振り返りのヒントとして読めます。</p>
    <h2>属性ごとの解説</h2>
    <ul>${ORDER.map((el) => `<li>${elLink(el)}属性の性格と特徴</li>`).join("")}</ul>
    <p class="note">※八百万診断は、五行思想や十干をもとにした娯楽のためのオリジナル診断です。</p>`;
}

function sukuyoArticle() {
  return `
    <p>相性診断に出てくる「安壊」や「栄親」。聞き慣れない名前を見て、どんな関係なのか気になった方へ。宿曜では、生まれた日から決まる本命宿を使って、ふたりの関係を読みます。このページでは八百万診断の表示に沿って、結果を楽しむための基本を紹介します。</p>
    <h2>本命宿とは？ 正体とは別のあなたの一面</h2>
    <p>八百万診断の宿曜は、日本時間の旧暦の生年月日から27種類の「本命宿」を求めます。生まれた月と日の組み合わせで決まるため、日干から選ぶ「本当の正体」とは別の結果になります。</p>
    <p>本命宿の名前と短い説明は、正体診断の「占いのくわしい結果」で読めます。相性診断では、ふたりの本命宿の並びの距離から「三九の秘法」による関係を表示します。</p>
    <h2>宿曜の相性は6種類</h2>
    <p>次の読み方や行動例は、結果を日常に取り入れるための当サイトの提案です。関係の名前で、ふたりの将来が決まるわけではありません。</p>
    <h3>命（めい）</h3><p>同じ本命宿。似た感覚に安心しやすい関係とされます。</p><p><b>試してみたいこと：</b>「同じはず」と思い込まず、相手の希望も聞く。</p>
    <h3>業胎（ぎょうたい）</h3><p>伝統的には深い縁が語られる関係。互いに影響を受けやすいとされます。</p><p><b>試してみたいこと：</b>親しくても、それぞれの時間や目標を持つ。</p>
    <h3>栄親（えいしん）</h3><p>支え合い、安心感を育てやすい関係とされます。</p><p><b>試してみたいこと：</b>してもらったことへの感謝を言葉にする。</p>
    <h3>友衰（ゆうすい）</h3><p>気楽に話しやすく、友達のような親しさがあるとされます。</p><p><b>試してみたいこと：</b>楽しむ時間と、約束を守る場面の区切りをつくる。</p>
    <h3>安壊（あんかい）</h3><p>惹かれ合う力と、ぶつかったときの揺れが語られる関係です。</p><p><b>試してみたいこと：</b>熱くなったら時間を置き、無理のない距離を相談する。</p>
    <h3>危成（きせい）</h3><p>価値観やペースの違いが学びにつながるとされます。</p><p><b>試してみたいこと：</b>連絡の頻度や役割分担など、違いを具体的に確かめる。</p>
    <h2>五行の相性と違う結果が出たら？</h2>
    <p>八百万診断の相性％は、日干と五行の関係から出すオリジナルの目安です。宿曜の関係はこの点数に加えていません。たとえば、五行では支え合う「相生」、宿曜では刺激のある「安壊」という組み合わせもあります。</p>
    <p>この場合は「支え合える面がありつつ、距離感には工夫がいるかもしれない」と、ふたつの視点を並べて読めます。どちらかを正解にしたり、点数を足し合わせたりする必要はありません。</p>
    <h2>恋人・友達・同僚との関係に使うなら</h2>
    <ol><li>ふたりの関係の説明を読み、思い当たる場面をひとつ挙げる。</li><li>相手にも同じように感じているか聞く。</li><li>連絡や相談の仕方を、ひとつだけ変えてみる。</li></ol>
    <p>たとえば、予定の変更でぶつかりやすいなら「変更は分かった時点で伝える」と決める。名前の良し悪しを気にするより、会話のきっかけにすると使いやすくなります。</p>
    <h2>結果が別のサイトと違うとき</h2>
    <p>暦や流派の扱いが違うと、本命宿がずれる場合があります。このサイトでは日本時間の旧暦を使い、閏月は同じ番号の月として扱います。紫微斗数は中国標準時の暦を使い、23時台の扱いも異なるため、表示する旧暦の日付が一致しない場合があります。</p>
    <p class="note">宿曜の関係だけで、交際や別れを決める必要はありません。実際の相手の言動や、ふたりが心地よく過ごせるかを大切にしてください。</p>
    <p><a href="compatibility.html">五行の相性の仕組みも読む</a> ／ <a href="how-it-works.html">診断全体の仕組みを読む</a></p>`;
}

function kyuseiArticle() {
  const stars=[['一白水星','水','柔軟さ・聞く力'],['二黒土星','土','積み重ね・支える力'],['三碧木星','木','行動・新しい始まり'],['四緑木星','木','調和・人とのつながり'],['五黄土星','土','意志・中心となる力'],['六白金星','金','責任感・向上心'],['七赤金星','金','交流・楽しむ力'],['八白土星','土','粘り強さ・変化'],['九紫火星','火','感性・表現する力']];
  return `
    <p>診断の属性は「木」なのに、本命星は「一白水星」。そんな結果でも矛盾ではありません。九星気学は、生まれ年や月から性質を読む別の見方です。本命星・月命星・今年の運勢の違いから見てみましょう。</p>
    <h2>本命星と月命星は何が違う？</h2>
    <p><b>本命星</b>は、生まれ年をもとに求める星です。八百万診断では「生まれ持った性質」のヒントとして紹介しています。<b>月命星</b>は、生まれた月の区切りと本命星をもとに求め、内面や子どもの頃の性質を読むヒントとして表示しています。</p>
    <p>本命星が行動的、月命星が慎重という結果なら、「動きたい気持ちと、準備したい気持ちの両方がある」と読むこともできます。ひとつの星だけで自分を決めつけず、実際の経験と照らしてみてください。</p>
    <h2>9つの星の見取り図</h2>
    <p>次のキーワードは、八百万診断の説明を短くまとめたものです。「水星」などの名前は九星の名称で、西洋占星術の惑星の水星とは別です。</p>
    <table class="a-table kv"><thead><tr><th>星</th><th>五行</th><th>性質を読むキーワード</th></tr></thead><tbody>${stars.map(([name,el,key])=>`<tr><td>${name}</td><td>${el}</td><td>${key}</td></tr>`).join('')}</tbody></table>
    <h2>年は1月1日、月は1日で切り替わらない</h2>
    <p>このサイトの九星気学は、年を立春、月を節入りで区切ります。1月生まれや立春より前の生まれは、前年の九星の年に入ります。また、節入りより前の日は、カレンダーの月とは違う区切りになることがあります。</p>
    <p>立春は2月4日ごろですが、日付と時刻は年によって変わります。毎年同じ日だと考えず、結果に表示された年の区切りを確認してください。二十四節気は太陽の位置で決まる季節の目印です。<a href="https://eco.mtk.nao.ac.jp/koyomi/faq/24sekki.html" target="_blank" rel="noopener">国立天文台の二十四節気の説明</a></p>
    <h2>「今年のあなた」は何を表している？</h2>
    <p>生まれたときの本命星は固定ですが、今年の年盤でその星が回る位置は年ごとに変わります。八百万診断は、その位置の「宮」とテーマを表示しています。今年の区切りも立春です。</p>
    <p>たとえば「休息と準備の年」なら、何もできない年という意味で受け取らず、後回しにしていた勉強や生活の整理に目を向けるきっかけに。「スタートと発展の年」なら、小さく試すことをひとつ選ぶ。表示のテーマを、自分の行動へ置き換えてみましょう。</p>
    <h2>日干の属性や、相性のいい星との関係</h2>
    <p>診断の最初に出る属性は生まれた日の日干、九星の五行は主に生まれ年から見ています。違う五行が出ても、計算の土台が違うためです。九星は「本当の正体」の判定にも、相性診断の％にも加えていません。</p>
    <p>九星の「相性のいい星」は、本命星の五行が同じ、または育て合う関係にある星を紹介する目安です。相手の性格や、関係のすべてを表すものではありません。</p>
    <h2>日常に取り入れる3つの問い</h2>
    <ul><li>本命星の説明で、自分らしいと感じるところは？</li><li>月命星の説明で、人に見せていない一面は？</li><li>今年のテーマを参考に、今週ひとつ整えるなら何？</li></ul>
    <p class="note">このサイトでは年のテーマを紹介しており、個別の引っ越し日や旅行先の吉方位を判定する機能はありません。</p>
    <p><a href="how-it-works.html">正体の判定と各占いの違いを読む</a></p>`;
}

function ekiArticle() {
  return `
    <p>「今日の易」で出た難しい名前と、6本の線。全部を覚える必要はありません。まず全体の文章を読み、金色の線に添えられたひとことを見て、今日できる小さな行動を考えてみましょう。</p>
    <h2>卦（け）とは？ 6本の線の組み合わせ</h2>
    <p>易の図は、つながった陽の線と、途中が切れた陰の線を6本重ねたものです。6本の線の組み合わせは64通りあり、それぞれを「卦」と呼びます。3本ずつに分けた上下の組み合わせも、結果に表示しています。</p>
    <p>結果の卦の名前とキーワードは、全体の場面をつかむ手がかりです。このサイトの文章は、今日を振り返りやすい言葉にしたオリジナルの解説です。</p>
    <h2>金色の線は変爻（へんこう）</h2>
    <p>1本1本の線を「爻（こう）」と呼びます。「今日の易」では6本のうち1本を、動く線である変爻として選び、金色で表示します。爻は下から数え、いちばん下が初爻、いちばん上が上爻です。</p>
    <p>卦の文章が全体のテーマなら、変爻のひとことは、その中で今日はどこに目を向けるかを考えるヒントです。八百万診断では卦と1本の変爻を表示し、線を反転した後の別の卦（之卦）の解説は表示していません。</p>
    <h2>八百万診断では、どうやって引く？</h2>
    <p>ボタンを押したときに、64卦と6本の変爻からランダムに選びます。組み合わせは384通りです。生年月日で決まる本当の正体や、日付から出す今日の運勢とは別の仕組みです。</p>
    <p>結果は、同じ端末・ブラウザに今日の分として保存します。通常は同じ日に開き直しても同じ結果で、日付が変わるとまた引けます。別の端末やブラウザを使う、保存データを消すなどの場合は、同じ結果を引き継げません。ブラウザが保存を制限している場合も、保持できないことがあります。</p>
    <h2>引く前に、問いをひとつ決める</h2>
    <p>問いは入力する必要はありません。頭の中やメモで、今日考えたいことをひとつ決めてから引くと、文章を自分の状況に重ねやすくなります。</p>
    <ul><li>「今日の作業を進めるために、何を整えよう？」</li><li>「相手と話すとき、どんな姿勢を大切にしよう？」</li><li>「焦っている今、いったん見直せることは？」</li></ul>
    <h2>読み解きの例：水沢節が出たら</h2>
    <p>水沢節（すいたくせつ）のキーワードは「節度」。全体の文章は、時間や言葉などにほどよい区切りをつける場面として読めます。今日は「無理なく節度を守れて吉」という爻のひとことが出たとします。</p>
    <p>作業の問いなら「25分取り組んで、いったん休む」、会話の問いなら「今日は伝えたいことをひとつに絞る」と、無理のない行動に置き換えられます。これは当サイトの読み方の例で、唯一の正解ではありません。</p>
    <h2>厳しい言葉が出た日も、小さく読む</h2>
    <p>「待つ」「注意」といった言葉を、悪いことが必ず起きる知らせとして受け取る必要はありません。「返事を急がない」「予定をもう一度確かめる」など、自分でできる工夫を探してみてください。</p>
    <p>夜に「問い・出たキーワード・試した行動・気づいたこと」を短く残すと、占いの文章をどう受け取ったか振り返れます。結果を評価するより、自分の選択を見つめる使い方です。</p>
    <p><a href="how-it-works.html">正体・今日の運勢・易の違いを読む</a></p>`;
}

function indexPage() {
  return `
    <p>八百万診断の「読みもの」では、診断の背景にある五行思想、宿曜・九星気学・易の結果の読み方、神話の神々・妖怪・神社・パワーストーンについて詳しく紹介しています。</p>
    <div class="a-list">${ARTICLES.map((a) => `
      <a class="a-card" href="${a.file}"><b>${a.short}</b><span>${a.desc}</span></a>`).join("")}</div>`;
}

// ---- 書き出し ----
fs.mkdirSync(OUT, { recursive: true });
const bodies = {
  "sukuyo.html": [sukuyoArticle(), false],
  "kyusei.html": [kyuseiArticle(), false],
  "eki.html": [ekiArticle(), false],
  "places.html": [placesArticle(), true],
  "true-identities.html": [trueIdentitiesArticle(), false],
  "compatibility.html": [compatibilityArticle(), false],
  "birthstones.html": [birthstonesArticle(), true],
  "power-stones.html": [powerStonesArticle(), true],
  "shrines.html": [shrinesArticle(), true],
  "gods.html": [zukan(["india", "japan", "greece", "norse"], "八百万診断に登場するインド神話・日本神話・ギリシャ神話・北欧神話の神々を、五行の属性別に紹介します。診断で出た神のことをもっと知りたいときや、ほかの属性の神々をのぞいてみたいときにどうぞ。"), false],
  "yokai.html": [zukan(["yokai", "kaii", "legend"], "八百万診断に登場する妖怪・怪異・都市伝説を、五行の属性別に紹介します。江戸時代の絵師・鳥山石燕の妖怪画など、昔の絵とあわせてお楽しみください。"), false],
  "cthulhu.html": [zukan(["cthulhu"], "クトゥルフ神話は、アメリカの作家H・P・ラヴクラフト（1890〜1937年）と仲間の作家たちの小説から生まれた、架空の神話です。八百万診断の「ルルイエなら…」の結果に登場する神々や生き物を、五行の属性別に紹介します。紹介しているのは、著作権の切れた原作の小説に登場する存在です。"), false],
  "power-spots.html": [powerSpotsArticle(), true],
  "americas.html": [originArticle("八百万診断の「本当の正体」には、中南米の神話の神々も登場します。メキシコ中央部で栄えたアステカと、南米アンデスに大帝国を築いたインカ。どちらも太陽や雨、大地、海といった自然の恵みと深く結びついた神々を信仰していました。", [
    { title: "🌞 アステカ神話の神々", filter: (t) => t.origin.includes("アステカ"), lead: "アステカ（メシカ）は、14〜16世紀にメキシコ中央部で栄えた人々です。湖の上の都テノチティトランを中心に、太陽・雨・トウモロコシ・水などを司る多くの神々を祀りました。神々どうしがライバルになったり、力を合わせて世界をつくり直したりする、ダイナミックな神話が伝わっています。" },
    { title: "🏔️ インカ・アンデスの神々", filter: (t) => t.origin.includes("インカ"), lead: "インカは、15〜16世紀に南米アンデスの山々に大帝国を築きました。皇帝は太陽神インティの子とされ、首都クスコの太陽の神殿は黄金でおおわれていたと伝わります。母なる大地パチャママへの感謝は、今もアンデスの暮らしの中に息づいています。" },
  ]), false],
  "goetia.html": [originArticle("「ソロモン72柱」は、17世紀ごろにまとめられた魔術書『レメゲトン』の第1部『ゴエティア』に記された、72の悪魔のことです。古代イスラエルのソロモン王が、指輪の力で72の悪魔を従え、真鍮の器に封じたという伝説にもとづきます。悪魔たちはそれぞれ王・公爵・侯爵などの爵位と軍団を持ち、学問や芸術、宝探しなど、得意な知識を授けるとされました。", [
    { title: "📜 八百万診断に登場するソロモン72柱", filter: (t) => t.origin === "ソロモン72柱", lead: "八百万診断では、72柱のうち、姿や得意なことがそれぞれ異なる8柱を「本当の正体」に選びました。こわい存在というより、強い個性と才能をもつ存在として読み解いています。" },
  ], '<p class="note">※ソロモン72柱は、魔術書に書かれた伝承です。八百万診断では、物語の登場人物のように性格のたとえとして紹介しています。</p>'), false],
  "uma.html": [originArticle("UMA（ユーマ）は「未確認動物」を意味する、日本で生まれた言葉です。目撃談は多いのに、正体がはっきりしない生き物たち。八百万診断の「本当の正体」には、そんなUMAや、写真が世界を騒がせた妖精、錬金術の人造生命など、オカルトの世界の存在も登場します。", [
    { title: "🛸 UMA・オカルトの正体", filter: (t) => UMA_NAMES.includes(t.name), lead: "世界各地で語られてきた、なぞに満ちた存在たちです。見た目のインパクトだけでなく、伝わる話から性格を読み解いています。" },
  ], '<p>ツチノコ、ビッグフット、ネッシーなどのUMAは、「別の世界の姿」の都市伝説として登場します。<a href="yokai.html">妖怪・怪異・都市伝説図鑑</a>もどうぞ。</p>'), false],
  "how-it-works.html": [howItWorksArticle(), false],
};
ORDER.forEach((el) => (bodies[`element-${el}.html`] = [elementArticle(el), true]));
for (const a of ARTICLES) {
  const [body, hasAd] = bodies[a.file];
  fs.writeFileSync(path.join(OUT, a.file), page({ ...a, body, hasAd }));
}
fs.writeFileSync(path.join(OUT, "index.html"), page({
  file: "index.html", title: "読みもの｜五行・宿曜・九星・易と神話の解説",
  desc: "八百万診断の無料の読みもの。五行・宿曜の相性、九星気学・易の読み方、神話や妖怪の図鑑、神社と石を紹介します。",
  body: indexPage(), hasAd: false,
}));

// ---- 正体ごとのシェア用ページ（t/番号.html）----
// Xなどでシェアしたとき、リンクのカードにその正体の画像（img/ogp/t番号.jpg）と名前が出るようにする。
// 番号は TRUE_IDENTITIES の並び順（1〜100）。並びを変えるとURLが変わるので、正体は末尾に足すこと。
// カード画像は tools/make-ogp-images.ps1 で作る（材料は tools/ogp-manifest.json に書き出す）
const T_DIR = path.join(ROOT, "t");
fs.mkdirSync(T_DIR, { recursive: true });
const manifest = [];
TRUE_IDENTITIES.forEach((t, i) => {
  const n = i + 1, el = ORDER[Math.floor(t.stem / 2)], img = IMAGES[t.name];
  const url = `${SITE}t/${n}.html`, ogImage = `${SITE}img/ogp/t${n}.jpg`;
  const title = `本当の正体は「${t.name}」｜${t.catch}`;
  const desc = `${t.origin}の${t.type}「${t.name}」。${t.essence}`.slice(0, 120);
  const nameHtml = t.kana ? `<ruby>${t.name}<rt>${t.kana}</rt></ruby>` : t.name;
  manifest.push({ n, name: t.name, kana: t.kana || "", catch: t.catch, origin: `${t.origin}・${t.type}`,
    color: ELEMENTS[el].color, img: img ? img.src : "", credit: img ? img.credit : "" });
  fs.writeFileSync(path.join(T_DIR, `${n}.html`), `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}｜八百万診断</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="${url}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="あなたの正体は、何者か。神か、怪異か、それとも…。生年月日で無料診断。">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="八百万診断">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${ogImage}">
  <link rel="stylesheet" href="../css/style.css?v=${VERSION}">
</head>
<body>
  <header class="site-header">
    <a href="../" class="logo">⛩️ 八百万診断</a>
    <nav class="site-nav"><a href="../">正体診断</a><a href="../#compat">相性診断</a><a href="../articles/">読みもの</a></nav>
  </header>
  <main class="container">
    <article class="card article share-page" style="--el:${ELEMENTS[el].color}">
      <p class="share-lead">シェアされた「本当の正体」</p>
      ${figure(t.name)}
      <p class="ti-origin">${t.origin}・${t.type}</p>
      <h1 class="ti-name">${nameHtml}</h1>
      <p class="ti-catch">「${t.catch}」</p>
      <a class="cta-btn" href="../">⛩️ あなたの正体も診断する（無料）</a>
      <h2>本質</h2><p>${t.essence}</p>
      <dl class="ti-dl">
        <dt>✨ 長所</dt><dd>${t.good}</dd>
        <dt>⚠️ 短所</dt><dd>${t.weak}</dd>
        <dt>💞 恋愛・人間関係</dt><dd>${t.love}</dd>
        <dt>💼 仕事・才能</dt><dd>${t.work}</dd>
      </dl>
      ${placeLine(t.name).replace('href="places.html', 'href="../articles/places.html')}
      <div class="cta">
        <p>生年月日から、四柱推命・西洋占星術・紫微斗数で「100を超える正体」のどれかを診断します。</p>
        <a class="cta-btn" href="../">⛩️ あなたの正体を診断する</a>
        <a class="cta-btn sub" href="../articles/true-identities.html#ti-${n}">🌟 本当の正体図鑑でほかの正体を見る</a>
      </div>
    </article>
  </main>
  <footer class="site-footer">
    <p>当サイトはアフィリエイト広告を利用しています。</p>
    <p><a href="../privacy.html">プライバシーポリシー・免責事項</a></p>
    <p>診断結果は娯楽としてお楽しみください。</p>
    <p>© 2026 八百万診断</p>
  </footer>
  <script src="../js/config.js?v=${VERSION}"></script>
  <script src="../js/analytics.js?v=${VERSION}"></script>
</body>
</html>
`);
});
fs.writeFileSync(path.join(ROOT, "tools", "ogp-manifest.json"), JSON.stringify(manifest, null, 1));

// ---- 相性のシェア用ページ（c/l番号.html＝伝説の組み合わせ、c/日干-日干.html＝日干の組み合わせ）----
// 相性診断のXシェアのリンク先。カード画像は img/ogp/cl番号.jpg・img/ogp/c日干-日干.jpg（tools/make-ogp-images.ps1）
// 伝説の番号は LEGEND_PAIRS の並び順。並べ替えるとURLが変わるので、増やすときは末尾に足すこと。
const C_DIR = path.join(ROOT, "c");
fs.mkdirSync(C_DIR, { recursive: true });
const compatManifest = [];
const STEM_SHORT = ["大樹", "草花", "太陽", "灯火", "山", "田畑", "剣", "宝石", "大海", "雨"];
const stemLabel = (i) => `${STEM_INFO[i][0]}（${STEM_SHORT[i]}）`;
const relOf = (i, j) => {
  const a = Math.floor(i / 2), b = Math.floor(j / 2);
  if (a === b) return "same";
  return (a + 1) % 5 === b || (b + 1) % 5 === a ? "gen" : "ctrl";
};
const REL_NAME = { same: "似た者同士の「比和」", gen: "支え合う「相生」", ctrl: "刺激し合う「相剋」" };
const tIndex = (name) => TRUE_IDENTITIES.findIndex((t) => t.name === name);
const tLink = (name) => `<a href="../t/${tIndex(name) + 1}.html">${name}</a>`;

function sharePageShell({ file, title, desc, ogImage, ogDesc, body }) {
  const url = `${SITE}c/${file}`;
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}｜八百万診断</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="${url}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${ogDesc}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="八百万診断">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${ogImage}">
  <link rel="stylesheet" href="../css/style.css?v=${VERSION}">
</head>
<body>
  <header class="site-header">
    <a href="../" class="logo">⛩️ 八百万診断</a>
    <nav class="site-nav"><a href="../">正体診断</a><a href="../#compat">相性診断</a><a href="../articles/">読みもの</a></nav>
  </header>
  <main class="container">
    <article class="card article share-page">
${body}
      <div class="cta">
        <p>ふたりの生年月日から、五行・宿曜・本当の正体の組み合わせで相性を診断します。</p>
        <a class="cta-btn sub" href="../#compat">💞 あなたも相性を診断する（無料）</a>
        <a class="cta-btn" href="../">⛩️ 自分の本当の正体を診断する</a>
      </div>
    </article>
  </main>
  <footer class="site-footer">
    <p>当サイトはアフィリエイト広告を利用しています。</p>
    <p><a href="../privacy.html">プライバシーポリシー・免責事項</a></p>
    <p>診断結果は娯楽としてお楽しみください。</p>
    <p>© 2026 八百万診断</p>
  </footer>
  <script src="../js/config.js?v=${VERSION}"></script>
  <script src="../js/analytics.js?v=${VERSION}"></script>
</body>
</html>
`;
}

// 伝説の組み合わせ
LEGEND_PAIRS.forEach((lp, k) => {
  const n = k + 1, A = TRUE_IDENTITIES[tIndex(lp.a)], B = TRUE_IDENTITIES[tIndex(lp.b)];
  const elA = ORDER[Math.floor(A.stem / 2)], elB = ORDER[Math.floor(B.stem / 2)];
  const imgA = IMAGES[A.name], imgB = IMAGES[B.name];
  compatManifest.push({ kind: "legend", file: `cl${n}`, title: lp.title, a: A.name, b: B.name,
    colorA: ELEMENTS[elA].color, colorB: ELEMENTS[elB].color,
    imgA: imgA ? imgA.src : "", imgB: imgB ? imgB.src : "", creditA: imgA ? imgA.credit : "", creditB: imgB ? imgB.credit : "" });
  fs.writeFileSync(path.join(C_DIR, `l${n}.html`), sharePageShell({
    file: `l${n}.html`, title: `伝説の組み合わせ「${A.name}×${B.name}」｜${lp.title}`,
    desc: `${A.name}と${B.name}は、神話・伝承でゆかりのある「伝説の組み合わせ」。${lp.text}`.slice(0, 120),
    ogImage: `${SITE}img/ogp/cl${n}.jpg`, ogDesc: "ふたりの本当の正体は伝説の組み合わせ！あなたたちの相性も無料で診断。",
    body: `      <p class="share-lead">シェアされた「伝説の組み合わせ」</p>
      <div class="pair-ti-row legend-share">
        <div class="pair-ti">${figure(A.name, true)}<p class="pair-ti-name">${tLink(A.name)}</p><p class="pair-ti-catch">${A.catch}</p></div>
        <span class="pair-x">×</span>
        <div class="pair-ti">${figure(B.name, true)}<p class="pair-ti-name">${tLink(B.name)}</p><p class="pair-ti-catch">${B.catch}</p></div>
      </div>
      <div class="legend-pair"><p class="legend-badge">✨ 伝説の組み合わせ</p><h1>${lp.title}</h1><p>${lp.text}</p></div>
      <p class="note">ふたりの正体が${A.name}と${B.name}になったとき、この「伝説の組み合わせ」が現れます。正体は生年月日（と出生時刻）で決まります。</p>`,
  }));
});

// 日干の組み合わせ（55通り）
Object.entries(STEM_PAIRS).forEach(([key, sp]) => {
  const [i, j] = key.split("-").map(Number);
  const rel = relOf(i, j), kango = Math.abs(i - j) === 5, polDiff = i % 2 !== j % 2;
  const aspect = ASPECT_TEXT[rel][polDiff ? "diff" : "same"];
  const text = sp.text.replace(/\{A\}/g, `${stemLabel(i)}の人`).replace(/\{B\}/g, `${stemLabel(j)}の人`);
  const elI = ORDER[Math.floor(i / 2)], elJ = ORDER[Math.floor(j / 2)];
  const examples = (st) => TRUE_IDENTITIES.filter((t) => t.stem === st).slice(0, 5).map((t) => tLink(t.name)).join("・");
  const legends = LEGEND_PAIRS.map((lp, k) => ({ lp, k })).filter(({ lp }) => {
    const sa = TRUE_IDENTITIES[tIndex(lp.a)].stem, sb = TRUE_IDENTITIES[tIndex(lp.b)].stem;
    return (sa === i && sb === j) || (sa === j && sb === i);
  });
  const pairName = i === j ? `${stemLabel(i)}どうし` : `${stemLabel(i)}と${stemLabel(j)}`;
  compatManifest.push({ kind: "stem", file: `c${key}`, title: sp.title, stemA: STEM_INFO[i][0], stemB: STEM_INFO[j][0],
    shortA: STEM_SHORT[i], shortB: STEM_SHORT[j], colorA: ELEMENTS[elI].color, colorB: ELEMENTS[elJ].color,
    rel: REL_NAME[rel] + (kango ? "・干合" : "") });
  fs.writeFileSync(path.join(C_DIR, `${key}.html`), sharePageShell({
    file: `${key}.html`, title: `${pairName}の相性｜${sp.title}`,
    desc: `四柱推命の日干でみる${pairName}の相性。${text}`.slice(0, 120),
    ogImage: `${SITE}img/ogp/c${key}.jpg`, ogDesc: "生年月日でわかる、ふたりの相性。あなたたちも無料で診断。",
    body: `      <p class="share-lead">シェアされた「ふたりの相性」</p>
      <p class="stem-pair-big"><span style="color:${ELEMENTS[elI].color}">${STEM_INFO[i][0]}</span> × <span style="color:${ELEMENTS[elJ].color}">${STEM_INFO[j][0]}</span></p>
      <h1 class="stem-pair-title">「${sp.title}」</h1>
      <p class="compat-rel" style="text-align:center">${REL_NAME[rel]}${kango ? '<span class="kango">💞 干合</span>' : ""}</p>
      <p>${text}</p>
      <dl class="ti-dl">
        <dt>💞 恋愛</dt><dd>${aspect.love}</dd>
        <dt>🤝 友情</dt><dd>${aspect.friend}</dd>
        <dt>💼 仕事</dt><dd>${aspect.work}</dd>
      </dl>
      <h2>この組み合わせの本当の正体の例</h2>
      <p>${stemLabel(i)}の人：${examples(i)} など</p>
      ${i !== j ? `<p>${stemLabel(j)}の人：${examples(j)} など</p>` : ""}
      ${legends.length ? `<p>この組み合わせで現れる伝説の組み合わせ：${legends.map(({ lp, k }) => `<a href="l${k + 1}.html">${lp.a}×${lp.b}</a>`).join("、")}</p>` : ""}
      <p class="note">日干（にっかん）は、生まれた日の十干です。四柱推命では、日干がその人自身をあらわすとされます。<a href="../articles/how-it-works.html">日干とは？</a></p>`,
  }));
});
fs.writeFileSync(path.join(ROOT, "tools", "ogp-compat-manifest.json"), JSON.stringify(compatManifest, null, 1));

// サイトマップ
const today = new Date().toISOString().slice(0, 10);
const urls = ["", "privacy.html", "articles/", ...ARTICLES.map((a) => "articles/" + a.file), ...TRUE_IDENTITIES.map((_, i) => `t/${i + 1}.html`), ...LEGEND_PAIRS.map((_, k) => `c/l${k + 1}.html`), ...Object.keys(STEM_PAIRS).map((key) => `c/${key}.html`)];
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}
</urlset>
`);
console.log(`articles: ${ARTICLES.length + 1} pages, sitemap: ${urls.length} urls`);
