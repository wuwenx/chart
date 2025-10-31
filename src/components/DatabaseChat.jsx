import React, { useState, useRef, useEffect } from 'react'
import { Send, Database, Bot, User, X, ExternalLink } from 'lucide-react'
import * as echarts from 'echarts'

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
  const [databases, setDatabases] = useState([])
  const [currentDatabase, setCurrentDatabase] = useState('')
  const [isLoadingDatabase, setIsLoadingDatabase] = useState(false)
  const [showChartModal, setShowChartModal] = useState(false)
  const [currentChartConfig, setCurrentChartConfig] = useState(null)
  const chartContainerRef = useRef(null)
  const chartInstanceRef = useRef(null)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 加载数据库列表和当前数据库
  useEffect(() => {
    fetchDatabaseList()
    fetchCurrentDatabase()
  }, [])

  const fetchDatabaseList = async () => {
    try {
      const response = await fetch('/api/database/list')
      if (response.ok) {
        const data = await response.json()
        setDatabases(data.databases || [])
      }
    } catch (error) {
      console.error('获取数据库列表失败:', error)
    }
  }

  const fetchCurrentDatabase = async () => {
    try {
      const response = await fetch('/api/database/current')
      if (response.ok) {
        const data = await response.json()
        setCurrentDatabase(data.database || '')
      }
    } catch (error) {
      console.error('获取当前数据库失败:', error)
    }
  }

  const handleDatabaseSwitch = async (databaseName) => {
    if (databaseName === currentDatabase) return

    setIsLoadingDatabase(true)
    try {
      const response = await fetch('/api/database/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ database: databaseName })
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentDatabase(databaseName)
        addMessage('assistant', `✅ 已切换到数据库: ${databaseName}`)
      } else {
        const errorData = await response.json()
        addMessage('assistant', `❌ 切换数据库失败：${errorData.message}`)
      }
    } catch (error) {
      addMessage('assistant', '❌ 切换数据库失败，请检查网络连接')
    } finally {
      setIsLoadingDatabase(false)
    }
  }

  const addMessage = (type, content) => {
    // 使用时间戳 + 随机数确保 ID 唯一性
    const newMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
    return newMessage.id  // 返回消息 ID
  }

  const sendMessage = async (generateChart = false, sendToTelegram = false) => {
    if (!inputValue.trim() || isLoading) return

    const question = inputValue.trim()
    
    // 自动检测：如果问题中包含图表相关关键词，自动启用图表生成
    const chartKeywords = ['图表', '图', 'chart', '可视化', '展示', '生成图表', '画图', '绘图', '绘制']
    const shouldAutoGenerateChart = chartKeywords.some(keyword => 
      question.toLowerCase().includes(keyword.toLowerCase())
    )
    
    // 如果用户明确要求图表或者问题中有图表相关词汇，自动启用图表生成
    const finalGenerateChart = generateChart || shouldAutoGenerateChart
    
    addMessage('user', question)
    setInputValue('')
    setIsLoading(true)

    console.log('📤 发送查询请求，生成图表:', finalGenerateChart, '(原始:', generateChart, ',自动检测:', shouldAutoGenerateChart, ')', '问题:', question.substring(0, 50))

    try {
      const response = await fetch('/api/database/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          question,
          generateChart: finalGenerateChart,
          sendToTelegram,
          chartType: 'auto'
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('📥 收到响应，包含图表:', !!data.chartBase64)
        
        // 合并文本响应和图表到一条消息中，避免重复 key
        let responseContent = data.response
        let chartInfo = null
        
        // 如果有图表数据，添加到响应内容中
        if (data.chartBase64) {
          console.log('🖼️ 图表数据大小:', data.chartBase64.length, '字符')
          const chartImage = `data:image/png;base64,${data.chartBase64}`
          responseContent += `\n\n📊 **生成的图表：**\n\n![查询结果图表](${chartImage})`
          
          // 保存图表配置和数据，用于交互式图表
          if (data.chartConfig && data.chartData) {
            chartInfo = {
              config: data.chartConfig,
              data: data.chartData,
              imageBase64: data.chartBase64
            }
          }
        } else {
          console.log('⚠️ 响应中没有图表数据')
        }
        
        // 添加消息，如果有关联图表则保存图表信息
        const messageId = addMessage('assistant', responseContent)
        if (chartInfo) {
          // 将图表信息附加到消息上
          setMessages(prev => prev.map(msg => 
            msg.id === messageId ? { ...msg, chartInfo } : msg
          ))
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

  const handleViewChart = (chartInfo) => {
    setCurrentChartConfig(chartInfo)
    setShowChartModal(true)
  }

  const closeChartModal = () => {
    setShowChartModal(false)
    setCurrentChartConfig(null)
    // 销毁图表实例
    if (chartInstanceRef.current) {
      chartInstanceRef.current.dispose()
      chartInstanceRef.current = null
    }
  }

  // 初始化 ECharts 图表
  useEffect(() => {
    if (showChartModal && currentChartConfig && chartContainerRef.current) {
      // 销毁旧实例
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose()
      }
      
      // 创建新实例
      const chartInstance = echarts.init(chartContainerRef.current)
      chartInstanceRef.current = chartInstance
      
      // 设置配置
      chartInstance.setOption(currentChartConfig.config, true)
      
      // 响应式调整
      const handleResize = () => {
        chartInstance.resize()
      }
      window.addEventListener('resize', handleResize)
      
      return () => {
        window.removeEventListener('resize', handleResize)
        if (chartInstanceRef.current) {
          chartInstanceRef.current.dispose()
          chartInstanceRef.current = null
        }
      }
    }
  }, [showChartModal, currentChartConfig])

  const formatMessage = (content, message = null) => {
    // 处理Markdown格式的消息内容
    const lines = content.split('\n')
    // 使用 content 的前几个字符和时间戳生成唯一前缀，确保不同消息的 key 不会重复
    const contentHash = content.substring(0, 10).replace(/[^a-zA-Z0-9]/g, '')
    const formattedLines = lines.map((line, index) => {
      // 生成唯一的 key
      const uniqueKey = `${contentHash}-${index}-${line.substring(0, 10).replace(/[^a-zA-Z0-9]/g, '')}`
      
      // 处理图表图片
      if (line.includes('data:image/png;base64,')) {
        const base64Match = line.match(/data:image\/png;base64,([^)]+)/)
        if (base64Match) {
          // 检查消息是否有图表信息
          const hasInteractiveChart = message?.chartInfo
          
          return (
            <div key={uniqueKey} className="chart-image-container">
              <img 
                src={`data:image/png;base64,${base64Match[1]}`} 
                alt="查询结果图表" 
                className="chart-image"
              />
              {hasInteractiveChart && (
                <button
                  className="chart-view-btn"
                  onClick={() => handleViewChart(message.chartInfo)}
                  title="查看交互式图表"
                >
                  <ExternalLink size={16} />
                  查看交互式图表
                </button>
              )}
            </div>
          )
        }
      }
      
      // 处理表格
      if (line.includes('|') && line.includes('---')) {
        return <div key={uniqueKey} className="table-container"><pre className="table-content">{line}</pre></div>
      }
      
      // 处理SQL代码块
      if (line.startsWith('```sql')) {
        const sqlContent = content.split('```sql')[1]?.split('```')[0]
        return <pre key={uniqueKey} className="sql-code">{sqlContent}</pre>
      }
      
      // 处理JSON代码块
      if (line.startsWith('```json')) {
        const jsonContent = content.split('```json')[1]?.split('```')[0]
        return <pre key={uniqueKey} className="json-code">{jsonContent}</pre>
      }
      
      // 处理普通代码块
      if (line.startsWith('```')) {
        const codeContent = content.split('```')[1]?.split('```')[0]
        return <pre key={uniqueKey} className="code-block">{codeContent}</pre>
      }
      
      // 处理粗体文本
      if (line.includes('**') && line.includes('**')) {
        const parts = line.split('**')
        return (
          <div key={uniqueKey}>
            {parts.map((part, i) => 
              i % 2 === 1 ? <strong key={`${uniqueKey}-strong-${i}`}>{part}</strong> : part
            )}
          </div>
        )
      }
      
      return <div key={uniqueKey}>{line}</div>
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
        <div className="database-selector">
          <label htmlFor="database-select">当前数据库：</label>
          <select
            id="database-select"
            value={currentDatabase}
            onChange={(e) => handleDatabaseSwitch(e.target.value)}
            disabled={isLoadingDatabase || databases.length === 0}
            className="database-select"
          >
            {databases.length === 0 ? (
              <option value="">加载中...</option>
            ) : (
              databases.map((db) => (
                <option key={db} value={db}>
                  {db}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="quick-queries">
        <div className="quick-queries-title">快速查询：</div>
        <div className="quick-queries-list">
          {quickQueries.map((query, index) => (
            <button
              key={`quick-query-${index}-${query.substring(0, 10)}`}
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
              {formatMessage(message.content, message)}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div key="loading-message" className="message assistant">
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

      {/* 图表查看弹窗 */}
      {showChartModal && currentChartConfig && (
        <div className="chart-modal-overlay" onClick={closeChartModal}>
          <div className="chart-modal" onClick={(e) => e.stopPropagation()}>
            <div className="chart-modal-header">
              <h3>交互式图表</h3>
              <button className="chart-modal-close" onClick={closeChartModal}>
                <X size={20} />
              </button>
            </div>
            <div className="chart-modal-content">
              <div 
                ref={chartContainerRef} 
                className="chart-interactive-container"
                style={{ width: '100%', height: '600px' }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DatabaseChat
