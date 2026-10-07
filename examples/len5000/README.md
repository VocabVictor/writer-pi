# len5000 示例：5000 字深度分析（开源维护者倦怠）

brief.md 声明「长度：5000字」（程序口径 4000-6000 字），sources/maintainer-notes.md
是调研素材。深度分析档会推断为学术写作体裁，context/references.md 登记引用对应，
检查环会核对引用标记是否在 references.md 与 sources/ 中有出处。

在这个目录启动 writer-pi：

```bash
cd examples/len5000
writer-pi
```

然后在交互界面输入：

```
/draft 写一篇关于开源维护者倦怠的深度分析
```

非交互等价命令：

```bash
node ../../packages/coding-agent/dist/bundle/cli.js -a -p "/draft 写一篇关于开源维护者倦怠的深度分析" --no-session
```

## 实测（GLM，非交互一次生成）

- 长度目标：5000 字（程序口径 4000-6000）
- 实际字数（产品口径）：4660 字，程序检查 withinTarget: true
- 分节：提纲 6 节，逐节写作 6 轮
- 检查环：3 轮程序+语义检查，2 轮局部修改，最终稿 draft-003
- 耗时：约 15 分钟

注：academic 体裁的持久上下文是 context/references.md，项目里必须预置该文件
（模板即可），否则提纲轮模型读它时找不到文件会中断。
