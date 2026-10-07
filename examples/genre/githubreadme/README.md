# githubreadme 示例:开源项目 README

在这个目录启动 writer-pi:

```bash
cd examples/genre/githubreadme
writer-pi
```

然后在交互界面输入:

```
/draft Write a README for the waitfor-http polling tool --genre=github-readme
```

也可以用非交互方式真实生成:

```bash
node ../../packages/coding-agent/dist/bundle/cli.js -a -p "/draft Write a README for the waitfor-http polling tool --genre=github-readme" --no-session
```

brief.md 已声明体裁 `github-readme`(开源 README),目标读者是第一次接触项目的新用户;
sources/specs.md 是项目事实(安装命令、CLI 与 API 用法、许可证、贡献规范)。
github-readme 体裁开启引用检查:命令、flag、版本号、链接必须可追溯到 sources/,
在 context/commands.md 与 context/links.md 登记,材料不足标【待核】。
最终稿在本目录的 article.md,drafts/ 下是各版本文件,reviews/ 下是检查意见。
