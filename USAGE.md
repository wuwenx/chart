# 智能问答系统 - 使用示例

## 📋 示例问题

### 文档相关问答
- "这个项目的架构是什么？"
- "如何部署这个应用？"
- "API 接口有哪些？"
- "配置文件如何设置？"

### 代码相关问答
- "这个函数的作用是什么？"
- "如何优化这段代码？"
- "代码中有什么潜在问题？"
- "如何重构这个类？"

### 技术问题
- "如何添加新的功能？"
- "错误处理的最佳实践是什么？"
- "如何提高代码性能？"
- "如何编写单元测试？"

## 🔧 配置示例

### .env 文件配置
```env
# AI 模型配置 - 选择其中一种

# 选项 1：Google Gemini（推荐）
GOOGLE_API_KEY=your_google_api_key_here
AI_MODEL_PROVIDER=gemini

# 选项 2：OpenAI
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
AI_MODEL_PROVIDER=openai

# 服务器配置
PORT=5000
NODE_ENV=development

# 存储路径
DOCUMENTS_PATH=./documents
VECTOR_STORE_PATH=./vectorstore
```

## 📁 支持的文件格式

### 文档格式
- PDF (.pdf)
- Word 文档 (.doc, .docx)
- 纯文本 (.txt)
- Markdown (.md)

### 代码格式
- JavaScript (.js)
- TypeScript (.ts)
- Python (.py)
- Java (.java)
- C++ (.cpp)
- C (.c)
- HTML (.html)
- CSS (.css)
- JSON (.json)
- XML (.xml)

## 🚀 快速测试

1. **启动系统**
```bash
./start.sh
```

2. **上传测试文档**
   - 创建一个 `test.txt` 文件
   - 内容：`这是一个测试文档，包含项目的基本信息。`
   - 上传到系统

3. **测试问答**
   - 问题：`这个文档包含什么信息？`
   - 期望回答：系统会基于上传的文档内容回答

4. **上传测试代码**
   - 创建一个 `test.js` 文件
   - 内容：
   ```javascript
   function greet(name) {
     return `Hello, ${name}!`;
   }
   
   console.log(greet('World'));
   ```
   - 上传到系统

5. **测试代码分析**
   - 问题：`这个函数的作用是什么？`
   - 期望回答：系统会分析代码并解释函数功能

## 🔍 高级功能

### 代码质量分析
上传代码后，可以询问：
- "这段代码的质量如何？"
- "有什么改进建议？"
- "代码复杂度如何？"

### 文档搜索
上传文档后，可以询问：
- "文档中提到了哪些技术？"
- "如何配置环境？"
- "有哪些注意事项？"

### 上下文对话
系统支持多轮对话，可以：
- 基于之前的回答继续提问
- 深入探讨某个话题
- 获得更详细的解释

## 🛠️ 故障排除

### 常见问题

1. **API Key 错误**
   - 检查 .env 文件中的 API Key 配置
   - 确保 API Key 有效且有足够额度
   - 验证 AI_MODEL_PROVIDER 设置正确

2. **获取 Google Gemini API Key**
   - 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
   - 登录 Google 账户
   - 点击 "Create API Key" 创建新的 API Key
   - 复制 API Key 到 .env 文件中

2. **文件上传失败**
   - 检查文件大小（限制 10MB）
   - 确认文件格式受支持
   - 检查服务器磁盘空间

3. **回答质量不佳**
   - 确保上传了相关的文档或代码
   - 尝试更具体的问题
   - 检查文档内容是否清晰

4. **服务启动失败**
   - 检查端口是否被占用
   - 确认 Node.js 版本 >= 16
   - 检查依赖是否正确安装

### 调试模式

启用详细日志：
```bash
DEBUG=* npm run start
```

检查服务状态：
```bash
curl http://localhost:5000/api/health
```

## 📊 性能优化

### 文档处理优化
- 大文档会被自动分割成小块
- 向量存储使用内存模式，适合中小规模应用
- 支持增量更新，无需重新处理所有文档

### 代码分析优化
- 代码按函数/类分割，提高检索精度
- 支持多种编程语言的语法分析
- 智能识别代码结构和依赖关系

## 🔒 安全考虑

- API Key 存储在环境变量中
- 上传的文件会被临时存储后删除
- 支持 CORS 配置
- 文件类型验证和大小限制

## 📈 扩展建议

### 功能扩展
- 添加更多文档格式支持
- 集成更多 AI 模型
- 添加用户认证系统
- 实现文档版本管理

### 性能扩展
- 使用数据库存储向量
- 添加缓存机制
- 实现分布式处理
- 添加负载均衡

---

💡 **提示**: 这个系统是一个完整的 RAG 架构实现，可以作为企业级智能问答系统的基础进行扩展和定制。
