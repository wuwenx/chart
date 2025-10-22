# Jenkins 监控系统使用说明

## 功能概述

Jenkins监控系统是一个基于AI的智能监控解决方案，能够：

1. **监控Jenkins构建状态** - 实时监控指定Jenkins任务的构建状态
2. **AI智能判断** - 使用LangChain Agent分析构建日志和状态变化
3. **飞书通知** - 自动发送构建结果通知到飞书群
4. **日志记录** - 完整的监控日志和构建历史记录

## 系统架构

```
监控系统 / 日志源 Jenkins
          ↓
Node.js 服务 + LangChain Agent（AI 判断与推理）
          ↓
调用具体工具 Jenkins 构建
          ↓
执行结果反馈飞书
```

## 使用步骤

### 1. 配置Jenkins连接

在"Jenkins配置"卡片中填写：

- **Jenkins URL**: Jenkins服务器地址（如：http://jenkins.example.com）
- **用户名**: Jenkins登录用户名
- **API Token**: Jenkins API访问令牌
- **任务名称**: 要监控的Jenkins任务名称

点击"保存配置"保存设置，点击"测试连接"验证配置是否正确。

### 2. 配置飞书通知

在"飞书通知配置"卡片中填写：

- **飞书 Webhook URL**: 飞书机器人的Webhook地址
- **签名密钥**: 飞书机器人的签名密钥（可选）

点击"保存配置"保存设置，点击"测试通知"发送测试消息。

### 3. 开始监控

配置完成后，点击"开始监控"按钮启动监控服务。系统将：

- 每30秒检查一次Jenkins构建状态
- 使用AI Agent分析构建结果
- 根据分析结果决定是否发送飞书通知
- 记录所有监控活动到日志中

### 4. 查看监控状态

在"构建状态"卡片中可以查看：

- 当前构建状态（空闲/构建中/成功/失败）
- 最后构建信息（构建号、时间、持续时间、构建者）
- 实时监控日志

### 5. 手动触发构建

点击"触发构建"按钮可以手动触发Jenkins任务构建。

## AI智能分析功能

系统集成了LangChain Agent，能够：

- **构建结果评估** - 分析构建成功/失败的原因
- **性能分析** - 评估构建时间是否合理
- **变更风险评估** - 分析代码变更是否可能导致问题
- **智能建议** - 提供改进建议和下一步行动

## 监控日志

系统会记录以下类型的日志：

- **info**: 一般信息（监控启动、构建完成等）
- **warn**: 警告信息（配置问题、连接异常等）
- **error**: 错误信息（连接失败、API错误等）
- **debug**: 调试信息（详细的状态检查等）

## 注意事项

1. **网络连接**: 确保服务器能够访问Jenkins和飞书API
2. **权限配置**: Jenkins用户需要有查看和触发构建的权限
3. **API限制**: 注意Jenkins和飞书API的调用频率限制
4. **监控间隔**: 默认30秒检查一次，可根据需要调整

## 故障排除

### Jenkins连接失败
- 检查Jenkins URL是否正确
- 验证用户名和API Token
- 确认网络连接正常

### 飞书通知失败
- 检查Webhook URL格式
- 验证签名密钥（如果使用）
- 确认机器人有发送消息权限

### AI分析失败
- 检查AI模型配置
- 查看服务器日志
- 系统会自动降级到规则判断

## API接口

系统提供以下API接口：

- `GET /api/jenkins/config` - 获取Jenkins配置
- `POST /api/jenkins/config` - 保存Jenkins配置
- `POST /api/jenkins/test` - 测试Jenkins连接
- `GET /api/jenkins/logs` - 获取监控日志
- `POST /api/jenkins/monitor/start` - 开始监控
- `POST /api/jenkins/monitor/stop` - 停止监控
- `POST /api/jenkins/build/trigger` - 触发构建
- `GET /api/feishu/config` - 获取飞书配置
- `POST /api/feishu/config` - 保存飞书配置
- `POST /api/feishu/test` - 测试飞书连接

## 技术栈

- **前端**: React + Lucide React图标
- **后端**: Node.js + Express
- **AI**: LangChain.js + OpenAI/Google Gemini
- **通知**: 飞书Webhook API
- **监控**: Jenkins REST API
