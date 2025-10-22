const axios = require('axios')

// Jenkins配置
const jenkinsConfig = {
  url: 'https://jks.popfun.xyz',
  username: 'wuwenxiang',
  token: '1151d55491677b7add0d5aa327b29425a1',
  jobName: 'test/web/web-mm-admin-new'
}

async function getJenkinsCrumb(username, token, jenkinsUrl) {
  try {
    const auth = Buffer.from(`${username}:${token}`).toString('base64')
    const response = await axios.get(`${jenkinsUrl}/crumbIssuer/api/json`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      },
      timeout: 10000,
      validateStatus: function (status) {
        return status < 500;
      }
    })
    
    if (response.status === 200) {
      return {
        crumbRequestField: response.data.crumbRequestField,
        crumb: response.data.crumb
      }
    }
    return null
  } catch (error) {
    console.log(`   获取CSRF Token失败: ${error.message}`)
    return null
  }
}

async function testJenkinsAPI() {
  console.log('🔧 测试Jenkins API...')
  console.log(`URL: ${jenkinsConfig.url}`)
  console.log(`用户名: ${jenkinsConfig.username}`)
  console.log(`Token: ${jenkinsConfig.token.substring(0, 8)}...`)
  console.log(`任务: ${jenkinsConfig.jobName}`)
  console.log('')

  const auth = Buffer.from(`${jenkinsConfig.username}:${jenkinsConfig.token}`).toString('base64')
  
  // 1. 测试根API连接
  console.log('1. 测试根API连接...')
  try {
    const response = await axios.get(`${jenkinsConfig.url}/api/json`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      },
      timeout: 10000,
      validateStatus: function (status) {
        return status < 500;
      }
    })
    
    console.log(`   状态码: ${response.status}`)
    console.log(`   内容类型: ${response.headers['content-type']}`)
    
    if (response.status === 200) {
      console.log('   ✅ 根API连接成功')
      console.log(`   Jenkins版本: ${response.data.version || '未知'}`)
      console.log(`   Jenkins模式: ${response.data.mode || '未知'}`)
    } else {
      console.log(`   ❌ 根API连接失败: ${response.status}`)
      if (response.data) {
        console.log(`   响应内容:`, JSON.stringify(response.data, null, 2))
      }
      return
    }
  } catch (error) {
    console.log(`   ❌ 根API连接失败: ${error.message}`)
    return
  }
  
  console.log('')

  // 2. 获取CSRF Token
  console.log('2. 获取CSRF Token...')
  const crumb = await getJenkinsCrumb(jenkinsConfig.username, jenkinsConfig.token, jenkinsConfig.url)
  if (crumb) {
    console.log('   ✅ CSRF Token获取成功')
    console.log(`   Crumb字段: ${crumb.crumbRequestField}`)
    console.log(`   Crumb值: ${crumb.crumb.substring(0, 16)}...`)
  } else {
    console.log('   ⚠️  CSRF Token获取失败，可能不需要CSRF保护')
  }
  
  console.log('')

  // 3. 测试任务API连接
  console.log('3. 测试任务API连接...')
  try {
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
      console.log(`   最后成功构建: ${jobResponse.data.lastSuccessfulBuild ? `#${jobResponse.data.lastSuccessfulBuild.number}` : '无'}`)
    } else if (jobResponse.status === 404) {
      console.log('   ❌ 任务不存在')
      console.log('   请检查任务路径是否正确')
    } else {
      console.log(`   ❌ 任务API连接失败: ${jobResponse.status}`)
      if (jobResponse.data) {
        console.log(`   响应内容:`, JSON.stringify(jobResponse.data, null, 2))
      }
    }
  } catch (error) {
    console.log(`   ❌ 任务API连接失败: ${error.message}`)
  }
  
  console.log('')

  // 4. 测试触发构建
  console.log('4. 测试触发构建...')
  try {
    const jobPath = jenkinsConfig.jobName.replace(/\//g, '/job/')
    const buildUrl = `${jenkinsConfig.url}/job/${jobPath}/build`
    console.log(`   构建URL: ${buildUrl}`)
    
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json'
    }
    
    // 如果有CSRF Token，添加到请求头
    if (crumb) {
      headers[crumb.crumbRequestField] = crumb.crumb
      console.log('   使用CSRF Token进行请求')
    }
    
    const buildResponse = await axios.post(buildUrl, {}, {
      headers: headers,
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
      if (buildResponse.data) {
        console.log(`   响应内容:`, JSON.stringify(buildResponse.data, null, 2))
      }
    }
  } catch (error) {
    console.log(`   ❌ 触发构建失败: ${error.message}`)
  }
  
  console.log('')

  // 5. 测试获取构建日志
  console.log('5. 测试获取构建日志...')
  try {
    const jobPath = jenkinsConfig.jobName.replace(/\//g, '/job/')
    const logUrl = `${jenkinsConfig.url}/job/${jobPath}/lastBuild/consoleText`
    console.log(`   日志URL: ${logUrl}`)
    
    const logResponse = await axios.get(logUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'text/plain'
      },
      timeout: 10000,
      validateStatus: function (status) {
        return status < 500;
      }
    })
    
    console.log(`   状态码: ${logResponse.status}`)
    
    if (logResponse.status === 200) {
      console.log('   ✅ 获取构建日志成功')
      const logContent = logResponse.data.toString()
      console.log(`   日志长度: ${logContent.length} 字符`)
      console.log(`   日志预览: ${logContent.substring(0, 200)}...`)
    } else {
      console.log(`   ❌ 获取构建日志失败: ${logResponse.status}`)
    }
  } catch (error) {
    console.log(`   ❌ 获取构建日志失败: ${error.message}`)
  }
  
  console.log('')
  
  // 6. 检查Token格式
  console.log('6. 检查Token格式...')
  console.log(`   Token长度: ${jenkinsConfig.token.length}`)
  console.log(`   Token格式: ${/^[a-f0-9]{32}$/i.test(jenkinsConfig.token) ? '✅ 正确' : '❌ 可能不正确'}`)
  
  console.log('')
  
  // 提供解决建议
  console.log('💡 解决建议:')
  console.log('   1. 如果认证失败，请检查用户名和API Token')
  console.log('   2. 如果任务不存在，请检查任务路径是否正确')
  console.log('   3. 如果权限不足，请联系Jenkins管理员')
  console.log('   4. 如果CSRF Token获取失败，Jenkins可能禁用了CSRF保护')
}

// 运行测试
testJenkinsAPI()