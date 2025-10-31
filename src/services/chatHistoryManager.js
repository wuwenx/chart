/**
 * 使用 LangChain.js 格式的消息历史管理器
 * 提供消息持久化和管理功能
 */
import { HumanMessage, AIMessage } from '@langchain/core/messages'

class ChatHistoryManager {
  constructor(storageKey = 'database_chat_history') {
    this.storageKey = storageKey
    this.maxMessages = 100 // 最大保存消息数量
  }

  /**
   * 从 localStorage 加载历史消息
   */
  loadMessages() {
    try {
      const saved = localStorage.getItem(this.storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        // 转换为 LangChain 消息格式
        return parsed.map(msg => this.deserializeMessage(msg))
      }
    } catch (error) {
      console.error('加载历史消息失败:', error)
    }
    
    // 返回默认欢迎消息
    const welcomeMessage = new AIMessage('您好！我是数据库查询助手，可以帮您用自然语言查询数据库。请告诉我您想要查询什么数据。')
    welcomeMessage.additional_kwargs = {
      id: `${Date.now()}-welcome`,
      timestamp: new Date().toISOString()
    }
    return [welcomeMessage]
  }

  /**
   * 保存消息到 localStorage
   */
  saveMessages(messages) {
    try {
      // 只保存最近的消息，避免超出存储限制
      const messagesToStore = messages.slice(-this.maxMessages)
      
      // 序列化消息
      const serialized = messagesToStore.map(msg => this.serializeMessage(msg))
      
      localStorage.setItem(this.storageKey, JSON.stringify(serialized))
    } catch (error) {
      console.error('保存消息失败:', error)
      // 如果失败，尝试保存更少的消息
      try {
        const messagesToStore = messages.slice(-50)
        const serialized = messagesToStore.map(msg => this.serializeMessage(msg))
        localStorage.setItem(this.storageKey, JSON.stringify(serialized))
      } catch (e) {
        console.error('保存消息失败，可能是存储空间不足')
      }
    }
  }

  /**
   * 添加用户消息
   */
  addUserMessage(content) {
    const message = new HumanMessage(content)
    // 添加额外的元数据
    message.additional_kwargs = message.additional_kwargs || {}
    message.additional_kwargs.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    message.additional_kwargs.timestamp = new Date().toISOString()
    return message
  }

  /**
   * 添加助手消息
   */
  addAIMessage(content, chartInfo = null) {
    const message = new AIMessage(content)
    // 添加额外的元数据
    message.additional_kwargs = message.additional_kwargs || {}
    message.additional_kwargs.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    message.additional_kwargs.timestamp = new Date().toISOString()
    message.additional_kwargs.chartInfo = chartInfo || null
    return message
  }

  /**
   * 序列化消息为可存储格式
   */
  serializeMessage(message) {
    return {
      type: message.constructor.name, // 'HumanMessage' or 'AIMessage'
      content: message.content,
      id: message.additional_kwargs?.id || `${Date.now()}-${Math.random()}`,
      timestamp: message.additional_kwargs?.timestamp || new Date().toISOString(),
      chartInfo: message.additional_kwargs?.chartInfo || null
    }
  }

  /**
   * 反序列化消息
   */
  deserializeMessage(data) {
    let message
    if (data.type === 'HumanMessage') {
      message = new HumanMessage(data.content)
    } else {
      message = new AIMessage(data.content)
    }
    
    // 恢复额外的元数据
    message.additional_kwargs = {
      id: data.id,
      timestamp: data.timestamp,
      chartInfo: data.chartInfo || null
    }
    
    return message
  }

  /**
   * 转换为前端使用的消息格式
   */
  toUIMessages(langchainMessages) {
    return langchainMessages.map(msg => ({
      id: msg.additional_kwargs?.id || `${Date.now()}-${Math.random()}`,
      type: msg.constructor.name === 'HumanMessage' ? 'user' : 'assistant',
      content: msg.content,
      timestamp: msg.additional_kwargs?.timestamp 
        ? new Date(msg.additional_kwargs.timestamp) 
        : new Date(),
      chartInfo: msg.additional_kwargs?.chartInfo || null
    }))
  }

  /**
   * 从 UI 消息格式转换为 LangChain 消息
   */
  fromUIMessages(uiMessages) {
    return uiMessages.map(msg => {
      let message
      if (msg.type === 'user') {
        message = new HumanMessage(msg.content)
      } else {
        message = new AIMessage(msg.content)
      }
      
      // 添加额外的元数据
      message.additional_kwargs = {
        id: msg.id,
        timestamp: msg.timestamp instanceof Date 
          ? msg.timestamp.toISOString() 
          : new Date().toISOString(),
        chartInfo: msg.chartInfo || null
      }
      
      return message
    })
  }

  /**
   * 清除所有历史记录
   */
  clearHistory() {
    localStorage.removeItem(this.storageKey)
  }

  /**
   * 获取历史记录数量
   */
  getHistoryCount() {
    try {
      const saved = localStorage.getItem(this.storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        return parsed.length
      }
    } catch (error) {
      console.error('获取历史记录数量失败:', error)
    }
    return 0
  }
}

export default ChatHistoryManager

