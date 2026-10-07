# 示例：短文案（微博演出预告）

在这个目录启动 writer-pi：

```bash
cd examples/genre/microcopy
writer-pi
```

然后在交互界面输入：

```
/draft 写一条周六河滨公园民谣弹唱会的微博 --genre=microcopy
```

brief.md 已声明体裁 `microcopy`（短文案）并把长度限定在 50-140 字，
sources/event.md 是活动时间、地点与票价等事实。流程会自动进行：起草 → 保存初稿 →
程序检查 → 语义检查 → （最多两轮）局部修改。短文案超字数即失败，首句直接进入内容；
涉及活动事实的句子必须可追溯。article.md 是一次真实运行得到的成品。
