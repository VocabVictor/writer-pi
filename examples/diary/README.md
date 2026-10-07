# 示例：日记（停电夜）

在这个目录启动 writer-pi：

```bash
cd examples/diary
writer-pi
```

然后在交互界面输入：

```
/draft 把 sources/raw.md 的口述记录整理为一则日记 --genre=diary
```

brief.md 已声明体裁 `diary`（日记），sources/raw.md 是口述记录素材。日记体裁只做
轻度编辑：修错字与明显语病，保留日期头、当下的语气和没说完的话；不编造经历，
不解释心理动机，不提升立意。素材不够长时会报告为素材缺口而不是补写。
article.md 是本次生成的定稿。
