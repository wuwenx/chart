# Jenkins 自动监控和AI修复指南

## 🎯 目标
实现Jenkins构建失败时自动触发AI修复流程，无需Jenkins配置权限。

## 🚀 新功能：自动监控服务

**好消息！** 我们已经实现了自动监控功能，无需Jenkins配置权限！

### ✅ 自动监控功能：

1. **服务器每30秒自动检查Jenkins构建状态**
2. **检测到构建失败时自动触发AI修复**
3. **无需Jenkins webhook配置**
4. **使用Jenkins API key主动获取构建状态**

### 🔧 工作原理：

```
GitLab Push → Jenkins构建 → 服务器监控 → 检测失败 → AI修复 → 自动提交 → 新构建
```

## 📋 使用方法

### 方法1：完全自动化（推荐）

**无需任何配置！** 服务器已经启动自动监控服务：

- ✅ 每30秒检查Jenkins构建状态
- ✅ 检测到失败时自动触发AI修复
- ✅ 修复后自动提交并触发新构建
- ✅ 循环直到成功或达到最大重试次数

### 方法2：手动触发监控

如果需要手动触发监控和修复：

```bash
curl -X POST https://iconological-first-blake.ngrok-free.dev/api/jenkins/monitor-and-fix
```

### 方法3：检查构建状态

```bash
curl https://iconological-first-blake.ngrok-free.dev/api/cicd/build-status
```

## 🧪 测试自动监控

运行测试脚本：

```bash
./test-auto-monitor.sh
```

## 📊 监控和日志

- **服务器日志**：查看自动监控和AI修复的执行情况
- **CI/CD状态**：访问 `https://iconological-first-blake.ngrok-free.dev/api/cicd/status`
- **构建状态**：访问 `https://iconological-first-blake.ngrok-free.dev/api/cicd/build-status`

## ⚠️ 注意事项

1. **服务器必须保持运行**：自动监控服务在服务器中运行
2. **ngrok连接**：确保ngrok连接稳定
3. **API限制**：每30秒检查一次，避免过于频繁的API调用
4. **重复处理**：系统会自动防止重复处理同一个构建失败

## 🎉 预期效果

配置完成后（实际上无需配置），当Jenkins构建失败时：
1. 服务器自动检测到构建失败 ✅
2. 自动触发AI修复流程 ✅
3. AI分析构建错误并自动修复 ✅
4. 修复后自动提交代码并触发新构建 ✅
5. 循环直到构建成功或达到最大重试次数 ✅

---

## 📋 传统Jenkins Webhook配置（可选）

如果你有Jenkins配置权限，也可以使用传统的webhook方式：

## 📋 配置步骤

### 方法1：使用Jenkins Notification Plugin（推荐）

1. **安装插件**
   - 进入Jenkins管理 → 插件管理
   - 搜索并安装 "Notification Plugin" 或 "Generic Webhook Trigger Plugin"

2. **配置Webhook**
   - 进入你的Jenkins任务：`test/web/web-mm-admin-new`
   - 点击 "配置"
   - 在 "构建后操作" 部分添加 "Generic Webhook Trigger"
   - 配置如下：
     ```
     Webhook URL: https://iconological-first-blake.ngrok-free.dev/api/jenkins/build-failed
     Method: POST
     Content Type: application/json
     ```

3. **配置触发条件**
   - 在 "构建触发器" 部分配置：
     ```
     触发条件: 构建失败时
     ```

### 方法2：使用Jenkins Pipeline（高级）

1. **修改Jenkinsfile**
   ```groovy
   pipeline {
       agent any
       
       stages {
           stage('Build') {
               steps {
                   sh 'pnpm install && npm run build'
               }
           }
       }
       
       post {
           failure {
               // 构建失败时触发AI修复
               httpRequest(
                   url: 'https://iconological-first-blake.ngrok-free.dev/api/jenkins/build-failed',
                   httpMode: 'POST',
                   contentType: 'APPLICATION_JSON',
                   requestBody: '{"buildNumber": "${env.BUILD_NUMBER}", "jobName": "${env.JOB_NAME}"}'
               )
           }
       }
   }
   ```

### 方法3：使用Shell脚本（简单）

1. **在Jenkins构建步骤中添加**
   ```bash
   #!/bin/bash
   
   # 执行构建
   pnpm install && npm run build
   
   # 检查构建结果
   if [ $? -ne 0 ]; then
       echo "构建失败，触发AI修复..."
       curl -X POST https://iconological-first-blake.ngrok-free.dev/api/jenkins/build-failed \
            -H "Content-Type: application/json" \
            -d '{"buildNumber": "'$BUILD_NUMBER'", "jobName": "'$JOB_NAME'"}'
   fi
   ```

## 🔧 当前Jenkins任务配置

你的Jenkins任务路径：`test/web/web-mm-admin-new`

### 推荐配置（方法3 - Shell脚本）

1. **进入Jenkins任务配置**
   - 访问：`https://jks.popfun.xyz/job/test/job/web/job/web-mm-admin-new/configure`

2. **修改构建步骤**
   - 在 "构建" 部分，将现有的构建命令修改为：
   ```bash
   #!/bin/bash
   
   echo "开始构建..."
   pnpm install && npm run build
   
   # 检查构建结果
   BUILD_RESULT=$?
   
   if [ $BUILD_RESULT -ne 0 ]; then
       echo "❌ 构建失败，触发AI修复流程..."
       curl -X POST https://iconological-first-blake.ngrok-free.dev/api/jenkins/build-failed \
            -H "Content-Type: application/json" \
            -d '{"buildNumber": "'$BUILD_NUMBER'", "jobName": "'$JOB_NAME'", "result": "FAILURE"}'
       exit $BUILD_RESULT
   else
       echo "✅ 构建成功"
   fi
   ```

## 🧪 测试配置

1. **测试webhook端点**
   ```bash
   curl -X POST https://iconological-first-blake.ngrok-free.dev/api/jenkins/build-failed \
        -H "Content-Type: application/json" \
        -d '{"buildNumber": "999", "jobName": "test-job"}'
   ```

2. **故意制造构建错误**
   - 在你的代码中添加语法错误
   - 提交并推送到develop分支
   - 观察Jenkins是否自动触发AI修复

## 📊 监控和日志

- **Jenkins日志**：查看构建日志中的webhook调用
- **服务器日志**：查看AI修复流程的执行情况
- **CI/CD状态**：访问 `https://iconological-first-blake.ngrok-free.dev/api/cicd/status`

## ⚠️ 注意事项

1. **ngrok URL会变化**：如果ngrok重启，需要更新Jenkins中的webhook URL
2. **网络连接**：确保Jenkins能够访问ngrok URL
3. **权限问题**：确保Jenkins有权限调用webhook
4. **重复触发**：系统会自动防止重复触发AI修复流程

## 🚀 预期效果

配置完成后，当Jenkins构建失败时：
1. Jenkins自动调用webhook
2. 服务器收到通知，开始AI修复流程
3. AI分析构建错误并自动修复
4. 修复后自动提交代码并触发新构建
5. 循环直到构建成功或达到最大重试次数
