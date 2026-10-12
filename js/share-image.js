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
  ctx.fillStyle = '#efdaaa';
  const infoLine = [`${data.polarity}の${data.element.name}`, `日干 ${data.stemKanji}`, data.sukuyo, data.kyusei].filter(Boolean).join('  ·  ');
  fitText(ctx, infoLine, 540, 1470, 900, 32, 700);
  // 保存先でも作者・ライセンス・出典を確認できるよう、画像内に残す。
  if (image && asset) {
    ctx.fillStyle = '#c0bacd';
    const creditY = 1530;
    const height = drawShareLines(ctx, '画像：' + asset.credit, 540, creditY, 876, 22, 2);
    const source = new URL(asset.page || asset.src, SITE_CONFIG.siteUrl || location.href).href;
    drawShareLines(ctx, '出典：' + source, 540, creditY + height + 4, 876, 18, 4);
  }
  ctx.strokeStyle = '#efdaaa50'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(240, 1656); ctx.lineTo(840, 1656); ctx.stroke();
  ctx.fillStyle = '#fff5e3'; ctx.font = `700 38px ${SHARE_FONT}`;
  ctx.fillText('あなたは、100を超える正体のどれ？', 540, 1716);
  ctx.fillStyle = '#d8d0e5'; ctx.font = `500 28px ${SHARE_FONT}`;
  ctx.fillText((SITE_CONFIG.siteUrl || location.origin).replace(/^https?:\/\//, '').replace(/\/$/, ''), 540, 1766);
  // ハッシュタグは画面下端の操作ボタンと重ならない位置へ。
  ctx.fillStyle = gold; ctx.font = `700 32px ${SHARE_FONT}`;
  ctx.fillText('#八百万診断', 540, 1850);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image export failed')), 'image/png'));
}
// 画像を先に用意し、次のタップで共有する（Safariの操作判定を保つ）。
async function shareToInstagram(data, previewEl, text, builder) {
  // 入力内容・投稿文・共有先は送らず、操作名と診断の種類だけを記録する。
  const content = previewEl.closest("#compat-result") ? "compat" : "identity";
  const record = (event) => {
    try { if (typeof window.track === "function") window.track(event, { content }); } catch (error) {}
  };
  record("share_image_request");
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
    if (previewEl.shareRequest === request && previewEl.isConnected) {
      record("share_image_error");
      previewEl.innerHTML = '<p role="status">画像を作れませんでした。もう一度お試しください。</p>';
    }
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
    <p>iPhoneで保存画面が開いた場合は、画像を開いて共有ボタンから「画像を保存」を選んでください。画像の長押しでも保存できます。</p>
    <div class="insta-caption">
      <label>Instagram用の投稿文<textarea class="post-caption" readonly rows="12" spellcheck="false"></textarea></label>
      <button type="button" class="share-btn insta copy-caption">投稿文をコピー</button>
      <p class="caption-status" role="status">コピーした文章を、Instagramのキャプション欄やストーリーズの文字入力に貼り付けてください。</p>
    </div>`;
  record("share_image_ready");
  // 保存ボタンのクリック。端末への保存完了や画像の長押し保存は確認できない。
  previewEl.querySelector('.save').addEventListener('click', () => record("share_image_save_click"));
  const caption = previewEl.querySelector('.post-caption');
  caption.value = text || '';
  const copyButton = previewEl.querySelector('.copy-caption');
  const copyStatus = previewEl.querySelector('.caption-status');
  copyButton.addEventListener('click', async () => {
    copyButton.disabled = true;
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(caption.value);
      record("share_caption_copy");
      copyStatus.textContent = '投稿文をコピーしました。Instagramの投稿画面で貼り付けてください。';
    } catch (error) {
      record("share_caption_copy_error");
      caption.focus();
      caption.select();
      caption.setSelectionRange(0, caption.value.length);
      copyStatus.textContent = '自動でコピーできませんでした。文章を長押しするか、選択した文章をコピーしてください。';
    } finally { copyButton.disabled = false; }
  });
  if (canShare) {
    const button = previewEl.querySelector('.image-share');
    const status = previewEl.querySelector('.share-status');
    button.addEventListener('click', async () => {
      button.disabled = true;
      record("share_menu_request");
      try {
        // 他の非同期処理を挟まず、タップ直後に画像だけを渡す。
        await navigator.share({ files: [file] });
        // APIから正常に戻っただけ。共有先や投稿完了を意味しない。
        record("share_menu_return");
        status.textContent = 'Instagramが見つからなかった場合は、画像を保存して投稿してください。';
      } catch (error) {
        // AbortError はキャンセルのほか、共有先がない場合も含む。
        record(error.name === 'AbortError' ? "share_menu_abort" : "share_menu_error");
        status.textContent = error.name === 'AbortError'
          ? '共有を閉じました。もう一度共有するか、画像を保存できます。'
          : '共有メニューを開けませんでした。画像を保存してInstagramから投稿してください。';
      } finally { button.disabled = false; }
    });
  }
  previewEl.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
}
// ---- ふたりの本当の正体が主役の相性シェア画像（1080×1920）----
async function buildCompatShareImage(data) {
  const assets = [data.trueA, data.trueB].map(name => typeof IMAGES !== 'undefined' ? IMAGES[name] : null);
  const portraits = await Promise.all(assets.map(asset => loadSharePortrait(asset && asset.src)));
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  const legendary = !!data.legendTitle;
  const gold = legendary ? '#ffe3a0' : '#efdaaa';
  ctx.fillStyle = '#090d1d'; ctx.fillRect(0, 0, 1080, 1920);
  [data.elA, data.elB].forEach((el, i) => {
    const x = i === 0 ? 300 : 780;
    const glow = ctx.createRadialGradient(x, 600, 20, x, 600, 760);
    glow.addColorStop(0, el.color + 'cc'); glow.addColorStop(.6, el.color + '50'); glow.addColorStop(1, '#090d1d00');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, 1080, 1920);
    [252, 277, 300].forEach((r, j) => {
      ctx.beginPath(); ctx.arc(x, 590, r, 0, Math.PI * 2);
      ctx.lineWidth = j === 1 ? 2 : 1; ctx.strokeStyle = j === 1 ? '#efdaaa70' : '#efdaaa30'; ctx.stroke();
    });
  });
  if (legendary) {
    // 伝説の縁だけに、金の後光と放射状の光を重ねる。
    ctx.save();
    const halo=ctx.createRadialGradient(540,590,80,540,590,880);
    halo.addColorStop(0,'#fff1ad70');halo.addColorStop(.42,'#d39b3640');halo.addColorStop(1,'#d39b3600');
    ctx.fillStyle=halo;ctx.fillRect(0,0,1080,1920);
    ctx.translate(540,590);
    for(let i=0;i<32;i++){
      ctx.rotate(Math.PI/16);
      const ray=ctx.createLinearGradient(0,-140,0,-970);
      ray.addColorStop(0,'#ffe5a600');ray.addColorStop(.35,'#ffe5a630');ray.addColorStop(1,'#ffe5a600');
      ctx.fillStyle=ray;ctx.beginPath();ctx.moveTo(-3,-140);ctx.lineTo(-28,-970);ctx.lineTo(28,-970);ctx.lineTo(3,-140);ctx.fill();
    }
    ctx.restore();
  }
  for (let i=0; i<56; i++) {
    const x = 95 + (i * 137 % 890), y = 250 + (i * 193 % 1210);
    ctx.fillStyle = i % 3 ? '#ffffff60' : gold;
    ctx.beginPath(); ctx.arc(x,y,i % 3 ? 2 : 3.5,0,Math.PI*2); ctx.fill();
  }
  ctx.strokeStyle = '#efdaaa66'; ctx.lineWidth = 2;
  roundRect(ctx,54,92,972,1740,38); ctx.stroke();
  ctx.strokeStyle = '#efdaaa26';
  roundRect(ctx,68,106,944,1712,30); ctx.stroke();
  if(legendary){
    ctx.save();ctx.strokeStyle=gold;ctx.lineWidth=3;ctx.shadowColor='#ffc85a';ctx.shadowBlur=14;
    roundRect(ctx,54,92,972,1740,38);ctx.stroke();
    // 四隅の装飾。上下左右を反転して同じ意匠を揃える。
    [[84,122,1,1],[996,122,-1,1],[84,1802,1,-1],[996,1802,-1,-1]].forEach(([x,y,sx,sy])=>{
      ctx.save();ctx.translate(x,y);ctx.scale(sx,sy);ctx.beginPath();
      ctx.moveTo(0,108);ctx.lineTo(0,22);ctx.quadraticCurveTo(0,0,22,0);ctx.lineTo(108,0);
      ctx.moveTo(12,76);ctx.bezierCurveTo(58,72,64,24,25,25);ctx.bezierCurveTo(8,25,16,58,43,43);ctx.stroke();
      ctx.fillStyle=gold;ctx.beginPath();ctx.moveTo(70,13);ctx.lineTo(79,24);ctx.lineTo(70,35);ctx.lineTo(61,24);ctx.closePath();ctx.fill();ctx.restore();
    });ctx.restore();
  }
  ctx.textAlign = 'center'; ctx.fillStyle = gold;
  ctx.font = `700 44px ${SHARE_FONT}`; ctx.fillText('八 百 万 診 断',540,198);
  ctx.fillStyle = '#fff5e3'; ctx.font = `700 42px ${SHARE_FONT}`;
  ctx.fillText('ふたりの本当の正体',540,270);
  const sides = [
    {x:112,cx:303,name:data.nameA,trueName:data.trueA,kana:data.kanaA,catch:data.catchA,el:data.elA,label:data.labelA},
    {x:586,cx:777,name:data.nameB,trueName:data.trueB,kana:data.kanaB,catch:data.catchB,el:data.elB,label:data.labelB},
  ];
  sides.forEach((side,i) => {
    ctx.fillStyle = '#e0dbe9'; fitText(ctx,side.name,side.cx,328,370,34,700);
    ctx.save(); roundRect(ctx,side.x,366,382,466,65); ctx.clip();
    ctx.fillStyle = '#101628'; ctx.fillRect(side.x,366,382,466);
    const image = portraits[i];
    if (image) {
      const scale = Math.min(382/image.naturalWidth,466/image.naturalHeight);
      const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
      ctx.drawImage(image,side.cx-w/2,599-h/2,w,h);
    } else {
      const mist=ctx.createRadialGradient(side.cx,599,10,side.cx,599,250);
      mist.addColorStop(0,side.el.color);mist.addColorStop(1,'#101628');
      ctx.fillStyle=mist;ctx.fillRect(side.x,366,382,466);
      ctx.fillStyle=gold;ctx.font=`500 150px ${SHARE_FONT}`;ctx.fillText(side.el.name,side.cx,656);
    }
    ctx.restore();ctx.lineWidth=2;ctx.strokeStyle='#efdaaaa0';
    roundRect(ctx,side.x,366,382,466,65);ctx.stroke();
    if(legendary){ctx.save();ctx.strokeStyle=gold;ctx.lineWidth=3;ctx.shadowColor='#ffcb65';ctx.shadowBlur=22;
      roundRect(ctx,side.x-7,359,396,480,70);ctx.stroke();ctx.restore();}
    ctx.fillStyle=gold;fitText(ctx,side.trueName || '',side.cx,914,386,64,800);
    if(side.kana){ctx.fillStyle='#cfc8df';fitText(ctx,side.kana,side.cx,952,370,24,500);}
    ctx.fillStyle='#efdaaa';fitText(ctx,side.label,side.cx,997,370,27,700);
    ctx.fillStyle='#fff5e3';drawShareLines(ctx,side.catch || '',side.cx,1050,370,29,2,500);
  });
  ctx.fillStyle=gold;ctx.font=`300 52px ${SHARE_FONT}`;ctx.fillText('×',540,606);
  // 相性％を中央に大きく。恋愛・友情・仕事は読みやすい3列に。
  ctx.fillStyle='#d9d2e4';ctx.font=`700 28px ${SHARE_FONT}`;ctx.fillText('ふたりの相性',540,1160);
  ctx.save();
  if(legendary){ctx.shadowColor='#ffbb45';ctx.shadowBlur=34;}
  ctx.fillStyle=legendary ? gold : '#fff3d6';ctx.font=`800 166px ${SHARE_FONT}`;ctx.fillText(`${data.total}%`,540,1322);
  ctx.restore();
  if(legendary){
    ctx.save();
    const panel=ctx.createLinearGradient(0,1355,0,1478);
    panel.addColorStop(0,'#67461d');panel.addColorStop(.5,'#2b2118');panel.addColorStop(1,'#503319');
    ctx.fillStyle=panel;ctx.strokeStyle=gold;ctx.lineWidth=2;
    roundRect(ctx,112,1355,856,132,18);ctx.fill();ctx.stroke();
    const ribbon=ctx.createLinearGradient(300,0,780,0);
    ribbon.addColorStop(0,'#a76b21');ribbon.addColorStop(.5,'#ffe6a7');ribbon.addColorStop(1,'#a76b21');
    ctx.fillStyle=ribbon;ctx.beginPath();ctx.moveTo(290,1338);ctx.lineTo(790,1338);ctx.lineTo(766,1363);ctx.lineTo(790,1388);ctx.lineTo(290,1388);ctx.lineTo(314,1363);ctx.closePath();ctx.fill();
    ctx.fillStyle='#30200e';ctx.font=`800 28px ${SHARE_FONT}`;ctx.fillText('✦  伝説の組み合わせ  ✦',540,1374);
    ctx.fillStyle='#fff4d4';drawShareLines(ctx,`「${data.legendTitle}」`,540,1434,798,38,2,700);
    ctx.restore();
  }else{
    ctx.fillStyle=gold;ctx.font=`700 26px ${SHARE_FONT}`;ctx.fillText('ふたりを例えると',540,1380);
    ctx.fillStyle='#fff5e3';drawShareLines(ctx,data.title,540,1435,840,40,2,700);
  }
  const bars=[['恋愛',data.sub.love],['友情',data.sub.friend],['仕事',data.sub.work]];
  bars.forEach(([label,value],i)=>{
    const x=270+i*270;
    ctx.fillStyle='#cec6dd';ctx.font=`500 24px ${SHARE_FONT}`;ctx.fillText(label,x,1522);
    ctx.fillStyle=gold;ctx.font=`800 40px ${SHARE_FONT}`;ctx.fillText(`${value}%`,x,1570);
  });
  // 宿曜の相性（三九の秘法）
  if(data.sukuyo){ctx.fillStyle='#efdaaa';fitText(ctx,`宿曜の相性  ·  ${data.sukuyo}`,540,1622,860,28,700);}
  // ふたりの画像の作者・ライセンス・出典を、それぞれ保存画像内に残す。
  let creditY=data.sukuyo ? 1660 : 1616;
  assets.forEach((asset,i)=>{
    if(!portraits[i] || !asset)return;
    ctx.fillStyle='#bdb6cc';
    const height=drawShareLines(ctx,`${i===0?'左':'右'}の画像：${asset.credit}`,540,creditY,878,18,2);
    const source=new URL(asset.page || asset.src,SITE_CONFIG.siteUrl || location.href).href;
    const sourceHeight=drawShareLines(ctx,'出典：'+source,540,creditY+height,878,14,3);
    creditY+=height+sourceHeight+10;
  });
  ctx.fillStyle='#fff5e3';ctx.font=`700 30px ${SHARE_FONT}`;
  ctx.fillText('あなたとあの人は、どんな組み合わせ？',540,1788);
  ctx.fillStyle='#d8d0e5';ctx.font=`500 24px ${SHARE_FONT}`;
  ctx.fillText((SITE_CONFIG.siteUrl || location.origin).replace(/^https?:\/\//,'').replace(/\/$/,''),540,1825);
  ctx.fillStyle=gold;ctx.font=`700 28px ${SHARE_FONT}`;
  ctx.fillText('#八百万診断  #相性診断',540,1870);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Image export failed')),'image/png'));
}