const TelegramBot = require('node-telegram-bot-api')
const fs = require('fs')

class TelegramService {
  constructor() {
    this.bot = null
    this.chatId = null
    this.isConfigured = false
  }

  // 配置Telegram Bot
  configure(botToken, chatId) {
    try {
      this.bot = new TelegramBot(botToken, { polling: false })
      this.chatId = chatId
      this.isConfigured = true
      console.log('✅ Telegram Bot 配置成功')
      return true
    } catch (error) {
      console.error('❌ Telegram Bot 配置失败:', error.message)
      return false
    }
  }

  // 发送文本消息
  async sendMessage(text) {
    if (!this.isConfigured) {
      throw new Error('Telegram Bot 未配置')
    }

    try {
      const result = await this.bot.sendMessage(this.chatId, text, {
        disable_web_page_preview: true
      })
      return result
    } catch (error) {
      console.error('发送消息失败:', error.message)
      throw error
    }
  }

  // 发送图片
  async sendPhoto(imagePath, caption = '') {
    if (!this.isConfigured) {
      throw new Error('Telegram Bot 未配置')
    }

    try {
      const photo = fs.readFileSync(imagePath)
      const result = await this.bot.sendPhoto(this.chatId, photo, {
        caption: caption,
        parse_mode: 'Markdown'
      })
      return result
    } catch (error) {
      console.error('发送图片失败:', error.message)
      throw error
    }
  }

  // 发送图片Buffer
  async sendPhotoBuffer(imageBuffer, caption = '') {
    if (!this.isConfigured) {
      throw new Error('Telegram Bot 未配置')
    }

    try {
      const result = await this.bot.sendPhoto(this.chatId, imageBuffer, {
        caption: caption
      })
      return result
    } catch (error) {
      console.error('发送图片Buffer失败:', error.message)
      throw error
    }
  }

  // 发送查询结果和图表
  async sendQueryResult(queryText, queryResult, chartBuffer = null) {
    try {
      // 发送查询信息
      const queryMessage = `📊 数据库查询结果\n\n查询语句:\n\`${queryText}\`\n\n结果数量: ${queryResult.length} 条记录`
      await this.sendMessage(queryMessage)

      // 发送图表
      if (chartBuffer) {
        const chartCaption = `📈 数据可视化图表\n\n基于查询结果自动生成的图表`
        await this.sendPhotoBuffer(chartBuffer, chartCaption)
      }

      // 发送数据摘要
      if (queryResult.length > 0) {
        const summary = this.generateDataSummary(queryResult)
        await this.sendMessage(summary)
      }

      return true
    } catch (error) {
      console.error('发送查询结果失败:', error.message)
      throw error
    }
  }

  // 生成数据摘要
  generateDataSummary(data) {
    if (data.length === 0) return '📋 数据摘要: 无数据'

    const keys = Object.keys(data[0])
    let summary = '📋 数据摘要:\n\n'

    // 统计每个字段的基本信息
    keys.forEach(key => {
      const values = data.map(row => row[key])
      const numericValues = values.filter(val => typeof val === 'number' || !isNaN(parseFloat(val)))
      
      if (numericValues.length > 0) {
        const nums = numericValues.map(Number)
        const sum = nums.reduce((a, b) => a + b, 0)
        const avg = sum / nums.length
        const max = Math.max(...nums)
        const min = Math.min(...nums)
        
        summary += `${key}:\n`
        summary += `  • 总数: ${sum.toFixed(2)}\n`
        summary += `  • 平均: ${avg.toFixed(2)}\n`
        summary += `  • 最大: ${max}\n`
        summary += `  • 最小: ${min}\n\n`
      } else {
        const uniqueValues = [...new Set(values)]
        summary += `${key}: ${uniqueValues.length} 个不同值\n`
        if (uniqueValues.length <= 5) {
          summary += `  • ${uniqueValues.join(', ')}\n\n`
        }
      }
    })

    return summary
  }

  // 测试连接
  async testConnection() {
    if (!this.isConfigured) {
      throw new Error('Telegram Bot 未配置')
    }

    try {
      const me = await this.bot.getMe()
      const testMessage = `🤖 Bot 连接测试成功\n\nBot 信息:\n• 用户名: @${me.username}\n• 名称: ${me.first_name}\n• ID: ${me.id}`
      await this.sendMessage(testMessage)
      return true
    } catch (error) {
      console.error('Telegram 连接测试失败:', error.message)
      throw error
    }
  }

  // 获取配置状态
  getStatus() {
    return {
      configured: this.isConfigured,
      chatId: this.chatId,
      botUsername: this.bot ? this.bot.options.username : null
    }
  }
}

module.exports = { TelegramService }
