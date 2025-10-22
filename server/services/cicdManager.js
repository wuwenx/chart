const JenkinsAgent = require('./jenkinsAgent')
const GitWebhookService = require('./gitWebhookService')

class CICDManager {
  constructor() {
    this.jenkinsAgent = new JenkinsAgent()
    this.gitWebhook = new GitWebhookService()
    this.isProcessing = false
    this.maxRetries = 3
    this.currentRetry = 0
  }

  // 处理完整的CI/CD流程
  async handleCICDProcess(gitPayload = null) {
    if (this.isProcessing) {
      console.log('⏳ CI/CD流程正在进行中，跳过新的请求')
      return { success: false, message: 'CI/CD流程正在进行中' }
    }

    this.isProcessing = true
    this.currentRetry = 0

    try {
      console.log('🚀 开始CI/CD流程...')

      // 1. 处理Git推送事件（如果有）
      if (gitPayload) {
        await this.gitWebhook.handleGitLabPush(gitPayload)
      }

      // 2. 触发Jenkins构建
      const buildResult = await this.gitWebhook.triggerJenkinsBuild()
      if (!buildResult.success) {
        throw new Error(`触发构建失败: ${buildResult.message}`)
      }

      // 3. 等待构建完成并检查结果
      const buildStatus = await this.waitForBuildCompletion()
      
      if (buildStatus.success && buildStatus.result === 'SUCCESS') {
        console.log('✅ 构建成功！')
        return { success: true, message: '构建成功', buildStatus }
      } else if (buildStatus.success && buildStatus.result === 'FAILURE') {
        console.log('❌ 构建失败，开始自动修复流程...')
        return await this.handleBuildFailure(buildStatus)
      } else {
        console.log('⚠️ 构建状态未知')
        return { success: false, message: '构建状态未知', buildStatus }
      }

    } catch (error) {
      console.error('CI/CD流程处理失败:', error)
      return { success: false, message: error.message }
    } finally {
      this.isProcessing = false
    }
  }

  // 等待构建完成
  async waitForBuildCompletion(timeout = 300000) { // 5分钟超时
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      try {
        const status = await this.gitWebhook.checkBuildStatus()
        
        if (status.success) {
          if (!status.building) {
            // 构建完成
            return {
              success: true,
              buildNumber: status.buildNumber,
              result: status.result,
              url: status.url
            }
          } else {
            console.log(`⏳ 构建进行中... (${status.buildNumber})`)
          }
        }
        
        // 等待10秒后再次检查
        await this.sleep(10000)
      } catch (error) {
        console.error('检查构建状态失败:', error)
        await this.sleep(10000)
      }
    }
    
    throw new Error('构建超时')
  }

  // 处理构建失败
  async handleBuildFailure(buildStatus) {
    if (this.currentRetry >= this.maxRetries) {
      console.log('❌ 已达到最大重试次数，停止自动修复')
      return { 
        success: false, 
        message: '已达到最大重试次数，请手动修复',
        buildStatus 
      }
    }

    this.currentRetry++
    console.log(`🔄 开始第 ${this.currentRetry} 次自动修复尝试...`)

    try {
      // 1. 获取构建日志
      const logsResult = await this.gitWebhook.getBuildLogs(buildStatus.buildNumber)
      if (!logsResult.success) {
        throw new Error(`获取构建日志失败: ${logsResult.message}`)
      }

      // 2. 使用Jenkins Agent分析日志
      const analysisResult = await this.jenkinsAgent.analyzeBuildLogs({
        buildNumber: buildStatus.buildNumber,
        logs: logsResult.logs,
        url: buildStatus.url
      })

      if (!analysisResult.success) {
        throw new Error(`分析构建日志失败: ${analysisResult.message}`)
      }

      // 3. 检查是否需要修复
      if (!analysisResult.needsFix) {
        console.log('ℹ️ 分析结果显示不需要修复')
        return { 
          success: false, 
          message: '分析结果显示不需要修复',
          analysis: analysisResult
        }
      }

      // 4. 执行代码修复
      const fixResult = await this.jenkinsAgent.fixCodeIssues(analysisResult)
      if (!fixResult.success) {
        throw new Error(`代码修复失败: ${fixResult.message}`)
      }

      // 5. 提交修复的代码
      await this.gitWebhook.commitFix(analysisResult.summary)

      // 6. 等待GitLab webhook触发新的构建
      console.log('⏳ 等待GitLab webhook触发新的构建...')
      await this.sleep(30000) // 等待30秒让webhook生效

      // 7. 递归调用，重新开始CI/CD流程
      console.log('🔄 重新开始CI/CD流程...')
      return await this.handleCICDProcess()

    } catch (error) {
      console.error(`第 ${this.currentRetry} 次修复尝试失败:`, error)
      
      // 如果还有重试机会，继续尝试
      if (this.currentRetry < this.maxRetries) {
        console.log('🔄 准备进行下一次修复尝试...')
        await this.sleep(10000) // 等待10秒
        return await this.handleBuildFailure(buildStatus)
      } else {
        return { 
          success: false, 
          message: `自动修复失败: ${error.message}`,
          buildStatus 
        }
      }
    }
  }

  // 手动触发CI/CD流程
  async triggerManualBuild() {
    console.log('🔧 手动触发CI/CD流程...')
    return await this.handleCICDProcess()
  }

  // 获取CI/CD状态
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      currentRetry: this.currentRetry,
      maxRetries: this.maxRetries
    }
  }

  // 工具方法：等待
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

module.exports = CICDManager
