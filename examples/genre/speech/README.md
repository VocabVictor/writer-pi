# speech 示例:技术分享开场发言稿

在这个目录启动 writer-pi:

```bash
cd examples/genre/speech
writer-pi
```

然后在交互界面输入:

```
/draft 写一篇线上事故排查分享的开场发言稿 --genre=speech
```

也可以用非交互方式真实生成:

```bash
node ../../packages/coding-agent/dist/bundle/cli.js -a -p "/draft 写一篇线上事故排查分享的开场发言稿 --genre=speech" --no-session
```

brief.md 已声明体裁 `speech`(演讲稿),长度 300-500 字,开场 / 主体 / 收尾三段,
主体按排查时间线讲;sources/incident.md 是事故素材(现象、排查时间线、教训)。
演讲稿体裁要求口语节奏、数字具体,收尾只讲一条教训。最终稿在本目录的 article.md,
drafts/ 下是各版本文件,reviews/ 下是检查意见。
