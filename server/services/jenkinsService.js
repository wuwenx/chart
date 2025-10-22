const axios = require('axios')
const fs = require('fs')
const path = require('path')

class JenkinsService {
  constructor() {
    this.config = {
      url: 'https://jks.popfun.xyz',
      username: 'wuwenxiang',
      token: '1151d55491677b7add0d5aa327b29425a1',
      jobName: 'test/web/web-mm-admin-new',
      webhookUrl: ''
    }
    this.isMonitoring = false
    this.monitorInterval = null
    this.logs = []
    this.lastBuildInfo = null
    this.buildStatus = 'idle'
    this.configFile = path.join(__dirname, '../config/jenkins-config.json')
    this.logsFile = path.join(__dirname, '../logs/jenkins-logs.json')
    
    this.loadConfig()
    this.loadLogs()
  }

  // 加载配置
  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const data = fs.readFileSync(this.configFile, 'utf8')
        this.config = { ...this.config, ...JSON.parse(data) }
      }
    } catch (error) {
      console.error('加载Jenkins配置失败:', error)
    }
  }

  // 保存配置
  saveConfig() {
    try {
      const configDir = path.dirname(this.configFile)
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true })
      }
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2))
    } catch (error) {
      console.error('保存Jenkins配置失败:', error)
    }
  }

  // 加载日志
  loadLogs() {
    try {
      if (fs.existsSync(this.logsFile)) {
        const data = fs.readFileSync(this.logsFile, 'utf8')
        const logsData = JSON.parse(data)
        this.logs = logsData.logs || []
        this.lastBuildInfo = logsData.lastBuildInfo
        this.buildStatus = logsData.buildStatus || 'idle'
      }
    } catch (error) {
      console.error('加载Jenkins日志失败:', error)
    }
  }

  // 保存日志
  saveLogs() {
    try {
      const logsDir = path.dirname(this.logsFile)
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true })
      }
      const logsData = {
        logs: this.logs,
        lastBuildInfo: this.lastBuildInfo,
        buildStatus: this.buildStatus,
        lastUpdated: new Date().toISOString()
      }
      fs.writeFileSync(this.logsFile, JSON.stringify(logsData, null, 2))
    } catch (error) {
      console.error('保存Jenkins日志失败:', error)
    }
  }

  // 添加日志
  addLog(level, message, details = null) {
    const log = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    }
    this.logs.unshift(log)
    
    // 只保留最近100条日志
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(0, 100)
    }
    
    this.saveLogs()
    console.log(`[Jenkins ${level.toUpperCase()}] ${message}`)
  }

  // 测试Jenkins连接
  async testConnection(config = null) {
    const testConfig = config || this.config
    
    if (!testConfig.url) {
      throw new Error('Jenkins URL不能为空')
    }

    // 如果没有用户名和Token，尝试匿名访问
    if (!testConfig.username || !testConfig.token) {
      try {
        const response = await axios.get(`${testConfig.url}/api/json`, {
          headers: {
            'Accept': 'application/json'
          },
          timeout: 10000,
          validateStatus: function (status) {
            return status < 500;
          }
        })
        
        if (response.status === 200) {
          return {
            success: true,
            message: 'Jenkins连接成功（匿名访问）',
            data: response.data,
            statusCode: response.status
          }
        }
      } catch (error) {
        return {
          success: false,
          message: 'Jenkins需要认证，请提供用户名和API Token',
          error: error.message
        }
      }
    }

    try {
      const auth = Buffer.from(`${testConfig.username}:${testConfig.token}`).toString('base64')
      
      // 首先尝试访问根API端点
      const response = await axios.get(`${testConfig.url}/api/json`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        },
        timeout: 10000,
        validateStatus: function (status) {
          return status < 500; // 接受所有小于500的状态码
        }
      })
      
      // 检查响应内容类型
      const contentType = response.headers['content-type'] || ''
      if (!contentType.includes('application/json')) {
        // 如果返回的不是JSON，可能是HTML错误页面
        const responseText = response.data.toString().substring(0, 200)
        return {
          success: false,
          message: `Jenkins返回了非JSON响应 (${response.status}): ${responseText}`,
          statusCode: response.status,
          contentType: contentType
        }
      }
      
      // 检查状态码
      if (response.status === 401) {
        return {
          success: false,
          message: 'Jenkins认证失败，请检查用户名和API Token是否正确',
          statusCode: response.status,
          suggestions: [
            '检查Jenkins用户名是否正确',
            '重新生成API Token',
            '确认Token格式正确（32位十六进制字符串）',
            '检查Jenkins安全设置'
          ]
        }
      }
      
      if (response.status === 403) {
        return {
          success: false,
          message: 'Jenkins访问被拒绝，请检查用户权限',
          statusCode: response.status
        }
      }
      
      if (response.status !== 200) {
        return {
          success: false,
          message: `Jenkins API返回错误状态码: ${response.status}`,
          statusCode: response.status
        }
      }
      
      return {
        success: true,
        message: 'Jenkins连接成功',
        data: response.data,
        statusCode: response.status
      }
    } catch (error) {
      // 处理网络错误
      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          message: '无法连接到Jenkins服务器，请检查URL是否正确',
          error: error.message
        }
      }
      
      if (error.code === 'ENOTFOUND') {
        return {
          success: false,
          message: 'Jenkins服务器地址无法解析，请检查URL是否正确',
          error: error.message
        }
      }
      
      if (error.code === 'ETIMEDOUT') {
        return {
          success: false,
          message: '连接Jenkins服务器超时，请检查网络连接',
          error: error.message
        }
      }
      
      return {
        success: false,
        message: `Jenkins连接失败: ${error.message}`,
        error: error.message
      }
    }
  }

  // 获取任务信息
  async getJobInfo(jobName = null) {
    const job = jobName || this.config.jobName
    
    if (!job) {
      throw new Error('未指定任务名称')
    }

    try {
      const auth = Buffer.from(`${this.config.username}:${this.config.token}`).toString('base64')
      
      // 处理嵌套任务路径，将 / 替换为 /job/
      const jobPath = job.replace(/\//g, '/job/')
      const apiUrl = `${this.config.url}/job/${jobPath}/api/json`
      
      console.log(`尝试访问Jenkins任务: ${apiUrl}`)
      
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        },
        timeout: 10000,
        validateStatus: function (status) {
          return status < 500;
        }
      })
      
      // 检查响应
      const contentType = response.headers['content-type'] || ''
      if (!contentType.includes('application/json')) {
        const responseText = response.data.toString().substring(0, 200)
        throw new Error(`Jenkins返回了非JSON响应 (${response.status}): ${responseText}`)
      }
      
      if (response.status === 404) {
        throw new Error(`任务 '${job}' 不存在，请检查任务名称`)
      }
      
      if (response.status === 401) {
        throw new Error('Jenkins认证失败')
      }
      
      if (response.status !== 200) {
        throw new Error(`Jenkins API返回错误状态码: ${response.status}`)
      }
      
      return response.data
    } catch (error) {
      throw new Error(`获取任务信息失败: ${error.message}`)
    }
  }

  // 获取最后构建信息
  async getLastBuildInfo(jobName = null) {
    try {
      const jobInfo = await this.getJobInfo(jobName)
      
      if (!jobInfo.lastBuild) {
        return null
      }

      const buildNumber = jobInfo.lastBuild.number
      const buildUrl = jobInfo.lastBuild.url
      
      // 获取构建详情
      const auth = Buffer.from(`${this.config.username}:${this.config.token}`).toString('base64')
      const buildResponse = await axios.get(`${buildUrl}api/json`, {
        headers: {
          'Authorization': `Basic ${auth}`
        },
        timeout: 10000
      })

      const buildData = buildResponse.data
      
      return {
        number: buildNumber,
        url: buildUrl,
        timestamp: buildData.timestamp,
        duration: buildData.duration,
        result: buildData.result,
        building: buildData.building,
        builder: buildData.builtBy || 'N/A',
        description: buildData.description || '',
        changeSet: buildData.changeSet || {}
      }
    } catch (error) {
      throw new Error(`获取构建信息失败: ${error.message}`)
    }
  }

  // 获取CSRF Token
  async getCrumb() {
    try {
      const auth = Buffer.from(`${this.config.username}:${this.config.token}`).toString('base64')
      const response = await axios.get(`${this.config.url}/crumbIssuer/api/json`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        },
        timeout: 10000,
        validateStatus: function (status) {
          return status < 500;
        }
      })
      
      if (response.status === 200) {
        return {
          crumbRequestField: response.data.crumbRequestField,
          crumb: response.data.crumb
        }
      }
      return null
    } catch (error) {
      console.log('获取CSRF Token失败:', error.message)
      return null
    }
  }

  // 触发构建
  async triggerBuild(jobName = null) {
    const job = jobName || this.config.jobName
    
    if (!job) {
      throw new Error('未指定任务名称')
    }

    try {
      const auth = Buffer.from(`${this.config.username}:${this.config.token}`).toString('base64')
      
      // 处理嵌套任务路径
      const jobPath = job.replace(/\//g, '/job/')
      const buildUrl = `${this.config.url}/job/${jobPath}/build`
      
      console.log(`触发Jenkins构建: ${buildUrl}`)
      
      // 获取CSRF Token
      const crumb = await this.getCrumb()
      
      const headers = {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
      
      // 如果有CSRF Token，添加到请求头
      if (crumb) {
        headers[crumb.crumbRequestField] = crumb.crumb
        console.log('使用CSRF Token进行请求')
      }
      
      // 检查是否是参数化构建，如果是则使用buildWithParameters端点
      let requestUrl = buildUrl
      let requestBody = {}
      
      // 尝试获取作业信息来判断是否是参数化构建
      try {
        const jobInfoUrl = `${this.config.url}/job/${job.replace(/\//g, '/job/')}/api/json`
        const jobInfoResponse = await axios.get(jobInfoUrl, {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          }
        })
        
        // 检查是否有参数定义
        const hasParameters = jobInfoResponse.data.property && 
          jobInfoResponse.data.property.some(prop => prop._class === 'hudson.model.ParametersDefinitionProperty')
        
        if (hasParameters) {
          console.log('检测到参数化构建，使用buildWithParameters端点')
          requestUrl = `${this.config.url}/job/${job.replace(/\//g, '/job/')}/buildWithParameters`
          
          // 设置默认参数
          requestBody = {
            TAG: 'origin/develop',
            APP_ENV: 'test1',
            APP_BUILDFORCE: 'no',
            APP_BUILDCMD: 'pnpm install && npm run build',
            APP_BUILDFILE: 'dist',
            APP_NAME: 'web-mm-admin-new',
            APP_SHORTNAME: 'mm-admin-new',
            APP_CLASS: 'fe',
            APP_HOSTNAME: 'test-ex-openresty'
          }
        }
      } catch (error) {
        console.log('无法获取作业信息，使用标准构建端点:', error.message)
      }
      
      // 发送构建请求
      const response = await axios.post(requestUrl, requestBody, {
        headers: headers,
        timeout: 10000,
        validateStatus: function (status) {
          return status < 500;
        }
      })
      
      // 检查响应
      if (response.status === 404) {
        throw new Error(`任务 '${job}' 不存在`)
      }
      
      if (response.status === 401) {
        throw new Error('Jenkins认证失败')
      }
      
      if (response.status === 403) {
        throw new Error('没有权限触发构建')
      }
      
       if (response.status === 400) {
        // 400通常表示请求格式问题，可能是CSRF Token或参数问题
        const errorMsg = response.data?.message || '请求格式错误'
        
        // 检查是否是"No changes"或"Nothing is submitted"的情况
        if (errorMsg.includes('Nothing is submitted') || errorMsg.includes('No changes')) {
          throw new Error('没有新的代码提交，Jenkins拒绝触发构建。请先提交代码变更。')
        }
        
        throw new Error(`触发构建失败: ${errorMsg}`)
      }
      
      if (response.status !== 200 && response.status !== 201) {
        throw new Error(`触发构建失败，状态码: ${response.status}`)
      }
      
      this.addLog('info', `触发构建: ${job}`, `状态码: ${response.status}`)
      
      return {
        success: true,
        message: '构建已触发',
        statusCode: response.status
      }
    } catch (error) {
      this.addLog('error', `触发构建失败: ${job}`, error.message)
      throw new Error(`触发构建失败: ${error.message}`)
    }
  }

  // 检查构建状态
  async checkBuildStatus(jobName = null) {
    try {
      const buildInfo = await this.getLastBuildInfo(jobName)
      
      if (!buildInfo) {
        this.buildStatus = 'idle'
        return this.buildStatus
      }

      if (buildInfo.building) {
        this.buildStatus = 'building'
      } else if (buildInfo.result === 'SUCCESS') {
        this.buildStatus = 'success'
      } else if (buildInfo.result === 'FAILURE' || buildInfo.result === 'UNSTABLE') {
        this.buildStatus = 'failure'
      } else {
        this.buildStatus = 'idle'
      }

      this.lastBuildInfo = buildInfo
      this.saveLogs()
      
      return this.buildStatus
    } catch (error) {
      this.addLog('error', '检查构建状态失败', error.message)
      return 'error'
    }
  }

  // 开始监控
  startMonitoring() {
    if (this.isMonitoring) {
      return { success: false, message: '监控已在运行中' }
    }

    if (!this.config.url || !this.config.username || !this.config.token || !this.config.jobName) {
      return { success: false, message: 'Jenkins配置不完整，请先配置' }
    }

    this.isMonitoring = true
    this.addLog('info', '开始监控Jenkins构建', `任务: ${this.config.jobName}`)
    
    // 每30秒检查一次构建状态
    this.monitorInterval = setInterval(async () => {
      try {
        const status = await this.checkBuildStatus()
        this.addLog('debug', `构建状态检查: ${status}`)
        
        // 如果状态发生变化，触发AI判断
        if (this.lastBuildInfo && this.lastBuildInfo.result) {
          await this.handleBuildStatusChange(status, this.lastBuildInfo)
        }
      } catch (error) {
        this.addLog('error', '监控检查失败', error.message)
      }
    }, 30000)

    return { success: true, message: '监控已启动' }
  }

  // 停止监控
  stopMonitoring() {
    if (!this.isMonitoring) {
      return { success: false, message: '监控未在运行' }
    }

    this.isMonitoring = false
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval)
      this.monitorInterval = null
    }
    
    this.addLog('info', '停止监控Jenkins构建')
    return { success: true, message: '监控已停止' }
  }

  // 处理构建状态变化
  async handleBuildStatusChange(status, buildInfo) {
    try {
      // 这里将调用AI Agent进行判断
      const aiDecision = await this.getAIDecision(status, buildInfo)
      
      if (aiDecision.shouldNotify) {
        await this.sendNotification(aiDecision.message, buildInfo)
      }
      
      this.addLog('info', `AI决策: ${aiDecision.message}`, JSON.stringify(aiDecision))
    } catch (error) {
      this.addLog('error', 'AI决策处理失败', error.message)
    }
  }

  // 设置外部服务引用
  setExternalServices(feishuService, jenkinsAgent) {
    this.feishuService = feishuService
    this.jenkinsAgent = jenkinsAgent
  }

  // AI决策逻辑（这里将集成LangChain Agent）
  async getAIDecision(status, buildInfo) {
    // 如果有AI Agent，使用AI决策
    if (this.jenkinsAgent) {
      try {
        return await this.jenkinsAgent.makeDecision(status, buildInfo, this.config.jobName)
      } catch (error) {
        this.addLog('error', 'AI Agent决策失败，使用规则决策', error.message)
      }
    }

    // 降级到规则判断
    let shouldNotify = false
    let message = ''

    switch (status) {
      case 'success':
        shouldNotify = true
        message = `✅ 构建成功！任务 ${this.config.jobName} 构建 #${buildInfo.number} 已完成`
        break
      case 'failure':
        shouldNotify = true
        message = `❌ 构建失败！任务 ${this.config.jobName} 构建 #${buildInfo.number} 失败，需要关注`
        break
      case 'building':
        shouldNotify = false
        message = `🔄 构建进行中：任务 ${this.config.jobName} 构建 #${buildInfo.number} 正在执行`
        break
      default:
        shouldNotify = false
        message = `ℹ️ 构建状态：${status}`
    }

    return {
      shouldNotify,
      message,
      status,
      buildInfo,
      timestamp: new Date().toISOString()
    }
  }

  // 发送通知（这里将调用飞书服务）
  async sendNotification(message, buildInfo) {
    try {
      // 如果有飞书服务，发送通知
      if (this.feishuService) {
        await this.feishuService.sendBuildNotification(
          this.buildStatus, 
          buildInfo, 
          this.config.jobName
        )
        this.addLog('info', '飞书通知发送成功', message)
      } else {
        this.addLog('warn', '飞书服务未配置，跳过通知', message)
      }
    } catch (error) {
      this.addLog('error', '发送通知失败', error.message)
    }
  }

  // 获取监控状态
  getMonitoringStatus(includeSensitiveInfo = false) {
    const config = {
      url: this.config.url,
      username: this.config.username,
      jobName: this.config.jobName
    }
    
    // 如果需要敏感信息（如测试连接时），则包含token
    if (includeSensitiveInfo) {
      config.token = this.config.token
    }
    
    return {
      isMonitoring: this.isMonitoring,
      buildStatus: this.buildStatus,
      lastBuildInfo: this.lastBuildInfo,
      logs: this.logs.slice(0, 20), // 返回最近20条日志
      config: config
    }
  }

  // 更新配置
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig }
    this.saveConfig()
    this.addLog('info', 'Jenkins配置已更新')
  }
}

module.exports = JenkinsService
