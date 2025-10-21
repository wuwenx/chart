const { PromptTemplate } = require('langchain/prompts')
const { LLMChain } = require('langchain/chains')
const { AIModelManager } = require('./aiModelManager')

class ChatService {
  constructor(vectorStore) {
    this.vectorStore = vectorStore
    this.aiManager = new AIModelManager()
    this.llm = this.aiManager.getLLM()
    
    this.setupPrompts()
  }

  setupPrompts() {
    // RAG 提示模板
    this.ragPrompt = new PromptTemplate({
      inputVariables: ['context', 'question', 'chat_history'],
      template: `你是一个智能助手，专门帮助用户回答关于内部文档和项目代码的问题。

请基于以下上下文信息回答用户的问题：

上下文信息：
{context}

聊天历史：
{chat_history}

用户问题：{question}

请遵循以下规则：
1. 基于提供的上下文信息回答问题
2. 如果上下文信息不足以回答问题，请明确说明
3. 回答要准确、简洁、有用
4. 如果涉及代码，请提供具体的代码示例
5. 使用中文回答
6. 如果问题与文档或代码无关，请礼貌地引导用户询问相关内容

回答：`
    })

    // 代码分析提示模板
    this.codeAnalysisPrompt = new PromptTemplate({
      inputVariables: ['code', 'question'],
      template: `你是一个专业的代码分析师，请分析以下代码并回答用户的问题：

代码：
{code}

用户问题：{question}

请提供：
1. 代码功能分析
2. 关键逻辑解释
3. 可能的改进建议
4. 相关的技术要点

使用中文回答，要专业且易懂。`
    })

    // 通用问答提示模板
    this.generalPrompt = new PromptTemplate({
      inputVariables: ['question', 'chat_history'],
      template: `你是一个友好的智能助手。请回答用户的问题：

聊天历史：
{chat_history}

用户问题：{question}

请用中文回答，要准确、有用且友好。如果问题超出了你的知识范围，请礼貌地说明。`
    })
  }

  async generateResponse(question, chatHistory = []) {
    try {
      // 首先尝试从向量存储中检索相关文档
      const relevantDocs = await this.vectorStore.similaritySearch(question, 5)
      
      if (relevantDocs.length > 0) {
        // 使用 RAG 模式回答
        return await this.generateRAGResponse(question, relevantDocs, chatHistory)
      } else {
        // 使用通用模式回答
        return await this.generateGeneralResponse(question, chatHistory)
      }
    } catch (error) {
      console.error('生成回答失败:', error)
      return '抱歉，我暂时无法回答您的问题。请稍后重试。'
    }
  }

  async generateRAGResponse(question, relevantDocs, chatHistory) {
    try {
      // 构建上下文
      const context = relevantDocs
        .map((doc, index) => {
          const source = doc.metadata?.source || '未知来源'
          const type = doc.metadata?.type || '文档'
          return `[${index + 1}] 来源：${source} (${type})\n内容：${doc.pageContent}\n`
        })
        .join('\n')

      // 格式化聊天历史
      const formattedHistory = chatHistory
        .slice(-5) // 只取最近5条
        .map(msg => `${msg.type === 'user' ? '用户' : '助手'}: ${msg.content}`)
        .join('\n')

      // 创建链
      const ragChain = new LLMChain({
        llm: this.llm,
        prompt: this.ragPrompt
      })

      const response = await ragChain.call({
        context,
        question,
        chat_history: formattedHistory || '无'
      })

      return response.text
    } catch (error) {
      console.error('RAG 回答生成失败:', error)
      return await this.generateGeneralResponse(question, chatHistory)
    }
  }

  async generateGeneralResponse(question, chatHistory) {
    try {
      const formattedHistory = chatHistory
        .slice(-3) // 只取最近3条
        .map(msg => `${msg.type === 'user' ? '用户' : '助手'}: ${msg.content}`)
        .join('\n')

      const generalChain = new LLMChain({
        llm: this.llm,
        prompt: this.generalPrompt
      })

      const response = await generalChain.call({
        question,
        chat_history: formattedHistory || '无'
      })

      return response.text
    } catch (error) {
      console.error('通用回答生成失败:', error)
      return '抱歉，我暂时无法回答您的问题。请检查网络连接或稍后重试。'
    }
  }

  async analyzeCode(code, question) {
    try {
      const codeChain = new LLMChain({
        llm: this.llm,
        prompt: this.codeAnalysisPrompt
      })

      const response = await codeChain.call({
        code,
        question
      })

      return response.text
    } catch (error) {
      console.error('代码分析失败:', error)
      return '抱歉，代码分析失败。请稍后重试。'
    }
  }

  // 获取相关文档摘要
  async getDocumentSummary(sourceName) {
    try {
      const docs = this.vectorStore.documents.filter(
        doc => doc.metadata?.source === sourceName
      )
      
      if (docs.length === 0) {
        return '未找到相关文档'
      }

      const summary = docs
        .slice(0, 3) // 只取前3个块
        .map(doc => doc.pageContent.substring(0, 200) + '...')
        .join('\n\n')

      return summary
    } catch (error) {
      console.error('获取文档摘要失败:', error)
      return '获取文档摘要失败'
    }
  }

  // 搜索特定类型的文档
  async searchByType(type, query, limit = 5) {
    try {
      const allDocs = this.vectorStore.documents.filter(
        doc => doc.metadata?.type === type
      )
      
      if (allDocs.length === 0) {
        return []
      }

      // 简单的文本匹配搜索
      const results = allDocs
        .filter(doc => 
          doc.pageContent.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, limit)

      return results
    } catch (error) {
      console.error('按类型搜索失败:', error)
      return []
    }
  }
}

module.exports = { ChatService }
