# coverletter 示例:求职信

在这个目录启动 writer-pi:

```bash
cd examples/genre/coverletter
writer-pi
```

然后在交互界面输入:

```
/draft 写一封应聘前端工程师的求职信 --genre=cover-letter
```

也可以用非交互方式真实生成:

```bash
node ../../packages/coding-agent/dist/bundle/cli.js -a -p "/draft 写一封应聘前端工程师的求职信 --genre=cover-letter" --no-session
```

brief.md 已声明体裁 `cover-letter`(求职信),长度 250-400 字;sources/background.md
是候选人背景(教育、经历、技能、求职动机)。求职信体裁的能力表述必须来自经历,
不编造工作年限与项目。最终稿在本目录的 article.md,drafts/ 下是各版本文件,
reviews/ 下是检查意见。
