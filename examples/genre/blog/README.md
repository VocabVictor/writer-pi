# 示例：观点博客（周报该写变化）

在这个目录启动 writer-pi：

```bash
cd examples/genre/blog
writer-pi
```

然后在交互界面输入：

```
/draft 写一篇周报该写变化不该写流水账的博客 --genre=blog
```

brief.md 已声明体裁 `blog`（观点博客）并写明中心观点，sources/notes.md 是对照、
数字与他人说法等论据。流程会自动进行：提纲 → 起草 → 保存初稿 → 程序检查 →
语义检查 → （最多两轮）局部修改。体裁检查盯两件事：中心观点是否尽早出现、
每个例子是否真的支撑观点。article.md 是一次真实运行得到的成品。
