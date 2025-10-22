import React, { useState, useRef, useEffect } from 'react'
import { Send, Upload, X, Bot, User, Settings, Database, FileText, Monitor } from 'lucide-react'
import FileManager from './components/FileManager'
import DatabaseChat from './components/DatabaseChat'
import JenkinsMonitor from './components/JenkinsMonitor'

const App = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: '您好！我是您的智能助手，可以帮您回答关于内部文档和项目代码的问题。请上传相关文档或直接提问。',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [showFileManager, setShowFileManager] = useState(false)
  const [activeTab, setActiveTab] = useState('document') // 'document', 'database', 'jenkins'
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

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

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files)
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }))
    setUploadedFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId))
  }

  const uploadDocuments = async () => {
    if (uploadedFiles.length === 0) return

    setIsLoading(true)
    const formData = new FormData()
    uploadedFiles.forEach(file => {
      formData.append('files', file.file)
    })

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        addMessage('assistant', `✅ 成功上传 ${data.processedFiles} 个文件！`)
        setUploadedFiles([])
      } else {
        throw new Error('上传失败')
      }
    } catch (error) {
      addMessage('assistant', '❌ 文件上传失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const question = inputValue.trim()
    addMessage('user', question)
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/document-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: question,
          history: messages.slice(-10) // 只发送最近10条消息作为上下文
        })
      })

      if (response.ok) {
        const data = await response.json()
        addMessage('assistant', data.response)
      } else {
        throw new Error('请求失败')
      }
    } catch (error) {
      addMessage('assistant', '抱歉，我暂时无法回答您的问题。请检查网络连接或稍后重试。')
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

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (showFileManager) {
    return (
      <div className="app">
        <div className="header">
          <h1>📁 文件管理</h1>
          <button 
            onClick={() => setShowFileManager(false)}
            className="back-btn"
          >
            ← 返回聊天
          </button>
        </div>
        <FileManager />
      </div>
    )
  }

  return (
    <div className="app">
      <div className="header">
        <h1>🤖 智能问答系统</h1>
        <p>基于 LangChain.js 的 RAG 架构文档问答助手</p>
        <button 
          onClick={() => setShowFileManager(true)}
          className="file-manager-btn"
        >
          <Settings size={16} />
          文件管理
        </button>
      </div>

      <div className="tab-container">
        <div className="tab-buttons">
          <button 
            className={`tab-btn ${activeTab === 'document' ? 'active' : ''}`}
            onClick={() => setActiveTab('document')}
          >
            <FileText size={16} />
            文档问答
          </button>
          <button 
            className={`tab-btn ${activeTab === 'database' ? 'active' : ''}`}
            onClick={() => setActiveTab('database')}
          >
            <Database size={16} />
            数据库查询
          </button>
          <button 
            className={`tab-btn ${activeTab === 'jenkins' ? 'active' : ''}`}
            onClick={() => setActiveTab('jenkins')}
          >
            <Monitor size={16} />
            Jenkins监控
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'document' ? (
            <div className="document-chat">
              <div className="chat-container">
                <div className="messages">
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
                          正在思考
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

                <div className="input-container">
                  {uploadedFiles.length > 0 && (
                    <div className="file-upload">
                      <div className="uploaded-files">
                        {uploadedFiles.map(file => (
                          <div key={file.id} className="uploaded-file">
                            <span className="file-name">{file.name}</span>
                            <span className="file-size">({formatFileSize(file.size)})</span>
                            <button 
                              className="remove-file-btn"
                              onClick={() => removeFile(file.id)}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button 
                        className="upload-btn"
                        onClick={uploadDocuments}
                        disabled={isLoading}
                      >
                        {isLoading ? '上传中...' : '上传文档'}
                      </button>
                    </div>
                  )}

                  <div className="input-form">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.md"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                    <button 
                      className="upload-file-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={18} />
                    </button>
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
                      placeholder="请输入您的问题..."
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
            </div>
          ) : activeTab === 'database' ? (
            <DatabaseChat />
          ) : (
            <JenkinsMonitor />
          )}
        </div>
      </div>
    </div>
  )
}

export default App