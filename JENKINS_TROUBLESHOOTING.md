# Jenkins 连接问题解决指南

## 当前问题分析

根据测试结果，您的Jenkins连接失败的原因是：

**错误**: `401 Unauthorized` - Jenkins认证失败

**可能原因**:
1. **API Token格式不正确** - 您的Token长度是34位，标准Jenkins API Token应该是32位十六进制字符串
2. **用户名不正确** - 使用的用户名可能不是实际的Jenkins用户名
3. **Token已过期或无效** - API Token可能已被删除或重置

## 解决步骤

### 1. 获取正确的Jenkins用户名

登录Jenkins Web界面，查看右上角显示的用户名，这就是您需要使用的用户名。

### 2. 重新生成API Token

1. 登录Jenkins Web界面
2. 点击右上角的用户名
3. 选择 "Configure"（配置）
4. 滚动到 "API Token" 部分
5. 点击 "Add new Token"（添加新Token）
6. 输入Token名称（如：monitor-system）
7. 点击 "Generate"（生成）
8. 复制生成的32位Token（格式如：`a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`）

### 3. 检查Jenkins安全设置

确保Jenkins安全配置正确：

1. 进入 "Manage Jenkins" > "Configure Global Security"
2. 确保 "Enable security" 已勾选
3. 选择合适的授权策略（如 "Matrix-based security"）
4. 确保您的用户有以下权限：
   - `Overall/Read`
   - `Overall/View`
   - `Job/Build`
   - `Job/Read`

### 4. 测试连接

使用以下信息测试连接：

```
Jenkins URL: https://jks.popfun.xyz
用户名: [您的实际Jenkins用户名]
API Token: [新生成的32位Token]
任务名称: test/web/web-mm-admin-new
```

### 5. 验证任务路径

确保任务路径正确。根据您提供的信息：
- 完整URL: `https://jks.popfun.xyz/job/test/job/web/job/web-mm-admin-new/`
- 任务名称应该是: `test/web/web-mm-admin-new`

## 常见问题

### Q: Token格式不正确怎么办？
A: Jenkins API Token必须是32位十六进制字符串，如果您的Token不是这个格式，请重新生成。

### Q: 用户名不确定怎么办？
A: 登录Jenkins Web界面，查看右上角显示的用户名，或者查看 "Manage Jenkins" > "Manage Users" 中的用户列表。

### Q: 权限不足怎么办？
A: 联系Jenkins管理员，确保您的用户有足够的权限访问API和执行构建。

### Q: 任务路径不正确怎么办？
A: 在Jenkins Web界面中找到您的任务，查看URL路径，然后转换为API格式（将 `/` 替换为 `/job/`）。

## 测试脚本

您可以使用以下测试脚本验证连接：

```bash
# 运行测试脚本
node test-jenkins-connection.js
```

## 下一步

1. 按照上述步骤重新生成API Token
2. 确认用户名正确
3. 在Jenkins监控界面中重新配置
4. 测试连接
5. 如果仍有问题，请检查Jenkins服务器日志

## 联系支持

如果按照上述步骤仍无法解决问题，请提供：
1. Jenkins版本信息
2. Jenkins安全配置截图
3. 用户权限配置截图
4. Jenkins服务器日志中的相关错误信息
