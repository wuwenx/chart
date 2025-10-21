const { PromptTemplate } = require('langchain/prompts')
const { LLMChain } = require('langchain/chains')
const { AIModelManager } = require('./aiModelManager')

class CodeAnalyzer {
  constructor() {
    this.aiManager = new AIModelManager()
    this.llm = this.aiManager.getLLM()
    
    this.setupPrompts()
  }

  setupPrompts() {
    // 代码质量分析提示
    this.qualityAnalysisPrompt = new PromptTemplate({
      inputVariables: ['code', 'language'],
      template: `作为代码质量分析师，请分析以下${language}代码的质量：

代码：
\`\`\`${language}
{code}
\`\`\`

请从以下维度进行分析：
1. **代码结构**：函数/类的组织是否合理
2. **可读性**：变量命名、注释、代码格式
3. **性能**：是否存在性能问题
4. **安全性**：是否存在安全漏洞
5. **最佳实践**：是否遵循语言最佳实践
6. **可维护性**：代码是否易于维护和扩展

请给出具体的改进建议，使用中文回答。`
    })

    // 代码功能分析提示
    this.functionalityAnalysisPrompt = new PromptTemplate({
      inputVariables: ['code', 'language'],
      template: `作为代码功能分析师，请分析以下${language}代码的功能：

代码：
\`\`\`${language}
{code}
\`\`\`

请分析：
1. **主要功能**：这段代码的主要作用是什么
2. **输入输出**：函数的参数和返回值
3. **算法逻辑**：核心算法或业务逻辑
4. **依赖关系**：依赖的外部模块或函数
5. **使用场景**：适用的使用场景
6. **潜在问题**：可能存在的问题或边界情况

使用中文回答，要详细且易懂。`
    })

    // 代码重构建议提示
    this.refactorPrompt = new PromptTemplate({
      inputVariables: ['code', 'language', 'issues'],
      template: `作为代码重构专家，请为以下${language}代码提供重构建议：

代码：
\`\`\`${language}
{code}
\`\`\`

发现的问题：
{issues}

请提供：
1. **重构方案**：具体的重构建议
2. **重构后的代码**：提供改进后的代码示例
3. **重构理由**：解释为什么这样重构
4. **注意事项**：重构时需要注意的问题
5. **测试建议**：如何测试重构后的代码

使用中文回答，提供实用的建议。`
    })

    // 代码解释提示
    this.explainPrompt = new PromptTemplate({
      inputVariables: ['code', 'language'],
      template: `请用简单易懂的方式解释以下${language}代码：

代码：
\`\`\`${language}
{code}
\`\`\`

请解释：
1. **代码目的**：这段代码想要实现什么
2. **逐行解释**：关键代码行的作用
3. **执行流程**：代码的执行顺序
4. **关键概念**：涉及的重要编程概念
5. **实际应用**：在什么情况下会用到

使用中文回答，适合初学者理解。`
    })
  }

  async analyzeCodeQuality(code, language = 'javascript') {
    try {
      const chain = new LLMChain({
        llm: this.llm,
        prompt: this.qualityAnalysisPrompt
      })

      const response = await chain.call({
        code,
        language
      })

      return response.text
    } catch (error) {
      console.error('代码质量分析失败:', error)
      throw error
    }
  }

  async analyzeFunctionality(code, language = 'javascript') {
    try {
      const chain = new LLMChain({
        llm: this.llm,
        prompt: this.functionalityAnalysisPrompt
      })

      const response = await chain.call({
        code,
        language
      })

      return response.text
    } catch (error) {
      console.error('代码功能分析失败:', error)
      throw error
    }
  }

  async suggestRefactoring(code, language = 'javascript', issues = '') {
    try {
      const chain = new LLMChain({
        llm: this.llm,
        prompt: this.refactorPrompt
      })

      const response = await chain.call({
        code,
        language,
        issues
      })

      return response.text
    } catch (error) {
      console.error('重构建议生成失败:', error)
      throw error
    }
  }

  async explainCode(code, language = 'javascript') {
    try {
      const chain = new LLMChain({
        llm: this.llm,
        prompt: this.explainPrompt
      })

      const response = await chain.call({
        code,
        language
      })

      return response.text
    } catch (error) {
      console.error('代码解释失败:', error)
      throw error
    }
  }

  // 综合代码分析
  async comprehensiveAnalysis(code, language = 'javascript') {
    try {
      const [quality, functionality, explanation] = await Promise.all([
        this.analyzeCodeQuality(code, language),
        this.analyzeFunctionality(code, language),
        this.explainCode(code, language)
      ])

      return {
        quality,
        functionality,
        explanation,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('综合代码分析失败:', error)
      throw error
    }
  }

  // 检测代码语言
  detectLanguage(filename) {
    const ext = filename.split('.').pop()?.toLowerCase()
    const languageMap = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'xml': 'xml'
    }
    return languageMap[ext] || 'text'
  }

  // 提取代码中的关键信息
  extractCodeInfo(code, language) {
    const info = {
      lines: code.split('\n').length,
      characters: code.length,
      functions: 0,
      classes: 0,
      comments: 0,
      complexity: 'low'
    }

    // 简单的代码分析
    const lines = code.split('\n')
    
    lines.forEach(line => {
      const trimmed = line.trim()
      
      // 统计注释
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('#')) {
        info.comments++
      }
      
      // 统计函数
      if (language === 'javascript' || language === 'typescript') {
        if (trimmed.match(/^(function|const|let|var)\s+\w+\s*[=\(]/)) {
          info.functions++
        }
        if (trimmed.match(/^class\s+\w+/)) {
          info.classes++
        }
      } else if (language === 'python') {
        if (trimmed.match(/^def\s+\w+/)) {
          info.functions++
        }
        if (trimmed.match(/^class\s+\w+/)) {
          info.classes++
        }
      }
    })

    // 简单的复杂度评估
    if (info.functions > 10 || info.lines > 100) {
      info.complexity = 'high'
    } else if (info.functions > 5 || info.lines > 50) {
      info.complexity = 'medium'
    }

    return info
  }
}

module.exports = { CodeAnalyzer }
