# 示例：书评（《潮间带》）

在这个目录启动 writer-pi：

```bash
cd examples/critique
writer-pi
```

然后在交互界面输入：

```
/draft 写一篇《潮间带》的书评 --genre=critique
```

brief.md 已声明体裁 `critique`（评论写作）与立场（有保留的推荐），
sources/work.md 是情节梗概与原文摘录。流程会自动进行：定立场与评价维度 →
起草 → 保存初稿 → 程序检查 → 语义检查 → （最多两轮）局部修改。
文中引述的原文会登记进 context/quotes.md 与素材一一对应，改变原意的引述、
替用户改立场的评价都会被拦下。article.md 是一次真实运行得到的成品。
