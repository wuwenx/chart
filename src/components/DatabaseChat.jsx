import React, { useState, useRef, useEffect } from 'react'
import { Send, Database, Bot, User } from 'lucide-react'

const DatabaseChat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: '您好！我是数据库查询助手，可以帮您用自然语言查询数据库。请告诉我您想要查询什么数据。',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showTelegramConfig, setShowTelegramConfig] = useState(false)
  const [telegramConfig, setTelegramConfig] = useState({ botToken: '', chatId: '' })
  const [telegramStatus, setTelegramStatus] = useState(null)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const addMessage = (type, content) => {
    const newMessage = {
      id: Date.now(),
      type,
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
  }

  const sendMessage = async (generateChart = false, sendToTelegram = false) => {
    if (!inputValue.trim() || isLoading) return

    const question = inputValue.trim()
    addMessage('user', question)
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/database/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          question,
          generateChart,
          sendToTelegram,
          chartType: 'auto'
        })
      })

      if (response.ok) {
        const data = await response.json()
        addMessage('assistant', data.response)
        
        // 如果有图表数据，显示图表
        if (data.chartBase64) {
          const chartImage = `data:image/png;base64,${data.chartBase64}`
          addMessage('assistant', `📊 **生成的图表：**\n\n![查询结果图表](${chartImage})`)
        }
      } else {
        const errorData = await response.json()
        addMessage('assistant', `❌ 查询失败：${errorData.message}`)
      }
    } catch (error) {
      addMessage('assistant', '❌ 查询执行失败，请检查网络连接')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const quickQueries = [
    '查询所有用户账户的数量',
    '统计每个分片表的用户数量',
    '显示数据库结构信息',
    '查询最近的交易记录',
    '统计各币种的交易量'
  ]

  const handleQuickQuery = (query) => {
    setInputValue(query)
  }

  // Telegram配置功能
  const configureTelegram = async () => {
    try {
      const response = await fetch('/api/telegram/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(telegramConfig)
      })

      if (response.ok) {
        addMessage('assistant', '✅ Telegram Bot 配置成功！')
        setShowTelegramConfig(false)
        await fetchTelegramStatus()
      } else {
        const errorData = await response.json()
        addMessage('assistant', `❌ Telegram配置失败：${errorData.message}`)
      }
    } catch (error) {
      addMessage('assistant', '❌ Telegram配置失败，请检查网络连接')
    }
  }

  const fetchTelegramStatus = async () => {
    try {
      const response = await fetch('/api/telegram/status')
      if (response.ok) {
        const status = await response.json()
        setTelegramStatus(status)
      }
    } catch (error) {
      console.error('获取Telegram状态失败:', error)
    }
  }

  const testTelegramConnection = async () => {
    try {
      const response = await fetch('/api/telegram/test', {
        method: 'POST'
      })

      if (response.ok) {
        addMessage('assistant', '✅ Telegram连接测试成功！')
      } else {
        const errorData = await response.json()
        addMessage('assistant', `❌ Telegram连接测试失败：${errorData.message}`)
      }
    } catch (error) {
      addMessage('assistant', '❌ Telegram连接测试失败，请检查网络连接')
    }
  }

  const formatMessage = (content) => {
    // 处理Markdown格式的消息内容
    const lines = content.split('\n')
    const formattedLines = lines.map((line, index) => {
      // 处理图表图片
      if (line.includes('data:image/png;base64,')) {
        const base64Match = line.match(/data:image\/png;base64,([^)]+)/)
        if (base64Match) {
          return (
            <div key={index} className="chart-image-container">
              <img 
                src={`data:image/png;base64,${base64Match[1]}`} 
                alt="查询结果图表" 
                className="chart-image"
              />
            </div>
          )
        }
      }
      
      // 处理表格
      if (line.includes('|') && line.includes('---')) {
        return <div key={index} className="table-container"><pre className="table-content">{line}</pre></div>
      }
      
      // 处理SQL代码块
      if (line.startsWith('```sql')) {
        const sqlContent = content.split('```sql')[1]?.split('```')[0]
        return <pre key={index} className="sql-code">{sqlContent}</pre>
      }
      
      // 处理JSON代码块
      if (line.startsWith('```json')) {
        const jsonContent = content.split('```json')[1]?.split('```')[0]
        return <pre key={index} className="json-code">{jsonContent}</pre>
      }
      
      // 处理普通代码块
      if (line.startsWith('```')) {
        const codeContent = content.split('```')[1]?.split('```')[0]
        return <pre key={index} className="code-block">{codeContent}</pre>
      }
      
      // 处理粗体文本
      if (line.includes('**') && line.includes('**')) {
        const parts = line.split('**')
        return (
          <div key={index}>
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            )}
          </div>
        )
      }
      
      return <div key={index}>{line}</div>
    })
    
    return formattedLines
  }

  return (
    <div className="database-chat">
      <div className="chat-header">
        <div className="chat-title">
          <Database size={20} />
          <span>数据库查询助手</span>
        </div>
        <div className="chat-subtitle">用自然语言查询数据库</div>
      </div>

      <div className="quick-queries">
        <div className="quick-queries-title">快速查询：</div>
        <div className="quick-queries-list">
          {quickQueries.map((query, index) => (
            <button
              key={index}
              className="quick-query-btn"
              onClick={() => handleQuickQuery(query)}
            >
              {query}
            </button>
          ))}
        </div>
        
        <div className="telegram-controls">
          <button 
            className="telegram-config-btn"
            onClick={() => setShowTelegramConfig(!showTelegramConfig)}
          >
            📱 Telegram配置
          </button>
          {telegramStatus?.configured && (
            <button 
              className="telegram-test-btn"
              onClick={testTelegramConnection}
            >
              测试Telegram连接
            </button>
          )}
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-avatar">
              {message.type === 'user' ? <User size={18} /> : <Bot size={18} />}
            </div>
            <div className="message-content">
              {formatMessage(message.content)}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message assistant">
            <div className="message-avatar">
              <Bot size={18} />
            </div>
            <div className="message-content">
              <div className="loading">
                正在查询数据库
                <div className="loading-dots">
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                  <div className="loading-dot"></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showTelegramConfig && (
        <div className="telegram-config-panel">
          <h3>📱 Telegram Bot 配置</h3>
          <div className="config-form">
            <input
              type="text"
              placeholder="Bot Token"
              value={telegramConfig.botToken}
              onChange={(e) => setTelegramConfig({...telegramConfig, botToken: e.target.value})}
              className="config-input"
            />
            <input
              type="text"
              placeholder="Chat ID"
              value={telegramConfig.chatId}
              onChange={(e) => setTelegramConfig({...telegramConfig, chatId: e.target.value})}
              className="config-input"
            />
            <button onClick={configureTelegram} className="config-save-btn">
              保存配置
            </button>
          </div>
        </div>
      )}

      <div className="chat-input-container">
        <div className="input-form">
          <textarea
            ref={(el) => {
              if (el) {
                el.style.height = 'auto'
                el.style.height = el.scrollHeight + 'px'
              }
            }}
            className="input-field"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="请输入您想要查询的数据问题..."
            rows={1}
          />
          <div className="action-buttons">
            <button
              className="chart-btn"
              onClick={() => sendMessage(true, false)}
              disabled={!inputValue.trim() || isLoading}
              title="生成图表"
            >
              📊
            </button>
            <button
              className="telegram-btn"
              onClick={() => sendMessage(true, true)}
              disabled={!inputValue.trim() || isLoading || !telegramStatus?.configured}
              title="生成图表并发送到Telegram"
            >
              📱
            </button>
            <button
              className="send-btn"
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DatabaseChat
