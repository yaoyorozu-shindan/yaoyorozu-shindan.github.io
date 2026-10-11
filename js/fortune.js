// 占いロジック本体

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const STEM_ELEMENTS = ["wood", "fire", "earth", "metal", "water"];

// 生まれた日の「日干」を求める（2000年1月1日 = 戊 を基準に、日数の差から計算）
// 甲乙=木 / 丙丁=火 / 戊己=土 / 庚辛=金 / 壬癸=水、偶数番目が陽・奇数番目が陰
function dayStem(birthday) {
  const [y, m, d] = birthday.split("-").map(Number);
  const days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2000, 0, 1)) / 86400000);
  const index = (((4 + days) % 10) + 10) % 10;
  return {
    index,
    kanji: STEMS[index],
    element: STEM_ELEMENTS[Math.floor(index / 2)],
    yang: index % 2 === 0,
  };
}

// 文字列から数値の種(シード)を作る。同じ入力なら必ず同じ結果になる
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// シード付き乱数（mulberry32）
function seededRandom(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 生まれ持った正体（生年月日だけで決まり、一生変わらない）
function diagnose(birthday) {
  const stem = dayStem(birthday);
  const pool = RESULTS[stem.element];
  const pickFor = (key) => pool[key][hashString(birthday + "|" + key) % pool[key].length];

  const identities = {};
  for (const c of CATEGORIES) identities[c.key] = pickFor(c.key);

  return { stem, element: ELEMENTS[stem.element], identities, shrine: pickFor("shrine") };
}

// 今日の運勢（生年月日＋日付で決まり、毎日変わる）
function dailyFortune(birthday, dateStr) {
  const rand = seededRandom(hashString(birthday + "|" + dateStr));
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const score = () => 1 + Math.floor(rand() * 5);

  const scores = { overall: score(), love: score(), money: score(), work: score() };
  const texts = {};
  for (const key in scores) texts[key] = pick(MESSAGES[key][scores[key]]);

  return { scores, texts, luckyColor: pick(LUCKY_COLORS), luckyItem: pick(LUCKY_ITEMS), advice: pick(ADVICE) };
}

// ---- 表示 ----

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function stars(n) {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

// 画像がない項目用のオリジナルイラスト（カテゴリごとのモチーフ＋属性カラー）
const MOTIFS = {
  // 蓮の花と光輪
  india: `<circle cx="100" cy="62" r="34" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>
    <circle cx="100" cy="62" r="22" fill="#fff" fill-opacity=".25"/>
    <path d="M100 112c-10-14-10-30 0-44 10 14 10 30 0 44zM100 112c-20-4-30-18-30-34 16 4 26 18 30 34zM100 112c20-4 30-18 30-34-16 4-26 18-30 34zM100 112c-28 2-44-8-50-22 20-2 38 8 50 22zM100 112c28 2 44-8 50-22-20-2-38 8-50 22z" fill="#fff"/>`,
  // 日輪と山
  japan: `<circle cx="100" cy="60" r="26" fill="#fff"/>
    <g stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-opacity=".6">
      <path d="M100 20v-8M100 108v8M60 60h-8M140 60h8M72 32l-6-6M128 32l6-6M72 88l-6 6M128 88l6 6"/></g>
    <path d="M20 128l50-44 26 22 22-16 62 38z" fill="#fff" fill-opacity=".85"/>`,
  // 神殿
  greece: `<path d="M50 50l50-26 50 26z" fill="#fff"/>
    <rect x="48" y="52" width="104" height="8" fill="#fff"/>
    <g fill="#fff"><rect x="56" y="64" width="10" height="46"/><rect x="78" y="64" width="10" height="46"/><rect x="112" y="64" width="10" height="46"/><rect x="134" y="64" width="10" height="46"/></g>
    <rect x="44" y="112" width="112" height="10" fill="#fff"/>`,
  // 光輪と星（本当の正体）
  true: `<circle cx="100" cy="70" r="46" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="3"/>
    <circle cx="100" cy="70" r="58" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="2"/>
    <path d="M100 30l10 28h30l-24 18 9 29-25-18-25 18 9-29-24-18h30z" fill="#fff"/>`,
  // 雷神の槌と稲妻
  norse: `<g fill="#fff"><rect x="62" y="30" width="76" height="34" rx="6"/><rect x="93" y="62" width="14" height="56" rx="4"/>
      <rect x="88" y="114" width="24" height="10" rx="3"/></g>
    <path d="M34 34l14 22h-9l12 24-24-28h10z M166 34l-14 22h9l-12 24 24-28h-10z" fill="#fff" fill-opacity=".6"/>`,
  // 闇に光る目
  yokai: `<path d="M50 120c0-50 22-84 50-84s50 34 50 84l-12-10-12 10-13-10-13 10-13-10-12 10-13-10z" fill="#fff" fill-opacity=".9"/>
    <ellipse cx="86" cy="72" rx="8" ry="11" fill="#2b2540"/><ellipse cx="114" cy="72" rx="8" ry="11" fill="#2b2540"/>
    <circle cx="88" cy="68" r="3" fill="#fff"/><circle cx="116" cy="68" r="3" fill="#fff"/>`,
  // 人魂（鬼火）
  kaii: `<g fill="#fff"><path d="M70 104a18 18 0 1 1 30-14c-6-8-2-24 10-34-2 14 6 22 6 36a18 18 0 0 1-46 12z" fill-opacity=".95"/>
    <path d="M124 70a10 10 0 1 1 18-8c-4-4-2-14 6-20-2 8 4 12 4 20a10 10 0 0 1-28 8z" fill-opacity=".6"/>
    <path d="M44 56a8 8 0 1 1 14-6c-3-3-1-10 4-15-1 6 3 9 3 15a8 8 0 0 1-21 6z" fill-opacity=".45"/></g>`,
  // 月と「？」
  legend: `<path d="M140 30a34 34 0 1 0 24 52 27 27 0 1 1-24-52z" fill="#fff" fill-opacity=".85"/>
    <text x="72" y="108" font-size="80" font-weight="700" fill="#fff" text-anchor="middle" font-family="Georgia, serif">?</text>
    <g fill="#fff"><circle cx="40" cy="30" r="2"/><circle cx="168" cy="110" r="2"/><circle cx="56" cy="118" r="1.5"/></g>`,
  // 鳥居
  shrine: `<g fill="#fff"><path d="M36 40q64 -14 128 0v10q-64 -12 -128 0z"/><rect x="48" y="58" width="104" height="8"/>
    <rect x="62" y="48" width="10" height="76"/><rect x="128" y="48" width="10" height="76"/><rect x="96" y="58" width="8" height="10"/></g>`,
};

function illustration(category, color, elementName) {
  const id = "g" + category + Math.random().toString(36).slice(2, 7);
  return `<svg class="art-svg" viewBox="0 0 200 140" role="img" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#1e1a33"/></linearGradient></defs>
    <rect width="200" height="140" fill="url(#${id})"/>
    <text x="186" y="132" font-size="44" fill="#fff" fill-opacity=".12" text-anchor="end" font-family="serif">${elementName}</text>
    ${MOTIFS[category]}
  </svg>`;
}

// 画像があれば実物の絵（＋クレジット）、なければオリジナルイラスト
function artFor(name, category, element) {
  const fallback = illustration(category, element.color, element.name);
  const img = typeof IMAGES !== "undefined" && IMAGES[name];
  if (!img) return `<figure class="art">${fallback}</figure>`;
  return `<figure class="art">
    <img src="${img.src}" alt="${escapeHtml(name)}" loading="lazy" referrerpolicy="no-referrer"
      onerror="this.parentNode.innerHTML=this.nextElementSibling.innerHTML">
    <template>${fallback}</template>
    <figcaption><a href="${img.page}" target="_blank" rel="noopener">画像: ${escapeHtml(img.credit)}</a></figcaption>
  </figure>`;
}

function affiliateLinks(keyword, label) {
  const q = encodeURIComponent(keyword);
  const links = [];
  if (SITE_CONFIG.amazonTag) {
    links.push(`<a class="aff-btn amazon" href="https://www.amazon.co.jp/s?k=${q}&tag=${encodeURIComponent(SITE_CONFIG.amazonTag)}" target="_blank" rel="sponsored noopener">Amazonで${label}</a>`);
  }
  if (SITE_CONFIG.rakutenAffiliateId) {
    const target = encodeURIComponent(`https://search.rakuten.co.jp/search/mall/${q}/`);
    links.push(`<a class="aff-btn rakuten" href="https://hb.afl.rakuten.co.jp/hgc/${SITE_CONFIG.rakutenAffiliateId}/?pc=${target}" target="_blank" rel="sponsored noopener">楽天で${label}</a>`);
  }
  if (!links.length) return "";
  return `<div class="aff"><span class="pr">PR</span><div class="aff-btns">${links.join("")}</div></div>`;
}

// 神社近くの宿を探すリンク。IDが未設定でも通常リンクとして表示し、設定済みならアフィリエイトリンクになる
function travelLinks(shrine) {
  const rakutenUrl = `https://kw.travel.rakuten.co.jp/keyword/Search.do?charset=utf-8&f_query=${encodeURIComponent(shrine.stay)}`;
  const jalanUrl = `https://www.jalan.net/uw/uwp2011/uww2011init.do?keyword=${shrine.jalan || sjisPercent(shrine.stay)}`;
  const { rakutenAffiliateId: rid, valueCommerceSid: sid, valueCommercePid: pid } = SITE_CONFIG;
  const rakutenHref = rid ? `https://hb.afl.rakuten.co.jp/hgc/${rid}/?pc=${encodeURIComponent(rakutenUrl)}` : rakutenUrl;
  const jalanHref = sid && pid
    ? `https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=${sid}&pid=${pid}&vc_url=${encodeURIComponent(jalanUrl)}`
    : jalanUrl;
  const isAd = rid || (sid && pid);
  return `<div class="travel${isAd ? " aff" : ""}">
    ${isAd ? '<span class="pr">PR</span>' : ""}
    <p class="travel-title">🏨 ${shrine.stay}周辺の宿を探す</p>
    <div class="aff-btns">
      <a class="aff-btn rakuten" href="${rakutenHref}" target="_blank" rel="${rid ? "sponsored " : ""}noopener">楽天トラベル</a>
      <a class="aff-btn jalan" href="${jalanHref}" target="_blank" rel="${sid && pid ? "sponsored " : ""}noopener">じゃらん</a>
    </div>
  </div>`;
}

// 海外のゆかりの地：ガイドブック（楽天ブックス）と楽天トラベルの海外旅行ページ
function overseasLinks(guide) {
  const rid = SITE_CONFIG.rakutenAffiliateId;
  const aff = (url) => (rid ? `https://hb.afl.rakuten.co.jp/hgc/${rid}/?pc=${encodeURIComponent(url)}` : url);
  const rel = rid ? "sponsored noopener" : "noopener";
  const bookUrl = `https://books.rakuten.co.jp/search?sitem=${encodeURIComponent("地球の歩き方 " + guide)}&g=001`;
  return `<div class="travel${rid ? " aff" : ""}">
    ${rid ? '<span class="pr">PR</span>' : ""}
    <p class="travel-title">✈️ ${guide}への旅を準備する</p>
    <div class="aff-btns">
      <a class="aff-btn rakuten" href="${aff(bookUrl)}" target="_blank" rel="${rel}">ガイドブック</a>
      <a class="aff-btn rakuten" href="${aff("https://travel.rakuten.co.jp/kaigai/")}" target="_blank" rel="${rel}">楽天トラベル 海外</a>
    </div>
  </div>`;
}

// キャラのゆかりの地（js/places.js）。場所がないキャラは何も出さない
function placeBlock(name) {
  const p = typeof PLACES !== "undefined" && PLACES[name];
  if (!p) return "";
  const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.place + " " + p.area)}`;
  return `<details class="place">
    <summary>📍 ゆかりの地：${p.place}</summary>
    <p class="place-area">${p.area}　<a href="${map}" target="_blank" rel="noopener">地図で見る</a></p>
    <p class="place-note">${p.note}</p>
    ${p.stay ? travelLinks({ stay: p.stay }) : overseasLinks(p.guide)}
  </details>`;
}

// 「現在の価格を見る」リンク。IDが未設定なら通常リンク、設定済みならアフィリエイトリンクになる
function priceLinks(keyword) {
  const q = encodeURIComponent(keyword);
  const { rakutenAffiliateId: rid, amazonTag: tag } = SITE_CONFIG;
  const rakutenUrl = `https://search.rakuten.co.jp/search/mall/${q}/`;
  const rakutenHref = rid ? `https://hb.afl.rakuten.co.jp/hgc/${rid}/?pc=${encodeURIComponent(rakutenUrl)}` : rakutenUrl;
  const amazonHref = `https://www.amazon.co.jp/s?k=${q}${tag ? "&tag=" + encodeURIComponent(tag) : ""}`;
  return `<div class="price-btns">
    <a class="aff-btn rakuten" href="${rakutenHref}" target="_blank" rel="${rid ? "sponsored " : ""}noopener">楽天で現在の価格を見る</a>
    <a class="aff-btn amazon" href="${amazonHref}" target="_blank" rel="${tag ? "sponsored " : ""}noopener">Amazonで現在の価格を見る</a>
  </div>`;
}

// 宝石のイラスト（石の色で塗る）
function gemSvg(color) {
  return `<svg class="gem-svg" viewBox="0 0 100 80" aria-hidden="true">
    <polygon points="20,8 80,8 96,28 50,76 4,28" fill="${color}"/>
    <polygon points="20,8 80,8 96,28 4,28" fill="#fff" fill-opacity=".35"/>
    <polygon points="34,8 66,8 72,28 28,28" fill="#fff" fill-opacity=".35"/>
    <polygon points="28,28 72,28 50,76" fill="#000" fill-opacity=".08"/>
    <polyline points="4,28 50,76 96,28" fill="none" stroke="#000" stroke-opacity=".15"/>
  </svg>`;
}

function stoneItem(label, stone) {
  return `<div class="stone-item">
    <div class="stone-head">${gemSvg(stone.color)}<div><p class="id-label">${label}</p><h4>${stone.name}</h4></div></div>
    <p class="stone-meaning">${stone.meaning}</p>
    ${priceLinks(stone.keyword)}
  </div>`;
}

function stoneCard(birthday, stem) {
  const month = Number(birthday.split("-")[1]);
  const power = POWER_STONES[stem.element][stem.yang ? "yang" : "yin"];
  const births = BIRTHSTONES[month].map((b) => stoneItem(`${month}月の誕生石`, b)).join("");
  const isAd = SITE_CONFIG.rakutenAffiliateId || SITE_CONFIG.amazonTag;
  return `<div class="card stones-card${isAd ? " has-pr" : ""}">
    ${isAd ? '<span class="pr">PR</span>' : ""}
    <h3>💎 あなたの石</h3>
    ${stoneItem(`守護パワーストーン（${stem.yang ? "陽" : "陰"}の${ELEMENTS[stem.element].name}）`, power)}
    ${births}
    <p class="note">※石の意味は古くからの言い伝えです。</p>
  </div>`;
}

// 関連する漫画・小説を楽天ブックスで探すリンク（g=001001: 漫画、g=001004: 小説・エッセイ）
function bookLinks(name) {
  const rid = SITE_CONFIG.rakutenAffiliateId;
  const link = (g) => {
    const url = `https://books.rakuten.co.jp/search?sitem=${encodeURIComponent(name)}&g=${g}`;
    return rid ? `https://hb.afl.rakuten.co.jp/hgc/${rid}/?pc=${encodeURIComponent(url)}` : url;
  };
  const rel = rid ? "sponsored noopener" : "noopener";
  return `<div class="book-links"><span>📚 ${name}が出てくる</span>
    <a href="${link("001001")}" target="_blank" rel="${rel}">漫画</a>
    <a href="${link("001004")}" target="_blank" rel="${rel}">小説</a></div>`;
}

// 金運がいい日（★4以上）に出す、楽天toto（BIG・toto）の案内
function lotteryCard(moneyScore) {
  if (moneyScore < 4) return "";
  const rid = SITE_CONFIG.rakutenAffiliateId;
  const url = "https://toto.rakuten.co.jp/";
  const href = rid ? `https://hb.afl.rakuten.co.jp/hgc/${rid}/?pc=${encodeURIComponent(url)}` : url;
  const msg = moneyScore === 5
    ? "今日は金運★5の絶好調デー！せっかくの追い風、夢を買ってみるのもアリかも。"
    : "今日は金運が好調な日。ちょっとだけ運試しをしてみては？";
  return `<div class="card lottery-card">
    ${rid ? '<span class="pr">PR</span>' : ""}
    <h3>💰 金運アップの日の運試し</h3>
    <p>${msg}</p>
    <p class="lottery-desc">楽天totoなら、最高6億円のBIGをネットで買えます。数字はコンピューターがランダムに選んでくれるので、選ぶ手間もありません。</p>
    <a class="lottery-btn" href="${href}" target="_blank" rel="${rid ? "sponsored " : ""}noopener">楽天totoでBIGを見てみる</a>
    <p class="note">※スポーツくじ（BIG・toto）は19歳以上の方が購入できます（楽天totoの利用には楽天カード・JCBカード・楽天銀行口座のいずれかが必要です）。占いは当せんを約束するものではありません。無理のない範囲で楽しみましょう。</p>
  </div>`;
}

// 四柱推命の命式と五行バランスのカード
const ELEMENT_LUCK = {
  wood: { color: "緑・青", dir: "東" }, fire: { color: "赤・オレンジ", dir: "南" }, earth: { color: "黄・ベージュ", dir: "中央（家の中心）" },
  metal: { color: "白・金・銀", dir: "西" }, water: { color: "黒・紺", dir: "北" },
};
function meishikiCard(fp) {
  const cols = [["時柱", fp.pillars.hour], ["日柱", fp.pillars.day], ["月柱", fp.pillars.month], ["年柱", fp.pillars.year]];
  const cell = (p, key) => p ? `<td style="--c:${ELEMENTS[key === "stem" ? p.stemElement : p.branchElement].color}"><b>${key === "stem" ? SC_STEMS[p.stem] : SC_BRANCHES[p.branch]}</b><small>${ELEMENTS[key === "stem" ? p.stemElement : p.branchElement].name}</small></td>` : `<td class="empty">—</td>`;
  const max = Math.max(...Object.values(fp.balance));
  const order = ["wood", "fire", "earth", "metal", "water"];
  const bars = order.map((el) => `<div class="gx-row"><span>${ELEMENTS[el].icon} ${ELEMENTS[el].name}</span>
      <div class="gx-track"><div class="gx-fill" style="width:${(fp.balance[el] / fp.total) * 100}%;background:${ELEMENTS[el].color}"></div></div><b>${fp.balance[el]}</b></div>`).join("");
  const strong = order.filter((el) => fp.balance[el] === max);
  const lacking = order.filter((el) => fp.balance[el] === 0);
  const name = (els) => els.map((el) => `「${ELEMENTS[el].name}」`).join("");
  let advice = `いちばん多いのは${name(strong)}の気。${strong.map((el) => ELEMENTS[el].trait.split("。")[0]).join("。")}。`;
  if (lacking.length) {
    advice += ` 一方で${name(lacking)}の気が見当たりません。${lacking.map((el) => `${ELEMENTS[el].name}の気は、${ELEMENT_LUCK[el].color}の小物や${ELEMENT_LUCK[el].dir}の方角で補うとよいとされます`).join("。")}。`;
  } else {
    advice += " 五行がすべてそろっている、バランスのよい命式です。";
  }
  return `<div class="card meishiki-card">
    <h3>📜 四柱推命の命式</h3>
    <table class="meishiki"><thead><tr>${cols.map(([l]) => `<th>${l}</th>`).join("")}</tr></thead>
      <tbody><tr>${cols.map(([, p]) => cell(p, "stem")).join("")}</tr><tr>${cols.map(([, p]) => cell(p, "branch")).join("")}</tr></tbody>
      <tfoot><tr>${cols.map(([, p]) => `<td>${p ? p.kanji : ""}</td>`).join("")}</tr></tfoot></table>
    <h4>五行バランス</h4>
    <div class="gx">${bars}</div>
    <p class="gx-advice">${advice}</p>
    ${fp.hasTime ? "" : '<p class="note">※出生時刻を入れると「時柱」も出て、五行バランスがより正確になります（「くわしく診断する」から入力）。</p>'}
    <p class="note">※節入り（月の切り替わり）の前後数十分に生まれた方は、月柱が前後する場合があります。</p>
  </div>`;
}

// 西洋占星術のカード（ホロスコープの円・主要3点・天体一覧・4元素）
function horoscopeWheel(wc) {
  const cx = 150, cy = 150, R1 = 140, R2 = 112, R3 = 80;
  const base = wc.asc ? wc.asc.lon : 0; // ASCを左（9時の位置）に置く。なければ牡羊座0度を左に
  // 反時計回り（黄経が増えると下へ進む）が一般的なホロスコープの向き
  const pos = (lon, r) => { const a = Math.PI + (lon - base) * Math.PI / 180; return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; };
  let s = `<svg class="wheel" viewBox="0 0 300 300" role="img" aria-label="ホロスコープ">`;
  s += `<circle cx="${cx}" cy="${cy}" r="${R1}" class="w-ring"/><circle cx="${cx}" cy="${cy}" r="${R2}" class="w-ring"/><circle cx="${cx}" cy="${cy}" r="${R3}" class="w-inner"/>`;
  for (let i = 0; i < 12; i++) {
    const [x1, y1] = pos(i * 30, R2), [x2, y2] = pos(i * 30, R1), [gx, gy] = pos(i * 30 + 15, (R1 + R2) / 2);
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="w-line"/>`;
    s += `<text x="${gx}" y="${gy}" class="w-sign" fill="${WEST_ELEMENTS[ZODIAC[i].el].color}">${ZODIAC[i].glyph}︎</text>`;
  }
  if (wc.asc) {
    const [ax, ay] = pos(wc.asc.lon, R1 + 2), [dx, dy] = pos(wc.asc.lon + 180, R1 + 2);
    s += `<line x1="${ax}" y1="${ay}" x2="${dx}" y2="${dy}" class="w-axis"/><text x="${ax - 2}" y="${ay - 6}" class="w-label">ASC</text>`;
  }
  // 天体：近いものは内側にずらして重ならないようにする
  const placed = [];
  wc.planets.slice().sort((a, b) => a.lon - b.lon).forEach((p) => {
    let r = R2 - 16;
    while (placed.some((q) => Math.abs(((q.lon - p.lon + 540) % 360) - 180) < 9 && q.r === r)) r -= 15;
    placed.push({ lon: p.lon, r });
    const [px, py] = pos(p.lon, r);
    s += `<text x="${px}" y="${py}" class="w-planet">${p.glyph}︎</text>`;
  });
  return s + "</svg>";
}

function horoscopeCard(wc) {
  const z = (o) => ZODIAC[o.sign];
  const big3 = [
    ["☉ 太陽星座", "表の自分", wc.sun],
    ["☽ 月星座", "心の内・素の自分", wc.moon],
    ...(wc.asc ? [["ASC アセンダント", "第一印象・見た目の雰囲気", wc.asc]] : []),
  ].map(([label, role, o]) => `<div class="big3" style="--wc:${WEST_ELEMENTS[z(o).el].color}">
      <p class="b3-label">${label}<small>（${role}）</small></p>
      <p class="b3-sign">${z(o).glyph}︎ ${z(o).name}<small> ${o.deg}°</small></p>
      <p class="b3-text">${z(o).text}</p></div>`).join("");
  const rows = wc.planets.map((p) => `<tr><td>${p.glyph}︎ ${p.name}</td><td>${z(p).name} ${p.deg}°</td><td>${p.role}</td></tr>`).join("")
    + (wc.asc ? `<tr><td>ASC</td><td>${z(wc.asc).name} ${wc.asc.deg}°</td><td>第一印象</td></tr><tr><td>MC</td><td>${z(wc.mc).name} ${wc.mc.deg}°</td><td>社会での顔・天職</td></tr>` : "");
  const total = Object.values(wc.balance).reduce((a, b) => a + b, 0);
  const max = Math.max(...Object.values(wc.balance));
  const bars = Object.entries(WEST_ELEMENTS).map(([k, e]) => `<div class="gx-row"><span>${e.name}</span>
      <div class="gx-track"><div class="gx-fill" style="width:${(wc.balance[k] / total) * 100}%;background:${e.color}"></div></div><b>${wc.balance[k]}</b></div>`).join("");
  const top = Object.keys(WEST_ELEMENTS).filter((k) => wc.balance[k] === max).map((k) => `「${WEST_ELEMENTS[k].name}」（${WEST_ELEMENTS[k].text}）`).join("と");
  const notes = [];
  if (wc.moonUncertain) notes.push(`※生まれた日のうちに月の星座が${ZODIAC[wc.moonUncertain[0]].name}から${ZODIAC[wc.moonUncertain[1]].name}へ移っています。出生時刻を入れると正確にわかります。`);
  if (!wc.hasTime) notes.push("※出生時刻を入れると、アセンダント（ASC）とMCも出ます。");
  else if (!wc.hasPlace) notes.push("※出生地（都道府県）を選ぶと、アセンダント（ASC）とMCも出ます。海外の場合は表示されません。");
  return `<div class="card horoscope-card">
    <h3>🌌 西洋占星術のホロスコープ</h3>
    ${horoscopeWheel(wc)}
    <div class="big3-wrap">${big3}</div>
    <h4>4元素のバランス</h4>
    <div class="gx">${bars}</div>
    <p class="gx-advice">いちばん強いのは${top}のエレメントです。</p>
    <details class="planet-list"><summary>すべての天体の位置を見る</summary>
      <table class="a-table"><tbody>${rows}</tbody></table></details>
    ${notes.map((n) => `<p class="note">${n}</p>`).join("")}
  </div>`;
}

// 紫微斗数のカード（命盤と命宮の主星）
const PALACE_NAMES = ["命宮", "兄弟宮", "夫妻宮", "子女宮", "財帛宮", "疾厄宮", "遷移宮", "交友宮", "官禄宮", "田宅宮", "福徳宮", "父母宮"];
function ziweiCard(zw) {
  if (!zw) {
    return `<div class="card ziwei-card"><h3>🌟 紫微斗数</h3>
      <p>紫微斗数は、生まれた時刻（十二時辰）で命盤が大きく変わる占いです。「くわしく診断する」から<b>出生時刻</b>を入れると、あなたの命宮と主星がわかります。</p></div>`;
  }
  const palaceOf = (b) => PALACE_NAMES[((zw.ming.branch - b) % 12 + 12) % 12];
  const starsAt = (b) => Object.keys(zw.positions).filter((s) => zw.positions[s] === b);
  const cell = (b) => `<div class="zp${b === zw.ming.branch ? " ming" : ""}${b === zw.shen.branch ? " shen" : ""}" style="grid-area:b${b}">
      <span class="zp-name">${palaceOf(b)}${b === zw.shen.branch ? "<i>身</i>" : ""}</span>
      <span class="zp-stars">${starsAt(b).join(" ")}</span>
      <span class="zp-br">${ZW_BRANCHES[b]}</span></div>`;
  const main = zw.mainStars.map((s) => `<div class="zw-main"><p class="zw-star">${s}星</p><p>${MAJOR_STARS[s].text}</p></div>`).join("");
  const L = zw.lunar;
  return `<div class="card ziwei-card">
    <h3>🌟 紫微斗数の命盤</h3>
    <div class="zw-board">
      ${[0,1,2,3,4,5,6,7,8,9,10,11].map(cell).join("")}
      <div class="zw-center"><b>${zw.bureau}</b><span>命宮 ${zw.ming.kanji}</span><span>旧暦 ${L.isLeap ? "閏" : ""}${L.month}月${L.day}日</span><span>${ZW_BRANCHES[zw.hourBranch]}の刻生まれ</span></div>
    </div>
    <h4>命宮の主星（あなたの本質）</h4>
    ${main}
    ${zw.borrowed ? '<p class="note">※命宮に主星がない「空宮」のため、向かいの遷移宮の星を借りて読んでいます。</p>' : ""}
    <p class="note">※旧暦は中国の農暦で計算しています。閏月は15日までを前の月、16日以降を次の月として扱い、23時台は翌日の子の刻としています（流派により異なる場合があります）。</p>
  </div>`;
}

// 本当の正体（主役）のカード
function trueIdentityCard(ti, who, element) {
  const c = ti.identity;
  const sec = (icon, label, text) => `<div class="ti-sec"><p class="ti-sec-label">${icon} ${label}</p><p>${text}</p></div>`;
  return `<div class="card ti-card" id="true-identity">
    <p class="ti-lead">${who}の本当の正体は——</p>
    ${artFor(c.name, "true", element)}
    <p class="ti-origin">${c.origin}・${c.type}</p>
    <h2 class="ti-name">${nameRuby(c)}</h2>
    <p class="ti-catch">「${c.catch}」</p>
    <div class="ti-body">
      ${sec("🔮", "本質", c.essence)}
      ${sec("✨", "長所", c.good)}
      ${sec("⚠️", "短所", c.weak)}
      ${sec("💞", "恋愛・人間関係", c.love)}
      ${sec("💼", "仕事・才能", c.work)}
    </div>
    <details class="ti-why"><summary>なぜこの正体？（判定の理由）</summary>
      <ul>${ti.reasons.map((r) => `<li>${r}</li>`).join("")}</ul>
      <p class="note">同じ日干の10体の中から、西洋占星術と紫微斗数の結果がいちばん重なる存在を選んでいます。</p>
      <p class="ti-near">ほかに近い正体：${ti.runnersUp.map((r) => r.name).join("、")}</p>
    </details>
    <a class="read-more" href="articles/true-identities.html#ti-${TRUE_IDENTITIES.indexOf(c) + 1}">🌟 本当の正体100体の図鑑で、ほかの正体も見る →</a>
    ${ti.detailed ? "" : '<p class="ti-more">🔭 出生時刻と出生地を入れると、紫微斗数やアセンダントも加わり、<b>より精密な正体</b>がわかります（「くわしく診断する」から）。</p>'}
    ${placeBlock(c.name)}
    <a class="wiki-link" href="${wikiUrl(c.wiki)}" target="_blank" rel="noopener">${c.name}をWikipediaで詳しく見る ↗</a>
    ${bookLinks(c.name)}
  </div>`;
}

function wikiUrl(title) {
  return `https://ja.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

function spotList(shrine) {
  const items = shrine.spots.map((p) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + " " + shrine.area)}`;
    return `<li><a href="${url}" target="_blank" rel="noopener">${p.name}</a><span>${p.desc}</span></li>`;
  }).join("");
  return `<div class="spots"><p class="travel-title">📍 周辺の観光スポット</p><ul>${items}</ul></div>`;
}

function render(birthday, nickname, birthtime, birthplace) {
  const fp = fourPillars(birthday, birthtime || "");
  const wc = typeof Astronomy !== "undefined" ? westernChart(birthday, birthtime || "", birthplace || "") : null;
  const zw = typeof Astronomy !== "undefined" && birthtime ? ziweiChart(birthday, birthtime) : null;
  const ti = judgeTrueIdentity(birthday, fp, wc, zw);
  const dx = diagnose(birthday);
  const daily = dailyFortune(birthday, todayString());
  const { element, stem, identities, shrine } = dx;
  const who = nickname ? `${escapeHtml(nickname)}さん` : "あなた";
  const polarity = stem.yang ? "陽" : "陰";

  const idCards = CATEGORIES.map((c) => {
    const r = identities[c.key];
    return `
      <div class="id-card">
        ${artFor(r.name, c.key, element)}
        <p class="id-lead">${c.lead}…</p>
        <p class="id-label">${c.label}</p>
        <h4>${r.name}</h4>
        <p class="id-sub">${r.sub}</p>
        <p class="id-desc">${r.desc}</p>
        ${r.weak ? `<p class="id-weak"><b>⚠️ このキャラの弱点</b>${r.weak}</p>` : ""}
        ${placeBlock(r.name)}
        <a class="wiki-link" href="${wikiUrl(r.wiki)}" target="_blank" rel="noopener">Wikipediaで詳しく見る ↗</a>
        ${bookLinks(r.name)}
      </div>`;
  }).join("");

  const luckRows = [
    ["総合運", "overall"], ["恋愛運", "love"], ["金運", "money"], ["仕事運", "work"],
  ].map(([label, key]) => `
    <div class="luck-row">
      <div class="luck-head"><span>${label}</span><span class="stars">${stars(daily.scores[key])}</span></div>
      <p>${daily.texts[key]}</p>
    </div>`).join("");

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shrine.name + " " + shrine.area)}`;
  const shareText = `私の本当の正体は「${ti.identity.name}」！\n${ti.identity.catch}\n\n別の世界では…\nインド神話：${identities.india.name}\n日本神話：${identities.japan.name}\nギリシャ神話：${identities.greece.name}\n北欧神話：${identities.norse.name}\n妖怪：${identities.yokai.name}\n都市伝説：${identities.legend.name}\n#八百万診断`;
  const shareUrl = SITE_CONFIG.siteUrl || location.href.split("#")[0];

  const el = document.getElementById("result");
  el.style.setProperty("--el", element.color);
  el.innerHTML = `
    ${trueIdentityCard(ti, who, element)}

    <div class="share-area">
      <p class="share-title">結果をシェアする</p>
      <div class="share-btns">
        <a class="share-btn x" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}" target="_blank" rel="noopener">Xでシェア</a>
        <button type="button" class="share-btn insta" id="insta-share">インスタでシェア</button>
      </div>
      <div id="insta-preview" class="insta-preview" hidden></div>
    </div>

    <div class="card element-card">
      <div class="element-icon" aria-hidden="true">${element.icon}</div>
      <p class="sub">${who}の属性は</p>
      <h2>${polarity}の${element.name}</h2>
      <p class="stem">日干：${stem.kanji}</p>
      <p>${element.trait}</p>
      <p class="polarity">${element[stem.yang ? "yang" : "yin"]}</p>
      <a class="read-more" href="articles/element-${stem.element}.html">「${element.name}」属性について詳しく読む →</a>
    </div>


    ${meishikiCard(fp)}

    ${wc ? horoscopeCard(wc) : ""}

    ${ziweiCard(zw)}

    <h3 class="section-title">別の世界に生まれていたら…</h3>
    <p class="section-sub">神話や伝承の7つの世界での、${who}の姿</p>
    ${SITE_CONFIG.rakutenAffiliateId ? '<p class="pr-line">PR：漫画・小説のリンクは楽天ブックスのアフィリエイトリンクです</p>' : ""}
    <div class="id-grid">${idCards}</div>

    <div class="card shrine-card">
      ${artFor(shrine.name, "shrine", element)}
      <p class="id-label">相性のいい神社</p>
      <h3>⛩️ ${shrine.name}</h3>
      <p class="shrine-meta">${shrine.area}／ご祭神：${shrine.deity}</p>
      <p>${shrine.desc}</p>
      <div class="shrine-btns">
        <a class="map-btn" href="${mapUrl}" target="_blank" rel="noopener">地図で見る</a>
        <a class="map-btn" href="${wikiUrl(shrine.wiki)}" target="_blank" rel="noopener">Wikipedia ↗</a>
      </div>
      ${spotList(shrine)}
      ${travelLinks(shrine)}
      ${affiliateLinks("御朱印帳", "御朱印帳を探す")}
    </div>

    ${stoneCard(birthday, stem)}

    ${typeof bestMatchesHTML === "function" ? bestMatchesHTML(birthday, who, ti.identity) : ""}

    <div class="card" id="today-card">
      <h3>${todayString().replace(/-/g, "/")} の運勢</h3>
      ${luckRows}
    </div>

    ${lotteryCard(daily.scores.money)}

    <div class="card lucky">
      <h3>今日のラッキー</h3>
      <dl>
        <dt>カラー</dt><dd>${daily.luckyColor}</dd>
        <dt>アイテム</dt><dd>${daily.luckyItem.name}</dd>
      </dl>
      ${affiliateLinks(daily.luckyItem.keyword, "探す")}
      <p class="advice">💡 ${daily.advice}</p>
    </div>

  `;
  const shareData = {
    who: nickname ? `${nickname}さん` : "あなた",
    trueName: ti.identity.name, trueKana: ti.identity.kana || "", trueCatch: ti.identity.catch,
    element, polarity, stemKanji: stem.kanji, identities, shrine,
    power: POWER_STONES[stem.element][stem.yang ? "yang" : "yin"],
  };
  document.getElementById("insta-share").addEventListener("click", () =>
    shareToInstagram(shareData, document.getElementById("insta-preview"), shareText + "\n" + shareUrl));
  el.hidden = false;
  el.scrollIntoView({ behavior: "smooth" });
}

// ---- 初期化 ----

document.getElementById("year").textContent = new Date().getFullYear();

const form = document.getElementById("fortune-form");
const birthdayInput = document.getElementById("birthday");
const nicknameInput = document.getElementById("nickname");
const birthtimeInput = document.getElementById("birthtime");
const birthplaceInput = document.getElementById("birthplace");
birthdayInput.max = todayString();

// 入力内容は本人のブラウザ内にだけ保存（サーバーには送らない）
try {
  birthdayInput.value = localStorage.getItem("birthday") || "";
  nicknameInput.value = localStorage.getItem("nickname") || "";
  birthtimeInput.value = localStorage.getItem("birthtime") || "";
  birthplaceInput.value = localStorage.getItem("birthplace") || "";
  if (birthtimeInput.value || birthplaceInput.value) document.getElementById("detail-input").open = true;
} catch (e) {}

// 前に診断したことがある人には「おかえりなさい」バナーを出す
(function () {
  let saved = "", name = "", time = "", place = "";
  try {
    saved = localStorage.getItem("birthday") || ""; name = localStorage.getItem("nickname") || "";
    time = localStorage.getItem("birthtime") || ""; place = localStorage.getItem("birthplace") || "";
  } catch (e) {}
  if (!saved) return;
  const box = document.getElementById("welcome-back");
  const who = name ? `${escapeHtml(name)}さん` : "";
  box.querySelector(".welcome-msg").innerHTML = `おかえりなさい${who ? "、" + who : ""}！<br><small>今日の運勢は毎日変わります。</small>`;
  box.hidden = false;
  const show = (targetId) => {
    render(saved, name, time, place);
    setTimeout(() => document.getElementById(targetId).scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  document.getElementById("wb-today").addEventListener("click", () => show("today-card"));
  document.getElementById("wb-result").addEventListener("click", () => show("result"));
})();

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const birthday = birthdayInput.value;
  if (!birthday) return;
  const nickname = nicknameInput.value.trim();
  try {
    localStorage.setItem("birthday", birthday);
    localStorage.setItem("nickname", nickname);
    localStorage.setItem("birthtime", birthtimeInput.value);
    localStorage.setItem("birthplace", birthplaceInput.value);
  } catch (e) {}
  render(birthday, nickname, birthtimeInput.value, birthplaceInput.value);
});
