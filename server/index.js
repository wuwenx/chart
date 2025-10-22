const express = require('express')
const cors = require('cors')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
require('dotenv').config()

const { DocumentProcessor } = require('./services/documentProcessor')
const { VectorStore } = require('./services/vectorStore')
const { ChatService } = require('./services/chatService')
const { DocumentChatService } = require('./services/documentChatService')
const { CodeAnalyzer } = require('./services/codeAnalyzer')
const { AIModelManager } = require('./services/aiModelManager')

const app = express()
const PORT = process.env.PORT || 5000

// 中间件
app.use(cors())
app.use(express.json())
app.use(express.static('dist'))

// 确保必要的目录存在
const ensureDirectories = () => {
  const dirs = ['./documents', './vectorstore', './uploads', './codebase']
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })
}

ensureDirectories()

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = file.fieldname === 'codeFiles' ? './codebase' : './uploads'
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 限制
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.md', '.js', '.ts', '.py', '.java', '.cpp', '.c', '.html', '.css', '.json', '.xml']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowedTypes.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的文件类型'))
    }
  }
})

// 初始化服务
let documentProcessor, vectorStore, chatService, documentChatService, codeAnalyzer, aiModelManager

const initializeServices = async () => {
  try {
    aiModelManager = new AIModelManager()
    documentProcessor = new DocumentProcessor()
    vectorStore = new VectorStore()
    chatService = new ChatService(vectorStore)
    documentChatService = new DocumentChatService(vectorStore)
    codeAnalyzer = new CodeAnalyzer()
    
    console.log('✅ 服务初始化完成')
    console.log(`🤖 当前 AI 模型: ${aiModelManager.getProvider()}`)
  } catch (error) {
    console.error('❌ 服务初始化失败:', error)
  }
}

// API 路由

// 上传文档
app.post('/api/upload', upload.array('documents'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '没有上传文件' })
    }

    const processedDocs = []
    
    for (const file of req.files) {
      try {
        const ext = path.extname(file.originalname).toLowerCase()
        
        if (['.js', '.ts', '.py', '.java', '.cpp', '.c', '.html', '.css'].includes(ext)) {
          // 处理代码文件
          const documents = await documentProcessor.processCodeFile(file.path, file.originalname)
          processedDocs.push(...documents)
        } else {
          // 处理文档文件
          const documents = await documentProcessor.processFile(file.path, file.originalname)
          processedDocs.push(...documents)
        }
        
        // 清理临时文件
        fs.unlinkSync(file.path)
      } catch (error) {
        console.error(`处理文件 ${file.originalname} 时出错:`, error)
      }
    }

    if (processedDocs.length > 0) {
      // 存储到向量数据库
      await vectorStore.addDocuments(processedDocs)
      
      res.json({ 
        message: '文档上传成功',
        processedCount: processedDocs.length,
        totalFiles: req.files.length
      })
    } else {
      res.status(400).json({ error: '没有成功处理任何文档' })
    }
  } catch (error) {
    console.error('上传处理错误:', error)
    res.status(500).json({ error: '文档处理失败' })
  }
})

// 上传代码文件
app.post('/api/upload-code', upload.array('codeFiles'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '没有上传代码文件' })
    }

    const processedDocs = []
    
    for (const file of req.files) {
      try {
        const documents = await documentProcessor.processCodeFile(file.path, file.originalname)
        processedDocs.push(...documents)
        
        // 清理临时文件
        fs.unlinkSync(file.path)
      } catch (error) {
        console.error(`处理代码文件 ${file.originalname} 时出错:`, error)
      }
    }

    if (processedDocs.length > 0) {
      await vectorStore.addDocuments(processedDocs)
      
      res.json({ 
        message: '代码文件上传成功',
        processedCount: processedDocs.length,
        totalFiles: req.files.length
      })
    } else {
      res.status(400).json({ error: '没有成功处理任何代码文件' })
    }
  } catch (error) {
    console.error('代码文件上传处理错误:', error)
    res.status(500).json({ error: '代码文件处理失败' })
  }
})

// 聊天接口
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: '消息不能为空' })
    }

    const response = await chatService.generateResponse(message, history)
    
    res.json({ response })
  } catch (error) {
    console.error('聊天处理错误:', error)
    res.status(500).json({ error: '生成回答失败' })
  }
})

// 文档问答接口（独立，不包含数据库查询功能）
app.post('/api/document-chat', async (req, res) => {
  try {
    const { message, history } = req.body
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: '消息不能为空' })
    }

    const response = await documentChatService.generateResponse(message, history)
    
    res.json({ response })
  } catch (error) {
    console.error('文档聊天处理错误:', error)
    res.status(500).json({ error: '生成回答失败' })
  }
})

// 代码分析接口
app.post('/api/analyze-code', async (req, res) => {
  try {
    const { code, question } = req.body
    
    if (!code || !code.trim()) {
      return res.status(400).json({ error: '代码不能为空' })
    }

    const analysis = await chatService.analyzeCode(code, question || '请分析这段代码')
    
    res.json({ analysis })
  } catch (error) {
    console.error('代码分析错误:', error)
    res.status(500).json({ error: '代码分析失败' })
  }
})

// 搜索代码
app.post('/api/search-code', async (req, res) => {
  try {
    const { query, language } = req.body
    
    if (!query || !query.trim()) {
      return res.status(400).json({ error: '搜索查询不能为空' })
    }

    const results = await chatService.searchByType('code', query, 10)
    
    // 如果指定了语言，过滤结果
    const filteredResults = language 
      ? results.filter(doc => doc.metadata?.language === language)
      : results

    res.json({ 
      results: filteredResults,
      total: filteredResults.length
    })
  } catch (error) {
    console.error('代码搜索错误:', error)
    res.status(500).json({ error: '代码搜索失败' })
  }
})

// 获取文档列表
app.get('/api/documents', async (req, res) => {
  try {
    const documents = await vectorStore.getDocumentList()
    res.json({ documents })
  } catch (error) {
    console.error('获取文档列表错误:', error)
    res.status(500).json({ error: '获取文档列表失败' })
  }
})

// 获取代码统计
app.get('/api/code-stats', async (req, res) => {
  try {
    const stats = vectorStore.getStats()
    const codeDocs = vectorStore.documents.filter(doc => doc.metadata?.type === 'code')
    
    const languageStats = {}
    codeDocs.forEach(doc => {
      const lang = doc.metadata?.language || 'unknown'
      languageStats[lang] = (languageStats[lang] || 0) + 1
    })

    res.json({
      totalDocuments: stats.totalDocuments,
      codeDocuments: codeDocs.length,
      documentDocuments: stats.totalDocuments - codeDocs.length,
      languageStats,
      lastUpdated: stats.lastUpdated
    })
  } catch (error) {
    console.error('获取代码统计错误:', error)
    res.status(500).json({ error: '获取代码统计失败' })
  }
})

// 删除文档
app.delete('/api/documents/:id', async (req, res) => {
  try {
    const { id } = req.params
    await vectorStore.deleteDocument(id)
    res.json({ message: '文档删除成功' })
  } catch (error) {
    console.error('删除文档错误:', error)
    res.status(500).json({ error: '删除文档失败' })
  }
})

// 获取文档摘要
app.get('/api/documents/:id/summary', async (req, res) => {
  try {
    const { id } = req.params
    const summary = await chatService.getDocumentSummary(id)
    res.json({ summary })
  } catch (error) {
    console.error('获取文档摘要错误:', error)
    res.status(500).json({ error: '获取文档摘要失败' })
  }
})

// 获取 AI 模型信息
app.get('/api/model-info', (req, res) => {
  try {
    if (!aiModelManager) {
      return res.status(500).json({ error: 'AI 模型管理器未初始化' })
    }
    
    const modelInfo = aiModelManager.getModelInfo()
    res.json(modelInfo)
  } catch (error) {
    console.error('获取模型信息错误:', error)
    res.status(500).json({ error: '获取模型信息失败' })
  }
})

// 数据库查询相关 API
// 获取数据库概览
app.get('/api/database/overview', async (req, res) => {
  try {
    const overview = await chatService.getDatabaseOverview()
    res.json(overview)
  } catch (error) {
    console.error('获取数据库概览错误:', error)
    res.status(500).json({ error: '获取数据库概览失败' })
  }
})

// 执行数据库查询
app.post('/api/database/query', async (req, res) => {
  try {
    const { question } = req.body
    
    if (!question) {
      return res.status(400).json({ error: '查询问题不能为空' })
    }

    const result = await chatService.generateDatabaseResponse(question)
    res.json({ 
      success: true,
      response: result,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('数据库查询错误:', error)
    res.status(500).json({ 
      success: false,
      error: '数据库查询失败',
      message: error.message
    })
  }
})

// 测试数据库连接
app.get('/api/database/test', async (req, res) => {
  try {
    await chatService.initializeDatabaseService()
    res.json({ 
      success: true,
      message: '数据库连接测试成功'
    })
  } catch (error) {
    console.error('数据库连接测试错误:', error)
    res.status(500).json({ 
      success: false,
      error: '数据库连接测试失败',
      message: error.message
    })
  }
})

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      documentProcessor: !!documentProcessor,
      vectorStore: !!vectorStore,
      chatService: !!chatService,
      codeAnalyzer: !!codeAnalyzer,
      aiModelManager: !!aiModelManager,
      databaseService: !!chatService?.sqlQueryService
    },
    aiModel: aiModelManager ? aiModelManager.getModelInfo() : null
  })
})

// 启动服务器
app.listen(PORT, async () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`)
  await initializeServices()
})

module.exports = app