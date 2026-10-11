#!/bin/sh
# サイトを更新して公開する前に実行する：
#  1) CSS/JSの読み込みにバージョン番号を付け直す（見る人のブラウザに古いファイルが残らないように）
#  2) 記事（articles/）とサイトマップを作り直す
cd "$(dirname "$0")/.."
V=$(date +%Y%m%d%H%M)
sed -i -E "s#(href=\"css/style\.css)(\?v=[0-9]+)?\"#\1?v=$V\"#; s#(src=\"js/[a-z-]+\.js)(\?v=[0-9]+)?\"#\1?v=$V\"#g" index.html privacy.html
node tools/build-articles.js
echo "version: $V"
