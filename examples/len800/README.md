# len800 示例：800 字博客文章

在这个目录启动 writer-pi：

```bash
cd examples/len800
writer-pi
```

然后在交互界面输入：

```
/draft 写一篇关于远程工作两年后的复盘的博客文章
```

brief.md 已写好口径（体裁、长度 800 字、禁用词）。流程会自动进行：起草 → 保存
初稿 → 程序检查 → 语义检查 → （最多两轮）局部修改，结束后在 drafts/ 下可以
看到版本文件，reviews/ 下是检查意见；定稿另存为 article.md。

# 长度核对

口径：中文字符 + 英文单词 + 数字组（见 packages/coding-agent/src/writer/genres/longform.ts 的 countWords）。
目标 800 字，产品解析区间为 640–960 字。
实测（review-004.json，article.md 复核一致）：673 字（中文字符 671，英文单词 0，数字组 2），达标。
流程注：blog 体裁初稿出占位骨架等待素材，以 /continue 补入结论、数字与结尾做法后出定稿。
