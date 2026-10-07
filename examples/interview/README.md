# 示例：访谈稿（二手书店店主）

在这个目录启动 writer-pi：

```bash
cd examples/interview
writer-pi
```

然后在交互界面输入：

```
/draft 把对书店店主顾眠的采访整理成访谈稿 --genre=interview
```

brief.md 已声明体裁 `interview`（访谈稿），sources/notes.md 是原始问答材料。
流程会自动进行：定问答主线 → 起草 → 保存初稿 → 程序检查 → 语义检查 →
（最多两轮）局部修改。问答成组、每个回答对应一个问题；引语保留口语与原意，
叙述部分保持书面，语域分层由体裁约定。article.md 是一次真实运行得到的成品。
