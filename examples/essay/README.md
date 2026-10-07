# 示例：随笔（菜市场收摊前）

在这个目录启动 writer-pi：

```bash
cd examples/essay
writer-pi
```

然后在交互界面输入：

```
/draft 写一篇随笔：菜市场收摊前 --genre=essay
```

brief.md 已声明体裁 `essay`（散文），sources/observation.md 是观察素材。散文体裁
开了长度检查（300-500 字）与人生感悟检测（empty_elevation），不添加宏大结尾；
检查以细节是否具体、语言节奏为主。article.md 是本次生成的定稿。
