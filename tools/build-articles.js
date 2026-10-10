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
const src = ["js/config.js", "js/fortune-data.js", "js/images.js"]
  .map((f) => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
const D = new Function(src + "; return { SITE_CONFIG, ELEMENTS, CATEGORIES, RESULTS, BIRTHSTONES, POWER_STONES, IMAGES };")();
const { SITE_CONFIG, ELEMENTS, CATEGORIES, RESULTS, BIRTHSTONES, POWER_STONES, IMAGES } = D;
const ORDER = ["wood", "fire", "earth", "metal", "water"];
const VERSION = (fs.readFileSync(path.join(ROOT, "index.html"), "utf8").match(/style\.css\?v=(\d+)/) || [])[1] || "1";

// ---- リンク作成 ----
const rid = SITE_CONFIG.rakutenAffiliateId, tag = SITE_CONFIG.amazonTag;
const vcSid = SITE_CONFIG.valueCommerceSid, vcPid = SITE_CONFIG.valueCommercePid;
const rakuten = (url) => (rid ? `https://hb.afl.rakuten.co.jp/hgc/${rid}/?pc=${encodeURIComponent(url)}` : url);
const relFor = (isAd) => (isAd ? "sponsored noopener" : "noopener");
const wikiUrl = (t) => `https://ja.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, "_"))}`;
const mapUrl = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

function priceButtons(keyword) {
  const q = encodeURIComponent(keyword);
  return `<div class="price-btns">
      <a class="aff-btn rakuten" href="${rakuten(`https://search.rakuten.co.jp/search/mall/${q}/`)}" target="_blank" rel="${relFor(rid)}">楽天で現在の価格を見る</a>
      <a class="aff-btn amazon" href="https://www.amazon.co.jp/s?k=${q}${tag ? "&tag=" + encodeURIComponent(tag) : ""}" target="_blank" rel="${relFor(tag)}">Amazonで現在の価格を見る</a>
    </div>`;
}

function travelButtons(s) {
  const rUrl = `https://kw.travel.rakuten.co.jp/keyword/Search.do?charset=utf-8&f_query=${encodeURIComponent(s.stay)}`;
  const jUrl = `https://www.jalan.net/uw/uwp2011/uww2011init.do?keyword=${s.jalan}`;
  const jHref = vcSid && vcPid ? `https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=${vcSid}&pid=${vcPid}&vc_url=${encodeURIComponent(jUrl)}` : jUrl;
  return `<p class="travel-title">🏨 ${s.stay}周辺の宿を探す</p>
    <div class="aff-btns">
      <a class="aff-btn rakuten" href="${rakuten(rUrl)}" target="_blank" rel="${relFor(rid)}">楽天トラベル</a>
      <a class="aff-btn jalan" href="${jHref}" target="_blank" rel="${relFor(vcSid && vcPid)}">じゃらん</a>
    </div>`;
}

function figure(name, small) {
  const img = IMAGES[name];
  if (!img) return "";
  return `<figure class="a-fig${small ? " small" : ""}"><img src="${img.src}" alt="${name}" loading="lazy" referrerpolicy="no-referrer">
      <figcaption><a href="${img.page}" target="_blank" rel="noopener">画像: ${img.credit}</a></figcaption></figure>`;
}

const label = (el, yang) => `${yang ? "陽" : "陰"}の${ELEMENTS[el].name}`;

// ---- 記事の一覧（タイトル・説明） ----
const ARTICLES = [
  ...ORDER.map((el) => ({
    file: `element-${el}.html`,
    title: `「${ELEMENTS[el].name}」属性の性格と特徴｜正体・相性・開運スポット`,
    short: `${ELEMENTS[el].icon} 「${ELEMENTS[el].name}」属性の性格と特徴`,
    desc: `五行の「${ELEMENTS[el].name}」属性の人の性格、陽と陰の違い、神話の神や妖怪としての正体、相性のいい属性、おすすめの神社とパワーストーンを解説します。`,
  })),
  { file: "compatibility.html", title: "五行でわかる相性の仕組み｜相生・相剋・比和と10タイプの相性表", short: "💞 五行でわかる相性の仕組み",
    desc: "相生・相剋・比和とは？五行（木・火・土・金・水）の関係から相性を読み解く方法と、10タイプの相性早見表を紹介します。" },
  { file: "birthstones.html", title: "誕生石一覧（1月〜12月）｜それぞれの石の意味と選び方", short: "💎 誕生石一覧（1月〜12月）",
    desc: "1月のガーネットから12月のターコイズまで、日本で親しまれている誕生石と、それぞれの石に伝わる意味を一覧で紹介します。" },
  { file: "power-stones.html", title: "属性別・守護パワーストーンの選び方｜10タイプのおすすめ天然石", short: "🔮 守護パワーストーンの選び方",
    desc: "五行と陰陽の10タイプ別に、相性のいい守護パワーストーンを紹介。石の意味と、身につけ方のポイントも解説します。" },
  { file: "shrines.html", title: "属性別おすすめ神社ガイド｜全国15社と周辺の観光スポット", short: "⛩️ 属性別おすすめ神社ガイド",
    desc: "木・火・土・金・水の属性ごとに相性のいい全国の神社15社を、ご祭神・ご利益・周辺の観光スポットとあわせて紹介します。" },
  { file: "gods.html", title: "神話の神々図鑑｜インド神話・日本神話・ギリシャ神話の75柱", short: "🕉️ 神話の神々図鑑",
    desc: "ガネーシャ、アマテラス、ゼウスなど、インド神話・日本神話・ギリシャ神話の神々75柱を、五行の属性別にわかりやすく紹介します。" },
  { file: "yokai.html", title: "妖怪・怪異・都市伝説図鑑｜河童から口裂け女まで75種", short: "👻 妖怪・怪異・都市伝説図鑑",
    desc: "河童・天狗などの妖怪、狐火・神隠しなどの怪異、口裂け女・きさらぎ駅などの都市伝説75種を、五行の属性別に紹介します。" },
  { file: "how-it-works.html", title: "八百万診断の仕組み｜日干（にっかん）とは？生年月日から属性を出す方法", short: "📖 八百万診断の仕組みと日干",
    desc: "八百万診断が使っている「日干（にっかん）」とは何か、生年月日から五行の属性と陰陽を求める方法をわかりやすく解説します。" },
];

// ---- ページの共通部分 ----
function page({ file, title, desc, body, hasAd }) {
  const url = SITE + "articles/" + file;
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
  <link rel="stylesheet" href="../css/style.css?v=${VERSION}">
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
      <p class="a-meta">公開日：${PUBLISHED.replace(/-/g, "/")}${hasAd ? "　<span class=\"pr-note\">※この記事にはアフィリエイト広告（PR）が含まれます</span>" : ""}</p>
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
  const toc = ["基本データ", "陽と陰の違い", "神話の神としての正体", "妖怪・怪異・都市伝説としての正体", "相性のいい属性", "おすすめの神社", "守護パワーストーン"];
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

    <h2 id="s3">神話の神としての正体</h2>
    <p>八百万診断では、${E.name}属性の人の「正体」を、${E.name}の気にゆかりのある神々の中から導き出します。あなたはどの神に近いでしょうか。</p>
    ${identityTable(el, ["india", "japan", "greece"])}

    <h2 id="s4">妖怪・怪異・都市伝説としての正体</h2>
    ${identityTable(el, ["yokai", "kaii", "legend"])}

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
          <a href="${wikiUrl(r.wiki)}" target="_blank" rel="noopener">Wikipediaで詳しく ↗</a>
        </div>`).join("")}</div>`).join("");
  }).join("");
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
    <table class="a-table"><thead><tr><th>十干</th><th>五行</th><th>陰陽</th></tr></thead><tbody>${rows}</tbody></table>

    <h2>日干（にっかん）とは</h2>
    <p>生まれた「日」の十干を日干といいます。四柱推命という占いでは、日干がその人自身の本質を表すもっとも大切な要素とされています。たとえば2000年1月1日の日干は「戊（つちのえ）」、その6日後の1月7日は「甲（きのえ）」です。日干は10日ごとに一巡します。</p>

    <h2>八百万診断の流れ</h2>
    <ol>
      <li>生年月日から日干を計算し、<b>五行の属性</b>（木・火・土・金・水）と<b>陰陽</b>を決めます。</li>
      <li>属性ごとに用意した神話の神・妖怪・怪異・都市伝説の候補から、生年月日をもとにあなたの<b>「正体」</b>を選びます。正体は一生変わりません。</li>
      <li>属性にゆかりのある<b>神社</b>と、属性・陰陽に合った<b>守護パワーストーン</b>、生まれ月の<b>誕生石</b>を紹介します。</li>
      <li>今日の運勢だけは、生年月日と今日の日付から計算するので、毎日変わります。</li>
    </ol>

    <h2>属性ごとの解説</h2>
    <ul>${ORDER.map((el) => `<li>${elLink(el)}属性の性格と特徴</li>`).join("")}</ul>
    <p class="note">※八百万診断は、五行思想や十干をもとにした娯楽のためのオリジナル診断です。</p>`;
}

function indexPage() {
  return `
    <p>八百万診断の「読みもの」では、診断の背景にある五行思想や、神話の神々・妖怪・神社・パワーストーンについて詳しく紹介しています。</p>
    <div class="a-list">${ARTICLES.map((a) => `
      <a class="a-card" href="${a.file}"><b>${a.short}</b><span>${a.desc}</span></a>`).join("")}</div>`;
}

// ---- 書き出し ----
fs.mkdirSync(OUT, { recursive: true });
const bodies = {
  "compatibility.html": [compatibilityArticle(), false],
  "birthstones.html": [birthstonesArticle(), true],
  "power-stones.html": [powerStonesArticle(), true],
  "shrines.html": [shrinesArticle(), true],
  "gods.html": [zukan(["india", "japan", "greece"], "八百万診断に登場するインド神話・日本神話・ギリシャ神話の神々を、五行の属性別に紹介します。診断で出た神のことをもっと知りたいときや、ほかの属性の神々をのぞいてみたいときにどうぞ。"), false],
  "yokai.html": [zukan(["yokai", "kaii", "legend"], "八百万診断に登場する妖怪・怪異・都市伝説を、五行の属性別に紹介します。江戸時代の絵師・鳥山石燕の妖怪画など、昔の絵とあわせてお楽しみください。"), false],
  "how-it-works.html": [howItWorksArticle(), false],
};
ORDER.forEach((el) => (bodies[`element-${el}.html`] = [elementArticle(el), true]));
for (const a of ARTICLES) {
  const [body, hasAd] = bodies[a.file];
  fs.writeFileSync(path.join(OUT, a.file), page({ ...a, body, hasAd }));
}
fs.writeFileSync(path.join(OUT, "index.html"), page({
  file: "index.html", title: "読みもの｜五行・神話・妖怪・神社・パワーストーンの解説",
  desc: "八百万診断の読みもの。五行の属性ごとの性格、相性の仕組み、神話の神々や妖怪の図鑑、神社ガイド、誕生石とパワーストーンを紹介します。",
  body: indexPage(), hasAd: false,
}));

// サイトマップ
const today = new Date().toISOString().slice(0, 10);
const urls = ["", "privacy.html", "articles/", ...ARTICLES.map((a) => "articles/" + a.file)];
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}
</urlset>
`);
console.log(`articles: ${ARTICLES.length + 1} pages, sitemap: ${urls.length} urls`);
