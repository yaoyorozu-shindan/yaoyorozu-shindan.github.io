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
    const signals = [];
    if (wc) {
      const sun = ZODIAC[wc.sun.sign];
      if (sun.el === c.west) { score += JUDGE_POINTS.sun; reasons.push(`太陽星座が${sun.name}（${WEST_NAME[sun.el]}）`); signals.push({ kind: "west", label: "太陽星座", detail: `${sun.name}の「${WEST_NAME[sun.el]}」`, role: "表に現れる自分らしさ", points: JUDGE_POINTS.sun }); }
      const moon = ZODIAC[wc.moon.sign];
      if (!wc.moonUncertain && moon.el === c.west) { score += JUDGE_POINTS.moon; reasons.push(`月星座が${moon.name}（${WEST_NAME[moon.el]}）`); signals.push({ kind: "west", label: "月星座", detail: `${moon.name}の「${WEST_NAME[moon.el]}」`, role: "心の内側や素の自分", points: JUDGE_POINTS.moon }); }
      if (wc.asc) {
        const asc = ZODIAC[wc.asc.sign];
        if (asc.el === c.west) { score += JUDGE_POINTS.asc; reasons.push(`アセンダントが${asc.name}（${WEST_NAME[asc.el]}）`); signals.push({ kind: "west", label: "アセンダント", detail: `${asc.name}の「${WEST_NAME[asc.el]}」`, role: "人に伝わる第一印象", points: JUDGE_POINTS.asc }); }
      }
      if (westTop.includes(c.west)) { score += JUDGE_POINTS.westTop; reasons.push(`ホロスコープで「${WEST_NAME[c.west]}」の元素が強い`); signals.push({ kind: "west", label: "星全体のバランス", detail: `「${WEST_NAME[c.west]}」が最も強い元素のひとつ`, role: "星全体に見られる傾向", points: JUDGE_POINTS.westTop }); }
    }
    if (zw) {
      const hit = zw.mainStars.filter((s) => c.stars.includes(s));
      if (hit.length) { score += JUDGE_POINTS.ziwei * hit.length; reasons.push(`紫微斗数の命宮の主星が${hit.map((s) => s + "星").join("・")}`); signals.push({ kind: "ziwei", label: "命宮の主星", detail: hit.map(s => s + "星").join("・"), role: "紫微斗数で読む本質の手がかり", points: JUDGE_POINTS.ziwei * hit.length }); }
    }
    return { c, score, reasons, signals, tie: hashString(birthday + "|true|" + c.name) };
  });
  scored.sort((a, b) => b.score - a.score || a.tie - b.tie);

  const stemName = SC_STEMS[stem];
  const best = scored[0];
  return {
    identity: best.c,
    score: best.score,
    signals: best.signals,
    tied: scored.filter(s => s.score === best.score).length > 1,
    reasons: [`四柱推命の日干が「${stemName}」（${stem % 2 === 0 ? "陽" : "陰"}の${ELEMENTS[SC_ELEMENTS[Math.floor(stem / 2)]].name}）`, ...best.reasons],
    runnersUp: scored.slice(1, 3).map((s) => s.c),
    detailed: !!(zw && wc && wc.asc),
  };
}

// 正体の名前（漢字なら上に読みがなを付ける）
function nameRuby(t) {
  return t.kana ? `<ruby>${t.name}<rt>${t.kana}</rt></ruby>` : t.name;
}
