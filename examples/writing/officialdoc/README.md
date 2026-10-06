# 示例：公文（国庆放假通知）

在这个目录启动 writer-pi：

```bash
cd examples/writing/officialdoc
writer-pi
```

然后在交互界面输入：

```
/draft 国庆节放假通知
```

brief.md 已声明体裁 `official-doc`（公文），sources/facts.md 是放假时间、调休、值班与
安全要求等事实。流程会自动进行：拟框架 → 起草 → 保存初稿 → 程序检查 → 语义检查 →
（最多两轮）局部修改，结束后在 drafts/ 下可以看到版本文件，reviews/ 下是检查意见。
公文的一切事实必须可追溯到 sources/，材料不足时以【待补：…】标记。
