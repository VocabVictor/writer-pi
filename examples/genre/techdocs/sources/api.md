# API 事实（需要处理的事实）

- Base URL：https://api.taskflow.example.com/v1
- 认证：请求头 `Authorization: Bearer <token>`；token 在控制台「开发者设置」页创建，无过期时间，可手动吊销
- 创建任务：`POST /tasks`
  - 请求体：`{"title": "string", "priority": "high" | "normal" | "low", "due": "YYYY-MM-DD"}`
  - `title` 必填；`priority` 默认 normal；`due` 可选，服务端不设默认值（不传则无截止日）
  - 成功响应 201：`{"id": "task_8fa3", "title": "发布说明校对", "priority": "normal", "status": "open", "created_at": "2026-09-30T08:12:44Z"}`
  - 错误 400：`{"error": "invalid_request", "message": "title is required"}`
  - 认证失败 401：`{"error": "unauthorized", "message": "token is missing or revoked"}`
- 查询状态：`GET /tasks/{id}`
  - 成功响应 200：`{"id": "task_8fa3", "status": "done" | "open" | "closed", "priority": "high" | "normal" | "low"}`
  - 错误 404：`{"error": "not_found"}`
- 频率限制：每 token 每分钟 60 次；超限返回 429，响应头 `Retry-After` 给出秒数
- 示例 curl（创建任务）：`curl -X POST https://api.taskflow.example.com/v1/tasks -H "Authorization: Bearer $TOKEN" -d '{"title":"发布说明校对"}'`
- 不在范围内的内容：删除任务、批量接口、Webhook
