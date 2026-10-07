# API 与参数核对

<!-- 格式：- <API/参数/返回值> → sources/xxx.md：说明 -->

- Base URL https://api.taskflow.example.com/v1 → sources/api.md
- 认证：请求头 `Authorization: Bearer <token>`；token 在控制台「开发者设置」页创建，无过期时间，可手动吊销 → sources/api.md
  - 认证失败 401：{"error": "unauthorized", "message": "token is missing or revoked"} → sources/api.md
- POST /tasks → sources/api.md
  - title：string，必填，默认值无
  - priority：string，可选，默认 normal，取值 high/normal/low
  - due：string，可选，格式 YYYY-MM-DD，服务端不设默认值（不传则无截止日）→ sources/api.md
  - 201 响应字段：id、title、priority、status（示例为 open）、created_at（ISO 8601）
  - 400 错误：{"error": "invalid_request", "message": "title is required"}
- GET /tasks/{id} → sources/api.md
  - 路径参数 id：string，必填（示例值 task_8fa3）
  - 200 响应字段：id、status（open/done/closed 之一）、priority（high/normal/low 之一）
  - 404 错误：{"error": "not_found"}
- 频率限制：每 token 每分钟 60 次；超限 429，响应头 Retry-After 给出秒数 → sources/api.md
- 范围外内容（文档未涉及）：删除任务、批量接口、Webhook → sources/api.md
- 认证步骤的 `export TOKEN="<你的token>"` 与 GET 请求示例 curl 为按 sources/ 事实组织的示例（sources/ 未直接给出，无新增端点或参数）
