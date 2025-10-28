# 飞书通知配置说明

## 概述

系统现在支持两种飞书通知方式：

1. **Webhook方式**（推荐用于群聊）
2. **开放平台API方式**（推荐用于私聊）

## 配置方式

### 方式一：Webhook配置（群聊推荐）

1. 在飞书群聊中添加机器人
2. 获取Webhook URL
3. 可选：配置签名密钥提高安全性

**配置字段：**
- `webhookUrl`: 飞书机器人的Webhook URL
- `secret`: 签名密钥（可选）

### 方式二：开放平台API配置（私聊推荐）

1. 在飞书开放平台创建应用
2. 获取Access Token
3. 获取接收者ID（用户或群聊）

**配置字段：**
- `accessToken`: 飞书应用的访问令牌
- `receiveId`: 接收消息的用户ID或群聊ID
- `receiveIdType`: 接收者ID类型（open_id/user_id/union_id/email/chat_id）

## API调用示例

使用开放平台API发送消息的curl命令：

```bash
curl -i -X POST 'https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=open_id' \
-H 'Content-Type: application/json' \
-H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
-d '{
	"content": "{\"text\":\"test content\"}",
	"msg_type": "text",
	"receive_id": "YOUR_RECEIVE_ID"
}'
```

## 优先级

系统会优先使用API方式，如果API配置不完整，则回退到Webhook方式。

## 注意事项

1. 至少需要配置一种方式（Webhook或API）
2. API方式的Access Token需要定期刷新
3. 接收者ID类型需要与实际的ID格式匹配
4. 建议在生产环境中使用签名密钥提高安全性
