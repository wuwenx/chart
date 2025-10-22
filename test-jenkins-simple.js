const axios = require('axios')

// 测试不同的认证方式
async function testJenkinsAuth() {
  const jenkinsUrl = 'https://jks.popfun.xyz'
  const token = '1151d55491677b7add0d5aa327b29425a1'
  
  console.log('🔧 测试Jenkins认证...')
  console.log(`URL: ${jenkinsUrl}`)
  console.log(`Token: ${token.substring(0, 8)}...`)
  console.log('')

  // 测试不同的用户名
  const usernames = ['owen', 'admin', 'jenkins', 'user']
  
  for (const username of usernames) {
    console.log(`测试用户名: ${username}`)
    
    try {
      const auth = Buffer.from(`${username}:${token}`).toString('base64')
      
      const response = await axios.get(`${jenkinsUrl}/api/json`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        },
        timeout: 10000,
        validateStatus: function (status) {
          return status < 500;
        }
      })
      
      console.log(`  状态码: ${response.status}`)
      
      if (response.status === 200) {
        console.log(`  ✅ 认证成功！用户名: ${username}`)
        console.log(`  Jenkins版本: ${response.data.version || '未知'}`)
        console.log(`  Jenkins模式: ${response.data.mode || '未知'}`)
        
        // 如果认证成功，测试任务访问
        console.log('  测试任务访问...')
        const jobPath = 'test/web/web-mm-admin-new'.replace(/\//g, '/job/')
        const jobUrl = `${jenkinsUrl}/job/${jobPath}/api/json`
        
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
        
        console.log(`  任务状态码: ${jobResponse.status}`)
        
        if (jobResponse.status === 200) {
          console.log(`  ✅ 任务访问成功`)
          console.log(`  任务名称: ${jobResponse.data.name}`)
          console.log(`  最后构建: ${jobResponse.data.lastBuild ? `#${jobResponse.data.lastBuild.number}` : '无'}`)
        } else if (jobResponse.status === 404) {
          console.log(`  ❌ 任务不存在`)
        } else {
          console.log(`  ❌ 任务访问失败: ${jobResponse.status}`)
        }
        
        return username // 返回成功的用户名
      } else if (response.status === 401) {
        console.log(`  ❌ 认证失败`)
      } else {
        console.log(`  ⚠️  其他错误: ${response.status}`)
        if (response.data) {
          console.log(`  响应:`, JSON.stringify(response.data, null, 2))
        }
      }
    } catch (error) {
      console.log(`  ❌ 连接失败: ${error.message}`)
    }
    
    console.log('')
  }
  
  console.log('💡 如果所有用户名都失败，可能的原因:')
  console.log('  1. API Token不正确或已过期')
  console.log('  2. Jenkins安全设置不允许API访问')
  console.log('  3. 需要重新生成API Token')
  console.log('')
  console.log('📋 重新生成API Token的步骤:')
  console.log('  1. 登录Jenkins Web界面')
  console.log('  2. 点击右上角用户名')
  console.log('  3. 选择 "Configure"')
  console.log('  4. 在 "API Token" 部分点击 "Add new Token"')
  console.log('  5. 复制生成的32位Token')
}

// 运行测试
testJenkinsAuth()
