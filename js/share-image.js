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

  // 見出し
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `700 44px ${SHARE_FONT}`;
  ctx.fillText("⛩️ 八百万診断", W / 2, 170);
  ctx.fillStyle = "#fff";
  fitText(ctx, `${data.who}の正体は…`, W / 2, 290, 900, 60, 700);
  ctx.font = `120px ${SHARE_FONT}`;
  ctx.fillText(data.element.icon, W / 2, 470);
  ctx.font = `800 150px ${SHARE_FONT}`;
  ctx.fillText(`${data.polarity}の${data.element.name}`, W / 2, 650);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `500 40px ${SHARE_FONT}`;
  ctx.fillText(`日干：${data.stemKanji}`, W / 2, 725);

  // 正体の一覧
  const rows = [
    ...CATEGORIES.map((c) => [c.label, data.identities[c.key].name]),
    ["相性のいい神社", data.shrine.name],
    ["守護パワーストーン", data.power.name],
  ];
  const top = 800, rowH = 96, left = 110, right = W - 110;
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  roundRect(ctx, 70, top, W - 140, rows.length * rowH + 50, 36);
  ctx.fill();
  rows.forEach(([label, name], i) => {
    const y = top + 25 + i * rowH + 62;
    if (i > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(left, y - 66, right - left, 2);
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

// ボタンが押されたとき：スマホなら共有メニュー（インスタを選べる）、それ以外は保存用のプレビューを出す
async function shareToInstagram(data, previewEl, text) {
  const blob = await buildShareImage(data);
  const file = new File([blob], "yaoyorozu-shindan.png", { type: "image/png" });
  const url = URL.createObjectURL(blob);
  previewEl.innerHTML = `
    <img src="${url}" alt="診断結果のシェア画像">
    <p>画像を保存して、Instagramのストーリーズや投稿に使ってください。<br>スマホは画像を長押しでも保存できます。</p>
    <a class="share-btn save" href="${url}" download="yaoyorozu-shindan.png">画像を保存する</a>`;
  previewEl.hidden = false;

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
    } catch (e) {
      // 共有メニューを閉じただけなら何もしない
    }
  } else {
    previewEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}
