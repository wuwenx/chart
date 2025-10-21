const { ChatOpenAI } = require('@langchain/openai')
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai')
const { OpenAIEmbeddings } = require('@langchain/openai')

class AIModelManager {
  constructor() {
    this.provider = process.env.AI_MODEL_PROVIDER || 'gemini'
    this.llm = null
    this.embeddings = null
    this.initializeModels()
  }

  initializeModels() {
    try {
      switch (this.provider.toLowerCase()) {
        case 'openai':
          this.initializeOpenAI()
          break
        case 'gemini':
          this.initializeGemini()
          break
        default:
          console.log('⚠️ 未识别的模型提供商，默认使用 Gemini')
          this.initializeGemini()
      }
      console.log(`✅ AI 模型初始化完成: ${this.provider}`)
    } catch (error) {
      console.error('❌ AI 模型初始化失败:', error.message)
      throw error
    }
  }

  initializeOpenAI() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API Key 未配置')
    }

    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1000
    })

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-ada-002'
    })
  }

  initializeGemini() {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('Google API Key 未配置')
    }

    this.llm = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY,
      modelName: 'gemini-2.0-flash-001',
      temperature: 0.7,
      maxOutputTokens: 1000
    })

    // Gemini 使用 OpenAI 的嵌入模型（因为 Gemini 没有专门的嵌入模型）
    // 或者我们可以使用一个简单的文本嵌入替代方案
    this.embeddings = new SimpleTextEmbeddings()
  }

  getLLM() {
    if (!this.llm) {
      throw new Error('LLM 模型未初始化')
    }
    return this.llm
  }

  getEmbeddings() {
    if (!this.embeddings) {
      throw new Error('嵌入模型未初始化')
    }
    return this.embeddings
  }

  getProvider() {
    return this.provider
  }

  // 获取模型信息
  getModelInfo() {
    return {
      provider: this.provider,
      llmModel: this.provider === 'openai' ? 'gpt-3.5-turbo' : 'gemini-2.0-flash-001',
      embeddingsModel: this.provider === 'openai' ? 'text-embedding-ada-002' : 'simple-text',
      status: this.llm ? 'ready' : 'not_initialized'
    }
  }
}

// 简单的文本嵌入实现（用于 Gemini）
class SimpleTextEmbeddings {
  constructor() {
    console.log('📝 使用简单文本嵌入模型（适用于 Gemini）')
  }

  async embedDocuments(texts) {
    // 简单的文本向量化实现
    // 在实际应用中，您可能需要使用更复杂的嵌入方法
    return texts.map(text => this.textToVector(text))
  }

  async embedQuery(text) {
    return this.textToVector(text)
  }

  textToVector(text) {
    // 简单的文本向量化：基于字符频率
    const vector = new Array(384).fill(0) // 384 维向量
    const normalizedText = text.toLowerCase().replace(/[^a-z0-9\s]/g, '')
    
    for (let i = 0; i < normalizedText.length; i++) {
      const charCode = normalizedText.charCodeAt(i)
      const index = charCode % 384
      vector[index] += 1
    }
    
    // 归一化向量
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
    return vector.map(val => magnitude > 0 ? val / magnitude : 0)
  }
}

module.exports = { AIModelManager }
