#!/bin/bash

# 智能问答系统启动脚本

echo "🤖 启动智能问答系统..."

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js 16+"
    exit 1
fi

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到 npm，请先安装 npm"
    exit 1
fi

# 检查 .env 文件是否存在
if [ ! -f .env ]; then
    echo "⚠️  警告: 未找到 .env 文件，正在从 env.example 创建..."
    if [ -f env.example ]; then
        cp env.example .env
        echo "✅ 已创建 .env 文件，请编辑并添加您的 OpenAI API Key"
    else
        echo "❌ 错误: 未找到 env.example 文件"
        exit 1
    fi
fi

# 检查 OpenAI API Key
if ! grep -q "OPENAI_API_KEY=sk-" .env; then
    echo "⚠️  警告: 请在 .env 文件中设置您的 OpenAI API Key"
    echo "   编辑 .env 文件，将 OPENAI_API_KEY=your_openai_api_key_here 替换为您的实际 API Key"
fi

# 安装依赖
echo "📦 安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

# 创建必要的目录
echo "📁 创建必要的目录..."
mkdir -p documents vectorstore uploads codebase

# 启动后端服务
echo "🚀 启动后端服务..."
npm run start &

# 等待后端服务启动
sleep 3

# 启动前端开发服务器
echo "🎨 启动前端开发服务器..."
npm run dev &

echo ""
echo "✅ 智能问答系统启动完成！"
echo ""
echo "📱 前端地址: http://localhost:3000"
echo "🔧 后端地址: http://localhost:5000"
echo "📊 API 健康检查: http://localhost:5000/api/health"
echo ""
echo "💡 使用提示:"
echo "   1. 上传文档或代码文件"
echo "   2. 在聊天框中提问"
echo "   3. 享受智能问答体验！"
echo ""
echo "🛑 按 Ctrl+C 停止服务"

# 等待用户中断
wait
