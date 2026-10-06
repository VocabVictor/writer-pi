# 示例：电商文案（保温杯详情页）

在这个目录启动 writer-pi：

```bash
cd examples/writing/ecommerce
writer-pi
```

然后在交互界面输入：

```
/draft 给随行保温杯写商品详情页文案
```

brief.md 已声明体裁 `ecommerce`（电商文案），sources/specs.md 是参数、保温数据、
评价与资质等素材。流程会自动进行：定子类与卖点 → 起草 → 保存初稿 → 程序检查 →
语义检查 → （最多两轮）局部修改。详情页的每个卖点都要有材料依据，绝对化表述
（如「最」「第一」）被 brief 的禁用词直接拦下。
