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

// 改行しながら中央に描画。長い名前・コピーも枠の中に収める。
function shareTextLines(ctx, text, width, size, maxLines, weight = 500) {
  let lines;
  do {
    ctx.font = `${weight} ${size}px ${SHARE_FONT}`;
    lines = [''];
    for (const char of Array.from(text)) {
      if (char === '\n') { lines.push(''); continue; }
      const last = lines.length - 1;
      if (ctx.measureText(lines[last] + char).width > width && lines[last]) lines.push(char);
      else lines[last] += char;
    }
    if (lines.length <= maxLines || size <= 12) break;
    size -= 2;
  } while (true);
  return { lines, size };
}

function drawShareLines(ctx, text, x, y, width, size, maxLines, weight = 500) {
  const fitted = shareTextLines(ctx, text, width, size, maxLines, weight);
  fitted.lines.forEach((line, i) => ctx.fillText(line, x, y + i * fitted.size * 1.4));
  return fitted.lines.length * fitted.size * 1.4;
}

// CORSに対応した画像だけを描く。失敗時も保存できる光輪の絵を用意する。
function loadSharePortrait(src) {
  if (!src) return Promise.resolve(null);
  return new Promise(resolve => {
    const image = new Image();
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      image.onload = image.onerror = null;
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), 4500);
    image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';
    image.onload = () => finish(image);
    image.onerror = () => finish(null);
    image.src = src;
  });
}

async function buildShareImage(data) {
  const asset = typeof IMAGES !== 'undefined' ? IMAGES[data.trueName] : null;
  const image = await loadSharePortrait(asset && asset.src);
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const color = data.element.color;
  const gold = '#efdaaa';
  // 深い夜色と属性の光。外枠はストーリーズの上下UIから離して置く。
  ctx.fillStyle = '#090d1d'; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(540, 710, 40, 540, 710, 850);
  glow.addColorStop(0, color); glow.addColorStop(.55, color + '66'); glow.addColorStop(1, '#090d1d00');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#efdaaa66'; ctx.lineWidth = 2;
  roundRect(ctx, 54, 92, 972, 1720, 38); ctx.stroke();
  ctx.strokeStyle = '#efdaaa26';
  roundRect(ctx, 68, 106, 944, 1692, 30); ctx.stroke();
  // 3重の光輪と、小さな星の装飾。
  [402, 428, 460].forEach((radius, i) => {
    ctx.beginPath(); ctx.arc(540, 710, radius, 0, Math.PI * 2);
    ctx.strokeStyle = i === 1 ? '#efdaaa80' : '#efdaaa38';
    ctx.lineWidth = i === 1 ? 3 : 1; ctx.stroke();
  });
  for (let i = 0; i < 56; i++) {
    const angle = i * 2.39996, radius = 420 + i % 6 * 27;
    const x = 540 + Math.cos(angle) * radius, y = 710 + Math.sin(angle) * radius;
    ctx.fillStyle = i % 3 === 0 ? gold : '#ffffff75';
    const r = i % 3 === 0 ? 4 : 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = gold;
  ctx.font = `700 44px ${SHARE_FONT}`; ctx.fillText('八 百 万 診 断', 540, 198);
  ctx.fillStyle = '#edf0fa';
  fitText(ctx, `${data.who}の本当の正体は`, 540, 284, 880, 38, 500);
  // 大きな画像。元の絵を切らず、縦横比を保って額の中に収める。
  ctx.save();
  roundRect(ctx, 186, 356, 708, 708, 100); ctx.clip();
  ctx.fillStyle = '#101628'; ctx.fillRect(186, 356, 708, 708);
  if (image) {
    const scale = Math.min(708 / image.naturalWidth, 708 / image.naturalHeight);
    const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
    ctx.drawImage(image, 540 - w / 2, 710 - h / 2, w, h);
  } else {
    const mist = ctx.createRadialGradient(540, 710, 10, 540, 710, 360);
    mist.addColorStop(0, color); mist.addColorStop(1, '#101628');
    ctx.fillStyle = mist; ctx.fillRect(186, 356, 708, 708);
    ctx.fillStyle = gold; ctx.font = `500 240px ${SHARE_FONT}`;
    ctx.fillText(data.element.name, 540, 786);
    ctx.font = `500 28px ${SHARE_FONT}`; ctx.fillText('神話と伝承に宿る、あなたの姿', 540, 910);
  }
  ctx.restore();
  ctx.strokeStyle = '#efdaaaa0'; ctx.lineWidth = 3;
  roundRect(ctx, 186, 356, 708, 708, 100); ctx.stroke();
  // 画像の下に大きな名前。情報は主役に必要なものだけ。
  ctx.fillStyle = gold;
  fitText(ctx, data.trueName || '', 540, 1198, 900, 116, 800);
  const kanaY = 1256;
  if (data.trueKana) {
    ctx.fillStyle = '#d2ccdf'; fitText(ctx, data.trueKana, 540, kanaY, 860, 28, 500);
  }
  const catchY = 1320;
  ctx.fillStyle = '#fff5e3';
  drawShareLines(ctx, data.trueCatch ? `「${data.trueCatch}」` : '', 540, catchY, 864, 42, 2, 700);
  ctx.fillStyle = '#efdaaa'; ctx.font = `700 32px ${SHARE_FONT}`;
  ctx.fillText(`${data.polarity}の${data.element.name}  ·  日干 ${data.stemKanji}`, 540, 1470);
  // 保存先でも作者・ライセンス・出典を確認できるよう、画像内に残す。
  if (image && asset) {
    ctx.fillStyle = '#c0bacd';
    const creditY = 1530;
    const height = drawShareLines(ctx, '画像：' + asset.credit, 540, creditY, 876, 22, 2);
    const source = new URL(asset.page || asset.src, location.href).href;
    drawShareLines(ctx, '出典：' + source, 540, creditY + height + 4, 876, 18, 4);
  }
  ctx.strokeStyle = '#efdaaa50'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(240, 1656); ctx.lineTo(840, 1656); ctx.stroke();
  ctx.fillStyle = '#fff5e3'; ctx.font = `700 38px ${SHARE_FONT}`;
  ctx.fillText('あなたは、100の正体のどれ？', 540, 1716);
  ctx.fillStyle = '#d8d0e5'; ctx.font = `500 28px ${SHARE_FONT}`;
  ctx.fillText((SITE_CONFIG.siteUrl || location.origin).replace(/^https?:\/\//, '').replace(/\/$/, ''), 540, 1766);
  // ハッシュタグは画面下端の操作ボタンと重ならない位置へ。
  ctx.fillStyle = gold; ctx.font = `700 32px ${SHARE_FONT}`;
  ctx.fillText('#八百万診断', 540, 1850);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image export failed')), 'image/png'));
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
