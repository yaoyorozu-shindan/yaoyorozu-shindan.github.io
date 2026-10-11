// インスタ用のシェア画像（ストーリーズサイズ 1080×1920）を作る

const SHARE_FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Meiryo", sans-serif';

// 指定幅に収まるまで文字を小さくして描く
function fitText(ctx, text, x, y, maxWidth, size, weight) {
  let s = size;
  do {
    ctx.font = `${weight} ${s}px ${SHARE_FONT}`;
    s -= 2;
  } while (ctx.measureText(text).width > maxWidth && s > 20);
  ctx.fillText(text, x, y);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// data: { who, element, polarity, stemKanji, identities, shrine, power }
function buildShareImage(data) {
  const W = 1080, H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // 背景
  const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
  bg.addColorStop(0, data.element.color);
  bg.addColorStop(1, "#1e1a33");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  [[920, 260, 300], [120, 1500, 380], [980, 1650, 160]].forEach(([x, y, r]) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.font = `700 520px ${SHARE_FONT}`;
  ctx.textAlign = "right";
  ctx.fillText(data.element.name, W - 30, 760);

  // 見出し：本当の正体を主役に
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `700 44px ${SHARE_FONT}`;
  ctx.fillText("⛩️ 八百万診断", W / 2, 150);
  ctx.fillStyle = "#fff";
  fitText(ctx, `${data.who}の本当の正体は——`, W / 2, 260, 900, 54, 700);
  fitText(ctx, data.trueName || "", W / 2, 420, 960, 140, 800);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  // 漢字の名前なら読みがなを名前の下に入れ、キャッチコピーを少し下げる
  if (data.trueKana) fitText(ctx, data.trueKana, W / 2, 475, 960, 36, 700);
  fitText(ctx, data.trueCatch ? `「${data.trueCatch}」` : "", W / 2, data.trueKana ? 540 : 510, 960, 48, 700);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `500 40px ${SHARE_FONT}`;
  ctx.fillText(`${data.element.icon} ${data.polarity}の${data.element.name}（日干：${data.stemKanji}）`, W / 2, 600);

  // 正体の一覧
  const rows = [
    ...CATEGORIES.map((c) => [c.label, data.identities[c.key].name]),
    ["相性のいい神社", data.shrine.name],
    ["守護パワーストーン", data.power.name],
  ];
  const top = 670, rowH = Math.min(96, Math.floor(940 / rows.length)), left = 110, right = W - 110;
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  roundRect(ctx, 70, top, W - 140, rows.length * rowH + 50, 36);
  ctx.fill();
  rows.forEach(([label, name], i) => {
    const y = top + 25 + i * rowH + Math.round(rowH * 0.65);
    if (i > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(left, y - Math.round(rowH * 0.69), right - left, 2);
    }
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = `500 34px ${SHARE_FONT}`;
    ctx.fillText(label, left, y);
    ctx.textAlign = "right";
    ctx.fillStyle = "#fff";
    fitText(ctx, name, right, y, 560, 52, 700);
  });

  // フッター
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = `700 48px ${SHARE_FONT}`;
  ctx.fillText("あなたの正体も診断してみて！", W / 2, 1720);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = `500 40px ${SHARE_FONT}`;
  ctx.fillText((SITE_CONFIG.siteUrl || location.origin).replace(/^https?:\/\//, "").replace(/\/$/, ""), W / 2, 1795);
  ctx.fillText("#八百万診断", W / 2, 1860);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

// 画像を先に用意し、次のタップで共有する（Safariの操作判定を保つ）。
async function shareToInstagram(data, previewEl, text, builder) {
  const request = {};
  previewEl.shareRequest = request;
  if (previewEl.shareImageUrl) {
    URL.revokeObjectURL(previewEl.shareImageUrl);
    previewEl.shareImageUrl = null;
  }
  previewEl.hidden = false;
  previewEl.innerHTML = '<p role="status">インスタ用の画像を作っています…</p>';
  let blob;
  try {
    blob = await (builder || buildShareImage)(data);
    if (!blob) throw new Error('Image creation failed');
  } catch (error) {
    if (previewEl.shareRequest === request) previewEl.innerHTML = '<p role="status">画像を作れませんでした。もう一度お試しください。</p>';
    return;
  }
  if (previewEl.shareRequest !== request || !previewEl.isConnected) return;
  const file = new File([blob], 'yaoyorozu-shindan.png', { type: 'image/png' });
  const url = URL.createObjectURL(blob);
  previewEl.shareImageUrl = url;
  let canShare = false;
  try { canShare = !!(navigator.share && navigator.canShare && navigator.canShare({ files: [file] })); } catch (error) {}
  previewEl.innerHTML = `
    <img src="${url}" alt="診断結果のインスタ用画像">
    <p>画像ができました。共有メニューでInstagramを選んでください。<br>Instagramが見つからないときは「画像を保存」で写真に保存し、Instagramのストーリーズや投稿から選んでください。</p>
    <div class="share-btns">
      ${canShare ? '<button type="button" class="share-btn insta image-share">共有メニューを開く</button>' : ''}
      <a class="share-btn save" href="${url}" download="yaoyorozu-shindan.png">画像を保存する</a>
    </div>
    <p class="share-status" role="status">${canShare ? 'Instagramアプリは、共有先で選んだ後に開きます。' : 'このブラウザでは画像の共有に対応していません。保存して投稿してください。'}</p>
    <p>iPhoneで保存画面が開いた場合は、画像を開いて共有ボタンから「画像を保存」を選んでください。画像の長押しでも保存できます。</p>`;
  if (canShare) {
    const button = previewEl.querySelector('.image-share');
    const status = previewEl.querySelector('.share-status');
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        // 他の非同期処理を挟まず、タップ直後に画像だけを渡す。
        await navigator.share({ files: [file] });
        status.textContent = 'Instagramが見つからなかった場合は、画像を保存して投稿してください。';
      } catch (error) {
        status.textContent = error.name === 'AbortError'
          ? '共有を閉じました。もう一度共有するか、画像を保存できます。'
          : '共有メニューを開けませんでした。画像を保存してInstagramから投稿してください。';
      } finally { button.disabled = false; }
    });
  }
  previewEl.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
}
// ---- 相性診断のシェア画像（1080×1920）----
// data: { nameA, nameB, elA, elB, labelA, labelB, total, title, sub: {love, friend, work}, pairs: [[ラベル, A, B]], shrine }
function buildCompatShareImage(data) {
  const W = 1080, H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // 背景：ふたりの属性カラーを混ぜたグラデーション
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, data.elA.color);
  bg.addColorStop(0.55, "#2a2045");
  bg.addColorStop(1, data.elB.color);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  [[150, 300, 260], [950, 1500, 320]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `700 44px ${SHARE_FONT}`;
  ctx.fillText("💞 八百万診断 相性診断", W / 2, 160);

  // ふたりの名前と属性
  const colX = [W * 0.27, W * 0.73];
  [[data.nameA, data.elA, data.labelA], [data.nameB, data.elB, data.labelB]].forEach(([name, el, lab], i) => {
    ctx.fillStyle = "#fff";
    ctx.font = `100px ${SHARE_FONT}`;
    ctx.fillText(el.icon, colX[i], 330);
    fitText(ctx, name, colX[i], 430, 420, 56, 800);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = `500 36px ${SHARE_FONT}`;
    ctx.fillText(lab, colX[i], 485);
    const trueName = i === 0 ? data.trueA : data.trueB;
    if (trueName) { ctx.fillStyle = "#fff"; fitText(ctx, `正体：${trueName}`, colX[i], 545, 440, 42, 800); }
  });
  ctx.fillStyle = "#fff";
  ctx.font = `300 80px ${SHARE_FONT}`;
  ctx.fillText("×", W / 2, 400);

  // 相性％
  ctx.font = `800 230px ${SHARE_FONT}`;
  const numW = ctx.measureText(String(data.total)).width;
  ctx.font = `800 90px ${SHARE_FONT}`;
  const pctW = ctx.measureText("%").width;
  const startX = W / 2 - (numW + pctW) / 2;
  ctx.textAlign = "left";
  ctx.font = `800 230px ${SHARE_FONT}`;
  ctx.fillText(String(data.total), startX, 760);
  ctx.font = `800 90px ${SHARE_FONT}`;
  ctx.fillText("%", startX + numW + 6, 760);
  ctx.textAlign = "center";
  fitText(ctx, data.title, W / 2, 850, 900, 58, 700);

  // 恋愛・友情・仕事のバー
  const bars = [["恋愛", data.sub.love], ["友情", data.sub.friend], ["仕事", data.sub.work]];
  bars.forEach(([lab, v], i) => {
    const y = 950 + i * 70;
    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    ctx.font = `700 36px ${SHARE_FONT}`;
    ctx.fillText(lab, 130, y + 12);
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    roundRect(ctx, 240, y - 14, 600, 28, 14); ctx.fill();
    ctx.fillStyle = "#fff";
    roundRect(ctx, 240, y - 14, Math.max(28, 600 * v / 100), 28, 14); ctx.fill();
    ctx.textAlign = "right";
    ctx.fillText(`${v}%`, 950, y + 12);
  });

  // ふたりを例えると
  const top = 1125, rowH = 112;
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  roundRect(ctx, 70, top, W - 140, data.pairs.length * rowH + 100, 36); ctx.fill();
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = `700 38px ${SHARE_FONT}`;
  ctx.fillText("ふたりを例えると…", W / 2, top + 62);
  data.pairs.forEach(([lab, a, b], i) => {
    const y = top + 160 + i * rowH;
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = `500 28px ${SHARE_FONT}`;
    ctx.fillText(lab, W / 2, y - 50);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "right"; fitText(ctx, a, W / 2 - 40, y, 360, 44, 700);
    ctx.textAlign = "center"; ctx.font = `400 36px ${SHARE_FONT}`; ctx.fillText("×", W / 2, y);
    ctx.textAlign = "left"; fitText(ctx, b, W / 2 + 40, y, 360, 44, 700);
    ctx.textAlign = "center";
  });

  // フッター
  ctx.fillStyle = "#fff";
  ctx.font = `700 40px ${SHARE_FONT}`;
  fitText(ctx, `ふたりで行きたい神社：${data.shrine}`, W / 2, 1745, 940, 40, 700);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = `500 38px ${SHARE_FONT}`;
  ctx.fillText((SITE_CONFIG.siteUrl || location.origin).replace(/^https?:\/\//, "").replace(/\/$/, ""), W / 2, 1815);
  ctx.fillText("#八百万診断 #相性診断", W / 2, 1870);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
