# len3000 示例：3000 字散文（夜班公交）

brief.md 声明「长度：3000字」（程序口径 2400-3600 字），sources/nightbus-notes.md
是观察笔记素材。散文档不走技术结构，检查环重点核对语言节奏与硬加的总结。

在这个目录启动 writer-pi：

```bash
cd examples/len3000
writer-pi
```

然后在交互界面输入：

```
/draft 写一篇夜班公交上的观察散文
```

非交互等价命令：

```bash
node ../../packages/coding-agent/dist/bundle/cli.js -a -p "/draft 写一篇夜班公交上的观察散文" --no-session
```

## 实测（GLM，非交互一次生成）

- 长度目标：3000 字（程序口径 2400-3600）
- 实际字数（产品口径）：2552 字，程序检查 withinTarget: true
- 分节：提纲 6 节，逐节写作 6 轮
- 检查环：3 轮程序+语义检查，2 轮局部修改，最终稿 draft-003
- 耗时：约 25 分钟
