# academic 示例:论文节选(结果与讨论)

在这个目录启动 writer-pi:

```bash
cd examples/genre/academic
writer-pi
```

然后在交互界面输入:

```
/draft 写一篇关于青少年睡前手机使用与睡眠质量相关性的论文节选 --genre=academic
```

也可以用非交互方式真实生成:

```bash
node ../../packages/coding-agent/dist/bundle/cli.js -a -p "/draft 写一篇关于青少年睡前手机使用与睡眠质量相关性的论文节选 --genre=academic" --no-session
```

brief.md 已声明体裁 `academic`(学术写作),长度 400-600 字;sources/survey.md 是调查数据
(样本、测量工具、结果、局限)。学术体裁开启引用检查:正文数字标记(如 [1])必须在
context/references.md 登记或在 sources/ 中可解析,材料不足的论断标【待补】。
最终稿在本目录的 article.md,drafts/ 下是各版本文件,reviews/ 下是检查意见。
