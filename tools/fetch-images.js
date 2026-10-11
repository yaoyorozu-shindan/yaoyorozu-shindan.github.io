// 結果に表示する画像（Wikimedia Commons）とクレジットを取得して js/images.js を作り直す
// 使い方: node --dns-result-order=ipv4first tools/fetch-images.js .
const fs = require("fs");
const [site] = process.argv.slice(2);
eval(fs.readFileSync(site + "/js/fortune-data.js", "utf8") + ";globalThis.R=RESULTS;");
eval(fs.readFileSync(site + "/js/true-identity-a.js", "utf8") + fs.readFileSync(site + "/js/true-identity-b.js", "utf8") + ";globalThis.T=TRUE_IDENTITIES;");
// 絵として合わない画像は使わない（系図・動画・ロゴ・無関係な風景など）
const SKIP_FILES = ["Descendants_of_Izanami_alone.svg", "Gongenyama_Mt_Kimotsuki_Kagoshima.jpg", "Mayoiga_8086294422_ff2f173cf1_k.jpg",
  "Children_born_from_the_Challenge_of_Amaterasu_and_Susanoo.svg", "Sol_de_Mayo-Bandera_de_Argentina.svg", "Kinkaku-ji_04.jpg"];
const entries = [];
for (const v of Object.values(R)) for (const arr of Object.values(v)) for (const e of arr) entries.push(e);
for (const e of T) entries.push(e);
const UA = { headers: { "User-Agent": "fortune-site-check/0.1 (personal project)" } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 混み合っているとき（"You are making too many requests"）は少し待ってやり直す
async function getJson(u) {
  for (let i = 0; i < 6; i++) {
    const text = await (await fetch(u, UA)).text();
    if (text.trim().startsWith("{")) return JSON.parse(text);
    await sleep(15000 * (i + 1));
  }
  throw new Error("Wikipedia API が応答しません");
}
(async () => {
  const byWiki = {};
  const titles = [...new Set(entries.map((e) => e.wiki))];
  for (let i = 0; i < titles.length; i += 45) {
    const chunk = titles.slice(i, i + 45);
    const u = "https://ja.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail|name&pithumbsize=480&pilicense=free&titles=" + encodeURIComponent(chunk.join("|"));
    const j = await getJson(u);
    const norm = {}; (j.query.normalized || []).forEach((n) => (norm[n.from] = n.to));
    const pages = {}; Object.values(j.query.pages).forEach((p) => (pages[p.title] = p));
    for (const t of chunk) {
      const p = pages[norm[t] || t];
      if (!p || p.missing !== undefined) console.log("MISSING PAGE:", t);
      else if (p.thumbnail && !SKIP_FILES.includes(p.pageimage) && !/\.(webm|ogv)$/i.test(p.pageimage)) byWiki[t] = { file: p.pageimage, src: p.thumbnail.source.split("?")[0] };
    }
    await sleep(3000);
  }
  const files = [...new Set(Object.values(byWiki).map((x) => "File:" + x.file))];
  const meta = {};
  for (let i = 0; i < files.length; i += 45) {
    const u = "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata|url&titles=" + encodeURIComponent(files.slice(i, i + 45).join("|"));
    const j = await getJson(u);
    const norm = {}; (j.query.normalized || []).forEach((n) => (norm[n.to] = n.from));
    for (const p of Object.values(j.query.pages)) {
      if (!p.imageinfo) continue;
      const m = p.imageinfo[0].extmetadata || {};
      const strip = (s) => (s ? s.value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() : "");
      const key = (norm[p.title] || p.title).replace(/^File:/, "").replace(/ /g, "_");
      meta[key] = { artist: strip(m.Artist), license: strip(m.LicenseShortName), page: p.imageinfo[0].descriptionurl };
    }
    await sleep(3000);
  }
  const lines = [];
  let missingMeta = 0;
  for (const e of entries) {
    const x = byWiki[e.wiki];
    if (!x) continue;
    const m = meta[x.file];
    if (!m || !m.license) { missingMeta++; console.log("NO LICENSE:", e.name, x.file); continue; }
    let artist = m.artist.replace(/(Unknown (author|artist))+/gi, "作者不明").replace(/\s*\(.*$/, "").trim().slice(0, 60) || "作者不明";
    lines.push(`  ${JSON.stringify(e.name)}: ${JSON.stringify({ src: x.src, credit: `${artist} / ${m.license}`, page: m.page })},`);
  }
  const out = `// 結果に表示する画像（Wikimedia Commons の自由ライセンス画像）。
// キーは fortune-data.js の name と同じ。ここにない項目はオリジナルイラスト（SVG）が表示されます。
// 画像を差し替えたいときは src を自分の画像のパス（例: "img/kappa.png"）に変えればOK。
const IMAGES = {
${lines.join("\n")}
};
`;
  fs.writeFileSync(site + "/js/images.js", out);
  console.log("entries:", entries.length, "with image:", lines.length, "without:", entries.length - lines.length);
})();
