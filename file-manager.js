#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

class FileManager {
  constructor() {
    this.baseURL = BASE_URL;
  }

  async listDocuments() {
    try {
      const response = await axios.get(`${this.baseURL}/api/documents`);
      return response.data.documents;
    } catch (error) {
      console.error('❌ 获取文档列表失败:', error.message);
      return [];
    }
  }

  async getStats() {
    try {
      const response = await axios.get(`${this.baseURL}/api/code-stats`);
      return response.data;
    } catch (error) {
      console.error('❌ 获取统计信息失败:', error.message);
      return null;
    }
  }

  async deleteDocument(filename) {
    try {
      const response = await axios.delete(`${this.baseURL}/api/documents/${encodeURIComponent(filename)}`);
      return response.data;
    } catch (error) {
      console.error('❌ 删除文档失败:', error.message);
      throw error;
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async displayDocuments() {
    console.log('📁 当前上传的文件列表\n');
    
    const documents = await this.listDocuments();
    const stats = await this.getStats();

    if (documents.length === 0) {
      console.log('📭 暂无上传的文件');
      return;
    }

    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│                        文件列表                                │');
    console.log('├─────────────────────────────────────────────────────────────────┤');
    
    documents.forEach((doc, index) => {
      const fileType = doc.name.includes('.') ? doc.name.split('.').pop().toUpperCase() : '未知';
      console.log(`│ ${index + 1}. ${doc.name.padEnd(40)} │`);
      console.log(`│    类型: ${fileType.padEnd(8)} 块数: ${doc.chunks.toString().padEnd(6)} 更新时间: ${doc.lastUpdated.split('T')[0]} │`);
      console.log('├─────────────────────────────────────────────────────────────────┤');
    });

    if (stats) {
      console.log(`│ 总计: ${stats.totalDocuments} 个文档块 (${stats.documentDocuments} 个文档, ${stats.codeDocuments} 个代码文件) │`);
    }
    console.log('└─────────────────────────────────────────────────────────────────┘');
  }

  async deleteFile(filename) {
    try {
      console.log(`🗑️  正在删除文件: ${filename}`);
      const result = await this.deleteDocument(filename);
      console.log(`✅ ${result.message}`);
      return true;
    } catch (error) {
      console.log(`❌ 删除失败: ${error.message}`);
      return false;
    }
  }

  async interactiveMode() {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (query) => new Promise((resolve) => rl.question(query, resolve));

    while (true) {
      console.log('\n' + '='.repeat(60));
      await this.displayDocuments();
      
      console.log('\n📋 操作选项:');
      console.log('1. 删除文件');
      console.log('2. 刷新列表');
      console.log('3. 退出');
      
      const choice = await question('\n请选择操作 (1-3): ');
      
      switch (choice.trim()) {
        case '1':
          const filename = await question('请输入要删除的文件名: ');
          if (filename.trim()) {
            await this.deleteFile(filename.trim());
          }
          break;
        case '2':
          console.log('🔄 刷新文件列表...');
          break;
        case '3':
          console.log('👋 再见！');
          rl.close();
          return;
        default:
          console.log('❌ 无效选择，请重新输入');
      }
    }
  }
}

// 命令行参数处理
async function main() {
  const args = process.argv.slice(2);
  const fileManager = new FileManager();

  if (args.length === 0) {
    // 交互模式
    await fileManager.interactiveMode();
  } else if (args[0] === 'list') {
    // 仅列出文件
    await fileManager.displayDocuments();
  } else if (args[0] === 'delete' && args[1]) {
    // 删除指定文件
    await fileManager.deleteFile(args[1]);
  } else if (args[0] === 'stats') {
    // 显示统计信息
    const stats = await fileManager.getStats();
    if (stats) {
      console.log('📊 文件统计信息:');
      console.log(`总文档块数: ${stats.totalDocuments}`);
      console.log(`文档文件数: ${stats.documentDocuments}`);
      console.log(`代码文件数: ${stats.codeDocuments}`);
      console.log(`最后更新: ${stats.lastUpdated}`);
    }
  } else {
    console.log('📖 使用方法:');
    console.log('  node file-manager.js           # 交互模式');
    console.log('  node file-manager.js list      # 列出文件');
    console.log('  node file-manager.js delete <文件名>  # 删除文件');
    console.log('  node file-manager.js stats     # 显示统计');
    console.log('\n示例:');
    console.log('  node file-manager.js delete "strategy-edit-i18n-keys.md"');
  }
}

main().catch(console.error);
