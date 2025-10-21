// 测试 Google Gemini API Key
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai')
require('dotenv').config()

async function testGeminiAPI() {
  try {
    console.log('🔍 测试 Google Gemini API...')
    console.log('API Key:', process.env.GOOGLE_API_KEY ? '已配置' : '未配置')
    
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('Google API Key 未配置')
    }

    const llm = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY,
      modelName: 'gemini-1.5-flash',
      temperature: 0.7,
      maxOutputTokens: 100
    })

    console.log('📡 发送测试请求...')
    const response = await llm.invoke('你好，请简单回复"测试成功"')
    
    console.log('✅ API 测试成功!')
    console.log('回复:', response.content)
    
  } catch (error) {
    console.error('❌ API 测试失败:', error.message)
    console.error('详细错误:', error)
  }
}

testGeminiAPI()
