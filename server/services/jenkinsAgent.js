const { ChatOpenAI } = require('@langchain/openai')
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai')
const { AIModelManager } = require('./aiModelManager')

class JenkinsAgent {
  constructor() {
    this.aiModelManager = new AIModelManager()
    this.model = null
    this.initializeModel()
  }

  // 初始化AI模型
  async initializeModel() {
    try {
      this.model = this.aiModelManager.getModel()
      console.log('Jenkins Agent AI模型初始化成功')
    } catch (error) {
      console.error('Jenkins Agent AI模型初始化失败:', error)
    }
  }

  // 分析构建日志
  async analyzeBuildLogs(buildInfo) {
    if (!this.model) {
      throw new Error('AI模型未初始化')
    }

    try {
      const prompt = `
你是一个专业的DevOps工程师，请分析以下Jenkins构建信息并给出专业的判断和建议：

构建信息：
- 构建号: #${buildInfo.number}
- 构建结果: ${buildInfo.result}
- 构建时间: ${new Date(buildInfo.timestamp).toLocaleString('zh-CN')}
- 持续时间: ${Math.round(buildInfo.duration / 1000)}秒
- 构建者: ${buildInfo.builder || 'N/A'}
- 描述: ${buildInfo.description || '无'}

变更信息：
${buildInfo.changeSet && buildInfo.changeSet.items ? 
  buildInfo.changeSet.items.map(item => `- ${item.msg || '无描述'}`).join('\n') : 
  '无变更信息'}

请从以下角度进行分析：
1. 构建结果评估（成功/失败的原因分析）
2. 性能分析（构建时间是否合理）
3. 变更风险评估（代码变更是否可能导致问题）
4. 建议措施（如果需要的话）

请用JSON格式返回分析结果，包含以下字段：
{
  "assessment": "构建结果评估",
  "performance": "性能分析",
  "risk": "变更风险评估", 
  "recommendations": ["建议措施1", "建议措施2"],
  "priority": "high|medium|low",
  "shouldNotify": true/false,
  "notificationMessage": "通知消息内容"
}
`

      const response = await this.model.invoke(prompt)
      
      // 尝试解析JSON响应
      let analysis
      try {
        analysis = JSON.parse(response.content || response)
      } catch (parseError) {
        // 如果解析失败，使用默认分析
        analysis = this.getDefaultAnalysis(buildInfo)
      }

      return analysis
    } catch (error) {
      console.error('AI分析构建日志失败:', error)
      return this.getDefaultAnalysis(buildInfo)
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
        shouldNotify: analysis.shouldNotify,
        priority: analysis.priority,
        message: analysis.notificationMessage,
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
}

module.exports = JenkinsAgent
