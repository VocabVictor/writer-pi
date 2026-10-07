# writer-pi 示例总索引

每个示例目录都是一个自足的写作项目（不含任何私人数据），启动 writer-pi 后，
brief.md / sources/ / voice/ / locked.md / drafts/ / reviews/ / state.json 都以
当前目录为根。三个核心文件的分工：

- `brief.md` — 写作要求：目标读者、用途、体裁/语言/长度、语气、禁用词及其他限制
- `sources/` — 素材：事实、数据、引文、代码片段等，写进文稿的内容必须有来源
- `article.md` — 成品：一次真实模型运行得到的最终稿，随仓库一起维护；
  `drafts/` 下是各版本文件

## 启动方式

在示例目录启动 writer-pi，然后按 brief 的任务输入 `/draft`：

```bash
cd examples/<示例目录>
writer-pi
```

```
/draft <按 brief.md 的要求写出这篇文稿>
```

体裁由 brief.md 的「体裁」行自动识别，也可以用 `--genre=<体裁>` 显式指定；
流程自动进行：提纲 → 起草 → 保存初稿 → 程序检查 → 语义检查 → 局部修改。
非交互方式真实生成：

```bash
node ../../packages/coding-agent/dist/bundle/cli.js -a -p "/draft <任务>" --no-session
```

运行前提见仓库根 README 的「安装与启动」。drafts/ / reviews/ / state.json /
locked.md 是运行产物（被 .gitignore 忽略），可删除后重跑。

## 体裁示例

| 示例 | 体裁 · 长度 | 说明 |
| --- | --- | --- |
| [email](genre/email/) | 邮件 · 200 字以内 | 回复部门聚餐邀请；演示程序检查长度与禁用词 |
| [revise](genre/revise/) | 修改流程 | `/revise` 修改已有文稿并保留立场；演示语义检查拦截"成长叙事" |
| [voice](genre/voice/) | 文风样本 | `/voice` 结合 voice/ 文风样本写糖炒栗子小事 |
| [officialdoc](genre/officialdoc/) | 公文 · 300 字以内 | 国庆节放假通知；事实必须可追溯到 sources/ |
| [ecommerce](genre/ecommerce/) | 电商详情页 · 400-600 字 | 随行保温杯卖点文案；每个卖点紧跟参数、评价或资质 |
| [poetry](genre/poetry/) | 现代诗 · 3-4 节 | 深夜末班地铁；重复检查关闭，以语义审查为主 |
| [fiction](genre/fiction/) | 小说单章 · 300-600 字 | 第三人称限知视角，修车摊边的一只空画框 |
| [essay](genre/essay/) | 随笔 · 300-500 字 | 克制抒情，从细节出发，不添加人生感悟 |
| [diary](genre/diary/) | 日记 | 把口述记录整理为日记；保留粗粝感与没说完的话 |
| [script](genre/script/) | 剧本 | 短场一场；场景标题、人物名、对白与舞台指示三要素齐全 |
| [fairy](genre/fairy/) | 童话 · 5-7 岁 | 重复句式三次递进，结尾由情节自然带出寓意 |
| [blog](genre/blog/) | 观点博客 · 300-500 字 | 周报该写变化，不该写流水账；中心观点在前 2 段出现 |
| [csblog](genre/csblog/) | 技术博客 · 300-500 字 | 别再用 JSON.stringify 做深拷贝；代码来自素材并注明环境 |
| [news](genre/news/) | 新闻通稿 · 200-400 字 | 图书馆 24 小时自习区试运行；导语承载 5W，只陈述事实 |
| [critique](genre/critique/) | 评论 · 300-500 字 | 《潮间带》书评；有保留的推荐，引述必须来自素材 |
| [marketing](genre/marketing/) | 营销推文 · 300-500 字 | 雾岫咖啡公众号拉新推文，引导首次下单试饮装 |
| [microcopy](genre/microcopy/) | 微文案 · 140 字内 | 微博民谣弹唱会传播文案；首句进入内容 |
| [popsci](genre/popsci/) | 科普 · 300-500 字 | 气压与沸点；用一个类比解释机制，并写清类比的边界 |
| [interview](genre/interview/) | 访谈 · 300-500 字 | 二手书店店主问答；引语来自原始笔记，不编造发言 |
| [academic](genre/academic/) | 论文节选 · 400-600 字 | 手机使用与睡眠质量；论断紧跟数据，不用空泛推论 |
| [abstract](genre/abstract/) | 会议摘要 · 150-250 字 | 崩溃报告自动归类方法；目的/方法/结果/结论四要素齐全 |
| [githubreadme](genre/githubreadme/) | 开源 README · 不设上限 | waitfor 轮询工具；以新用户能跑起来为准，英文为主 |
| [coverletter](genre/coverletter/) | 求职信 · 250-400 字 | 前端工程师岗位；能力用经历说明，不用形容词堆砌 |
| [speech](genre/speech/) | 演讲稿 · 300-500 字 | 技术分享开场；按排查时间线讲一次线上事故 |
| [techdocs](genre/techdocs/) | API 文档 · 步骤化 | 创建任务与查询状态教程；字段与素材一致，不编造端点 |
| [minutes](genre/minutes/) | 会议纪要 · 200-300 字 | 改版排期评审；决议与待办的负责人、时限具体 |
| [manual](genre/manual/) | 说明书 · 250-400 字 | 净水器安装与首次使用；步骤编号连续，每步一个动作 |
| [workreport](genre/workreport/) | 周报 · 200-350 字 | 改版项目周报；进度、风险与阻塞、下周计划逐条列出 |

## 语言示例

同一类城市题材用 8 种语言各写一篇，验证 brief 的目标语言约束（全文只用目标语言，
引文除外，禁用词按各语言本地化）。长度均为 300 字（词）左右。

| 示例 | 语言 | 说明 |
| --- | --- | --- |
| [zh](language/zh/) | 中文 | 我家附近的旧书店城市随笔 |
| [en](language/en/) | English | 街角五金店随笔 |
| [ja](language/ja/) | 日本語 | 车站前的老咖啡店随笔 |
| [fr](language/fr/) | français | 街角面包店随笔 |
| [es](language/es/) | español | 旧书店随笔 |
| [ko](language/ko/) | 한국어 | 老式小吃店随笔 |
| [ru](language/ru/) | русский | 老电车速写 |
| [ar](language/ar/) | العربية | 老城集市随笔 |

## 长度示例

从 50 字到 10000 字共 17 档，验证 brief 的「长度：N 字左右」在各量级下能否约束生成。
每档配不同的真实写作任务。

| 示例 | 长度 | 说明 |
| --- | --- | --- |
| [len50](length/len50/) | 50 字 | 一句话状态便条（到岗延迟） |
| [len100](length/len100/) | 100 字 | 咖啡馆短评；只写观察到的细节 |
| [len150](length/len150/) | 150 字 | 工作交接便条；逐条列待办和截止时间 |
| [len200](length/len200/) | 200 字 | 交付延期致歉短信；原因一句，重点在补救 |
| [len250](length/len250/) | 250 字 | 书店手写推荐语；说推荐理由，不写全书梗概 |
| [len300](length/len300/) | 300 字 | 电影短评；观点明确，不剧透结局 |
| [len350](length/len350/) | 350 字 | 个人专栏随笔；从具体观察出发 |
| [len400](length/len400/) | 400 字 | 博客开头段落；第一人称，观点先行 |
| [len450](length/len450/) | 450 字 | 机械键盘测评；以使用体验为准 |
| [len500](length/len500/) | 500 字 | 报刊副刊散文；靠细节推进 |
| [len800](length/len800/) | 800 字 | 个人博客（工作方式）；结论先行 |
| [len1000](length/len1000/) | 1000 字 | 技术博客；围绕一个核心问题展开 |
| [len3000](length/len3000/) | 3000 字 | 散文（夜班公交观察）；人物有动作与对话 |
| [len5000](length/len5000/) | 5000 字 | 深度分析；倦怠的结构性成因与缓解方向 |
| [len6000](length/len6000/) | 6000 字 | 技术博客；服务拆分的工程复盘 |
| [len8000](length/len8000/) | 8000 字 | 深度分析；本地优先为什么重新成立 |
| [len10000](length/len10000/) | 10000 字 | 深度分析；平台迁移与读者关系的变化 |
