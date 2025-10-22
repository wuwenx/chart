const axios = require('axios')

// Jenkins配置
const jenkinsConfig = {
  url: 'https://jks.popfun.xyz',
  username: 'wuwenxiang', // 使用正确的Jenkins用户名
  token: '1151d55491677b7add0d5aa327b29425a1',
  jobName: 'test/web/web-mm-admin-new' // 根据您提供的路径
}

async function testJenkinsConnection() {
  console.log('🔧 测试Jenkins连接...')
  console.log(`URL: ${jenkinsConfig.url}`)
  console.log(`用户名: ${jenkinsConfig.username}`)
  console.log(`Token: ${jenkinsConfig.token.substring(0, 8)}...`)
  console.log(`任务: ${jenkinsConfig.jobName}`)
  console.log('')

  try {
    const auth = Buffer.from(`${jenkinsConfig.username}:${jenkinsConfig.token}`).toString('base64')
    
    // 测试根API
    console.log('1. 测试根API连接...')
    const rootResponse = await axios.get(`${jenkinsConfig.url}/api/json`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      },
      timeout: 10000,
      validateStatus: function (status) {
        return status < 500;
      }
    })
    
    console.log(`   状态码: ${rootResponse.status}`)
    console.log(`   内容类型: ${rootResponse.headers['content-type']}`)
    
    if (rootResponse.status === 200) {
      console.log('   ✅ 根API连接成功')
      console.log(`   Jenkins版本: ${rootResponse.data.version || '未知'}`)
    } else {
      console.log(`   ❌ 根API连接失败: ${rootResponse.status}`)
      if (rootResponse.data) {
        console.log(`   响应内容:`, JSON.stringify(rootResponse.data, null, 2))
      }
    }
    
    console.log('')
    
    // 测试任务API
    console.log('2. 测试任务API连接...')
    const jobPath = jenkinsConfig.jobName.replace(/\//g, '/job/')
    const jobUrl = `${jenkinsConfig.url}/job/${jobPath}/api/json`
    console.log(`   任务URL: ${jobUrl}`)
    
    const jobResponse = await axios.get(jobUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      },
      timeout: 10000,
      validateStatus: function (status) {
        return status < 500;
      }
    })
    
    console.log(`   状态码: ${jobResponse.status}`)
    console.log(`   内容类型: ${jobResponse.headers['content-type']}`)
    
    if (jobResponse.status === 200) {
      console.log('   ✅ 任务API连接成功')
      console.log(`   任务名称: ${jobResponse.data.name}`)
      console.log(`   任务描述: ${jobResponse.data.description || '无'}`)
      console.log(`   最后构建: ${jobResponse.data.lastBuild ? `#${jobResponse.data.lastBuild.number}` : '无'}`)
    } else if (jobResponse.status === 404) {
      console.log('   ❌ 任务不存在')
      console.log('   请检查任务路径是否正确')
    } else {
      console.log(`   ❌ 任务API连接失败: ${jobResponse.status}`)
      if (jobResponse.data) {
        console.log(`   响应内容:`, JSON.stringify(jobResponse.data, null, 2))
      }
    }
    
    console.log('')
    
    // 测试触发构建
    console.log('3. 测试触发构建...')
    const buildUrl = `${jenkinsConfig.url}/job/${jobPath}/build`
    console.log(`   构建URL: ${buildUrl}`)
    
    const buildResponse = await axios.post(buildUrl, {}, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      },
      timeout: 10000,
      validateStatus: function (status) {
        return status < 500;
      }
    })
    
    console.log(`   状态码: ${buildResponse.status}`)
    
    if (buildResponse.status === 200 || buildResponse.status === 201) {
      console.log('   ✅ 触发构建成功')
    } else if (buildResponse.status === 403) {
      console.log('   ❌ 没有权限触发构建')
    } else {
      console.log(`   ❌ 触发构建失败: ${buildResponse.status}`)
    }
    
  } catch (error) {
    console.error('❌ 连接测试失败:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   无法连接到Jenkins服务器，请检查URL是否正确')
    } else if (error.code === 'ENOTFOUND') {
      console.error('   Jenkins服务器地址无法解析，请检查URL是否正确')
    } else if (error.code === 'ETIMEDOUT') {
      console.error('   连接超时，请检查网络连接')
    }
  }
}

// 运行测试
testJenkinsConnection()
