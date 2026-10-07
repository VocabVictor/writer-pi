# minutes 示例:会议纪要

在这个目录启动 writer-pi:

```bash
cd examples/minutes
writer-pi
```

然后在交互界面输入:

```
/draft 写一份文档模块改版排期评审的会议纪要 --genre=minutes
```

也可以用非交互方式真实生成:

```bash
node ../../packages/coding-agent/dist/bundle/cli.js -a -p "/draft 写一份文档模块改版排期评审的会议纪要 --genre=minutes" --no-session
```

brief.md 已声明体裁 `minutes`(会议纪要),长度 200-300 字,结构为出席与时间 →
议题 → 决议 → 待办(负责人与时限具体);sources/agenda.md 是会议记录(出席、
三个议题的讨论与结果、待办)。纪要体裁要求条目化、客观、可核对,决议与待办必须
可追溯到记录。最终稿在本目录的 article.md,drafts/ 下是各版本文件,reviews/ 下
是检查意见。
