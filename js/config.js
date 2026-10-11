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

  // 占い師への相談（A8.net）。A8の「広告リンク作成」のテキスト広告から、リンク先(href)と計測用の画像(pixel)を入れます。
  // 空のままにすると、その案件は表示されません。
  consult: [
    { label: "電話占い【ココナラ】新規会員登録で3,000円無料クーポンプレゼント中", note: "電話で相談",
      href: "https://px.a8.net/svt/ejp?a8mat=4BEESZ+A94RUA+2PEO+C3BAQ", pixel: "https://www16.a8.net/0.gif?a8mat=4BEESZ+A94RUA+2PEO+C3BAQ" },
    { label: "ココナラでお悩み相談・カウンセリング", note: "メール・チャットで相談",
      href: "https://px.a8.net/svt/ejp?a8mat=4BEESZ+A9Q7G2+2PEO+1BPGPE", pixel: "https://www14.a8.net/0.gif?a8mat=4BEESZ+A9Q7G2+2PEO+1BPGPE" },
  ],
};
