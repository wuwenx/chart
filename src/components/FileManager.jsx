import React, { useState, useEffect } from 'react'
import { Trash2, RefreshCw, FileText, Upload } from 'lucide-react'

const FileManager = () => {
  const [documents, setDocuments] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/documents')
      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (error) {
      console.error('获取文档列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/code-stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('获取统计信息失败:', error)
    }
  }

  const deleteDocument = async (filename) => {
    if (!confirm(`确定要删除文件 "${filename}" 吗？`)) {
      return
    }

    try {
      setDeleting(filename)
      const response = await fetch(`/api/documents/${encodeURIComponent(filename)}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await fetchDocuments()
        await fetchStats()
        alert('文件删除成功！')
      } else {
        throw new Error('删除失败')
      }
    } catch (error) {
      console.error('删除文档失败:', error)
      alert('删除失败，请重试')
    } finally {
      setDeleting(null)
    }
  }

  useEffect(() => {
    fetchDocuments()
    fetchStats()
  }, [])

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  const getFileType = (filename) => {
    const ext = filename.split('.').pop()?.toUpperCase()
    return ext || '未知'
  }

  return (
    <div className="file-manager">
      <div className="file-manager-header">
        <h2>📁 文件管理</h2>
        <button 
          onClick={() => { fetchDocuments(); fetchStats(); }}
          disabled={loading}
          className="refresh-btn"
        >
          <RefreshCw size={16} />
          刷新
        </button>
      </div>

      {stats && (
        <div className="stats-card">
          <div className="stat-item">
            <span className="stat-label">总文档块:</span>
            <span className="stat-value">{stats.totalDocuments}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">文档文件:</span>
            <span className="stat-value">{stats.documentDocuments}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">代码文件:</span>
            <span className="stat-value">{stats.codeDocuments}</span>
          </div>
        </div>
      )}

      <div className="file-list">
        {loading ? (
          <div className="loading">加载中...</div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <p>暂无上传的文件</p>
            <p className="empty-hint">上传文档后，它们会出现在这里</p>
          </div>
        ) : (
          documents.map((doc, index) => (
            <div key={index} className="file-item">
              <div className="file-info">
                <div className="file-name">
                  <FileText size={16} />
                  {doc.name}
                </div>
                <div className="file-details">
                  <span className="file-type">{getFileType(doc.name)}</span>
                  <span className="file-chunks">{doc.chunks} 块</span>
                  <span className="file-date">{formatDate(doc.lastUpdated)}</span>
                </div>
              </div>
              <button
                onClick={() => deleteDocument(doc.name)}
                disabled={deleting === doc.name}
                className="delete-btn"
                title="删除文件"
              >
                {deleting === doc.name ? (
                  <RefreshCw size={16} className="spinning" />
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .file-manager {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .file-manager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .file-manager-header h2 {
          margin: 0;
          color: #333;
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        .refresh-btn:hover {
          background: #0056b3;
        }

        .refresh-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .stats-card {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          display: flex;
          gap: 24px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stat-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 18px;
          font-weight: bold;
          color: #333;
        }

        .file-list {
          background: white;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          overflow: hidden;
        }

        .file-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #e9ecef;
        }

        .file-item:last-child {
          border-bottom: none;
        }

        .file-info {
          flex: 1;
        }

        .file-name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
          color: #333;
          margin-bottom: 4px;
        }

        .file-details {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: #666;
        }

        .file-type {
          background: #e3f2fd;
          color: #1976d2;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .delete-btn {
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .delete-btn:hover {
          background: #c82333;
        }

        .delete-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #666;
        }

        .empty-state svg {
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-hint {
          font-size: 14px;
          margin-top: 8px;
          opacity: 0.7;
        }
      `}</style>
    </div>
  )
}

export default FileManager
