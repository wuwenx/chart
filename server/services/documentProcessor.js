const fs = require('fs')
const path = require('path')
const pdfParse = require('pdf-parse')
const mammoth = require('mammoth')
const cheerio = require('cheerio')
const { Document } = require('langchain/document')

class DocumentProcessor {
  constructor() {
    this.supportedFormats = {
      '.pdf': this.processPDF.bind(this),
      '.doc': this.processDOC.bind(this),
      '.docx': this.processDOCX.bind(this),
      '.txt': this.processTXT.bind(this),
      '.md': this.processMD.bind(this)
    }
  }

  async processFile(filePath, originalName) {
    const ext = path.extname(originalName).toLowerCase()
    const processor = this.supportedFormats[ext]
    
    if (!processor) {
      throw new Error(`不支持的文件格式: ${ext}`)
    }

    const content = await processor(filePath)
    return this.createDocuments(content, originalName)
  }

  async processPDF(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath)
      const data = await pdfParse(dataBuffer)
      return data.text
    } catch (error) {
      throw new Error(`PDF 处理失败: ${error.message}`)
    }
  }

  async processDOCX(filePath) {
    try {
      const result = await mammoth.extractRawText({ path: filePath })
      return result.value
    } catch (error) {
      throw new Error(`DOCX 处理失败: ${error.message}`)
    }
  }

  async processDOC(filePath) {
    // DOC 格式处理比较复杂，这里简化处理
    try {
      const result = await mammoth.extractRawText({ path: filePath })
      return result.value
    } catch (error) {
      throw new Error(`DOC 处理失败: ${error.message}`)
    }
  }

  async processTXT(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf8')
    } catch (error) {
      throw new Error(`TXT 处理失败: ${error.message}`)
    }
  }

  async processMD(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      // 移除 Markdown 标记，保留纯文本
      return content
        .replace(/#{1,6}\s+/g, '') // 移除标题标记
        .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体标记
        .replace(/\*(.*?)\*/g, '$1') // 移除斜体标记
        .replace(/`(.*?)`/g, '$1') // 移除代码标记
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // 移除链接标记
    } catch (error) {
      throw new Error(`MD 处理失败: ${error.message}`)
    }
  }

  createDocuments(content, originalName) {
    if (!content || content.trim().length === 0) {
      return []
    }

    // 按段落分割文档
    const paragraphs = content
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0)

    const documents = []
    
    paragraphs.forEach((paragraph, index) => {
      if (paragraph.length > 50) { // 只处理长度大于50字符的段落
        const doc = new Document({
          pageContent: paragraph,
          metadata: {
            source: originalName,
            page: index + 1,
            type: 'document',
            timestamp: new Date().toISOString()
          }
        })
        documents.push(doc)
      }
    })

    return documents
  }

  // 处理代码文件
  async processCodeFile(filePath, originalName) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const ext = path.extname(originalName).toLowerCase()
      
      // 按函数/类分割代码
      const codeBlocks = this.splitCodeIntoBlocks(content, ext)
      
      const documents = codeBlocks.map((block, index) => {
        return new Document({
          pageContent: block.content,
          metadata: {
            source: originalName,
            type: 'code',
            language: ext.substring(1),
            blockIndex: index,
            timestamp: new Date().toISOString()
          }
        })
      })

      return documents
    } catch (error) {
      throw new Error(`代码文件处理失败: ${error.message}`)
    }
  }

  splitCodeIntoBlocks(content, language) {
    const blocks = []
    
    // 简单的代码分割逻辑
    const lines = content.split('\n')
    let currentBlock = []
    let inComment = false
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // 检测注释开始/结束
      if (line.includes('/*')) inComment = true
      if (line.includes('*/')) inComment = false
      
      // 检测函数/类定义
      const isDefinition = this.isCodeDefinition(line, language)
      
      if (isDefinition && currentBlock.length > 0) {
        // 保存当前块
        blocks.push({
          content: currentBlock.join('\n'),
          startLine: i - currentBlock.length + 1,
          endLine: i
        })
        currentBlock = [line]
      } else {
        currentBlock.push(line)
      }
    }
    
    // 添加最后一个块
    if (currentBlock.length > 0) {
      blocks.push({
        content: currentBlock.join('\n'),
        startLine: lines.length - currentBlock.length + 1,
        endLine: lines.length
      })
    }
    
    return blocks
  }

  isCodeDefinition(line, language) {
    const patterns = {
      '.js': [/^function\s+\w+/, /^class\s+\w+/, /^const\s+\w+\s*=.*=>/, /^let\s+\w+\s*=.*=>/],
      '.ts': [/^function\s+\w+/, /^class\s+\w+/, /^interface\s+\w+/, /^type\s+\w+/],
      '.py': [/^def\s+\w+/, /^class\s+\w+/],
      '.java': [/^public\s+class\s+\w+/, /^private\s+\w+/, /^public\s+\w+/],
      '.cpp': [/^class\s+\w+/, /^\w+\s+\w+\s*\(/],
      '.c': [/^\w+\s+\w+\s*\(/]
    }
    
    const patternsForLang = patterns[language] || []
    return patternsForLang.some(pattern => pattern.test(line.trim()))
  }
}

module.exports = { DocumentProcessor }
