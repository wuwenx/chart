const axios = require('axios')

// Jenkins配置
const jenkinsConfig = {
  url: 'https://jks.popfun.xyz',
  username: 'wuwenxiang',
  token: '1151d55491677b7add0d5aa327b29425a1',
  jobName: 'test/web/web-mm-admin-new'
}

async function testJenkinsBuild() {
  console.log('🔧 测试Jenkins构建触发...')
  console.log(`URL: ${jenkinsConfig.url}`)
  console.log(`用户名: ${jenkinsConfig.username}`)
  console.log(`任务: ${jenkinsConfig.jobName}`)
  console.log('')

  const auth = Buffer.from(`${jenkinsConfig.username}:${jenkinsConfig.token}`).toString('base64')
  
  try {
    // 1. 获取CSRF Token
    console.log('1. 获取CSRF Token...')
    const crumbResponse = await axios.get(`${jenkinsConfig.url}/crumbIssuer/api/json`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      },
      timeout: 10000,
      validateStatus: function (status) {
        return status < 500;
      }
    })
    
    if (crumbResponse.status !== 200) {
      console.log('   ❌ 获取CSRF Token失败')
      return
    }
    
    const crumb = crumbResponse.data
    console.log('   ✅ CSRF Token获取成功')
    console.log(`   Crumb字段: ${crumb.crumbRequestField}`)
    console.log(`   Crumb值: ${crumb.crumb.substring(0, 16)}...`)
    console.log('')

    // 2. 触发构建
    console.log('2. 触发构建...')
    const jobPath = jenkinsConfig.jobName.replace(/\//g, '/job/')
    const buildUrl = `${jenkinsConfig.url}/job/${jobPath}/build`
    console.log(`   构建URL: ${buildUrl}`)
    
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    }
    
    // 添加CSRF Token
    headers[crumb.crumbRequestField] = crumb.crumb
    
    const buildResponse = await axios.post(buildUrl, null, {
      headers: headers,
      timeout: 10000,
      validateStatus: function (status) {
        return status < 500;
      }
    })
    
    console.log(`   状态码: ${buildResponse.status}`)
    
    if (buildResponse.status === 200 || buildResponse.status === 201) {
      console.log('   ✅ 触发构建成功')
    } else if (buildResponse.status === 400) {
      console.log('   ❌ 触发构建失败: 400 Bad Request')
      if (buildResponse.data) {
        console.log(`   响应内容:`, JSON.stringify(buildResponse.data, null, 2))
      }
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
  
  // 3. 检查任务状态
  console.log('3. 检查任务状态...')
  try {
    const jobPath = jenkinsConfig.jobName.replace(/\//g, '/job/')
    const jobUrl = `${jenkinsConfig.url}/job/${jobPath}/api/json`
    
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
    
    if (jobResponse.status === 200) {
      console.log('   ✅ 任务状态获取成功')
      console.log(`   任务名称: ${jobResponse.data.name}`)
      console.log(`   最后构建: ${jobResponse.data.lastBuild ? `#${jobResponse.data.lastBuild.number}` : '无'}`)
      console.log(`   最后成功构建: ${jobResponse.data.lastSuccessfulBuild ? `#${jobResponse.data.lastSuccessfulBuild.number}` : '无'}`)
      console.log(`   任务是否在构建中: ${jobResponse.data.lastBuild ? jobResponse.data.lastBuild.building : false}`)
    } else {
      console.log(`   ❌ 任务状态获取失败: ${jobResponse.status}`)
    }
  } catch (error) {
    console.log(`   ❌ 任务状态获取失败: ${error.message}`)
  }
}

// 运行测试
testJenkinsBuild()
