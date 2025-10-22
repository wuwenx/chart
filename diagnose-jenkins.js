const axios = require('axios')

// 测试不同的认证方式
async function diagnoseJenkinsAuth() {
  const jenkinsUrl = 'https://jks.popfun.xyz'
  const token = '1151d55491677b7add0d5aa327b29425a1'
  
  console.log('🔍 Jenkins认证诊断...')
  console.log(`URL: ${jenkinsUrl}`)
  console.log(`Token: ${token}`)
  console.log(`Token长度: ${token.length}`)
  console.log(`Token格式: ${/^[a-f0-9]{32}$/i.test(token) ? '✅ 正确' : '❌ 不正确'}`)
  console.log('')

  // 1. 测试匿名访问
  console.log('1. 测试匿名访问...')
  try {
    const response = await axios.get(`${jenkinsUrl}/api/json`, {
      timeout: 10000,
      validateStatus: function (status) {
        return status < 500;
      }
    })
    
    console.log(`   状态码: ${response.status}`)
    if (response.status === 200) {
      console.log('   ✅ Jenkins允许匿名访问')
      return
    } else if (response.status === 403) {
      console.log('   ❌ Jenkins需要认证')
    } else {
      console.log(`   ⚠️  其他状态: ${response.status}`)
    }
  } catch (error) {
    console.log(`   ❌ 连接失败: ${error.message}`)
  }
  
  console.log('')

  // 2. 测试Token作为密码使用
  console.log('2. 测试Token作为密码...')
  const usernames = ['owen', 'admin', 'jenkins', 'user', 'root']
  
  for (const username of usernames) {
    try {
      console.log(`   测试 ${username}:${token.substring(0, 8)}...`)
      
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
      
      if (response.status === 200) {
        console.log(`   ✅ 认证成功！用户名: ${username}`)
        console.log(`   Jenkins版本: ${response.data.version || '未知'}`)
        return username
      } else if (response.status === 401) {
        console.log(`   ❌ 认证失败`)
      } else {
        console.log(`   ⚠️  状态码: ${response.status}`)
      }
    } catch (error) {
      console.log(`   ❌ 错误: ${error.message}`)
    }
  }
  
  console.log('')

  // 3. 测试Token作为用户名使用
  console.log('3. 测试Token作为用户名...')
  try {
    const auth = Buffer.from(`${token}:${token}`).toString('base64')
    
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
    
    console.log(`   状态码: ${response.status}`)
    if (response.status === 200) {
      console.log('   ✅ Token作为用户名认证成功')
      return token
    } else {
      console.log(`   ❌ Token作为用户名认证失败`)
    }
  } catch (error) {
    console.log(`   ❌ 错误: ${error.message}`)
  }
  
  console.log('')

  // 4. 检查Jenkins版本和安全设置
  console.log('4. 检查Jenkins信息...')
  try {
    const response = await axios.get(`${jenkinsUrl}/api/json`, {
      timeout: 10000,
      validateStatus: function (status) {
        return status < 500;
      }
    })
    
    if (response.status === 200) {
      console.log('   ✅ 可以匿名访问Jenkins信息')
      console.log(`   Jenkins版本: ${response.data.version || '未知'}`)
      console.log(`   Jenkins模式: ${response.data.mode || '未知'}`)
      console.log(`   安全启用: ${response.data.useSecurity || '未知'}`)
    } else {
      console.log(`   ❌ 无法访问Jenkins信息: ${response.status}`)
    }
  } catch (error) {
    console.log(`   ❌ 无法访问Jenkins信息: ${error.message}`)
  }
  
  console.log('')

  // 5. 提供解决方案
  console.log('🛠️  解决方案:')
  console.log('')
  console.log('方案1: 重新生成API Token')
  console.log('  1. 登录Jenkins Web界面: https://jks.popfun.xyz')
  console.log('  2. 点击右上角用户名')
  console.log('  3. 选择 "Configure"')
  console.log('  4. 滚动到 "API Token" 部分')
  console.log('  5. 点击 "Add new Token"')
  console.log('  6. 输入Token名称（如：monitor-system）')
  console.log('  7. 点击 "Generate"')
  console.log('  8. 复制生成的32位Token')
  console.log('')
  console.log('方案2: 检查Jenkins安全设置')
  console.log('  1. 进入 "Manage Jenkins" > "Configure Global Security"')
  console.log('  2. 确保 "Enable security" 已勾选')
  console.log('  3. 选择合适的授权策略')
  console.log('  4. 确保用户有 "Overall/Read" 权限')
  console.log('')
  console.log('方案3: 使用密码认证（如果支持）')
  console.log('  1. 如果Jenkins允许密码认证')
  console.log('  2. 可以使用用户名和密码的组合')
  console.log('  3. 格式: username:password')
  console.log('')
  console.log('🔗 有用的链接:')
  console.log('  - Jenkins API文档: https://www.jenkins.io/doc/book/using/remote-access-api/')
  console.log('  - API Token生成: https://www.jenkins.io/doc/book/system-administration/authenticating-scripted-clients/')
}

// 运行诊断
diagnoseJenkinsAuth()
