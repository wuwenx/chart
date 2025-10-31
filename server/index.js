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
const JenkinsService = require('./services/jenkinsService')
const FeishuService = require('./services/feishuService')
const JenkinsAgent = require('./services/jenkinsAgent')
const CICDManager = require('./services/cicdManager')
const GitWebhookService = require('./services/gitWebhookService')

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
let jenkinsService, feishuService, jenkinsAgent, cicdManager, gitWebhookService

const initializeServices = async () => {
  try {
    aiModelManager = new AIModelManager()
    documentProcessor = new DocumentProcessor()
    vectorStore = new VectorStore()
    chatService = new ChatService(vectorStore)
    documentChatService = new DocumentChatService(vectorStore)
    codeAnalyzer = new CodeAnalyzer()
    jenkinsService = new JenkinsService()
    feishuService = new FeishuService()
    jenkinsAgent = new JenkinsAgent()
    cicdManager = new CICDManager()
    gitWebhookService = new GitWebhookService()
    
    // 连接服务
    jenkinsService.setExternalServices(feishuService, jenkinsAgent)
    
    console.log('✅ 服务初始化完成')
    console.log(`🤖 当前 AI 模型: ${aiModelManager.getProvider()}`)
    console.log('🔧 Jenkins监控服务已启动')
    console.log('📱 飞书通知服务已启动')
    console.log('🧠 Jenkins AI Agent已启动')
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
    const { question, generateChart, sendToTelegram, chartType } = req.body
    
    if (!question) {
      return res.status(400).json({ error: '查询问题不能为空' })
    }

    const options = {
      generateChart: generateChart || false,
      sendToTelegram: sendToTelegram || false,
      chartType: chartType || 'auto'
    }

    const result = await chatService.generateDatabaseResponse(question, options)
    
    const response = { 
      success: true,
      response: typeof result === 'object' ? result.text : result,
      timestamp: new Date().toISOString()
    }

    // 如果有图表数据，转换为base64
    if (typeof result === 'object' && result.chartBuffer) {
      response.chartBase64 = result.chartBuffer.toString('base64')
    }

    res.json(response)
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

// 获取数据库列表
app.get('/api/database/list', async (req, res) => {
  try {
    await chatService.initializeDatabaseService()
    const databases = await chatService.sqlQueryService.getDatabaseList()
    res.json({ 
      success: true,
      databases
    })
  } catch (error) {
    console.error('获取数据库列表错误:', error)
    res.status(500).json({ 
      success: false,
      error: '获取数据库列表失败',
      message: error.message
    })
  }
})

// 获取当前数据库
app.get('/api/database/current', async (req, res) => {
  try {
    await chatService.initializeDatabaseService()
    const currentDatabase = chatService.sqlQueryService.getCurrentDatabase()
    res.json({ 
      success: true,
      database: currentDatabase
    })
  } catch (error) {
    console.error('获取当前数据库错误:', error)
    res.status(500).json({ 
      success: false,
      error: '获取当前数据库失败',
      message: error.message
    })
  }
})

// 切换数据库
app.post('/api/database/switch', async (req, res) => {
  try {
    const { database } = req.body
    
    if (!database) {
      return res.status(400).json({ 
        success: false,
        error: '数据库名称不能为空'
      })
    }

    await chatService.initializeDatabaseService()
    await chatService.sqlQueryService.switchDatabase(database)
    
    res.json({ 
      success: true,
      message: `已切换到数据库: ${database}`,
      database
    })
  } catch (error) {
    console.error('切换数据库错误:', error)
    res.status(500).json({ 
      success: false,
      error: '切换数据库失败',
      message: error.message
    })
  }
})

// 配置Telegram Bot
app.post('/api/telegram/configure', async (req, res) => {
  try {
    const { botToken, chatId } = req.body
    
    if (!botToken || !chatId) {
      return res.status(400).json({ error: 'Bot Token 和 Chat ID 不能为空' })
    }

    const success = chatService.sqlQueryService.configureTelegram(botToken, chatId)
    
    if (success) {
      res.json({ 
        success: true,
        message: 'Telegram Bot 配置成功'
      })
    } else {
      res.status(400).json({ 
        success: false,
        error: 'Telegram Bot 配置失败'
      })
    }
  } catch (error) {
    console.error('Telegram配置错误:', error)
    res.status(500).json({ 
      success: false,
      error: 'Telegram配置失败',
      message: error.message
    })
  }
})

// 获取Telegram状态
app.get('/api/telegram/status', async (req, res) => {
  try {
    const status = chatService.sqlQueryService.getTelegramStatus()
    res.json(status)
  } catch (error) {
    console.error('获取Telegram状态错误:', error)
    res.status(500).json({ 
      success: false,
      error: '获取Telegram状态失败',
      message: error.message
    })
  }
})

// 测试Telegram连接
app.post('/api/telegram/test', async (req, res) => {
  try {
    await chatService.sqlQueryService.testTelegramConnection()
    res.json({ 
      success: true,
      message: 'Telegram连接测试成功'
    })
  } catch (error) {
    console.error('Telegram连接测试错误:', error)
    res.status(500).json({ 
      success: false,
      error: 'Telegram连接测试失败',
      message: error.message
    })
  }
})

// Jenkins 监控相关 API

// 获取Jenkins配置
app.get('/api/jenkins/config', (req, res) => {
  try {
    if (!jenkinsService) {
      return res.status(500).json({ error: 'Jenkins服务未初始化' })
    }
    
    const config = jenkinsService.getMonitoringStatus().config
    res.json(config)
  } catch (error) {
    console.error('获取Jenkins配置错误:', error)
    res.status(500).json({ error: '获取Jenkins配置失败' })
  }
})

// 保存Jenkins配置
app.post('/api/jenkins/config', async (req, res) => {
  try {
    if (!jenkinsService) {
      return res.status(500).json({ error: 'Jenkins服务未初始化' })
    }
    
    const { url, username, token, jobName } = req.body
    
    if (!url || !username || !token || !jobName) {
      return res.status(400).json({ error: '配置参数不完整' })
    }
    
    jenkinsService.updateConfig({ url, username, token, jobName })
    
    res.json({ 
      success: true,
      message: 'Jenkins配置保存成功'
    })
  } catch (error) {
    console.error('保存Jenkins配置错误:', error)
    res.status(500).json({ error: '保存Jenkins配置失败' })
  }
})

// 测试Jenkins连接
app.post('/api/jenkins/test', async (req, res) => {
  try {
    if (!jenkinsService) {
      return res.status(500).json({ error: 'Jenkins服务未初始化' })
    }
    
    const result = await jenkinsService.testConnection(req.body)
    res.json(result)
  } catch (error) {
    console.error('Jenkins连接测试错误:', error)
    res.status(500).json({ 
      success: false,
      error: 'Jenkins连接测试失败',
      message: error.message
    })
  }
})

// 获取监控日志
app.get('/api/jenkins/logs', (req, res) => {
  try {
    if (!jenkinsService) {
      return res.status(500).json({ error: 'Jenkins服务未初始化' })
    }
    
    const status = jenkinsService.getMonitoringStatus()
    res.json({
      logs: status.logs,
      lastBuildInfo: status.lastBuildInfo,
      buildStatus: status.buildStatus,
      isMonitoring: status.isMonitoring
    })
  } catch (error) {
    console.error('获取Jenkins日志错误:', error)
    res.status(500).json({ error: '获取Jenkins日志失败' })
  }
})

// 开始监控
app.post('/api/jenkins/monitor/start', (req, res) => {
  try {
    if (!jenkinsService) {
      return res.status(500).json({ error: 'Jenkins服务未初始化' })
    }
    
    const result = jenkinsService.startMonitoring()
    res.json(result)
  } catch (error) {
    console.error('启动Jenkins监控错误:', error)
    res.status(500).json({ 
      success: false,
      error: '启动Jenkins监控失败',
      message: error.message
    })
  }
})

// 停止监控
app.post('/api/jenkins/monitor/stop', (req, res) => {
  try {
    if (!jenkinsService) {
      return res.status(500).json({ error: 'Jenkins服务未初始化' })
    }
    
    const result = jenkinsService.stopMonitoring()
    res.json(result)
  } catch (error) {
    console.error('停止Jenkins监控错误:', error)
    res.status(500).json({ 
      success: false,
      error: '停止Jenkins监控失败',
      message: error.message
    })
  }
})

// 触发构建
app.post('/api/jenkins/build/trigger', async (req, res) => {
  try {
    if (!jenkinsService) {
      return res.status(500).json({ error: 'Jenkins服务未初始化' })
    }
    
    const result = await jenkinsService.triggerBuild()
    res.json(result)
  } catch (error) {
    console.error('触发Jenkins构建错误:', error)
    res.status(500).json({ 
      success: false,
      error: '触发Jenkins构建失败',
      message: error.message
    })
  }
})

// 飞书通知相关 API

// 获取飞书配置
app.get('/api/feishu/config', (req, res) => {
  try {
    if (!feishuService) {
      return res.status(500).json({ error: '飞书服务未初始化' })
    }
    
    const config = feishuService.getConfig()
    res.json(config)
  } catch (error) {
    console.error('获取飞书配置错误:', error)
    res.status(500).json({ error: '获取飞书配置失败' })
  }
})

// 保存飞书配置
app.post('/api/feishu/config', async (req, res) => {
  try {
    if (!feishuService) {
      return res.status(500).json({ error: '飞书服务未初始化' })
    }
    
    const { webhookUrl, secret, apiConfig } = req.body
    
    // 检查是否至少配置了一种方式
    const hasWebhook = webhookUrl && webhookUrl.trim() !== ''
    const hasApi = apiConfig && apiConfig.accessToken && apiConfig.receiveId
    
    if (!hasWebhook && !hasApi) {
      return res.status(400).json({ error: '至少需要配置Webhook URL或API配置' })
    }
    
    const config = { webhookUrl, secret }
    if (apiConfig) {
      config.apiConfig = apiConfig
    }
    
    feishuService.updateConfig(config)
    
    res.json({ 
      success: true,
      message: '飞书配置保存成功'
    })
  } catch (error) {
    console.error('保存飞书配置错误:', error)
    res.status(500).json({ error: '保存飞书配置失败' })
  }
})

// 测试飞书连接
app.post('/api/feishu/test', async (req, res) => {
  try {
    if (!feishuService) {
      return res.status(500).json({ error: '飞书服务未初始化' })
    }
    
    const result = await feishuService.testConnection(req.body)
    res.json(result)
  } catch (error) {
    console.error('飞书连接测试错误:', error)
    res.status(500).json({ 
      success: false,
      error: '飞书连接测试失败',
      message: error.message
    })
  }
})

// 发送测试通知
app.post('/api/feishu/send-test', async (req, res) => {
  try {
    if (!feishuService) {
      return res.status(500).json({ error: '飞书服务未初始化' })
    }
    
    const { message, title } = req.body
    const result = await feishuService.sendTextMessage(
      message || '这是一条测试消息',
      title || 'Jenkins监控测试'
    )
    res.json(result)
  } catch (error) {
    console.error('发送飞书测试消息错误:', error)
    res.status(500).json({ 
      success: false,
      error: '发送飞书测试消息失败',
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
      databaseService: !!chatService?.sqlQueryService,
      jenkinsService: !!jenkinsService,
      feishuService: !!feishuService,
      jenkinsAgent: !!jenkinsAgent
    },
    aiModel: aiModelManager ? aiModelManager.getModelInfo() : null
  })
})

// CI/CD 相关 API

// GitLab Webhook 端点
app.post('/api/webhook/gitlab', async (req, res) => {
  try {
    if (!cicdManager) {
      return res.status(500).json({ error: 'CI/CD管理器未初始化' })
    }
    
    const result = await cicdManager.handleCICDProcess(req.body)
    res.json(result)
  } catch (error) {
    console.error('处理GitLab webhook失败:', error)
    res.status(500).json({ 
      success: false,
      error: '处理GitLab webhook失败',
      message: error.message
    })
  }
})

// 手动触发CI/CD流程
app.post('/api/cicd/trigger', async (req, res) => {
  try {
    if (!cicdManager) {
      return res.status(500).json({ error: 'CI/CD管理器未初始化' })
    }
    
    const result = await cicdManager.triggerManualBuild()
    res.json(result)
  } catch (error) {
    console.error('手动触发CI/CD失败:', error)
    res.status(500).json({ 
      success: false,
      error: '手动触发CI/CD失败',
      message: error.message
    })
  }
})

// 获取CI/CD状态
app.get('/api/cicd/status', (req, res) => {
  try {
    if (!cicdManager) {
      return res.status(500).json({ error: 'CI/CD管理器未初始化' })
    }
    
    const status = cicdManager.getStatus()
    res.json({
      success: true,
      status: status
    })
  } catch (error) {
    console.error('获取CI/CD状态失败:', error)
    res.status(500).json({ 
      success: false,
      error: '获取CI/CD状态失败',
      message: error.message
    })
  }
})

// 检查构建状态
app.get('/api/cicd/build-status', async (req, res) => {
  try {
    if (!gitWebhookService) {
      return res.status(500).json({ error: 'Git Webhook服务未初始化' })
    }
    
    const status = await gitWebhookService.checkBuildStatus()
    res.json(status)
  } catch (error) {
    console.error('检查构建状态失败:', error)
    res.status(500).json({ 
      success: false,
      error: '检查构建状态失败',
      message: error.message
    })
  }
})

// Jenkins构建失败处理端点（供Jenkins webhook调用）
app.post('/api/jenkins/build-failed', async (req, res) => {
  try {
    console.log('📥 收到Jenkins构建失败通知:', req.body)
    
    if (!cicdManager) {
      return res.status(500).json({ error: 'CI/CD管理器未初始化' })
    }
    
    // 检查是否已经在处理中
    const status = cicdManager.getStatus()
    if (status.isProcessing) {
      console.log('⏳ CI/CD流程正在进行中，跳过新的修复请求')
      return res.json({ success: false, message: 'CI/CD流程正在进行中' })
    }
    
    // 触发AI修复流程
    console.log('🚀 开始AI自动修复流程...')
    const result = await cicdManager.handleCICDProcess()
    
    res.json(result)
  } catch (error) {
    console.error('处理Jenkins构建失败失败:', error)
    res.status(500).json({ 
      success: false,
      error: '处理Jenkins构建失败失败',
      message: error.message
    })
  }
})

// 手动触发构建监控和AI修复
app.post('/api/jenkins/monitor-and-fix', async (req, res) => {
  try {
    console.log('🔍 开始监控Jenkins构建状态...')
    
    if (!cicdManager) {
      return res.status(500).json({ error: 'CI/CD管理器未初始化' })
    }
    
    // 检查是否已经在处理中
    const status = cicdManager.getStatus()
    if (status.isProcessing) {
      console.log('⏳ CI/CD流程正在进行中，跳过新的监控请求')
      return res.json({ success: false, message: 'CI/CD流程正在进行中' })
    }
    
    // 检查最新构建状态
    const buildStatus = await gitWebhookService.checkBuildStatus()
    
    if (buildStatus.success && buildStatus.result === 'FAILURE') {
      console.log(`❌ 检测到构建失败: #${buildStatus.buildNumber}`)
      
      // 触发AI修复流程
      console.log('🚀 开始AI自动修复流程...')
      const result = await cicdManager.handleCICDProcess()
      
      res.json({
        success: true,
        message: '检测到构建失败，已触发AI修复流程',
        buildStatus: buildStatus,
        fixResult: result
      })
    } else if (buildStatus.success && buildStatus.result === 'SUCCESS') {
      console.log(`✅ 构建成功: #${buildStatus.buildNumber}`)
      res.json({
        success: true,
        message: '构建成功，无需修复',
        buildStatus: buildStatus
      })
    } else if (buildStatus.success && buildStatus.building) {
      console.log(`⏳ 构建进行中: #${buildStatus.buildNumber}`)
      res.json({
        success: true,
        message: '构建进行中，请稍后再检查',
        buildStatus: buildStatus
      })
    } else {
      console.log('❓ 无法获取构建状态')
      res.json({
        success: false,
        message: '无法获取构建状态',
        buildStatus: buildStatus
      })
    }
  } catch (error) {
    console.error('监控Jenkins构建状态失败:', error)
    res.status(500).json({ 
      success: false,
      error: '监控Jenkins构建状态失败',
      message: error.message
    })
  }
})

// 自动监控Jenkins构建状态的服务
let buildMonitorInterval = null
let lastCheckedBuildNumber = 0

async function startBuildMonitor() {
  console.log('🔍 启动Jenkins构建监控服务...')
  
  // 每30秒检查一次构建状态
  buildMonitorInterval = setInterval(async () => {
    try {
      if (!gitWebhookService || !cicdManager) {
        return
      }
      
      // 检查CI/CD是否正在处理中
      const cicdStatus = cicdManager.getStatus()
      if (cicdStatus.isProcessing) {
        return // 如果正在处理，跳过检查
      }
      
      // 检查最新构建状态
      const buildStatus = await gitWebhookService.checkBuildStatus()
      
      if (buildStatus.success && buildStatus.result === 'FAILURE') {
        // 检查是否是新的失败构建
        if (buildStatus.buildNumber > lastCheckedBuildNumber) {
          console.log(`🚨 检测到新的构建失败: #${buildStatus.buildNumber}`)
          lastCheckedBuildNumber = buildStatus.buildNumber
          
          // 触发AI修复流程
          console.log('🤖 自动触发AI修复流程...')
          try {
            await cicdManager.handleCICDProcess()
          } catch (error) {
            console.error('自动AI修复失败:', error)
          }
        }
      } else if (buildStatus.success && buildStatus.result === 'SUCCESS') {
        // 更新最后检查的构建号
        if (buildStatus.buildNumber > lastCheckedBuildNumber) {
          console.log(`✅ 构建成功: #${buildStatus.buildNumber}`)
          lastCheckedBuildNumber = buildStatus.buildNumber
        }
      }
    } catch (error) {
      console.error('构建监控检查失败:', error)
    }
  }, 30000) // 30秒检查一次
  
  console.log('✅ Jenkins构建监控服务已启动（每30秒检查一次）')
}

// 启动服务器
app.listen(PORT, async () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`)
  await initializeServices()
  
  // 启动构建监控服务
  await startBuildMonitor()
})

module.exports = app