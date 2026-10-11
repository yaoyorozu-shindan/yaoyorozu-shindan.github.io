// 相性診断：ふたりの属性（五行）と陰陽の関係から相性を出す
//
// 五行の関係
//   相生（育てる）: 木→火→土→金→水→木
//   相剋（抑える）: 木→土→水→火→金→木
//   比和（同じ属性）

const ELEMENT_ORDER = ["wood", "fire", "earth", "metal", "water"];

// 五行の関係の見出し（ふたりの組み合わせごとの文章は js/compat-stems.js の STEM_PAIRS）
const COMPAT_TEXT = {
  same: { title: "似た者同士の「比和」" },
  gen: { title: "支え合う「相生」" },
  ctrl: { title: "刺激し合う「相剋」" },
};

function compatibility(bdayA, bdayB) {
  const A = diagnose(bdayA), B = diagnose(bdayB);
  const ia = ELEMENT_ORDER.indexOf(A.stem.element), ib = ELEMENT_ORDER.indexOf(B.stem.element);
  let type, from = null, to = null, shrineElement;
  if (ia === ib) {
    type = "same"; shrineElement = A.stem.element;
  } else if ((ia + 1) % 5 === ib || (ib + 1) % 5 === ia) {
    type = "gen";
    [from, to] = (ia + 1) % 5 === ib ? ["A", "B"] : ["B", "A"];
    shrineElement = (to === "A" ? A : B).stem.element; // 育てられる側の属性
  } else {
    type = "ctrl";
    [from, to] = (ia + 2) % 5 === ib ? ["A", "B"] : ["B", "A"];
    // 抑える側 → 仲立ち → 抑えられる側 となる「仲立ちの属性」
    shrineElement = ELEMENT_ORDER[(ELEMENT_ORDER.indexOf((from === "A" ? A : B).stem.element) + 1) % 5];
  }
  const polarityDiff = A.stem.yang !== B.stem.yang;
  // 日干の組み合わせ（55通り）。{A} は番号の小さい日干の人
  const lowFirst = A.stem.index <= B.stem.index;
  const stemPair = STEM_PAIRS[lowFirst ? `${A.stem.index}-${B.stem.index}` : `${B.stem.index}-${A.stem.index}`];
  const kango = Math.abs(A.stem.index - B.stem.index) === 5; // 干合：甲己・乙庚・丙辛・丁壬・戊癸

  // 入れる順番を変えても同じ結果になるよう、並べ替えてから計算
  const pairKey = [bdayA, bdayB].sort().join("|");
  const rand = seededRandom(hashString("compat|" + pairKey));
  const base = { gen: 90, same: 78, ctrl: 62 }[type] + (polarityDiff ? 6 : 0);
  const clamp = (n) => Math.max(35, Math.min(99, n));
  const total = clamp(base + Math.floor(rand() * 9) - 4);
  const sub = {
    love: clamp(total + Math.floor(rand() * 17) - 8 + (kango ? 10 : 0)),
    friend: clamp(total + Math.floor(rand() * 17) - 8),
    work: clamp(total + Math.floor(rand() * 17) - 8),
  };
  const shrines = RESULTS[shrineElement].shrine;
  const shrine = shrines[hashString("pair-shrine|" + pairKey) % shrines.length];
  return { A, B, type, from, to, polarityDiff, total, sub, shrine, shrineElement, stemPair, lowFirst, kango };
}

// ---- 1人の入力から「相性のいいタイプ」を出す ----

const MATCH_RELATION = {
  theyGenMe: { name: "相生", note: "あなたを育て、力を引き出してくれる人", order: 0 },
  meGenThem: { name: "相生", note: "あなたが自然と支えたくなり、一緒にいると満たされる人", order: 1 },
  same:      { name: "比和", note: "価値観が近く、気をつかわずにいられる人", order: 2 },
  meCtrlThem:{ name: "相剋", note: "あなたがリードしがち。ぶつかりながら成長できる人", order: 3 },
  theyCtrlMe:{ name: "相剋", note: "あなたにハッパをかけてくれる、刺激的な人", order: 4 },
};

// 自分以外も含む全10タイプ（五行×陰陽）との相性を、高い順に並べる
function matchRanking(birthday) {
  const me = dayStem(birthday);
  const i = ELEMENT_ORDER.indexOf(me.element);
  const list = [];
  ELEMENT_ORDER.forEach((el, j) => {
    [true, false].forEach((yang) => {
      let rel;
      if (i === j) rel = "same";
      else if ((j + 1) % 5 === i) rel = "theyGenMe";
      else if ((i + 1) % 5 === j) rel = "meGenThem";
      else if ((i + 2) % 5 === j) rel = "meCtrlThem";
      else rel = "theyCtrlMe";
      const type = rel.includes("Gen") ? "gen" : rel === "same" ? "same" : "ctrl";
      const score = { gen: 90, same: 78, ctrl: 62 }[type] + (yang !== me.yang ? 6 : 0);
      const stem = j * 2 + (yang ? 0 : 1);
      const kango = Math.abs(stem - me.index) === 5;
      const pair = STEM_PAIRS[me.index <= stem ? `${me.index}-${stem}` : `${stem}-${me.index}`];
      list.push({ element: el, yang, rel, score, stem, kango, title: pair.title });
    });
  });
  // 同じ点数なら、干合（惹かれ合う組み合わせ）を上に
  list.sort((a, b) => b.score - a.score || b.kango - a.kango || MATCH_RELATION[a.rel].order - MATCH_RELATION[b.rel].order);
  return list;
}

// 自分の本当の正体と「伝説の組み合わせ」になる相手（正体と、その正体の日干）
function legendPartners(ti) {
  if (!ti) return [];
  return LEGEND_PAIRS.filter((p) => p.a === ti.name || p.b === ti.name).map((p) => {
    const partner = TRUE_IDENTITIES.find((t) => t.name === (p.a === ti.name ? p.b : p.a));
    return { name: partner.name, stem: partner.stem, title: p.title };
  });
}

function matchLabel(m) {
  return `${m.yang ? "陽" : "陰"}の${ELEMENTS[m.element].name}`;
}

// 相性ランキングのカード（個人の診断結果と、相性診断の「1人だけ入力」で共通）
// ti：自分の本当の正体（わかれば「伝説の組み合わせ」の相手も出す）
function bestMatchesHTML(birthday, who, ti) {
  const ranking = matchRanking(birthday);
  const legends = legendPartners(ti);
  const medal = ["🥇", "🥈", "🥉"];
  const kangoTag = (m) => (m.kango ? '<span class="kango">💞 干合</span>' : "");
  const legendFor = (m) => legends.filter((l) => l.stem === m.stem);
  const top = ranking.slice(0, 3).map((m, k) => {
    const el = ELEMENTS[m.element];
    const examples = TRUE_IDENTITIES.filter((t) => t.stem === m.stem).slice(0, 3).map((t) => t.name);
    return `<div class="match-item" style="--mc:${el.color}">
      <div class="match-head"><span class="medal">${medal[k]}</span>
        <div><p class="match-type">${el.icon} ${matchLabel(m)}（${SC_STEMS[m.stem]}）の人</p>
        <p class="match-rel">${MATCH_RELATION[m.rel].name}・相性 ${m.score}%${kangoTag(m)}</p></div></div>
      <p class="match-title">「${m.title}」</p>
      <p class="match-note">${MATCH_RELATION[m.rel].note}。${m.kango ? "四柱推命で強く惹かれ合うとされる「干合」で、恋愛はとくに好相性。" : ""}</p>
      ${legendFor(m).map((l) => `<p class="match-legend">✨ 正体が${l.name}の人なら、伝説の組み合わせ「${l.title}」</p>`).join("")}
      <p class="match-eg">正体の例：${examples.join("、")} など</p>
    </div>`;
  }).join("");
  const rest = ranking.slice(3).map((m, k) =>
    `<li><span>${k + 4}位</span><b>${ELEMENTS[m.element].icon} ${matchLabel(m)}（${SC_STEMS[m.stem]}）</b><em>${MATCH_RELATION[m.rel].name}</em><i>${m.score}%</i>
      <small>「${m.title}」${legendFor(m).map((l) => `・✨ ${l.name}なら伝説の組み合わせ`).join("")}</small></li>`).join("");
  return `<div class="card matches-card">
    <h3>💞 ${who}と相性のいい人</h3>
    <p class="match-lead">相手のタイプ（日干）は、その人の生年月日で診断するとわかります。</p>
    ${legends.length ? `<div class="legend-pair">
      <p class="legend-badge">✨ ${ti.name}と「伝説の組み合わせ」になる相手</p>
      <ul>${legends.map((l) => `<li><b>${l.name}</b>（${SC_STEMS[l.stem]}の人に多い正体）…「${l.title}」</li>`).join("")}</ul>
    </div>` : ""}
    ${top}
    <details class="match-rest"><summary>4位以下も見る</summary><ol>${rest}</ol></details>
    <button type="button" class="match-go" data-bday="${birthday}">相手の生年月日で相性を診断する</button>
  </div>`;
}

// 「相手の生年月日で相性を診断する」ボタン：相性診断の欄へ移動して、自分の生年月日を入れておく
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".match-go");
  if (!btn) return;
  document.getElementById("bday-a").value = btn.dataset.bday;
  document.getElementById("compat").scrollIntoView({ behavior: "smooth" });
  setTimeout(() => document.getElementById("bday-b").focus(), 500);
});

function compatBar(label, value, note) {
  return `<div class="cbar"><span>${label}</span><div class="cbar-track"><div class="cbar-fill" style="width:${value}%"></div></div><b>${value}%</b></div>
      ${note ? `<p class="cbar-note">${note}</p>` : ""}`;
}

// ふたりそれぞれの本当の正体（生年月日だけで判定。「あなた」に保存済みの出生時刻があれば、くわしく判定）
function trueIdentityFor(birthday, time, place) {
  const fp = fourPillars(birthday, time || "");
  const wc = typeof Astronomy !== "undefined" ? westernChart(birthday, time || "", place || "") : null;
  const zw = typeof Astronomy !== "undefined" && time ? ziweiChart(birthday, time) : null;
  return judgeTrueIdentity(birthday, fp, wc, zw).identity;
}

const PAIR_TEXT = {
  same: (a, b) => `同じ気を持つ${a.name}と${b.name}。並び立てば向かうところ敵なしの、息ぴったりの名コンビです。`,
  gen: (giver, receiver) => `${giver.name}の力が${receiver.name}をさらに輝かせる、まるで神話のような名コンビ。お互いがいることで、どちらも本来の力を発揮できます。`,
  ctrl: (strong, weak) => `${strong.name}と${weak.name}は、ぶつかり合うことで互いを鍛え合う、宿命のライバルのような関係。認め合えたとき、最強のタッグになります。`,
};

function pairCard(tiA, tiB, nA, nB, c) {
  const side = (ti, n) => `<div class="pair-ti">
      ${artFor(ti.name, "true", ELEMENTS[SC_ELEMENTS[Math.floor(ti.stem / 2)]])}
      <p class="pair-ti-who">${n}の正体</p>
      <p class="pair-ti-name">${nameRuby(ti)}</p>
      <p class="pair-ti-catch">${ti.catch}</p>
    </div>`;
  const byKey = { A: tiA, B: tiB };
  const text = c.type === "same" ? PAIR_TEXT.same(tiA, tiB) : PAIR_TEXT[c.type](byKey[c.from], byKey[c.to]);
  const legend = legendPair(tiA, tiB);
  return `<div class="card pair-card">
    <h3>ふたりの本当の正体</h3>
    <div class="pair-ti-row">${side(tiA, nA)}<span class="pair-x">×</span>${side(tiB, nB)}</div>
    ${legend ? `<div class="legend-pair">
      <p class="legend-badge">✨ 伝説の組み合わせ</p>
      <h4>${legend.title}</h4>
      <p>${legend.text}</p>
    </div>` : `<p class="pair-text">${text}</p>`}
  </div>`;
}

// 神話・伝承でゆかりのあるふたりなら、その組み合わせを返す
function legendPair(tiA, tiB) {
  return LEGEND_PAIRS.find((p) => (p.a === tiA.name && p.b === tiB.name) || (p.a === tiB.name && p.b === tiA.name)) || null;
}

// 「あなた」の本当の正体。保存済みの生年月日と同じなら、出生時刻・出生地も使ってくわしく判定
function ownTrueIdentity(bday) {
  let savedB = "", savedTime = "", savedPlace = "";
  try { savedB = localStorage.getItem("birthday") || ""; savedTime = localStorage.getItem("birthtime") || ""; savedPlace = localStorage.getItem("birthplace") || ""; } catch (e) {}
  return savedB === bday ? trueIdentityFor(bday, savedTime, savedPlace) : trueIdentityFor(bday);
}

function renderCompat(bdayA, nameA, bdayB, nameB) {
  const c = compatibility(bdayA, bdayB);
  const tiA = ownTrueIdentity(bdayA);
  const tiB = trueIdentityFor(bdayB);
  const nA = nameA ? `${escapeHtml(nameA)}さん` : "あなた";
  const nB = nameB ? `${escapeHtml(nameB)}さん` : "お相手";
  const elA = ELEMENTS[c.A.stem.element], elB = ELEMENTS[c.B.stem.element];
  const label = (d) => `${d.stem.yang ? "陽" : "陰"}の${ELEMENTS[d.stem.element].name}`;
  // 文章の {A} は日干の番号が小さい人、{B} は大きい人
  const [lowName, highName] = c.lowFirst ? [nA, nB] : [nB, nA];
  const desc = c.stemPair.text.replace(/\{A\}/g, lowName).replace(/\{B\}/g, highName);
  const aspect = ASPECT_TEXT[c.type][c.polarityDiff ? "diff" : "same"];

  const hearts = "💗".repeat(Math.round(c.total / 20)) + "🤍".repeat(5 - Math.round(c.total / 20));
  const rows = ["japan", "greece", "norse", "yokai", "legend"].map((key) => {
    const cat = CATEGORIES.find((x) => x.key === key);
    return `<tr><th>${cat.label}</th><td>${c.A.identities[key].name}</td><td class="x">×</td><td>${c.B.identities[key].name}</td></tr>`;
  }).join("");

  const shareText = `${nameA || "わたし"}（${tiA.name}）× ${nameB || "お相手"}（${tiB.name}）の相性は ${c.total}%！\n「${c.stemPair.title}」\n#八百万診断 #相性診断`;
  const shareUrl = SITE_CONFIG.siteUrl || location.href.split("#")[0];
  const s = c.shrine;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name + " " + s.area)}`;

  const el = document.getElementById("compat-result");
  el.style.setProperty("--el", elA.color);
  el.style.setProperty("--el2", elB.color);
  el.innerHTML = `
    <div class="card compat-card">
      <p class="pair"><span style="color:${elA.color}">${nA}</span> × <span style="color:${elB.color}">${nB}</span></p>
      <p class="pair-el">${elA.icon} ${label(c.A)} × ${elB.icon} ${label(c.B)}</p>
      <p class="score">${c.total}<small>%</small></p>
      <p class="hearts">${hearts}</p>
      <h3>「${c.stemPair.title}」</h3>
      <p class="compat-rel">${COMPAT_TEXT[c.type].title}${c.kango ? '<span class="kango">💞 干合</span>' : ""}</p>
      <p class="compat-desc">${desc}</p>
      ${compatBar("恋愛", c.sub.love, aspect.love)}
      ${compatBar("友情", c.sub.friend, aspect.friend)}
      ${compatBar("仕事", c.sub.work, aspect.work)}
    </div>

    ${pairCard(tiA, tiB, nA, nB, c)}

    <div class="card">
      <h3>ふたりを例えると…</h3>
      <table class="pair-table">
        <tr><th></th><td>${nA}</td><td></td><td>${nB}</td></tr>
        ${rows}
      </table>
    </div>

    <div class="card shrine-card">
      ${artFor(s.name, "shrine", ELEMENTS[c.shrineElement])}
      <p class="id-label">ふたりで行きたい神社</p>
      <h3>⛩️ ${s.name}</h3>
      <p class="shrine-meta">${s.area}／ご祭神：${s.deity}</p>
      <p>${s.desc}</p>
      <div class="shrine-btns">
        <a class="map-btn" href="${mapUrl}" target="_blank" rel="noopener">地図で見る</a>
        <a class="map-btn" href="${wikiUrl(s.wiki)}" target="_blank" rel="noopener">Wikipedia ↗</a>
      </div>
      ${travelLinks(s)}
      ${affiliateLinks("ペアブレスレット 天然石", "ペアの天然石を探す")}
    </div>

    <div class="share-area">
      <p class="share-title">相性をシェアする</p>
      <div class="share-btns">
        <a class="share-btn x" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}" target="_blank" rel="noopener">Xでシェア</a>
        <button type="button" class="share-btn insta" id="insta-share-compat">インスタでシェア</button>
      </div>
      <div id="insta-preview-compat" class="insta-preview" hidden></div>
    </div>
  `;
  const imgData = {
    nameA: nameA ? `${nameA}さん` : "あなた", nameB: nameB ? `${nameB}さん` : "お相手",
    elA, elB, labelA: label(c.A), labelB: label(c.B),
    total: c.total, title: `「${c.stemPair.title}」`, sub: c.sub, shrine: s.name,
    trueA: tiA.name, trueB: tiB.name,
    pairs: ["japan", "greece", "norse", "yokai"].map((key) => [CATEGORIES.find((x) => x.key === key).label, c.A.identities[key].name, c.B.identities[key].name]),
  };
  document.getElementById("insta-share-compat").addEventListener("click", () =>
    shareToInstagram(imgData, document.getElementById("insta-preview-compat"), shareText + "\n" + shareUrl, buildCompatShareImage));
  el.hidden = false;
  el.scrollIntoView({ behavior: "smooth" });
}

// ---- 初期化 ----
(function () {
  const form = document.getElementById("compat-form");
  if (!form) return;
  const a = document.getElementById("bday-a"), na = document.getElementById("name-a");
  const b = document.getElementById("bday-b"), nb = document.getElementById("name-b");
  a.max = b.max = todayString();
  try {
    a.value = localStorage.getItem("birthday") || "";
    na.value = localStorage.getItem("nickname") || "";
  } catch (e) {}
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!a.value) return;
    if (!b.value) {
      const out = document.getElementById("compat-result");
      const nA = na.value.trim();
      out.innerHTML = bestMatchesHTML(a.value, nA ? `${escapeHtml(nA)}さん` : "あなた", ownTrueIdentity(a.value));
      out.hidden = false;
      out.scrollIntoView({ behavior: "smooth" });
      return;
    }
    renderCompat(a.value, na.value.trim(), b.value, nb.value.trim());
  });
})();
