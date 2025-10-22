const axios = require('axios')
const { exec } = require('child_process')
const path = require('path')
const fs = require('fs').promises

class GitWebhookService {
  constructor() {
    this.projectPath = '/Users/wuwenxiang/wuwx/mm-admin'
    this.jenkinsJobName = 'test/web/web-mm-admin-new'
    this.jenkinsUrl = 'https://jks.popfun.xyz'
    this.jenkinsUsername = 'wuwenxiang'
    this.jenkinsToken = '1151d55491677b7add0d5aa327b29425a1'
  }

  // 处理GitLab推送事件
  async handleGitLabPush(payload) {
    try {
      console.log('📥 收到GitLab推送事件')
      
      // 检查是否是目标分支
      const branch = payload.ref?.replace('refs/heads/', '')
      if (branch !== 'develop') {
        console.log(`⏭️ 跳过非develop分支: ${branch}`)
        return { success: true, message: `跳过非develop分支: ${branch}` }
      }

      // 检查是否有新的提交
      const commits = payload.commits || []
      if (commits.length === 0) {
        console.log('⏭️ 没有新的提交')
        return { success: true, message: '没有新的提交' }
      }

      console.log(`🔄 检测到 ${commits.length} 个新提交到 develop 分支`)
      
      // 触发Jenkins构建
      const buildResult = await this.triggerJenkinsBuild()
      
      return {
        success: true,
        message: `成功触发Jenkins构建`,
        buildResult
      }
    } catch (error) {
      console.error('处理GitLab推送事件失败:', error)
      throw error
    }
  }

  // 触发Jenkins构建
  async triggerJenkinsBuild() {
    try {
      const auth = Buffer.from(`${this.jenkinsUsername}:${this.jenkinsToken}`).toString('base64')
      
      // 处理嵌套任务路径
      const jobPath = this.jenkinsJobName.replace(/\//g, '/job/')
      
      // 检查是否是参数化构建，如果是则使用buildWithParameters端点
      let requestUrl = `${this.jenkinsUrl}/job/${jobPath}/build`
      let requestBody = {}
      
      // 尝试获取作业信息来判断是否是参数化构建
      try {
        const jobInfoUrl = `${this.jenkinsUrl}/job/${jobPath}/api/json`
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
          console.log('🔧 检测到参数化构建，使用buildWithParameters端点')
          requestUrl = `${this.jenkinsUrl}/job/${jobPath}/buildWithParameters`
          
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
        console.log('⚠️ 无法获取作业信息，使用标准构建端点:', error.message)
      }
      
      console.log(`🚀 触发Jenkins构建: ${requestUrl}`)
      
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
        console.log('🔐 使用CSRF Token进行请求')
      }
      
      const response = await axios.post(requestUrl, requestBody, {
        headers: headers,
        timeout: 10000,
        validateStatus: function (status) {
          return status < 500;
        }
      })
      
      if (response.status === 200 || response.status === 201) {
        console.log('✅ Jenkins构建触发成功')
        return {
          success: true,
          statusCode: response.status,
          message: '构建已触发'
        }
      } else {
        throw new Error(`触发构建失败，状态码: ${response.status}`)
      }
    } catch (error) {
      console.error('触发Jenkins构建失败:', error)
      throw error
    }
  }

  // 获取CSRF Token
  async getCrumb() {
    try {
      const auth = Buffer.from(`${this.jenkinsUsername}:${this.jenkinsToken}`).toString('base64')
      const response = await axios.get(`${this.jenkinsUrl}/crumbIssuer/api/json`, {
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
      console.log(`获取CSRF Token失败: ${error.message}`)
      return null
    }
  }

  // 检查构建状态
  async checkBuildStatus() {
    try {
      const auth = Buffer.from(`${this.jenkinsUsername}:${this.jenkinsToken}`).toString('base64')
      const jobPath = this.jenkinsJobName.replace(/\//g, '/job/')
      const apiUrl = `${this.jenkinsUrl}/job/${jobPath}/api/json`
      
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      })
      
      if (response.status === 200) {
        const jobInfo = response.data
        const lastBuild = jobInfo.lastBuild
        
        if (lastBuild) {
          // 获取具体构建的详细信息
          const buildApiUrl = `${lastBuild.url}api/json`
          const buildResponse = await axios.get(buildApiUrl, {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Accept': 'application/json'
            },
            timeout: 10000
          })
          
          if (buildResponse.status === 200) {
            const buildInfo = buildResponse.data
            return {
              success: true,
              buildNumber: buildInfo.number,
              building: buildInfo.building || false,
              result: buildInfo.result,
              url: buildInfo.url
            }
          }
        }
      }
      
      return { success: false, message: '无法获取构建状态' }
    } catch (error) {
      console.error('检查构建状态失败:', error)
      return { success: false, message: error.message }
    }
  }

  // 获取构建日志
  async getBuildLogs(buildNumber) {
    try {
      const auth = Buffer.from(`${this.jenkinsUsername}:${this.jenkinsToken}`).toString('base64')
      const jobPath = this.jenkinsJobName.replace(/\//g, '/job/')
      const logUrl = `${this.jenkinsUrl}/job/${jobPath}/${buildNumber}/consoleText`
      
      const response = await axios.get(logUrl, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'text/plain'
        },
        timeout: 30000
      })
      
      if (response.status === 200) {
        return {
          success: true,
          logs: response.data
        }
      }
      
      return { success: false, message: '无法获取构建日志' }
    } catch (error) {
      console.error('获取构建日志失败:', error)
      return { success: false, message: error.message }
    }
  }

  // 在本地项目目录执行Git命令
  async executeGitCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, { cwd: this.projectPath }, (error, stdout, stderr) => {
        if (error) {
          console.error(`Git命令执行失败: ${error.message}`)
          reject(error)
        } else {
          resolve({ stdout: stdout.trim(), stderr: stderr.trim() })
        }
      })
    })
  }

  // 提交修复的代码
  async commitFix(fixDescription) {
    try {
      console.log('📝 提交修复的代码...')
      
      // 添加所有修改的文件
      await this.executeGitCommand('git add .')
      
      // 提交修改
      const commitMessage = `🔧 Auto-fix: ${fixDescription}`
      await this.executeGitCommand(`git commit -m "${commitMessage}"`)
      
      // 推送到develop分支
      await this.executeGitCommand('git push origin develop')
      
      console.log('✅ 修复代码已提交并推送')
      return { success: true, message: '修复代码已提交并推送' }
    } catch (error) {
      console.error('提交修复代码失败:', error)
      throw error
    }
  }
}

module.exports = GitWebhookService
