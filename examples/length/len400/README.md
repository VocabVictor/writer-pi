# len400 示例：400 字博客段落

在这个目录启动 writer-pi：

```bash
cd examples/length/len400
writer-pi
```

然后在交互界面输入：

```
/draft 写一段关于为什么我把手机通知全关了的博客
```

brief.md 已写好口径（体裁、长度 400 字、禁用词）。流程会自动进行：起草 → 保存
初稿 → 程序检查 → 语义检查 → （最多两轮）局部修改，结束后在 drafts/ 下可以
看到版本文件，reviews/ 下是检查意见；定稿另存为 article.md。

# 长度核对

口径：中文字符 + 英文单词 + 数字组（见 packages/coding-agent/src/writer/genres/longform.ts 的 countWords）。
目标 400 字，产品解析区间为 320–480 字。
实测（review-004.json，article.md 复核一致）：356 字（中文字符 356，英文单词 0，数字组 0），达标。
流程注：blog 体裁不编造个人经历，初稿后以 /continue 补入作者素材（铃声规则、两周取舍）再出定稿。
