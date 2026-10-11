// アクセス解析（Google アナリティクス 4）
// js/config.js の gaMeasurementId（"G-" で始まる測定ID）が入っているときだけ動く。空なら何もしない。
// 生年月日・ニックネームなど、入力された内容は送らない（送るのは正体の名前や押したボタンの種類だけ）。

(function () {
  const id = typeof SITE_CONFIG !== "undefined" && SITE_CONFIG.gaMeasurementId;
  window.track = function () {};
  if (!id) return;

  const s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", id);

  // イベントを送る（例：track("diagnose", { identity: "スサノオ" })）
  window.track = function (name, params) {
    try { window.gtag("event", name, params || {}); } catch (e) {}
  };

  // ボタンやリンクが押されたときに、種類だけを記録する
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a, button");
    if (!a) return;
    if (a.classList.contains("share-btn")) {
      window.track("share", { method: a.classList.contains("x") ? "x" : "instagram", content: a.closest("#compat-result") ? "compat" : "identity" });
    } else if (a.id === "eki-draw") {
      window.track("eki_draw");
    } else if (a.tagName === "A" && /\bsponsored\b/.test(a.rel)) {
      const host = (a.hostname || "").replace(/^www\./, "");
      const network = /rakuten/.test(host) ? "rakuten" : /a8\.net/.test(host) ? "a8" : /moshimo|amazon/.test(host) ? "amazon" : /valuecommerce|jalan/.test(host) ? "jalan" : host;
      window.track("affiliate_click", { network, label: (a.textContent || "").trim().slice(0, 40) });
    } else if (a.classList.contains("cta-btn")) {
      window.track("cta_click", { label: (a.textContent || "").trim().slice(0, 40) });
    }
  });
  // 折りたたみを本人が押して開いたとき（最初から開いているものは数えない）
  document.addEventListener("click", (e) => {
    const sum = e.target.closest("summary");
    const d = sum && sum.parentElement;
    if (d && d.tagName === "DETAILS" && !d.open && d.id) window.track("fold_open", { section: d.id });
  });
})();
