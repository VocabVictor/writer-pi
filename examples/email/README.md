# email 示例：根据素材写一封拒绝邀请的邮件

在这个目录启动 writer-pi：

```bash
cd examples/email
writer-pi
```

然后在交互界面输入：

```
/draft 写一封回复部门聚餐邀请的邮件
```

brief.md 已写好口径（目标读者、长度、禁用词）；sources/invite.md 是需要处理的素材。
流程会自动进行：起草 → 保存初稿 → 程序检查 → 语义检查 → （最多两轮）局部修改，
结束后在 drafts/ 下可以看到版本文件，reviews/ 下是检查意见。
