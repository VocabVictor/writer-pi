# ja サンプル:素材から書く街の随筆

このディレクトリで writer-pi を起動する:

```bash
cd examples/language/ja
writer-pi
```

対話画面で入力:

```
/draft 駅前の喫茶店についての随筆を書いて
```

brief.md に条件(目標言語・ジャンル・長さ・禁止語)、sources/kissa.md に素材がある。
非対話での実際の生成:

```bash
node ../../packages/coding-agent/dist/bundle/cli.js -a -p "/draft 駅前の喫茶店についての随筆を書いて" --no-session
```

処理は自動で進む:起草 → 保存 → プログラム検査 → 意味検査 → 部分修正。
最終稿は article.md、drafts/ に版ファイルがある。
