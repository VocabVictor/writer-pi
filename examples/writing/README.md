# writer-pi 写作示例

三个自足的示例写作项目（不含任何私人数据，内容均为演示编写）。
每个目录就是一个写作项目：启动 writer-pi 后，brief.md / sources/ / voice/ /
locked.md / drafts/ / reviews/ / state.json 都以当前目录为根。

| 示例 | 入口命令 | 演示内容 |
| --- | --- | --- |
| [01-draft-email](01-draft-email/) | `/draft 写一封回复部门聚餐邀请的邮件` | 根据 brief 与素材起草，程序检查长度与禁用词 |
| [02-revise](02-revise/) | `/revise sources/original-draft.md 把语气改得更平实一些，删掉重复的表达` | 修改已有文稿并保留立场；演示语义检查拦截"成长叙事" |
| [03-voice](03-voice/) | `/voice 写一段下班路上买到最后一份糖炒栗子的小事` | 结合 voice/ 文风样本起草 |

运行前提见仓库根 README 的「安装与启动」。每次运行产生的新版本都在各示例目录的
drafts/ 与 reviews/ 下，可删除后重跑。
