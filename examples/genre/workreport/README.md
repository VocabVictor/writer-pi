# workreport 示例:项目周报

在这个目录启动 writer-pi:

```bash
cd examples/genre/workreport
writer-pi
```

然后在交互界面输入:

```
/draft 写一份文档模块改版项目的周报(9 月 22 日至 26 日) --genre=workreport
```

也可以用非交互方式真实生成:

```bash
node ../../packages/coding-agent/dist/bundle/cli.js -a -p "/draft 写一份文档模块改版项目的周报(9 月 22 日至 26 日) --genre=workreport" --no-session
```

brief.md 已声明体裁 `workreport`(工作汇报),长度 200-350 字,结构为本周进度 →
风险与阻塞 → 下周计划;sources/facts.md 是本周事实(进度百分比、性能数字、风险
与应对)。工作汇报体裁要求事实与数字有来源、不拔高,素材未记录的情况标【待核】。
最终稿在本目录的 article.md,drafts/ 下是各版本文件,reviews/ 下是检查意见。
