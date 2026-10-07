# revise 示例：修改一段个人表达，保留立场和语气

在这个目录启动 writer-pi：

```bash
cd examples/revise
writer-pi
```

然后在交互界面输入：

```
/revise sources/original-draft.md 把语气改得更平实一些，删掉重复的表达
```

这个用例专门演示语义检查能否拦住"成长叙事"：原始表达是"我当时不想答应，只是怕
直接拒绝让场面难看"——作者没有说自己"学会了尊重边界"。如果修改后的稿子出现
"这段经历让我学会尊重自己的边界"这类原文没有的成长叙事，语义检查应报出
`meaning_drift` 或 `unsourced_addition`（实际效果取决于所用模型，见 README 的
限制说明）。

article.md 是该示例成品，随仓库入库；drafts/、reviews/ 等运行产物被 .gitignore 忽略。
