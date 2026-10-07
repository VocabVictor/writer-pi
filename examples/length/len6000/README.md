# len6000 示例：6000 字技术博客（单体到模块化拆分复盘）

brief.md 声明「长度：6000字」（程序口径 4800-7200 字），sources/refactor-notes.md
是工程复盘记录素材。复盘体：按时间线组织，每个阶段要有当时的数据和后来验证的结果。

在这个目录启动 writer-pi：

```bash
cd examples/length/len6000
writer-pi
```

然后在交互界面输入：

```
/draft 写一篇从单体到模块化拆分的后端工程复盘技术博客
```

非交互等价命令：

```bash
node ../../packages/coding-agent/dist/bundle/cli.js -a -p "/draft 写一篇从单体到模块化拆分的后端工程复盘技术博客" --no-session
```

## 实测（GLM，非交互一次生成）

- 长度目标：6000 字（程序口径 4800-7200）
- 实际字数（产品口径）：5049 字，程序检查 withinTarget: true
- 分节：提纲 7 节，逐节写作 7 轮
- 检查环：3 轮程序+语义检查，2 轮局部修改，最终稿 draft-003
- 耗时：约 13 分钟
