# 🤖 智能问答系统

基于 LangChain.js 框架的 RAG（检索增强生成）架构智能问答系统，支持内部文档和项目代码的智能问答。

## ✨ 功能特性

- 🔍 **RAG 架构**：基于 LangChain.js 实现检索增强生成
- 📄 **多格式文档支持**：PDF、Word、TXT、Markdown 等
- 💻 **代码分析**：支持 JavaScript、TypeScript、Python、Java 等多种编程语言
- 🧠 **智能问答**：基于 OpenAI GPT 模型的智能对话
- 📊 **向量存储**：使用内存向量存储进行文档检索
- 🎨 **现代 UI**：响应式设计，美观的用户界面
- 🔄 **实时交互**：支持实时问答和文档上传

## 🚀 快速开始

### 环境要求

- Node.js 16+ 
- npm 或 yarn
- AI 模型 API Key（支持 OpenAI 或 Google Gemini）

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd intelligent-qa-system
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp env.example .env
```

编辑 `.env` 文件，选择并配置 AI 模型：

**选项 1：使用 Google Gemini（推荐，免费额度）**
```env
GOOGLE_API_KEY=your_google_api_key_here
AI_MODEL_PROVIDER=gemini
PORT=5000
NODE_ENV=development
```

**选项 2：使用 OpenAI**
```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
AI_MODEL_PROVIDER=openai
PORT=5000
NODE_ENV=development
```

4. **启动开发服务器**
```bash
# 启动后端服务
npm run start

# 在另一个终端启动前端开发服务器
npm run dev
```

4. **获取 API Key**

**获取 Google Gemini API Key（推荐）：**
1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 登录您的 Google 账户
3. 点击 "Create API Key" 创建新的 API Key
4. 复制生成的 API Key 到 `.env` 文件中

**获取 OpenAI API Key：**
1. 访问 [OpenAI Platform](https://platform.openai.com/api-keys)
2. 登录您的 OpenAI 账户
3. 点击 "Create new secret key" 创建新的 API Key
4. 复制生成的 API Key 到 `.env` 文件中

5. **启动开发服务器**
```bash
# 启动后端服务
npm run start

# 在另一个终端启动前端开发服务器
npm run dev
```

6. **访问应用**
打开浏览器访问 `http://localhost:3000`

## 📁 项目结构

```
intelligent-qa-system/
├── src/                    # 前端源码
│   ├── App.jsx            # 主应用组件
│   ├── main.jsx           # 入口文件
│   └── index.css          # 样式文件
├── server/                # 后端服务
│   ├── index.js           # 服务器入口
│   └── services/          # 服务模块
│       ├── documentProcessor.js  # 文档处理服务
│       ├── vectorStore.js       # 向量存储服务
│       ├── chatService.js       # 聊天服务
│       └── codeAnalyzer.js      # 代码分析服务
├── documents/             # 文档存储目录
├── vectorstore/          # 向量存储目录
├── uploads/              # 上传文件临时目录
├── codebase/             # 代码文件存储目录
└── package.json          # 项目配置
```

## 🔧 API 接口

### 文档上传
```http
POST /api/upload
Content-Type: multipart/form-data

documents: File[]
```

### 代码文件上传
```http
POST /api/upload-code
Content-Type: multipart/form-data

codeFiles: File[]
```

### 智能问答
```http
POST /api/chat
Content-Type: application/json

{
  "message": "您的问题",
  "history": []
}
```

### 代码分析
```http
POST /api/analyze-code
Content-Type: application/json

{
  "code": "代码内容",
  "question": "分析问题"
}
```

### 代码搜索
```http
POST /api/search-code
Content-Type: application/json

{
  "query": "搜索关键词",
  "language": "javascript"
}
```

### 获取文档列表
```http
GET /api/documents
```

### 获取代码统计
```http
GET /api/code-stats
```

## 🎯 使用指南

### 1. 上传文档
- 点击"上传文档"按钮
- 选择 PDF、Word、TXT 或 Markdown 文件
- 系统会自动处理并存储到向量数据库

### 2. 上传代码
- 选择代码文件（支持 .js, .ts, .py, .java, .cpp 等）
- 系统会分析代码结构并建立索引

### 3. 智能问答
- 在输入框中输入问题
- 系统会基于上传的文档和代码生成回答
- 支持上下文对话

### 4. 代码分析
- 上传代码文件后，可以询问代码相关问题
- 系统提供代码质量分析、功能解释等

## 🔧 技术栈

### 前端
- **React 18** - 用户界面框架
- **Vite** - 构建工具
- **Lucide React** - 图标库
- **CSS3** - 样式设计

### 后端
- **Node.js** - 运行环境
- **Express** - Web 框架
- **LangChain.js** - AI 应用框架
- **OpenAI API** - 大语言模型
- **Multer** - 文件上传处理

### 文档处理
- **pdf-parse** - PDF 解析
- **mammoth** - Word 文档解析
- **cheerio** - HTML 解析

## 🛠️ 开发说明

### 添加新的文档格式支持

1. 在 `documentProcessor.js` 中添加新的处理方法
2. 更新 `supportedFormats` 对象
3. 在文件上传配置中添加新的文件类型

### 自定义 AI 模型

1. 修改 `chatService.js` 中的模型配置
2. 更新环境变量中的 API 配置
3. 调整提示模板以适应新模型

### 扩展代码分析功能

1. 在 `codeAnalyzer.js` 中添加新的分析提示
2. 实现特定的代码分析逻辑
3. 更新 API 接口以支持新功能

## 📝 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `AI_MODEL_PROVIDER` | AI 模型提供商 | `gemini` |
| `GOOGLE_API_KEY` | Google Gemini API 密钥 | 必填（使用 Gemini 时） |
| `OPENAI_API_KEY` | OpenAI API 密钥 | 必填（使用 OpenAI 时） |
| `OPENAI_BASE_URL` | OpenAI API 基础 URL | `https://api.openai.com/v1` |
| `PORT` | 服务器端口 | `5000` |
| `NODE_ENV` | 运行环境 | `development` |
| `DOCUMENTS_PATH` | 文档存储路径 | `./documents` |
| `VECTOR_STORE_PATH` | 向量存储路径 | `./vectorstore` |

### 🤖 AI 模型选择

**Google Gemini（推荐）：**
- ✅ 免费额度充足
- ✅ 性能优秀
- ✅ 支持中文
- ✅ 无需信用卡

**OpenAI GPT：**
- ✅ 功能强大
- ✅ 生态完善
- ⚠️ 需要付费
- ⚠️ 需要信用卡

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [LangChain.js](https://js.langchain.com/) - AI 应用开发框架
- [OpenAI](https://openai.com/) - 大语言模型服务
- [React](https://reactjs.org/) - 用户界面库
- [Vite](https://vitejs.dev/) - 构建工具

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件至 [your-email@example.com]
- 项目讨论区

---

⭐ 如果这个项目对您有帮助，请给它一个星标！
