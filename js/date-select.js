// 生年月日の入力を、カレンダーではなく「年・月・日」を選ぶ形にする
// （スマホではくるくる回すドラム式になる）。
// 元の <input type="date"> は見えない入れ物として残すので、ほかのJSは今までどおり .value で "YYYY-MM-DD" を読み書きできる。

function setupDateSelect(input) {
  const thisYear = new Date().getFullYear();
  const minYear = Number((input.min || "1900").slice(0, 4));
  const pad = (n) => String(n).padStart(2, "0");

  const make = (unit, label) => {
    const s = document.createElement("select");
    s.setAttribute("aria-label", label);
    s.innerHTML = `<option value="">--${unit}</option>`;
    return s;
  };
  const ySel = make("年", "生まれた年");
  const mSel = make("月", "生まれた月");
  const dSel = make("日", "生まれた日");
  // 年は新しい順（若い人ほどスクロールが短くてすむ）
  for (let y = thisYear; y >= minYear; y--) ySel.add(new Option(`${y}年`, y));
  for (let m = 1; m <= 12; m++) mSel.add(new Option(`${m}月`, m));

  // 月によって日数（28〜31日）を変える
  const fillDays = () => {
    const y = Number(ySel.value) || 2000; // 年が未選択ならうるう年扱いで29日まで出す
    const m = Number(mSel.value) || 1;
    const last = new Date(y, m, 0).getDate();
    const keep = dSel.value;
    dSel.length = 1;
    for (let d = 1; d <= last; d++) dSel.add(new Option(`${d}日`, d));
    if (keep && Number(keep) <= last) dSel.value = keep;
  };
  fillDays();

  const box = document.createElement("div");
  box.className = "date-select";
  box.append(ySel, mSel, dSel);
  if (input.required) [ySel, mSel, dSel].forEach((s) => (s.required = true));
  input.after(box);

  // 元の入力欄は隠し、ラベルを押したら「年」を選べるようにする
  input.type = "hidden";
  const label = document.querySelector(`label[for="${input.id}"]`);
  if (label) { ySel.id = input.id + "-year"; label.htmlFor = ySel.id; }

  // .value の読み書きを3つの選択欄とつなぐ
  Object.defineProperty(input, "value", {
    get() {
      if (!ySel.value || !mSel.value || !dSel.value) return "";
      return `${ySel.value}-${pad(mSel.value)}-${pad(dSel.value)}`;
    },
    set(v) {
      const [y, m, d] = String(v || "").split("-").map(Number);
      ySel.value = y || ""; mSel.value = m || "";
      fillDays();
      dSel.value = d || "";
    },
  });
  input.focus = () => ySel.focus();

  ySel.addEventListener("change", fillDays);
  mSel.addEventListener("change", fillDays);
}

document.querySelectorAll('input[type="date"]').forEach(setupDateSelect);
