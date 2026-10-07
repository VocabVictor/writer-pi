# voice 示例：结合文风样本写一篇短文

在这个目录启动 writer-pi：

```bash
cd examples/voice
writer-pi
```

然后在交互界面输入：

```
/voice 写一段下班路上买到最后一份糖炒栗子的小事
```

voice/style.md 是两段自写的文风样本（短句、少形容词、以动作和实物收尾）。
writer-pi 会把样本作为文风依据起草；`/voice` 在项目里已有当前文稿时会先询问
是起草新稿还是修改当前稿。文风样本优先于通用风格规则。

article.md 是该示例成品，随仓库入库；drafts/、reviews/ 等运行产物被 .gitignore 忽略。
