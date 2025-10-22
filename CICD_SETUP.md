# GitLab Webhook 配置指南

## 概述
本系统支持通过GitLab Webhook实现自动CI/CD流程。当你在本地提交代码到develop分支时，系统会自动触发Jenkins构建，并在构建失败时使用AI自动修复代码。

## 配置步骤

### 1. 获取Webhook URL
你的GitLab Webhook URL是：
```
https://iconological-first-blake.ngrok-free.dev/api/webhook/gitlab
```

### 2. 在GitLab中配置Webhook
1. 进入你的GitLab项目：`/Users/wuwenxiang/wuwx/mm-admin`
2. 点击 **Settings** → **Webhooks**
3. 添加新的Webhook：
   - **URL**: `https://iconological-first-blake.ngrok-free.dev/api/webhook/gitlab`
   - **Trigger events**: 选择 `Push events`
   - **Branch filter**: 输入 `develop` (只监听develop分支)
   - **SSL verification**: 启用（推荐）

### 3. 测试Webhook
配置完成后，你可以：
1. 在本地修改代码
2. 提交到develop分支：
   ```bash
   git add .
   git commit -m "测试CI/CD流程"
   git push origin develop
   ```
3. 观察Jenkins监控界面，应该会自动触发构建

## CI/CD流程说明

### 自动流程
1. **代码提交** → GitLab检测到develop分支的推送
2. **Webhook触发** → 发送POST请求到 `/api/webhook/gitlab`
3. **Jenkins构建** → 自动触发Jenkins构建任务
4. **构建监控** → 等待构建完成
5. **结果处理**：
   - ✅ **构建成功** → 流程结束
   - ❌ **构建失败** → 启动AI自动修复

### AI自动修复流程
1. **日志分析** → Jenkins Agent分析构建日志
2. **问题识别** → AI识别具体的错误原因
3. **代码修复** → AI生成修复代码
4. **自动提交** → 修复代码自动提交到develop分支
5. **重新构建** → 触发新的构建流程
6. **重试机制** → 最多重试3次

### 手动触发
你也可以在Jenkins监控界面点击 **"启动CI/CD"** 按钮手动触发整个流程。

## 监控界面

### CI/CD状态卡片
- **处理状态**: 显示当前是否正在进行CI/CD流程
- **重试次数**: 显示当前重试次数和最大重试次数
- **进度条**: 显示修复进度

### 构建状态卡片
- **构建状态**: idle/building/success/failure
- **最后构建信息**: 构建号、时间、持续时间等

### 监控日志
- 实时显示Jenkins操作日志
- 包含构建触发、状态检查、修复操作等

## 注意事项

1. **权限要求**: 确保Jenkins用户有权限触发构建
2. **网络访问**: 确保服务器可以访问GitLab和Jenkins
3. **项目路径**: 确保本地项目路径正确：`/Users/wuwenxiang/wuwx/mm-admin`
4. **分支配置**: 目前只监听develop分支的推送
5. **重试限制**: 自动修复最多重试3次，超过后需要手动处理

## 故障排除

### Webhook不触发
- 检查GitLab Webhook配置是否正确
- 确认服务器可以接收外部请求
- 查看服务器日志是否有错误

### 构建失败
- 检查Jenkins任务配置
- 确认代码仓库路径正确
- 查看构建日志了解具体错误

### AI修复失败
- 检查AI模型是否正常初始化
- 查看Jenkins Agent日志
- 确认代码分析权限

## API端点

- `POST /api/webhook/gitlab` - GitLab Webhook接收端点
- `POST /api/cicd/trigger` - 手动触发CI/CD流程
- `GET /api/cicd/status` - 获取CI/CD状态
- `GET /api/cicd/build-status` - 获取构建状态
