// 简单的 Gemini API 测试
const https = require('https')
require('dotenv').config()

const apiKey = process.env.GOOGLE_API_KEY
console.log('API Key:', apiKey ? '已配置' : '未配置')

if (!apiKey) {
  console.error('❌ API Key 未配置')
  process.exit(1)
}

const data = JSON.stringify({
  contents: [{
    parts: [{
      text: "Hello"
    }]
  }]
})

const options = {
  hostname: 'generativelanguage.googleapis.com',
  port: 443,
  path: `/v1beta/models/gemini-2.0-flash-001:generateContent?key=${apiKey}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}

console.log('📡 发送请求到 Gemini API...')

const req = https.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`)
  
  let responseData = ''
  
  res.on('data', (chunk) => {
    responseData += chunk
  })
  
  res.on('end', () => {
    try {
      const response = JSON.parse(responseData)
      if (response.error) {
        console.error('❌ API 错误:', response.error.message)
      } else {
        console.log('✅ API 调用成功!')
        console.log('回复:', response.candidates[0].content.parts[0].text)
      }
    } catch (error) {
      console.error('❌ 解析响应失败:', error.message)
      console.log('原始响应:', responseData)
    }
  })
})

req.on('error', (error) => {
  console.error('❌ 请求失败:', error.message)
})

req.write(data)
req.end()
