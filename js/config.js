// サイト設定。アフィリエイトの審査に通ったら、ここに自分のIDを入れるだけでリンクが有効になります。
// 空のままだと商品リンク欄は表示されません。
const SITE_CONFIG = {
  siteName: "八百万診断",
  siteUrl: "https://yaoyorozu-shindan.github.io/", // 公開後のURL。シェアボタンで使います。

  // Amazonアソシエイトのトラッキングタグ（例: "yourname-22"）
  amazonTag: "",

  // 楽天アフィリエイトID（楽天アフィリエイトの「アフィリエイトID」。例: "1a2b3c4d.5e6f7a8b.1a2b3c4d.5e6f7a8b"）
  rakutenAffiliateId: "11c8babe.a0490367.11c8babf.9411b51c",

  // じゃらん（バリューコマース経由）。バリューコマースでじゃらんnetと提携後、
  // 「MyLink」の広告タグに含まれる sid と pid の数字を入れます。
  valueCommerceSid: "",
  valueCommercePid: "",
};
