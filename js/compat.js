// 相性診断：ふたりの属性（五行）と陰陽の関係から相性を出す
//
// 五行の関係
//   相生（育てる）: 木→火→土→金→水→木
//   相剋（抑える）: 木→土→水→火→金→木
//   比和（同じ属性）

const ELEMENT_ORDER = ["wood", "fire", "earth", "metal", "water"];

const COMPAT_TEXT = {
  same: {
    title: "似た者同士の「比和」",
    desc: (a, b, el) => `ふたりとも同じ「${el}」の気を持っています。言わなくても通じ合える安心感が魅力。ただ似ているぶん、同じところでつまずくことも。お互いの小さな違いを楽しむと、絆がさらに深まります。`,
  },
  gen: {
    title: "支え合う「相生」",
    desc: (giver, receiver, ge, re) => `${giver}の「${ge}」が${receiver}の「${re}」を育てる、五行でいちばん相性のよい関係。${giver}がそばにいるだけで、${receiver}は力を発揮しやすくなります。${receiver}が感謝を言葉にすると、ふたりの運気がさらに巡ります。`,
  },
  ctrl: {
    title: "刺激し合う「相剋」",
    desc: (strong, weak, se, we) => `${strong}の「${se}」が${weak}の「${we}」を引き締める関係。ぶつかることもありますが、お互いに足りないものを持っている、成長し合えるふたりです。${strong}は言い方をやわらかく、${weak}は遠慮せず本音を伝えるのがうまくいくコツ。`,
  },
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

  // 入れる順番を変えても同じ結果になるよう、並べ替えてから計算
  const pairKey = [bdayA, bdayB].sort().join("|");
  const rand = seededRandom(hashString("compat|" + pairKey));
  const base = { gen: 90, same: 78, ctrl: 62 }[type] + (polarityDiff ? 6 : 0);
  const clamp = (n) => Math.max(35, Math.min(99, n));
  const total = clamp(base + Math.floor(rand() * 9) - 4);
  const sub = {
    love: clamp(total + Math.floor(rand() * 17) - 8),
    friend: clamp(total + Math.floor(rand() * 17) - 8),
    work: clamp(total + Math.floor(rand() * 17) - 8),
  };
  const shrines = RESULTS[shrineElement].shrine;
  const shrine = shrines[hashString("pair-shrine|" + pairKey) % shrines.length];
  return { A, B, type, from, to, polarityDiff, total, sub, shrine, shrineElement };
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
      list.push({ element: el, yang, rel, score });
    });
  });
  list.sort((a, b) => b.score - a.score || MATCH_RELATION[a.rel].order - MATCH_RELATION[b.rel].order);
  return list;
}

function matchLabel(m) {
  return `${m.yang ? "陽" : "陰"}の${ELEMENTS[m.element].name}`;
}

// 相性ランキングのカード（個人の診断結果と、相性診断の「1人だけ入力」で共通）
function bestMatchesHTML(birthday, who) {
  const ranking = matchRanking(birthday);
  const medal = ["🥇", "🥈", "🥉"];
  const top = ranking.slice(0, 3).map((m, k) => {
    const el = ELEMENTS[m.element];
    const pool = RESULTS[m.element];
    const pick = m.yang ? 0 : 1;
    return `<div class="match-item" style="--mc:${el.color}">
      <div class="match-head"><span class="medal">${medal[k]}</span>
        <div><p class="match-type">${el.icon} ${matchLabel(m)}の人</p>
        <p class="match-rel">${MATCH_RELATION[m.rel].name}・相性 ${m.score}%</p></div></div>
      <p class="match-note">${MATCH_RELATION[m.rel].note}。</p>
      <p class="match-eg">正体の例：${pool.japan[pick].name}、${pool.greece[pick].name}、${pool.yokai[pick].name} など</p>
    </div>`;
  }).join("");
  const rest = ranking.slice(3).map((m, k) =>
    `<li><span>${k + 4}位</span><b>${ELEMENTS[m.element].icon} ${matchLabel(m)}</b><em>${MATCH_RELATION[m.rel].name}</em><i>${m.score}%</i></li>`).join("");
  return `<div class="card matches-card">
    <h3>💞 ${who}と相性のいい人</h3>
    <p class="match-lead">相手の属性は、その人の生年月日で診断するとわかります。</p>
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

function compatBar(label, value) {
  return `<div class="cbar"><span>${label}</span><div class="cbar-track"><div class="cbar-fill" style="width:${value}%"></div></div><b>${value}%</b></div>`;
}

function renderCompat(bdayA, nameA, bdayB, nameB) {
  const c = compatibility(bdayA, bdayB);
  const nA = nameA ? `${escapeHtml(nameA)}さん` : "あなた";
  const nB = nameB ? `${escapeHtml(nameB)}さん` : "お相手";
  const elA = ELEMENTS[c.A.stem.element], elB = ELEMENTS[c.B.stem.element];
  const label = (d) => `${d.stem.yang ? "陽" : "陰"}の${ELEMENTS[d.stem.element].name}`;
  const who = { A: nA, B: nB }, elOf = { A: elA.name, B: elB.name };

  let desc;
  if (c.type === "same") desc = COMPAT_TEXT.same.desc(nA, nB, elA.name);
  else desc = COMPAT_TEXT[c.type].desc(who[c.from], who[c.to], elOf[c.from], elOf[c.to]);
  desc += c.polarityDiff
    ? " さらに陰と陽の組み合わせなので、凸凹がぴったりはまるバランスのよさもあります。"
    : " 陰陽も同じなので、テンポや価値観が近いふたりです。";

  const hearts = "💗".repeat(Math.round(c.total / 20)) + "🤍".repeat(5 - Math.round(c.total / 20));
  const rows = ["japan", "greece", "yokai", "legend"].map((key) => {
    const cat = CATEGORIES.find((x) => x.key === key);
    return `<tr><th>${cat.label}</th><td>${c.A.identities[key].name}</td><td class="x">×</td><td>${c.B.identities[key].name}</td></tr>`;
  }).join("");

  const shareText = `${nameA || "わたし"}（${label(c.A)}）× ${nameB || "お相手"}（${label(c.B)}）の相性は ${c.total}%！\n${COMPAT_TEXT[c.type].title}\n#八百万診断 #相性診断`;
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
      <h3>${COMPAT_TEXT[c.type].title}</h3>
      <p class="compat-desc">${desc}</p>
      ${compatBar("恋愛", c.sub.love)}
      ${compatBar("友情", c.sub.friend)}
      ${compatBar("仕事", c.sub.work)}
    </div>

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
      </div>
    </div>
  `;
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
      out.innerHTML = bestMatchesHTML(a.value, nA ? `${escapeHtml(nA)}さん` : "あなた");
      out.hidden = false;
      out.scrollIntoView({ behavior: "smooth" });
      return;
    }
    renderCompat(a.value, na.value.trim(), b.value, nb.value.trim());
  });
})();
