// 本当の正体の総合判定
// 1. 四柱推命の日干で、10体の候補にしぼる
// 2. 西洋占星術（太陽・月・ASC・いちばん強い4元素）と、紫微斗数（命宮の主星）で点数をつける
// 3. いちばん点数の高いキャラが「本当の正体」。同点なら生年月日から決まる順番で選ぶ（毎回同じ結果になる）

const JUDGE_POINTS = { sun: 3, moon: 2, asc: 2, westTop: 1, ziwei: 3 };
const WEST_NAME = { fire: "火", earth: "地", air: "風", water: "水" };

function judgeTrueIdentity(birthday, fp, wc, zw) {
  const stem = fp.dayMaster;
  const candidates = TRUE_IDENTITIES.filter((c) => c.stem === stem);
  const westTop = wc ? Object.keys(wc.balance).filter((k) => wc.balance[k] === Math.max(...Object.values(wc.balance))) : [];

  const scored = candidates.map((c) => {
    let score = 0;
    const reasons = [];
    if (wc) {
      const sun = ZODIAC[wc.sun.sign];
      if (sun.el === c.west) { score += JUDGE_POINTS.sun; reasons.push(`太陽星座が${sun.name}（${WEST_NAME[sun.el]}）`); }
      const moon = ZODIAC[wc.moon.sign];
      if (!wc.moonUncertain && moon.el === c.west) { score += JUDGE_POINTS.moon; reasons.push(`月星座が${moon.name}（${WEST_NAME[moon.el]}）`); }
      if (wc.asc) {
        const asc = ZODIAC[wc.asc.sign];
        if (asc.el === c.west) { score += JUDGE_POINTS.asc; reasons.push(`アセンダントが${asc.name}（${WEST_NAME[asc.el]}）`); }
      }
      if (westTop.includes(c.west)) { score += JUDGE_POINTS.westTop; reasons.push(`ホロスコープで「${WEST_NAME[c.west]}」の元素が強い`); }
    }
    if (zw) {
      const hit = zw.mainStars.filter((s) => c.stars.includes(s));
      if (hit.length) { score += JUDGE_POINTS.ziwei * hit.length; reasons.push(`紫微斗数の命宮の主星が${hit.map((s) => s + "星").join("・")}`); }
    }
    return { c, score, reasons, tie: hashString(birthday + "|true|" + c.name) };
  });
  scored.sort((a, b) => b.score - a.score || a.tie - b.tie);

  const stemName = SC_STEMS[stem];
  const best = scored[0];
  return {
    identity: best.c,
    score: best.score,
    reasons: [`四柱推命の日干が「${stemName}」（${stem % 2 === 0 ? "陽" : "陰"}の${ELEMENTS[SC_ELEMENTS[Math.floor(stem / 2)]].name}）`, ...best.reasons],
    runnersUp: scored.slice(1, 3).map((s) => s.c),
    detailed: !!(zw && wc && wc.asc),
  };
}
