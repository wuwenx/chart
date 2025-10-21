const fs = require('fs')
const path = require('path')
const { MemoryVectorStore } = require('langchain/vectorstores/memory')
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter')
const { AIModelManager } = require('./aiModelManager')

class VectorStore {
  constructor() {
    this.aiManager = new AIModelManager()
    this.embeddings = this.aiManager.getEmbeddings()
    this.vectorStore = null
    this.documents = []
    this.vectorStorePath = process.env.VECTOR_STORE_PATH || './vectorstore'
    this.initializeVectorStore()
  }

  async initializeVectorStore() {
    try {
      // 尝试加载现有的向量存储
      await this.loadVectorStore()
      console.log('✅ 向量存储初始化完成')
    } catch (error) {
      console.log('⚠️ 创建新的向量存储')
      this.vectorStore = new MemoryVectorStore(this.embeddings)
    }
  }

  async addDocuments(documents) {
    try {
      // 文本分割
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
        separators: ['\n\n', '\n', ' ', '']
      })

      const splitDocs = await textSplitter.splitDocuments(documents)
      
      // 添加到向量存储
      if (!this.vectorStore) {
        this.vectorStore = new MemoryVectorStore(this.embeddings)
      }
      
      await this.vectorStore.addDocuments(splitDocs)
      this.documents.push(...splitDocs)
      
      // 保存向量存储
      await this.saveVectorStore()
      
      console.log(`✅ 成功添加 ${splitDocs.length} 个文档块到向量存储`)
      return splitDocs.length
    } catch (error) {
      console.error('添加文档到向量存储失败:', error)
      throw error
    }
  }

  async similaritySearch(query, k = 5) {
    try {
      if (!this.vectorStore) {
        return []
      }
      
      const results = await this.vectorStore.similaritySearch(query, k)
      return results
    } catch (error) {
      console.error('相似性搜索失败:', error)
      return []
    }
  }

  async similaritySearchWithScore(query, k = 5) {
    try {
      if (!this.vectorStore) {
        return []
      }
      
      const results = await this.vectorStore.similaritySearchWithScore(query, k)
      return results
    } catch (error) {
      console.error('带分数的相似性搜索失败:', error)
      return []
    }
  }

  async getDocumentList() {
    try {
      const uniqueSources = new Set()
      this.documents.forEach(doc => {
        if (doc.metadata && doc.metadata.source) {
          uniqueSources.add(doc.metadata.source)
        }
      })
      
      return Array.from(uniqueSources).map(source => ({
        name: source,
        chunks: this.documents.filter(doc => doc.metadata?.source === source).length,
        lastUpdated: new Date().toISOString()
      }))
    } catch (error) {
      console.error('获取文档列表失败:', error)
      return []
    }
  }

  async deleteDocument(sourceName) {
    try {
      // 从文档列表中移除
      this.documents = this.documents.filter(doc => doc.metadata?.source !== sourceName)
      
      // 重新创建向量存储
      if (this.documents.length > 0) {
        this.vectorStore = new MemoryVectorStore(this.embeddings)
        await this.vectorStore.addDocuments(this.documents)
      } else {
        this.vectorStore = null
      }
      
      // 保存更新
      await this.saveVectorStore()
      
      console.log(`✅ 成功删除文档: ${sourceName}`)
    } catch (error) {
      console.error('删除文档失败:', error)
      throw error
    }
  }

  async saveVectorStore() {
    try {
      if (!fs.existsSync(this.vectorStorePath)) {
        fs.mkdirSync(this.vectorStorePath, { recursive: true })
      }
      
      const data = {
        documents: this.documents.map(doc => ({
          pageContent: doc.pageContent,
          metadata: doc.metadata
        })),
        timestamp: new Date().toISOString()
      }
      
      const filePath = path.join(this.vectorStorePath, 'vectorstore.json')
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
      
      console.log('✅ 向量存储已保存')
    } catch (error) {
      console.error('保存向量存储失败:', error)
    }
  }

  async loadVectorStore() {
    try {
      const filePath = path.join(this.vectorStorePath, 'vectorstore.json')
      
      if (!fs.existsSync(filePath)) {
        throw new Error('向量存储文件不存在')
      }
      
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      
      // 重建文档对象
      this.documents = data.documents.map(docData => ({
        pageContent: docData.pageContent,
        metadata: docData.metadata
      }))
      
      // 重建向量存储
      if (this.documents.length > 0) {
        this.vectorStore = new MemoryVectorStore(this.embeddings)
        await this.vectorStore.addDocuments(this.documents)
      }
      
      console.log(`✅ 成功加载 ${this.documents.length} 个文档块`)
    } catch (error) {
      console.error('加载向量存储失败:', error)
      throw error
    }
  }

  // 获取统计信息
  getStats() {
    return {
      totalDocuments: this.documents.length,
      uniqueSources: new Set(this.documents.map(doc => doc.metadata?.source)).size,
      lastUpdated: new Date().toISOString()
    }
  }
}

module.exports = { VectorStore }
