# 命令与用法核对

<!-- 格式：- <命令/flag> → sources/xxx.md：说明 -->

- `npm install waitfor-http` → sources/specs.md：安装命令
- `npx waitfor-http --url http://localhost:3000/health --timeout 30000 --interval 1000` → sources/specs.md：CLI 用法（仅 CLI usage 节出现一次；Install 节以行内代码 `npx waitfor-http` 作简短提示，见 review-001 去重）
- `--url`（必填，轮询地址）→ sources/specs.md：CLI 选项
- `--timeout`（默认 30000，ms，超时退出码 1）→ sources/specs.md：CLI 选项
- `--interval`（默认 1000，ms，重试间隔）→ sources/specs.md：CLI 选项
- `import { waitFor } from "waitfor-http"` / `waitFor("http://localhost:3000/health", { timeout: 30000 })` → sources/specs.md：API 用法（示例末尾 `console.log(res.status, res.body)` 仅为展示返回值 `{ status, body }`）
- `npm test` → sources/specs.md：贡献要求（提交 PR 前运行）
