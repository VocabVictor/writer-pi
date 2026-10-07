# len1000 示例：1000 字技术博客（缓存失效）

长档长度目标的最小档。brief.md 声明「长度：1000字」（程序口径 800-1200 字），
sources/cache-notes.md 是调研笔记素材。

在这个目录启动 writer-pi：

```bash
cd examples/length/len1000
writer-pi
```

然后在交互界面输入：

```
/draft 写一篇关于缓存失效的技术博客
```

非交互等价命令：

```bash
node ../../packages/coding-agent/dist/bundle/cli.js -a -p "/draft 写一篇关于缓存失效的技术博客" --no-session
```

## 实测（GLM，非交互一次生成）

- 长度目标：1000 字（程序口径 800-1200）
- 实际字数（产品口径）：938 字，程序检查 withinTarget: true
- 分节：提纲 4 节，逐节写作 4 轮
- 检查环：2 轮程序+语义检查，1 轮局部修改，最终稿 draft-002
- 耗时：约 17 分钟
