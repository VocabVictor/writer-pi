# Taskflow API 入门教程：创建任务与查询状态

本教程演示如何调用 API 完成两个操作：创建任务、查询任务状态。两个操作分别对应 `POST /tasks` 与 `GET /tasks/{id}` 端点，按步骤 1 至步骤 3 依次执行即可。

Base URL：`https://api.taskflow.example.com/v1`

## 前置条件

- 一个可用的 API token（获取方式见步骤 1）。
- 终端环境中已安装 curl（本文命令示例均使用 curl）。

## 步骤 1：认证

每个请求都需携带请求头 `Authorization: Bearer <token>`。token 在控制台「开发者设置」页创建，没有过期时间，可随时手动吊销。

先把 token 存入环境变量，便于后续命令直接引用：

```
export TOKEN="<你的token>"
```

后续示例中的 `$TOKEN` 会展开为这个值。

预期结果：token 可通过 `$TOKEN` 在后续命令中使用。

认证失败（token 缺失或已吊销）时返回 401：

```
{"error": "unauthorized", "message": "token is missing or revoked"}
```

## 步骤 2：创建任务

向 `POST /tasks` 发送 JSON 请求体。

请求参数：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| title | string | 是 | 无 | 任务标题 |
| priority | string | 否 | normal | 优先级，取值 high、normal、low |
| due | string | 否 | 无（不传则无截止日） | 截止日期，格式 YYYY-MM-DD |

请求示例（只传必填的 title）：

```
curl -X POST https://api.taskflow.example.com/v1/tasks -H "Authorization: Bearer $TOKEN" -d '{"title":"发布说明校对"}'
```

省略的 priority 取默认值 normal；due 不设置。

成功时返回 201：

```
{"id": "task_8fa3", "title": "发布说明校对", "priority": "normal", "status": "open", "created_at": "2026-09-30T08:12:44Z"}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 任务标识，查询状态时使用 |
| title | string | 任务标题 |
| priority | string | 优先级 |
| status | string | 新建任务的状态（示例中为 open） |
| created_at | string | 创建时间，ISO 8601 格式 |

请求体缺少 title 等无效请求返回 400：

```
{"error": "invalid_request", "message": "title is required"}
```

`message` 字段说明具体错误原因。

预期结果：返回 201 与新建任务的 id；请求体无效时返回 400。

## 步骤 3：查询任务状态

向 `GET /tasks/{id}` 发送请求，把 `{id}` 替换为步骤 2 返回的 id。

路径参数：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| id | string | 是 | 无 | 任务标识，取自创建任务响应的 id 字段 |

请求示例：

```
curl https://api.taskflow.example.com/v1/tasks/task_8fa3 -H "Authorization: Bearer $TOKEN"
```

成功时返回 200：

```
{"id": "task_8fa3", "status": "done" | "open" | "closed", "priority": "high" | "normal" | "low"}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 任务标识 |
| status | string | 任务状态，取值 open、done、closed 之一 |
| priority | string | 优先级，取值 high、normal、low 之一 |

id 不存在时返回 404：

```
{"error": "not_found"}
```

预期结果：返回 200 与任务当前状态；id 不存在时返回 404。

## 频率限制

每个 token 每分钟最多 60 次请求。超过限制时返回 429，响应头 `Retry-After` 给出需要等待的秒数。

## 范围说明

本文只覆盖创建任务与查询状态；删除任务、批量接口、Webhook 不在范围内。