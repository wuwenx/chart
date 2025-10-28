import React, { useState, useEffect } from 'react'
import { Play, Pause, Settings, Bell, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react'

const JenkinsMonitor = () => {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [jenkinsConfig, setJenkinsConfig] = useState({
    url: 'https://jks.popfun.xyz',
    username: 'wuwenxiang',
    token: '1151d55491677b7add0d5aa327b29425a1',
    jobName: 'test/web/web-mm-admin-new',
    webhookUrl: ''
  })
  const [feishuConfig, setFeishuConfig] = useState({
    webhookUrl: '',
    secret: '',
    apiConfig: {
      accessToken: '',
      receiveId: '',
      receiveIdType: 'open_id'
    }
  })
  const [logs, setLogs] = useState([])
  const [buildStatus, setBuildStatus] = useState('idle') // idle, building, success, failure
  const [lastBuildInfo, setLastBuildInfo] = useState(null)
  const [cicdStatus, setCicdStatus] = useState({ isProcessing: false, currentRetry: 0, maxRetries: 3 })

  // 获取配置
  useEffect(() => {
    fetchJenkinsConfig()
    fetchFeishuConfig()
    fetchLogs()
    fetchCICDStatus()
  }, [])

  const fetchJenkinsConfig = async () => {
    try {
      const response = await fetch('/api/jenkins/config')
      if (response.ok) {
        const config = await response.json()
        // 只更新非敏感字段，保留现有的token
        setJenkinsConfig(prevConfig => ({
          ...prevConfig,
          url: config.url || prevConfig.url,
          username: config.username || prevConfig.username,
          jobName: config.jobName || prevConfig.jobName,
          webhookUrl: config.webhookUrl || prevConfig.webhookUrl
          // 保留现有的token，不覆盖
        }))
      }
    } catch (error) {
      console.error('获取Jenkins配置失败:', error)
    }
  }

  const fetchFeishuConfig = async () => {
    try {
      const response = await fetch('/api/feishu/config')
      if (response.ok) {
        const config = await response.json()
        // 确保apiConfig字段存在
        setFeishuConfig({
          webhookUrl: config.webhookUrl || '',
          secret: config.secret || '',
          apiConfig: {
            accessToken: config.apiConfig?.accessToken || '',
            receiveId: config.apiConfig?.receiveId || '',
            receiveIdType: config.apiConfig?.receiveIdType || 'open_id'
          }
        })
      }
    } catch (error) {
      console.error('获取飞书配置失败:', error)
    }
  }

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/jenkins/logs')
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
        setLastBuildInfo(data.lastBuildInfo)
        setBuildStatus(data.buildStatus || 'idle')
        setIsMonitoring(data.isMonitoring || false)
      }
    } catch (error) {
      console.error('获取日志失败:', error)
    }
  }

  const saveJenkinsConfig = async () => {
    try {
      const response = await fetch('/api/jenkins/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jenkinsConfig)
      })
      
      if (response.ok) {
        alert('Jenkins配置保存成功！')
      } else {
        throw new Error('保存失败')
      }
    } catch (error) {
      alert('保存Jenkins配置失败: ' + error.message)
    }
  }

  const saveFeishuConfig = async () => {
    try {
      const response = await fetch('/api/feishu/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(feishuConfig)
      })
      
      if (response.ok) {
        alert('飞书配置保存成功！')
      } else {
        throw new Error('保存失败')
      }
    } catch (error) {
      alert('保存飞书配置失败: ' + error.message)
    }
  }

  const testJenkinsConnection = async () => {
    try {
      if (!jenkinsConfig.token) {
        alert('请先输入API Token！')
        return
      }
      
      const response = await fetch('/api/jenkins/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jenkinsConfig)
      })
      
      const result = await response.json()
      if (result.success) {
        alert('Jenkins连接测试成功！')
      } else {
        let errorMessage = `Jenkins连接测试失败: ${result.message}`
        
        if (result.suggestions && result.suggestions.length > 0) {
          errorMessage += '\n\n解决建议:\n' + result.suggestions.map(s => `• ${s}`).join('\n')
        }
        
        alert(errorMessage)
      }
    } catch (error) {
      alert('Jenkins连接测试失败: ' + error.message)
    }
  }

  const testFeishuConnection = async () => {
    try {
      const response = await fetch('/api/feishu/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(feishuConfig)
      })
      
      const result = await response.json()
      if (result.success) {
        alert('飞书连接测试成功！')
      } else {
        alert('飞书连接测试失败: ' + result.message)
      }
    } catch (error) {
      alert('飞书连接测试失败: ' + error.message)
    }
  }

  const startMonitoring = async () => {
    try {
      const response = await fetch('/api/jenkins/monitor/start', {
        method: 'POST'
      })
      
      const result = await response.json()
      if (result.success) {
        setIsMonitoring(true)
        alert('监控已启动！')
      } else {
        alert('启动监控失败: ' + result.message)
      }
    } catch (error) {
      alert('启动监控失败: ' + error.message)
    }
  }

  const stopMonitoring = async () => {
    try {
      const response = await fetch('/api/jenkins/monitor/stop', {
        method: 'POST'
      })
      
      const result = await response.json()
      if (result.success) {
        setIsMonitoring(false)
        alert('监控已停止！')
      } else {
        alert('停止监控失败: ' + result.message)
      }
    } catch (error) {
      alert('停止监控失败: ' + error.message)
    }
  }

  const triggerBuild = async () => {
    try {
      const response = await fetch('/api/jenkins/build/trigger', {
        method: 'POST'
      })
      
      const result = await response.json()
      if (result.success) {
        alert('构建已触发！')
        fetchLogs() // 刷新日志
      } else {
        alert('触发构建失败: ' + result.message)
      }
    } catch (error) {
      alert('触发构建失败: ' + error.message)
    }
  }

  const triggerCICD = async () => {
    try {
      const response = await fetch('/api/cicd/trigger', {
        method: 'POST'
      })
      
      const result = await response.json()
      if (result.success) {
        alert('CI/CD流程已启动！')
        fetchCICDStatus() // 刷新CI/CD状态
        fetchLogs() // 刷新日志
      } else {
        alert('启动CI/CD失败: ' + result.message)
      }
    } catch (error) {
      alert('启动CI/CD失败: ' + error.message)
    }
  }

  const fetchCICDStatus = async () => {
    try {
      const response = await fetch('/api/cicd/status')
      if (response.ok) {
        const data = await response.json()
        setCicdStatus(data.status)
      }
    } catch (error) {
      console.error('获取CI/CD状态失败:', error)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="status-icon success" size={20} />
      case 'failure':
        return <AlertTriangle className="status-icon failure" size={20} />
      case 'building':
        return <Clock className="status-icon building" size={20} />
      default:
        return <Clock className="status-icon idle" size={20} />
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'success':
        return '构建成功'
      case 'failure':
        return '构建失败'
      case 'building':
        return '构建中'
      default:
        return '空闲'
    }
  }

  return (
    <div className="jenkins-monitor">
      <div className="monitor-header">
        <h2>🔧 Jenkins 监控系统</h2>
        <div className="monitor-controls">
          <button 
            className={`control-btn ${isMonitoring ? 'stop' : 'start'}`}
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
          >
            {isMonitoring ? <Pause size={16} /> : <Play size={16} />}
            {isMonitoring ? '停止监控' : '开始监控'}
          </button>
          <button 
            className="control-btn trigger"
            onClick={triggerBuild}
            disabled={!jenkinsConfig.jobName}
          >
            <RefreshCw size={16} />
            触发构建
          </button>
          <button 
            className="control-btn cicd"
            onClick={triggerCICD}
            disabled={!jenkinsConfig.jobName}
          >
            <RefreshCw size={16} />
            启动CI/CD
          </button>
        </div>
      </div>

      <div className="monitor-content">
        <div className="config-section">
          <div className="config-card">
            <div className="config-header">
              <Settings size={20} />
              <h3>Jenkins 配置</h3>
            </div>
            <div className="jenkins-config-form">
              <div className="jenkins-form-group">
                <label>Jenkins URL:</label>
                <input
                  type="text"
                  value={jenkinsConfig.url}
                  onChange={(e) => setJenkinsConfig({...jenkinsConfig, url: e.target.value})}
                  placeholder="http://jenkins.example.com"
                />
              </div>
              <div className="jenkins-form-group">
                <label>用户名:</label>
                <input
                  type="text"
                  value={jenkinsConfig.username}
                  onChange={(e) => setJenkinsConfig({...jenkinsConfig, username: e.target.value})}
                  placeholder="jenkins用户名"
                />
              </div>
              <div className="jenkins-form-group">
                <label>API Token:</label>
                <input
                  type="password"
                  value={jenkinsConfig.token}
                  onChange={(e) => setJenkinsConfig({...jenkinsConfig, token: e.target.value})}
                  placeholder="Jenkins API Token"
                />
              </div>
              <div className="jenkins-form-group">
                <label>任务名称:</label>
                <input
                  type="text"
                  value={jenkinsConfig.jobName}
                  onChange={(e) => setJenkinsConfig({...jenkinsConfig, jobName: e.target.value})}
                  placeholder="要监控的Jenkins任务名称"
                />
              </div>
              <div className="jenkins-form-actions">
                <button onClick={saveJenkinsConfig} className="jenkins-save-btn">
                  保存配置
                </button>
                <button onClick={testJenkinsConnection} className="jenkins-test-btn">
                  测试连接
                </button>
              </div>
            </div>
          </div>

          <div className="config-card">
            <div className="config-header">
              <Bell size={20} />
              <h3>飞书通知配置</h3>
            </div>
            <div className="jenkins-config-form">
              <div className="config-section">
                <h4>方式一：Webhook（推荐用于群聊）</h4>
                <div className="jenkins-form-group">
                  <label>飞书 Webhook URL:</label>
                  <input
                    type="text"
                    value={feishuConfig.webhookUrl}
                    onChange={(e) => setFeishuConfig({...feishuConfig, webhookUrl: e.target.value})}
                    placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                  />
                </div>
                <div className="jenkins-form-group">
                  <label>签名密钥:</label>
                  <input
                    type="password"
                    value={feishuConfig.secret}
                    onChange={(e) => setFeishuConfig({...feishuConfig, secret: e.target.value})}
                    placeholder="飞书机器人签名密钥"
                  />
                </div>
              </div>
              
              <div className="config-section">
                <h4>方式二：开放平台API（推荐用于私聊）</h4>
                <div className="jenkins-form-group">
                  <label>Access Token:</label>
                  <input
                    type="password"
                    value={feishuConfig.apiConfig.accessToken}
                    onChange={(e) => setFeishuConfig({
                      ...feishuConfig, 
                      apiConfig: {...feishuConfig.apiConfig, accessToken: e.target.value}
                    })}
                    placeholder="t-g207ao95GIXKA42GE2DFLT355SXX4FRVJJXBPHJL"
                  />
                </div>
                <div className="jenkins-form-group">
                  <label>接收者ID:</label>
                  <input
                    type="text"
                    value={feishuConfig.apiConfig.receiveId}
                    onChange={(e) => setFeishuConfig({
                      ...feishuConfig, 
                      apiConfig: {...feishuConfig.apiConfig, receiveId: e.target.value}
                    })}
                    placeholder="ou_02901dcb31a01969258ced02bcadd1a6"
                  />
                </div>
                <div className="jenkins-form-group">
                  <label>接收者ID类型:</label>
                  <select
                    value={feishuConfig.apiConfig.receiveIdType}
                    onChange={(e) => setFeishuConfig({
                      ...feishuConfig, 
                      apiConfig: {...feishuConfig.apiConfig, receiveIdType: e.target.value}
                    })}
                  >
                    <option value="open_id">open_id</option>
                    <option value="user_id">user_id</option>
                    <option value="union_id">union_id</option>
                    <option value="email">email</option>
                    <option value="chat_id">chat_id</option>
                  </select>
                </div>
              </div>
              
              <div className="jenkins-form-actions">
                <button onClick={saveFeishuConfig} className="jenkins-save-btn">
                  保存配置
                </button>
                <button onClick={testFeishuConnection} className="jenkins-test-btn">
                  测试通知
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="status-section">
          <div className="status-card">
            <div className="status-header">
              <h3>构建状态</h3>
              <div className="status-indicator">
                {getStatusIcon(buildStatus)}
                <span className={`status-text ${buildStatus}`}>
                  {getStatusText(buildStatus)}
                </span>
              </div>
            </div>
            {lastBuildInfo && (
              <div className="build-info">
                <div className="info-item">
                  <strong>最后构建:</strong> #{lastBuildInfo.number}
                </div>
                <div className="info-item">
                  <strong>构建时间:</strong> {new Date(lastBuildInfo.timestamp).toLocaleString()}
                </div>
                <div className="info-item">
                  <strong>持续时间:</strong> {lastBuildInfo.duration}ms
                </div>
                <div className="info-item">
                  <strong>构建者:</strong> {lastBuildInfo.builder || 'N/A'}
                </div>
              </div>
            )}
          </div>

          <div className="cicd-card">
            <div className="cicd-header">
              <h3>CI/CD 状态</h3>
              <button onClick={fetchCICDStatus} className="refresh-btn">
                <RefreshCw size={16} />
                刷新
              </button>
            </div>
            <div className="cicd-content">
              <div className="cicd-status">
                <div className="status-item">
                  <strong>处理状态:</strong> 
                  <span className={cicdStatus.isProcessing ? 'processing' : 'idle'}>
                    {cicdStatus.isProcessing ? '进行中' : '空闲'}
                  </span>
                </div>
                <div className="status-item">
                  <strong>重试次数:</strong> {cicdStatus.currentRetry}/{cicdStatus.maxRetries}
                </div>
                {cicdStatus.isProcessing && (
                  <div className="status-item">
                    <strong>进度:</strong> 
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${(cicdStatus.currentRetry / cicdStatus.maxRetries) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="logs-card">
            <div className="logs-header">
              <h3>监控日志</h3>
              <button onClick={fetchLogs} className="refresh-btn">
                <RefreshCw size={16} />
                刷新
              </button>
            </div>
            <div className="logs-content">
              {logs.length === 0 ? (
                <div className="no-logs">暂无日志记录</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className={`log-item ${log.level}`}>
                    <div className="log-timestamp">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                    <div className="log-message">
                      {log.message}
                    </div>
                    {log.details && (
                      <div className="log-details">
                        {log.details}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JenkinsMonitor
