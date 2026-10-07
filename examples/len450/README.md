# len450 示例：450 字产品短评

在这个目录启动 writer-pi：

```bash
cd examples/len450
writer-pi
```

然后在交互界面输入：

```
/draft 写一篇关于一款 87 键机械键盘三个月使用体验的产品短评
```

brief.md 已写好口径（体裁、长度 450 字、禁用词）。流程会自动进行：起草 → 保存
初稿 → 程序检查 → 语义检查 → （最多两轮）局部修改，结束后在 drafts/ 下可以
看到版本文件，reviews/ 下是检查意见；定稿另存为 article.md。

# 长度核对

口径：中文字符 + 英文单词 + 数字组（见 packages/coding-agent/src/writer/genres/longform.ts 的 countWords）。
目标 450 字，产品解析区间为 360–540 字。
实测（review-002.json，article.md 复核一致）：401 字（中文字符 384，英文单词 10，数字组 7），达标。
流程注：critique 体裁要求引述有出处，sources/keyboard.md 提供使用体验素材，context/quotes.md 登记引述。
