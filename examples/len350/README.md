# len350 示例：350 字随笔

在这个目录启动 writer-pi：

```bash
cd examples/len350
writer-pi
```

然后在交互界面输入：

```
/draft 写一篇关于菜市场收摊前半小时的随笔
```

brief.md 已写好口径（体裁、长度 350 字、禁用词）。流程会自动进行：起草 → 保存
初稿 → 程序检查 → 语义检查 → （最多两轮）局部修改，结束后在 drafts/ 下可以
看到版本文件，reviews/ 下是检查意见；定稿另存为 article.md。

# 长度核对

口径：中文字符 + 英文单词 + 数字组（见 packages/coding-agent/src/writer/genres/longform.ts 的 countWords）。
目标 350 字，产品解析区间为 280–420 字。
实测（review-002.json，article.md 复核一致）：310 字（中文字符 310，英文单词 0，数字组 0），达标。
