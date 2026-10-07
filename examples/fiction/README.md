# 示例：小说（空画框）

在这个目录启动 writer-pi：

```bash
cd examples/fiction
writer-pi
```

然后在交互界面输入：

```
/draft 续写小说单章：小满毕业前最后一次来修车，发现老周的摊边靠着一只空画框 --genre=fiction
```

brief.md 已声明体裁 `fiction`（小说写作），sources/characters.md 是人物设定素材。
小说体裁开启 context/ 持久设定文件（人物设定、时间线、叙述视角、已经发生的事件），
续写时先读设定与前文，写作后把新事件登记回 context/。article.md 是本次生成的定稿。
