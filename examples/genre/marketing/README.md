# 示例：内容营销（雾岫咖啡品牌故事）

在这个目录启动 writer-pi：

```bash
cd examples/genre/marketing
writer-pi
```

然后在交互界面输入：

```
/draft 给雾岫咖啡写一篇品牌故事推文 --genre=marketing
```

brief.md 已声明体裁 `marketing`（内容营销）与拉新目标，sources/facts.md 是品牌、
产品、评价与价格等素材。流程会自动进行：定卖点结构 → 起草 → 保存初稿 →
程序检查 → 语义检查 → （最多两轮）局部修改。卖点按钩子/痛点/方案/证明/行动号召
展开，每个卖点都要有材料依据，绝对化表述（「最」「第一」）被 brief 的禁用词拦下。
article.md 是一次真实运行得到的成品。
