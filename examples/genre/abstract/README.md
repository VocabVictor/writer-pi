# abstract 示例:会议论文摘要

在这个目录启动 writer-pi:

```bash
cd examples/genre/abstract
writer-pi
```

然后在交互界面输入:

```
/draft 写一篇关于应用商店崩溃报告自动归类方法的会议摘要 --genre=abstract
```

也可以用非交互方式真实生成:

```bash
node ../../packages/coding-agent/dist/bundle/cli.js -a -p "/draft 写一篇关于应用商店崩溃报告自动归类方法的会议摘要 --genre=abstract" --no-session
```

brief.md 已声明体裁 `abstract`(学术摘要),长度 150-250 字,四要素(目的 / 方法 /
结果 / 结论)边界清楚;sources/study.md 是研究内容(背景、方法、数据、结果、结论)。
摘要体裁长度上限严格,结果部分要求具体数字。最终稿在本目录的 article.md,drafts/
下是各版本文件,reviews/ 下是检查意见。
