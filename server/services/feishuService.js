const axios = require('axios')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

class FeishuService {
  constructor() {
    this.config = {
      webhookUrl: '',
      secret: ''
    }
    this.configFile = path.join(__dirname, '../config/feishu-config.json')
    
    this.loadConfig()
  }

  // 加载配置
  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const data = fs.readFileSync(this.configFile, 'utf8')
        this.config = { ...this.config, ...JSON.parse(data) }
      }
    } catch (error) {
      console.error('加载飞书配置失败:', error)
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
      console.error('保存飞书配置失败:', error)
    }
  }

  // 生成签名
  generateSignature(timestamp, secret) {
    const stringToSign = timestamp + secret
    return crypto.createHmac('sha256', secret).update(stringToSign).digest('base64')
  }

  // 发送文本消息
  async sendTextMessage(text, title = null) {
    if (!this.config.webhookUrl) {
      throw new Error('飞书Webhook URL未配置')
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000).toString()
      let headers = {
        'Content-Type': 'application/json'
      }

      // 如果有签名密钥，添加签名
      if (this.config.secret) {
        const sign = this.generateSignature(timestamp, this.config.secret)
        headers['X-Lark-Signature'] = sign
        headers['X-Lark-Request-Timestamp'] = timestamp
      }

      const message = {
        msg_type: 'text',
        content: {
          text: title ? `**${title}**\n\n${text}` : text
        }
      }

      const response = await axios.post(this.config.webhookUrl, message, {
        headers,
        timeout: 10000
      })

      if (response.data.code === 0) {
        return {
          success: true,
          message: '消息发送成功',
          data: response.data
        }
      } else {
        throw new Error(`飞书API错误: ${response.data.msg}`)
      }
    } catch (error) {
      throw new Error(`发送飞书消息失败: ${error.message}`)
    }
  }

  // 发送富文本卡片消息
  async sendCardMessage(title, content, buildInfo = null) {
    if (!this.config.webhookUrl) {
      throw new Error('飞书Webhook URL未配置')
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000).toString()
      let headers = {
        'Content-Type': 'application/json'
      }

      // 如果有签名密钥，添加签名
      if (this.config.secret) {
        const sign = this.generateSignature(timestamp, this.config.secret)
        headers['X-Lark-Signature'] = sign
        headers['X-Lark-Request-Timestamp'] = timestamp
      }

      // 构建卡片内容
      const elements = [
        {
          tag: 'div',
          text: {
            content: content,
            tag: 'plain_text'
          }
        }
      ]

      // 如果有构建信息，添加详细信息
      if (buildInfo) {
        elements.push({
          tag: 'div',
          fields: [
            {
              is_short: true,
              text: {
                content: `**构建号:** #${buildInfo.number}`,
                tag: 'lark_md'
              }
            },
            {
              is_short: true,
              text: {
                content: `**状态:** ${buildInfo.result}`,
                tag: 'lark_md'
              }
            },
            {
              is_short: true,
              text: {
                content: `**构建者:** ${buildInfo.builder}`,
                tag: 'lark_md'
              }
            },
            {
              is_short: true,
              text: {
                content: `**持续时间:** ${Math.round(buildInfo.duration / 1000)}秒`,
                tag: 'lark_md'
              }
            }
          ]
        })

        // 添加查看链接
        if (buildInfo.url) {
          elements.push({
            tag: 'action',
            actions: [
              {
                tag: 'button',
                text: {
                  content: '查看构建详情',
                  tag: 'plain_text'
                },
                url: buildInfo.url,
                type: 'primary'
              }
            ]
          })
        }
      }

      const message = {
        msg_type: 'interactive',
        card: {
          config: {
            wide_screen_mode: true
          },
          header: {
            template: buildInfo && buildInfo.result === 'SUCCESS' ? 'green' : 
                     buildInfo && buildInfo.result === 'FAILURE' ? 'red' : 'blue',
            title: {
              content: title,
              tag: 'plain_text'
            }
          },
          elements: elements
        }
      }

      const response = await axios.post(this.config.webhookUrl, message, {
        headers,
        timeout: 10000
      })

      if (response.data.code === 0) {
        return {
          success: true,
          message: '卡片消息发送成功',
          data: response.data
        }
      } else {
        throw new Error(`飞书API错误: ${response.data.msg}`)
      }
    } catch (error) {
      throw new Error(`发送飞书卡片消息失败: ${error.message}`)
    }
  }

  // 发送Jenkins构建通知
  async sendBuildNotification(buildStatus, buildInfo, jobName) {
    try {
      let title = ''
      let content = ''
      let color = 'blue'

      switch (buildStatus) {
        case 'success':
          title = '✅ Jenkins构建成功'
          content = `任务 **${jobName}** 构建 #${buildInfo.number} 成功完成！`
          color = 'green'
          break
        case 'failure':
          title = '❌ Jenkins构建失败'
          content = `任务 **${jobName}** 构建 #${buildInfo.number} 失败，需要立即关注！`
          color = 'red'
          break
        case 'building':
          title = '🔄 Jenkins构建进行中'
          content = `任务 **${jobName}** 构建 #${buildInfo.number} 正在执行中...`
          color = 'blue'
          break
        default:
          title = 'ℹ️ Jenkins构建状态更新'
          content = `任务 **${jobName}** 构建状态: ${buildStatus}`
      }

      // 添加时间戳
      const timestamp = new Date().toLocaleString('zh-CN')
      content += `\n\n⏰ 时间: ${timestamp}`

      // 如果有构建描述，添加到内容中
      if (buildInfo.description) {
        content += `\n\n📝 描述: ${buildInfo.description}`
      }

      // 如果有变更信息，添加到内容中
      if (buildInfo.changeSet && buildInfo.changeSet.items && buildInfo.changeSet.items.length > 0) {
        content += `\n\n📋 变更:\n`
        buildInfo.changeSet.items.forEach((item, index) => {
          if (index < 3) { // 只显示前3个变更
            content += `• ${item.msg || '无描述'}\n`
          }
        })
        if (buildInfo.changeSet.items.length > 3) {
          content += `• ... 还有 ${buildInfo.changeSet.items.length - 3} 个变更\n`
        }
      }

      return await this.sendCardMessage(title, content, buildInfo)
    } catch (error) {
      throw new Error(`发送构建通知失败: ${error.message}`)
    }
  }

  // 测试连接
  async testConnection(config = null) {
    const testConfig = config || this.config
    
    if (!testConfig.webhookUrl) {
      throw new Error('飞书Webhook URL未配置')
    }

    try {
      const testMessage = {
        msg_type: 'text',
        content: {
          text: '🔔 飞书通知测试消息\n\n这是一条测试消息，用于验证飞书机器人配置是否正确。'
        }
      }

      const timestamp = Math.floor(Date.now() / 1000).toString()
      let headers = {
        'Content-Type': 'application/json'
      }

      if (testConfig.secret) {
        const sign = this.generateSignature(timestamp, testConfig.secret)
        headers['X-Lark-Signature'] = sign
        headers['X-Lark-Request-Timestamp'] = timestamp
      }

      const response = await axios.post(testConfig.webhookUrl, testMessage, {
        headers,
        timeout: 10000
      })

      if (response.data.code === 0) {
        return {
          success: true,
          message: '飞书连接测试成功'
        }
      } else {
        throw new Error(`飞书API错误: ${response.data.msg}`)
      }
    } catch (error) {
      throw new Error(`飞书连接测试失败: ${error.message}`)
    }
  }

  // 更新配置
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig }
    this.saveConfig()
  }

  // 获取配置
  getConfig() {
    return {
      webhookUrl: this.config.webhookUrl,
      hasSecret: !!this.config.secret
    }
  }
}

module.exports = FeishuService
