# 示例：诗歌（深夜末班地铁）

在这个目录启动 writer-pi：

```bash
cd examples/poetry
writer-pi
```

然后在交互界面输入：

```
/draft 写一首深夜末班地铁的现代诗 --voice=sample
```

brief.md 已声明体裁 `poetry`（诗歌），sources/theme.md 是意象素材，voice/style.md
是文风样本。诗歌体裁关闭了程序重复检查（重复与碎句可能是有意的选择），检查以
语义审查为主：只有当重复明显破坏整首节奏时才报告。drafts/ 下是版本文件，
reviews/ 下是检查意见。
