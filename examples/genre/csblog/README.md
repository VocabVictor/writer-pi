# 示例：技术博客（别再用 JSON.stringify 做深拷贝）

在这个目录启动 writer-pi：

```bash
cd examples/genre/csblog
writer-pi
```

然后在交互界面输入：

```
/draft 写一篇别再用 JSON.stringify 做深拷贝的技术博客 --genre=cs-blog
```

brief.md 已声明体裁 `cs-blog`（技术博客），sources/snippets.md 是代码、版本号与
本机性能数据。流程会自动进行：定问题与读者 → 起草 → 保存初稿 → 程序检查 →
语义检查 → （最多两轮）局部修改。文中出现的代码块与版本号会登记进
context/snippets.md 并标注 sources/ 出处；改写前后的对比代码是有意的重复，
体裁的重复检查放宽为 loose。article.md 是一次真实运行得到的成品。
