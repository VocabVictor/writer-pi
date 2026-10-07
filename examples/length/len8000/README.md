# len8000 示例：8000 字深度分析（本地优先软件）

brief.md 声明「长度：8000字」（程序口径 6400-9600 字），sources/localfirst-notes.md
是调研素材（宣言、项目兴衰、正反证据）。深度分析档推断为学术写作体裁，
context/references.md 登记引用对应。

在这个目录启动 writer-pi：

```bash
cd examples/length/len8000
writer-pi
```

然后在交互界面输入：

```
/draft 写一篇关于本地优先软件为什么在2020年代重新成立的深度分析
```

非交互等价命令：

```bash
node ../../packages/coding-agent/dist/bundle/cli.js -a -p "/draft 写一篇关于本地优先软件为什么在2020年代重新成立的深度分析" --no-session
```

## 实测（GLM，非交互一次生成）

- 长度目标：8000 字（程序口径 6400-9600）
- 实际字数（产品口径）：6403 字，程序检查 withinTarget: true
- 分节：提纲 8 节，逐节写作 8 轮
- 检查环：3 轮程序+语义检查，2 轮局部修改，最终稿 draft-003
- 耗时：约 20 分钟

注：本档实测两次（首次 6399 字，差 1 字未过程序长度检查，清理 drafts/reviews/sections
后重跑），二次 6403 字通过。8000 字档的产出贴近区间下限，逐节写作偏保守是主要原因。
