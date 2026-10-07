# zh 示例:根据素材写一篇旧书店的城市随笔

在这个目录启动 writer-pi:

```bash
cd examples/language/zh
writer-pi
```

然后在交互界面输入:

```
/draft 写一篇关于巷口旧书店的城市随笔
```

brief.md 写好了要求(目标语言、体裁、长度、禁用词);sources/bookstore.md 是素材。
也可以用非交互方式真实生成:

```bash
node ../../packages/coding-agent/dist/bundle/cli.js -a -p "/draft 写一篇关于巷口旧书店的城市随笔" --no-session
```

流程自动进行:起草 → 保存初稿 → 程序检查 → 语义检查 → 局部修改。
最终稿在本目录的 article.md,drafts/ 下是各版本文件。
