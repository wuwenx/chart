# 🤖 Google Gemini 配置指南

## 🎯 为什么选择 Google Gemini？

- ✅ **免费额度充足**：Google 提供慷慨的免费使用额度
- ✅ **性能优秀**：Gemini Pro 模型性能与 GPT-3.5 相当
- ✅ **支持中文**：对中文理解和生成效果很好
- ✅ **无需信用卡**：注册即可使用，无需绑定支付方式
- ✅ **快速响应**：API 响应速度快

## 🔑 获取 Google API Key

### 步骤 1：访问 Google AI Studio
1. 打开浏览器，访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 使用您的 Google 账户登录

### 步骤 2：创建 API Key
1. 点击页面上的 **"Create API Key"** 按钮
2. 选择您的 Google 账户（如果提示）
3. 系统会生成一个新的 API Key
4. **重要**：立即复制并保存这个 API Key，它只会显示一次

### 步骤 3：配置到项目中
1. 打开项目根目录的 `.env` 文件
2. 将 API Key 填入配置：

```env
# Google Gemini 配置
GOOGLE_API_KEY=your_actual_api_key_here
AI_MODEL_PROVIDER=gemini

# 服务器配置
PORT=5000
NODE_ENV=development
```

## 🚀 启动系统

### 方法 1：使用启动脚本
```bash
./start.sh
```

### 方法 2：手动启动
```bash
# 启动后端服务
npm run start

# 在另一个终端启动前端
npm run dev
```

## ✅ 验证配置

### 检查服务状态
访问 `http://localhost:5000/api/health` 查看服务状态：

```json
{
  "status": "healthy",
  "services": {
    "aiModelManager": true,
    "chatService": true,
    "vectorStore": true
  },
  "aiModel": {
    "provider": "gemini",
    "llmModel": "gemini-pro",
    "status": "ready"
  }
}
```

### 检查模型信息
访问 `http://localhost:5000/api/model-info` 查看模型详情：

```json
{
  "provider": "gemini",
  "llmModel": "gemini-pro",
  "embeddingsModel": "simple-text",
  "status": "ready"
}
```

## 🧪 测试功能

### 1. 上传测试文档
- 上传 `test-document.md` 文件
- 询问："这个文档包含什么内容？"

### 2. 上传测试代码
- 上传 `test-code.js` 文件
- 询问："这个 UserManager 类有什么功能？"

### 3. 智能问答测试
- 问题："如何优化代码性能？"
- 问题："解释一下这段代码的逻辑"

## 🔧 故障排除

### 常见问题

**1. API Key 无效**
```
错误：Google API Key 未配置
解决：检查 .env 文件中的 GOOGLE_API_KEY 是否正确
```

**2. 模型初始化失败**
```
错误：AI 模型初始化失败
解决：确保网络连接正常，API Key 有效
```

**3. 回答质量不佳**
```
原因：Gemini 使用简单文本嵌入
解决：可以切换到 OpenAI 获得更好的嵌入效果
```

### 调试模式

启用详细日志：
```bash
DEBUG=* npm run start
```

检查 API 调用：
```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "你好，请介绍一下自己"}'
```

## 📊 性能对比

| 特性 | Google Gemini | OpenAI GPT |
|------|---------------|-------------|
| 免费额度 | ✅ 充足 | ❌ 有限 |
| 中文支持 | ✅ 优秀 | ✅ 优秀 |
| 响应速度 | ✅ 快速 | ✅ 快速 |
| 代码理解 | ✅ 良好 | ✅ 优秀 |
| 文档问答 | ✅ 良好 | ✅ 优秀 |
| 嵌入质量 | ⚠️ 简单 | ✅ 专业 |

## 🔄 切换模型

如果您想从 Gemini 切换到 OpenAI：

1. 获取 OpenAI API Key
2. 更新 `.env` 文件：
```env
OPENAI_API_KEY=your_openai_api_key_here
AI_MODEL_PROVIDER=openai
```
3. 重启服务

## 💡 使用建议

### 最佳实践
1. **文档问答**：Gemini 表现良好，适合一般问答
2. **代码分析**：Gemini 可以理解代码逻辑，提供有用建议
3. **复杂推理**：对于复杂问题，可以考虑切换到 OpenAI
4. **成本控制**：Gemini 免费额度充足，适合学习和测试

### 优化技巧
1. **问题描述**：尽量详细和具体地描述问题
2. **上下文**：提供足够的上下文信息
3. **分步提问**：将复杂问题分解为多个简单问题
4. **反馈循环**：根据回答质量调整问题描述

## 🎉 开始使用

现在您已经成功配置了 Google Gemini 模型！您可以：

1. 📤 上传您的文档和代码文件
2. 💬 开始智能问答体验
3. 🔍 探索 RAG 架构的强大功能
4. 🚀 享受免费的 AI 助手服务

---

**提示**：如果您在使用过程中遇到任何问题，请检查网络连接和 API Key 配置，或者查看控制台日志获取详细错误信息。
