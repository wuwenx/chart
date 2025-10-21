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

  const sendMessage = async () => {
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
        body: JSON.stringify({ question })
      })

      if (response.ok) {
        const data = await response.json()
        addMessage('assistant', data.response)
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
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-avatar">
              {message.type === 'user' ? <User size={18} /> : <Bot size={18} />}
            </div>
            <div className="message-content">
              {message.content}
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
  )
}

export default DatabaseChat
