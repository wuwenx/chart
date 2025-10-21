import React, { useState, useRef, useEffect } from 'react'
import { Send, Upload, X, Bot, User } from 'lucide-react'

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
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
      formData.append('documents', file.file)
    })

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        addMessage('assistant', `成功上传 ${uploadedFiles.length} 个文档！现在您可以询问关于这些文档的问题。`)
        setUploadedFiles([])
      } else {
        throw new Error('上传失败')
      }
    } catch (error) {
      addMessage('assistant', '文档上传失败，请重试。')
    } finally {
      setIsLoading(false)
    }
  }

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

    const userMessage = inputValue.trim()
    setInputValue('')
    addMessage('user', userMessage)
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage,
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

  return (
    <div className="app">
      <div className="header">
        <h1>🤖 智能问答系统</h1>
        <p>基于 LangChain.js 的 RAG 架构文档问答助手</p>
      </div>

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
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="file-tag">
                    {file.name} ({formatFileSize(file.size)})
                    <button onClick={() => removeFile(file.id)}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <button 
                onClick={uploadDocuments}
                disabled={isLoading}
                className="send-button"
                style={{ borderRadius: '8px', width: 'auto', padding: '8px 16px' }}
              >
                上传文档
              </button>
            </div>
          )}

          <div className="input-form">
            <div className="file-upload">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.md"
                onChange={handleFileUpload}
                id="file-upload"
              />
              <label htmlFor="file-upload" className="file-upload-label">
                <Upload size={16} />
                上传文档
              </label>
            </div>
            
            <textarea
              className="input-field"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入您的问题..."
              rows={1}
            />
            <button
              className="send-button"
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

export default App
