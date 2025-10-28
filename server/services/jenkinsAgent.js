const { ChatOpenAI } = require('@langchain/openai')
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai')
const { AIModelManager } = require('./aiModelManager')

class JenkinsAgent {
  constructor() {
    this.aiModelManager = new AIModelManager()
    this.model = null
    this.modelInitialized = false
    this.initializeModel()
  }

  // 初始化AI模型
  async initializeModel() {
    try {
      // 等待AIModelManager初始化完成
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 获取模型信息来检查是否已初始化
      const modelInfo = this.aiModelManager.getModelInfo()
      if (modelInfo.status === 'ready') {
        this.model = this.aiModelManager.llm
        this.modelInitialized = true
        console.log('Jenkins Agent AI模型初始化成功')
      } else {
        throw new Error('AIModelManager未就绪')
      }
    } catch (error) {
      console.error('Jenkins Agent AI模型初始化失败:', error)
      this.modelInitialized = false
    }
  }

  // 确保模型已初始化
  async ensureModelInitialized() {
    if (!this.modelInitialized) {
      await this.initializeModel()
    }
    if (!this.model) {
      throw new Error('AI模型未初始化')
    }
  }

  // 清理AI响应中的markdown格式
  cleanAIResponse(content) {
    let cleaned = content
    
    // 移除markdown代码块标记
    if (cleaned.includes('```javascript')) {
      cleaned = cleaned.replace(/```javascript\s*/, '').replace(/```\s*$/, '')
    }
    if (cleaned.includes('```json')) {
      cleaned = cleaned.replace(/```json\s*/, '').replace(/```\s*$/, '')
    }
    if (cleaned.includes('```')) {
      cleaned = cleaned.replace(/```\s*/, '').replace(/```\s*$/, '')
    }
    
    return cleaned.trim()
  }

  // 分析构建日志
  async analyzeBuildLogs(buildInfo) {
    // 确保AI模型已初始化
    await this.ensureModelInitialized()

    try {
      console.log(`🔍 分析构建日志: #${buildInfo.buildNumber}`)
      
      // 提取Vite build相关的错误信息
      const logs = buildInfo.logs || ''
      const viteErrorMatch = logs.match(/vite build.*?error[^]*?(?=\n\n|\n[A-Z]|\n$)/gi)
      const errorSection = viteErrorMatch ? viteErrorMatch[0] : logs
      
      const prompt = `
你是一个专业的DevOps工程师，请分析以下Jenkins构建日志并给出专业的判断和建议：

构建信息：
- 构建号: #${buildInfo.buildNumber}
- 构建URL: ${buildInfo.url}

构建日志：
${logs}

请仔细分析构建失败的原因，特别关注：
1. Vite build过程中的错误（如"Failed to parse source for import analysis"）
2. JavaScript语法错误（如缺少闭合大括号、分号等）
3. 文件路径问题（如文件不存在、路径错误）
4. 依赖问题（如模块未找到）
5. 配置文件错误

从日志中提取具体的错误信息，包括：
- 错误类型
- 出错的文件路径（相对路径，如src/main.js）
- 具体的错误描述
- 行号（如果有）

请用JSON格式返回分析结果，不要包含任何markdown格式：
{
  "success": true,
  "needsFix": true,
  "issues": [
    {
      "type": "syntax_error",
      "file": "src/main.js",
      "message": "Failed to parse source for import analysis because the content contains invalid JS syntax",
      "line": 8,
      "severity": "high"
    }
  ],
  "summary": "src/main.js文件存在语法错误，缺少闭合大括号",
  "recommendations": ["修复src/main.js中的语法错误", "检查代码结构"],
  "priority": "high"
}

注意：success字段必须始终为true，needsFix字段表示是否需要修复。`

      const response = await this.model.invoke(prompt)
      
      // 尝试解析JSON响应
      let analysis
      try {
        let responseText = response.content || response
        
        // 清理markdown格式的JSON
        if (responseText.includes('```json')) {
          responseText = responseText.replace(/```json\s*/, '').replace(/```\s*$/, '')
        }
        if (responseText.includes('```')) {
          responseText = responseText.replace(/```\s*/, '').replace(/```\s*$/, '')
        }
        
        analysis = JSON.parse(responseText.trim())
      } catch (parseError) {
        console.error('解析AI响应失败:', parseError)
        console.error('原始响应:', response.content || response)
        // 如果解析失败，使用默认分析
        analysis = {
          success: true,
          needsFix: true,
          issues: [{
            type: 'other',
            file: 'unknown',
            message: '无法解析构建日志，需要手动检查',
            line: 0,
            severity: 'medium'
          }],
          summary: '构建失败，需要手动检查',
          recommendations: ['检查构建日志', '检查代码语法'],
          priority: 'medium'
        }
      }

      console.log('📊 AI分析结果:', JSON.stringify(analysis, null, 2))
      
      return analysis
    } catch (error) {
      console.error('AI分析构建日志失败:', error)
      return {
        success: false,
        message: error.message,
        needsFix: false,
        issues: [],
        summary: '分析失败',
        recommendations: ['手动检查构建日志'],
        priority: 'low'
      }
    }
  }

  // 默认分析（当AI分析失败时使用）
  getDefaultAnalysis(buildInfo) {
    const isSuccess = buildInfo.result === 'SUCCESS'
    const duration = Math.round(buildInfo.duration / 1000)
    
    let assessment = ''
    let priority = 'medium'
    let shouldNotify = true
    let notificationMessage = ''

    if (isSuccess) {
      assessment = '构建成功完成'
      priority = duration > 300 ? 'medium' : 'low' // 超过5分钟算中等优先级
      notificationMessage = `✅ 构建成功！构建 #${buildInfo.number} 已完成，耗时 ${duration} 秒`
    } else {
      assessment = '构建失败，需要立即关注'
      priority = 'high'
      notificationMessage = `❌ 构建失败！构建 #${buildInfo.number} 失败，需要立即处理`
    }

    return {
      assessment,
      performance: `构建耗时 ${duration} 秒${duration > 300 ? '，时间较长' : '，时间合理'}`,
      risk: '需要人工检查变更内容',
      recommendations: isSuccess ? 
        (duration > 300 ? ['检查构建脚本优化', '考虑并行构建'] : ['构建正常']) :
        ['检查构建日志', '回滚相关变更', '通知开发团队'],
      priority,
      shouldNotify,
      notificationMessage
    }
  }

  // 智能决策
  async makeDecision(buildStatus, buildInfo, jobName) {
    try {
      // 首先进行AI分析
      const analysis = await this.analyzeBuildLogs(buildInfo)
      
      // 基于分析结果做决策
      const decision = {
        shouldNotify: this.shouldSendNotification(buildStatus, analysis),
        priority: analysis.priority || 'medium',
        message: analysis.notificationMessage || analysis.message || this.getDefaultMessage(buildStatus, buildInfo),
        analysis: analysis,
        timestamp: new Date().toISOString(),
        buildInfo: buildInfo,
        jobName: jobName
      }

      // 记录决策日志
      console.log('Jenkins Agent决策:', JSON.stringify(decision, null, 2))
      
      return decision
    } catch (error) {
      console.error('AI决策失败:', error)
      
      // 降级到规则决策
      return this.getRuleBasedDecision(buildStatus, buildInfo, jobName)
    }
  }

  // 判断是否应该发送通知
  shouldSendNotification(buildStatus, analysis) {
    // 对于成功和失败的构建，总是发送通知
    if (buildStatus === 'success' || buildStatus === 'failure') {
      return true
    }
    
    // 对于其他状态，使用AI分析的结果
    return analysis.shouldNotify || false
  }

  // 获取默认消息
  getDefaultMessage(buildStatus, buildInfo) {
    const duration = Math.round(buildInfo.duration / 1000)
    
    switch (buildStatus) {
      case 'success':
        return `✅ 构建成功！任务 ${buildInfo.jobName || 'Jenkins'} 构建 #${buildInfo.number} 已完成，耗时 ${duration} 秒`
      case 'failure':
        return `❌ 构建失败！任务 ${buildInfo.jobName || 'Jenkins'} 构建 #${buildInfo.number} 失败，需要立即处理`
      case 'building':
        return `🔄 构建进行中：任务 ${buildInfo.jobName || 'Jenkins'} 构建 #${buildInfo.number} 正在执行`
      default:
        return `ℹ️ 构建状态更新：${buildStatus}`
    }
  }

  // 基于规则的决策（降级方案）
  getRuleBasedDecision(buildStatus, buildInfo, jobName) {
    let shouldNotify = false
    let priority = 'low'
    let message = ''

    switch (buildStatus) {
      case 'success':
        shouldNotify = true
        priority = 'low'
        message = `✅ 构建成功！任务 ${jobName} 构建 #${buildInfo.number} 已完成`
        break
      case 'failure':
        shouldNotify = true
        priority = 'high'
        message = `❌ 构建失败！任务 ${jobName} 构建 #${buildInfo.number} 失败，需要立即关注`
        break
      case 'building':
        shouldNotify = false
        priority = 'low'
        message = `🔄 构建进行中：任务 ${jobName} 构建 #${buildInfo.number} 正在执行`
        break
      default:
        shouldNotify = false
        priority = 'low'
        message = `ℹ️ 构建状态更新：${buildStatus}`
    }

    return {
      shouldNotify,
      priority,
      message,
      analysis: {
        assessment: '基于规则的简单判断',
        performance: '未分析',
        risk: '未评估',
        recommendations: ['建议启用AI分析功能']
      },
      timestamp: new Date().toISOString(),
      buildInfo,
      jobName
    }
  }

  // 分析构建趋势
  async analyzeBuildTrends(buildHistory) {
    if (!this.model || !buildHistory || buildHistory.length < 3) {
      return this.getDefaultTrendAnalysis(buildHistory)
    }

    try {
      const prompt = `
请分析以下Jenkins构建历史趋势：

构建历史：
${buildHistory.map((build, index) => 
  `${index + 1}. 构建 #${build.number} - ${build.result} - ${new Date(build.timestamp).toLocaleString('zh-CN')} - ${Math.round(build.duration / 1000)}秒`
).join('\n')}

请分析：
1. 构建成功率趋势
2. 构建时间趋势
3. 失败模式分析
4. 改进建议

请用JSON格式返回分析结果：
{
  "successRate": "成功率百分比",
  "avgDuration": "平均构建时间",
  "trend": "up|down|stable",
  "failurePattern": "失败模式分析",
  "recommendations": ["改进建议1", "改进建议2"],
  "alertLevel": "high|medium|low"
}
`

      const response = await this.model.invoke(prompt)
      
      try {
        return JSON.parse(response.content || response)
      } catch (parseError) {
        return this.getDefaultTrendAnalysis(buildHistory)
      }
    } catch (error) {
      console.error('AI分析构建趋势失败:', error)
      return this.getDefaultTrendAnalysis(buildHistory)
    }
  }

  // 默认趋势分析
  getDefaultTrendAnalysis(buildHistory) {
    if (!buildHistory || buildHistory.length === 0) {
      return {
        successRate: '0%',
        avgDuration: '0秒',
        trend: 'stable',
        failurePattern: '无历史数据',
        recommendations: ['收集更多构建数据'],
        alertLevel: 'low'
      }
    }

    const successCount = buildHistory.filter(build => build.result === 'SUCCESS').length
    const successRate = Math.round((successCount / buildHistory.length) * 100)
    const avgDuration = Math.round(
      buildHistory.reduce((sum, build) => sum + build.duration, 0) / buildHistory.length / 1000
    )

    return {
      successRate: `${successRate}%`,
      avgDuration: `${avgDuration}秒`,
      trend: successRate > 80 ? 'up' : successRate < 60 ? 'down' : 'stable',
      failurePattern: '需要人工分析失败原因',
      recommendations: [
        successRate < 80 ? '提高构建稳定性' : '保持当前构建质量',
        avgDuration > 300 ? '优化构建性能' : '构建性能良好'
      ],
      alertLevel: successRate < 60 ? 'high' : successRate < 80 ? 'medium' : 'low'
    }
  }

  // 生成智能报告
  async generateReport(buildInfo, analysis, trends) {
    if (!this.model) {
      return this.getDefaultReport(buildInfo, analysis, trends)
    }

    try {
      const prompt = `
请基于以下信息生成一份专业的Jenkins构建报告：

构建信息：
- 构建号: #${buildInfo.number}
- 构建结果: ${buildInfo.result}
- 构建时间: ${new Date(buildInfo.timestamp).toLocaleString('zh-CN')}
- 持续时间: ${Math.round(buildInfo.duration / 1000)}秒

AI分析结果：
${JSON.stringify(analysis, null, 2)}

趋势分析：
${JSON.stringify(trends, null, 2)}

请生成一份简洁专业的报告，包含：
1. 执行摘要
2. 关键指标
3. 问题分析
4. 改进建议
5. 下一步行动

报告应该简洁明了，适合发送给技术团队。
`

      const response = await this.model.invoke(prompt)
      return response.content || response
    } catch (error) {
      console.error('AI生成报告失败:', error)
      return this.getDefaultReport(buildInfo, analysis, trends)
    }
  }

  // 默认报告
  getDefaultReport(buildInfo, analysis, trends) {
    return `
# Jenkins构建报告

## 执行摘要
构建 #${buildInfo.number} ${buildInfo.result === 'SUCCESS' ? '成功完成' : '执行失败'}

## 关键指标
- 构建结果: ${buildInfo.result}
- 构建时间: ${Math.round(buildInfo.duration / 1000)}秒
- 构建者: ${buildInfo.builder || 'N/A'}

## 问题分析
${analysis.assessment}

## 改进建议
${analysis.recommendations.map(rec => `- ${rec}`).join('\n')}

## 下一步行动
${analysis.priority === 'high' ? '立即处理构建问题' : '继续监控构建状态'}
`
  }

  // AI代码修复功能
  async fixCodeIssues(analysisResult) {
    try {
      console.log('🤖 开始AI代码修复...')
      
      // 确保AI模型已初始化
      await this.ensureModelInitialized()
      
      if (!analysisResult.needsFix) {
        return {
          success: false,
          message: '分析结果显示不需要修复',
          fixedFiles: []
        }
      }

      const fixedFiles = []
      
      // 根据分析结果生成修复代码
      for (const issue of analysisResult.issues) {
        if (issue.type === 'syntax_error' || issue.type === 'compilation_error') {
          const fixResult = await this.fixSyntaxError(issue)
          if (fixResult.success) {
            fixedFiles.push(fixResult.file)
          }
        } else if (issue.type === 'dependency_error') {
          const fixResult = await this.fixDependencyError(issue)
          if (fixResult.success) {
            fixedFiles.push(fixResult.file)
          }
        } else if (issue.type === 'configuration_error') {
          const fixResult = await this.fixConfigurationError(issue)
          if (fixResult.success) {
            fixedFiles.push(fixResult.file)
          }
        } else if (issue.type === 'module_resolution_error') {
          const fixResult = await this.fixModuleResolutionError(issue)
          if (fixResult.success) {
            fixedFiles.push(fixResult.file)
          }
        }
      }

      if (fixedFiles.length > 0) {
        console.log(`✅ 成功修复 ${fixedFiles.length} 个文件`)
        return {
          success: true,
          message: `成功修复 ${fixedFiles.length} 个文件`,
          fixedFiles: fixedFiles,
          summary: `AI自动修复了 ${fixedFiles.length} 个问题`
        }
      } else {
        return {
          success: false,
          message: '无法自动修复检测到的问题',
          fixedFiles: []
        }
      }
    } catch (error) {
      console.error('AI代码修复失败:', error)
      return {
        success: false,
        message: `AI代码修复失败: ${error.message}`,
        fixedFiles: []
      }
    }
  }

  // 修复语法错误
  async fixSyntaxError(issue) {
    try {
      let filePath = issue.file
      const errorMessage = issue.message
      
      // 如果文件路径是相对路径，转换为绝对路径
      if (!filePath.startsWith('/')) {
        filePath = `/Users/wuwenxiang/wuwx/mm-admin/${filePath}`
      }
      
      console.log(`🔧 修复语法错误: ${filePath}`)
      
      // 检查文件是否存在
      const fs = require('fs').promises
      try {
        await fs.access(filePath)
      } catch (error) {
        console.error(`文件不存在: ${filePath}`)
        return {
          success: false,
          file: filePath,
          message: `文件不存在: ${filePath}`
        }
      }
      
      // 读取文件内容
      const originalContent = await fs.readFile(filePath, 'utf8')
      
      // 使用AI分析并生成修复代码
      const prompt = `请修复以下代码中的语法错误：

文件路径: ${filePath}
错误信息: ${errorMessage}

原始代码:
\`\`\`
${originalContent}
\`\`\`

请提供修复后的完整代码，确保：
1. 修复所有语法错误
2. 保持代码逻辑不变
3. 保持代码风格一致
4. 只返回修复后的代码，不要包含解释
5. 不要使用markdown代码块格式，直接返回纯代码

修复后的代码:`

      const response = await this.model.invoke(prompt)
      const fixedContent = this.cleanAIResponse(response.content || response)
      
      // 写入修复后的代码
      await fs.writeFile(filePath, fixedContent, 'utf8')
      
      console.log(`✅ 语法错误修复完成: ${filePath}`)
      return {
        success: true,
        file: filePath,
        message: '语法错误修复成功'
      }
    } catch (error) {
      console.error(`修复语法错误失败 ${issue.file}:`, error)
      return {
        success: false,
        file: issue.file,
        message: error.message
      }
    }
  }

  // 修复模块解析错误
  async fixModuleResolutionError(issue) {
    try {
      let filePath = issue.file
      const errorMessage = issue.message
      
      // 如果文件路径是相对路径，转换为绝对路径
      if (!filePath.startsWith('/')) {
        filePath = `/Users/wuwenxiang/wuwx/mm-admin/${filePath}`
      }
      
      console.log(`🔧 修复模块解析错误: ${filePath}`)
      
      // 检查文件是否存在
      const fs = require('fs').promises
      try {
        await fs.access(filePath)
      } catch (error) {
        console.error(`文件不存在: ${filePath}`)
        return {
          success: false,
          file: filePath,
          message: `文件不存在: ${filePath}`
        }
      }
      
      // 读取文件内容
      const originalContent = await fs.readFile(filePath, 'utf8')
      
      // 使用AI分析并生成修复代码
      const prompt = `请修复以下代码中的模块解析错误：

文件路径: ${filePath}
错误信息: ${errorMessage}

原始代码:
\`\`\`
${originalContent}
\`\`\`

错误分析：代码中导入了不存在的模块 "./non-existent-module"，需要删除这个导入语句。

请提供修复后的完整代码，确保：
1. 删除不存在的模块导入
2. 保持其他代码不变
3. 保持代码风格一致
4. 只返回修复后的代码，不要包含解释
5. 不要使用markdown代码块格式，直接返回纯代码

修复后的代码:`

      const response = await this.model.invoke(prompt)
      const fixedContent = this.cleanAIResponse(response.content || response)
      
      // 写入修复后的代码
      await fs.writeFile(filePath, fixedContent, 'utf8')
      
      console.log(`✅ 模块解析错误修复完成: ${filePath}`)
      return {
        success: true,
        file: filePath,
        message: '模块解析错误修复成功'
      }
    } catch (error) {
      console.error(`修复模块解析错误失败 ${issue.file}:`, error)
      return {
        success: false,
        file: issue.file,
        message: error.message
      }
    }
  }

  // 修复依赖错误
  async fixDependencyError(issue) {
    try {
      const filePath = issue.file
      const errorMessage = issue.message
      
      console.log(`📦 修复依赖错误: ${filePath}`)
      
      // 读取package.json文件
      const fs = require('fs').promises
      const packageJsonPath = '/Users/wuwenxiang/wuwx/mm-admin/package.json'
      
      try {
        const packageContent = await fs.readFile(packageJsonPath, 'utf8')
        const packageJson = JSON.parse(packageContent)
        
        // 使用AI分析依赖问题并生成修复建议
        const prompt = `请分析以下依赖错误并提供修复方案：

错误信息: ${errorMessage}
当前package.json:
\`\`\`json
${packageContent}
\`\`\`

请提供修复后的package.json内容，确保：
1. 修复所有依赖问题
2. 保持版本兼容性
3. 只返回修复后的JSON，不要包含解释

修复后的package.json:`

        const response = await this.model.invoke(prompt)
        const fixedPackageJson = this.cleanAIResponse(response.content || response)
        
        // 写入修复后的package.json
        await fs.writeFile(packageJsonPath, fixedPackageJson, 'utf8')
        
        console.log(`✅ 依赖错误修复完成: ${packageJsonPath}`)
        return {
          success: true,
          file: packageJsonPath,
          message: '依赖错误修复成功'
        }
      } catch (error) {
        console.error('修复依赖错误失败:', error)
        return {
          success: false,
          file: packageJsonPath,
          message: error.message
        }
      }
    } catch (error) {
      console.error(`修复依赖错误失败 ${issue.file}:`, error)
      return {
        success: false,
        file: issue.file,
        message: error.message
      }
    }
  }

  // 修复配置错误
  async fixConfigurationError(issue) {
    try {
      const filePath = issue.file
      const errorMessage = issue.message
      
      console.log(`⚙️ 修复配置错误: ${filePath}`)
      
      // 读取配置文件
      const fs = require('fs').promises
      const originalContent = await fs.readFile(filePath, 'utf8')
      
      // 使用AI分析并生成修复配置
      const prompt = `请修复以下配置文件中的错误：

文件路径: ${filePath}
错误信息: ${errorMessage}

原始配置:
\`\`\`
${originalContent}
\`\`\`

请提供修复后的完整配置，确保：
1. 修复所有配置错误
2. 保持配置逻辑正确
3. 只返回修复后的配置，不要包含解释

修复后的配置:`

      const response = await this.model.invoke(prompt)
      const fixedContent = this.cleanAIResponse(response.content || response)
      
      // 写入修复后的配置
      await fs.writeFile(filePath, fixedContent, 'utf8')
      
      console.log(`✅ 配置错误修复完成: ${filePath}`)
      return {
        success: true,
        file: filePath,
        message: '配置错误修复成功'
      }
    } catch (error) {
      console.error(`修复配置错误失败 ${issue.file}:`, error)
      return {
        success: false,
        file: issue.file,
        message: error.message
      }
    }
  }
}

module.exports = JenkinsAgent
