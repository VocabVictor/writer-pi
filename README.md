# writer-pi

**writer-pi** 是一个专门用于写作的 Agent：根据素材起草文章、修改已有文稿、参考你提供的文风样本写作。它基于 [Pi Agent Harness](https://github.com/earendil-works/pi)（上游 monorepo，前身为 `badlogic/pi-mono`）修改而成——写作功能是产品本体（核心命令、核心工具、核心系统提示词），不是外挂扩展。

> **demo 状态**：这是一个可运行的 demo，面向中文短文。已实现一条完整的写作闭环（起草 → 程序检查 → 语义检查 → 局部修改 → 复核 → 保存）。尚未实现：Web 界面、账号系统、数据库、Word/PDF 导出、多 Agent、训练/微调。

---

## 目录

- [写作流程](#写作流程)
- [安装与启动](#安装与启动)
- [命令](#命令)
- [写作项目结构](#写作项目结构)
- [公开示例](#公开示例)
- [检查机制](#检查机制)
- [与上游 Pi 的关系](#与上游-pi-的关系)
- [已实现能力](#已实现能力)
- [已知限制](#已知限制)

## 写作流程

`/draft`、`/revise`、`/voice` 触发的流程由**代码**控制（不是一句提示词），每一步都落盘：

```
读取要求与材料 → 生成初稿并保存 → 程序检查 → 模型语义检查（结构化 JSON）
   → 有问题则局部修改（最多两轮）→ 每轮修改后重新检查 → 输出结果与文件路径
```

- 初稿**先保存、后检查**；模型忘记调用保存工具时，代码会把它的回复兜底保存为新版本。
- 每个版本和每轮检查意见都保存为文件，支持回看与回退；版本**从不覆盖**。
- 修改轮只允许 `revise_paragraph` 工具按段落修改，`original` 必须逐字来自当前文稿且全文唯一——防止错误替换。
- 退出条件明确：检查未发现问题（保留原稿）/ 达到两轮修改上限 / 检查输出两次无法解析（保留文稿并报告）/ 用户中止。
- 素材文件被视为待处理内容：文件中的任何指令都不会覆盖你的要求或 Agent 的系统指令。

## 安装与启动

### 实际验证过的运行环境

- Windows 10（10.0.26200，Git Bash）
- Node.js **22.23.3**（上游要求 `>=22.19.0`；本地系统 Node 22.17 低于要求时可用 `npx --yes --package=node@22.23.3 …` 代替）
- npm 11.4.2

### 从源码安装

```bash
git clone <本仓库> writer-pi
cd writer-pi
npm install --ignore-scripts
npm run hydrate:model-data   # 联网生成 provider 模型数据（构建必需）
npm run build:offline        # 构建；产物 packages/coding-agent/dist/bundle/cli.js
```

启动命令（`bin` 名 `writer-pi`）：

```bash
node packages/coding-agent/dist/bundle/cli.js        # 在写作项目目录中运行
# 或 npm link 后直接使用 writer-pi 命令
```

开发时可以不构建，直接从源码运行（Node ≥ 22.19）：

```bash
node --import packages/coding-agent/src/experimental/source-resolver.ts \
     packages/coding-agent/src/experimental/cli.ts
```

### 模型配置

沿用上游 Pi 的全部 provider 配置能力，**配置目录仍是 `~/.pi/agent/`**（没有另起炉灶）：

- `~/.pi/agent/auth.json` — provider 认证（`writer-pi auth check --provider <provider>` 确认就绪，或交互内 `/login`）
- `~/.pi/agent/models.json` — 自定义 provider / 模型
- 启动参数选择模型：`writer-pi --provider deepseek --model deepseek-v4-flash`；交互内 `/model` 切换

本 demo 的验证使用 DeepSeek（`deepseek-v4-flash`，`models.json` 自定义 provider）。编写 writer-pi 的过程使用了 GLM 5.3 Flash，但这**不意味着** writer-pi 绑定该模型——运行模型完全由上述配置决定。

## 命令

| 命令 | 说明 |
| --- | --- |
| `/draft <写作要求>` | 根据项目素材起草。若 `brief.md` 还没有实质内容，本次要求会写入 `brief.md` |
| `/revise [文稿路径] <修改要求>` | 修改已有文稿。无路径时修改当前版本；路径可以是 `drafts/` 内的版本或 `sources/` 下的稿件（会先导入为基线版本，原文件不动） |
| `/voice <写作要求>` | 结合 `voice/` 文风样本起草；项目里已有当前文稿时会先询问"起草新稿 / 修改当前稿" |
| `/writing` | 显示写作项目状态（阶段、当前版本、版本数、锁定句数等） |
| `/drafts` | 列出全部草稿版本 |
| `/diff [from] [to]` | 查看两个版本的差异（默认最近两版） |
| `/revert <版本>` | 把当前版本切回历史版本（历史文件保留，生成新版本号） |

模型也可调用同样能力：`save_draft`、`revise_paragraph`、`diff_versions`、`revert_version`，以及上游的 `read`（按需读取素材）。不要求用户批准内部步骤：普通写作命令直接执行，流程状态显示在界面与 `/writing` 中。

## 写作项目结构

**当前工作目录就是写作项目**。缺失的结构会在启动/首次命令时自动创建：

```
brief.md     写作要求：目标读者、用途、长度、语气、禁用词等
sources/     你提供的事实、素材和已有稿件
voice/       你提供的文风样本
locked.md    明确要求保留的原句（每行一条）；锁定判断不得改变含义
drafts/      每一轮完整文稿：draft-001.md、draft-002.md …（从不覆盖）
reviews/     每轮检查意见：review-001.json …（含程序检查结果与语义 issues）
state.json   当前阶段、当前版本、版本计数等
```

每轮任务按需读取相关内容：起草轮把 `brief.md` 全文和 `sources/` 清单给模型、由模型用 `read` 按需读取素材；复查轮提供素材摘录用于核对"是否有来源"。

## 公开示例

三个自足的示例项目（内容为演示编写，不含任何私人数据），见 [examples/writing/](examples/writing/)：

1. **[01-draft-email](examples/writing/01-draft-email/)** — 根据素材写一封拒绝聚餐邀请的邮件（brief 指定 200 字以内、禁用词）：
   `cd examples/writing/01-draft-email && writer-pi`，然后输入 `/draft 写一封回复部门聚餐邀请的邮件`
2. **[02-revise](examples/writing/02-revise/)** — 修改一段个人表达、保留立场与语气（语义检查应拦截"这段经历让我学会尊重自己的边界"式成长叙事）：
   `/revise sources/original-draft.md 把语气改得更平实一些，删掉重复的表达`
3. **[03-voice](examples/writing/03-voice/)** — 参照两段自写文风样本写一篇短文：
   `/voice 写一段下班路上买到最后一份糖炒栗子的小事`

## 检查机制

检查分两层，结果分开保存：

**A. 程序检查**（`checker.ts`，确定性规则，结果只是线索）：

- 长度：从 `brief.md` 解析口径（如 `长度：500-800字`、`300 字以内`、`约500字`）。**统计口径：字数 = 中文字符 + 英文单词 + 数字组**（类 Word 混排统计），同时报告纯中文字符数和去空白总字符数
- 禁用词（`禁用词：A、B` 行，顿号/逗号分隔）
- 完全重复的段落（≥10 字符）与明显重复的句子（≥15 字符出现 ≥2 次）
- 锁定原句是否逐字保留
- 语义检查输出的结构化验证：`kind` 枚举、段落编号越界、原文引用在文稿中不存在、解析失败——无效输出不能驱动修改；允许**一次**格式纠正，再次失败则保留文稿并明确报告

**B. 模型语义检查**（独立阶段指令，要求只输出 JSON）：

- 立场或情绪强度改变（`meaning_drift`）、增加无来源的事实/情绪（`unsourced_addition`）、遗漏重要信息与限定（`omission`）、空泛升华（`empty_elevation`）、过度解释（`over_explanation`）、公式化结构（`formulaic_structure`）、锁定句被改动（`locked_violation`）
- 每条意见包含：问题类型、段落编号、文稿原文引用、具体理由、修改建议，涉及来源时附素材引用

```json
{ "issues": [ { "kind": "meaning_drift", "paragraph": 3,
    "quote": "文稿中的原句", "reason": "具体问题", "suggestion": "修改建议",
    "source_quote": "可选的素材引用" } ] }
```

## 与上游 Pi 的关系

- 上游：<https://github.com/earendil-works/pi>（MIT License，monorepo；`badlogic/pi-mono` 的继任仓库）。本仓库通过 git merge 引入上游 **commit `7fbbd5f`**（main 分支），上游完整版权声明与 LICENSE 保留。
- 采用的包：`@earendil-works/pi-coding-agent`（CLI、会话管理、TUI、扩展机制）、`@earendil-works/pi-agent-core`（工具调用循环）、`@earendil-works/pi-ai`（统一多 provider API）。模型与 provider 接入、Agent 工具调用循环、会话管理、终端交互与流式输出全部沿用上游。
- writer-pi 的修改集中在：`packages/coding-agent/src/writer/`（新增写作模块）、`core/system-prompt.ts`（默认提示词）、`core/tools/writer.ts`（核心写作工具）、`core/settings-manager.ts`（默认工具集）、`core/agent-session.ts`（命令分发与流程钩子）、`extensions/index.ts`（移除编码向内置扩展）。没有全仓库改名。

## 已实现能力

- ✅ 三个入口 `/draft`、`/revise`、`/voice`，流程控制、轮数上限、版本管理与文件保存由代码保证
- ✅ 版本不覆盖、回退保留历史、版本 diff
- ✅ 程序检查（长度口径、禁用词、重复、锁定句）与模型语义检查（结构化 JSON + 校验 + 一次格式纠正）
- ✅ 上下文按需加载（清单 + `read`，不把整个项目塞进上下文）
- ✅ provider 配置沿用上游（`~/.pi/agent/`），自定义 provider 可用
- ✅ 自动化测试 43 项（vitest，`packages/coding-agent/test/writer/`），覆盖：版本不覆盖、锁定原句检测、段落修改校验（不存在/多处匹配/唯一匹配）、两轮修改上限、无效检查 JSON 与无效引用处理
- ✅ 实际模型调用验证（见下）

**实际模型调用验证**（DeepSeek `deepseek-v4-flash`，2026-10-02）：

- `/draft` 完整闭环：起草落盘 → 程序检查（95/200 字达标）→ 语义检查报出 1 条过度解释 → 修改轮 `revise_paragraph` 局部修改 → 复核 0 issues → 收尾
- `/revise` 完整闭环：导入基线 → 检查器指出删"含糊"导致后文指代失效（omission）→ 修改补回 → 复核 0 issues
- 成长叙事用例：对素材「我当时不想答应，只是怕直接拒绝让场面难看。」与不合格改稿「这段经历让我学会尊重自己的边界。」，模型独立给出 `meaning_drift`（犹豫被改写成已形成的结论）、`unsourced_addition`（"经历/学会/边界"无来源）、`empty_elevation`（总结式升华）三条意见

## 已知限制

- **mock 验证 ≠ 实际模型验证 ≠ 写作质量合格**。自动化测试用 mock 模型驱动流程（流程控制层面的保证）；实际模型行为只能通过调用验证（已做，见上）；**最终文稿好坏必须由人阅读判断**——程序检查只是线索，语义检查也无法保证完全准确。
- 语义检查可能漏报或误报；检查意见可能引用不准（无效引用会被校验丢弃，但"错误却格式正确"的意见无法程序排除）。修改意见是否采纳由模型判断，跳过时会在回复中说明。
- 每轮修改上限默认 2；超过后保留当前文稿并提示（可用 `/revise` 继续处理）。
- `sources/`、`voice/` 只列出 `.md/.markdown/.txt` 文本文件（一层目录）；二进制素材不在 demo 范围。
- 多行流程设计以交互 TUI 为主；print/json 单发模式也可完整跑完流程，但流程指令（检查 JSON 等）不在终端回显（`display: false`）。
- 上游测试 `packages/ai/test/together-models.test.ts` 在模型目录数据更新后存在一个与本次改动无关的既有错误。
- Windows 下个别构建脚本（`shx chmod`）偶发失败，重跑 `npm run build` 即可。
