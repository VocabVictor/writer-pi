# techdocs 示例:API 入门教程

在这个目录启动 writer-pi:

```bash
cd examples/techdocs
writer-pi
```

然后在交互界面输入:

```
/draft 写一份创建任务与查询状态的 API 入门教程 --genre=tech-docs
```

也可以用非交互方式真实生成:

```bash
node ../../packages/coding-agent/dist/bundle/cli.js -a -p "/draft 写一份创建任务与查询状态的 API 入门教程 --genre=tech-docs" --no-session
```

brief.md 已声明体裁 `tech-docs`(技术文档),结构为认证 → 创建任务 → 查询状态,
每步给出请求与响应示例;sources/api.md 是 API 事实(base URL、端点、参数、
错误响应、频率限制)。技术文档体裁要求步骤化、可执行,命令与字段名与 sources/
一致,无法核实的字段标【待核】。最终稿在本目录的 article.md,drafts/ 下是各版本
文件,reviews/ 下是检查意见。
