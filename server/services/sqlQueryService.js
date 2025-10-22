const { PromptTemplate } = require('langchain/prompts')
const { LLMChain } = require('langchain/chains')
const { DatabaseService } = require('./databaseService')
const { AIModelManager } = require('./aiModelManager')

class SQLQueryService {
  constructor() {
    this.databaseService = new DatabaseService()
    this.aiManager = new AIModelManager()
    this.llm = this.aiManager.getLLM()
    this.databaseInfo = null
    
    this.setupPrompts()
  }

  setupPrompts() {
    // SQL 生成提示模板
    this.sqlGenerationPrompt = new PromptTemplate({
      inputVariables: ['question', 'database_schema', 'examples'],
      template: `你是一个专业的 SQL 查询生成器。请根据用户的自然语言问题生成相应的 SQL 查询。

数据库结构信息：
{database_schema}

示例查询：
{examples}

用户问题：{question}

请遵循以下规则：
1. 只生成 SELECT 查询，不允许其他类型的 SQL 操作
2. 确保 SQL 语法正确
3. 使用适当的 WHERE 条件来过滤数据
4. 如果需要排序，使用 ORDER BY
5. 如果需要限制结果数量，使用 LIMIT
6. 使用中文注释说明查询的目的
7. 如果问题不明确或无法转换为 SQL，请说明原因

请只返回 SQL 查询语句，不要包含其他解释：

SQL 查询：`
    })

    // 结果解释提示模板
    this.resultExplanationPrompt = new PromptTemplate({
      inputVariables: ['question', 'sql', 'results', 'row_count'],
      template: `你是一个数据分析专家。请根据 SQL 查询结果为用户提供清晰的分析报告。

用户问题：{question}

执行的 SQL 查询：
{sql}

查询结果（共 {row_count} 条记录）：
{results}

请提供：
1. 结果摘要
2. 关键数据洞察
3. 数据趋势分析（如果适用）
4. 建议或结论

使用中文回答，要专业且易懂。如果结果为空，请说明可能的原因。`
    })

    // 错误处理提示模板
    this.errorHandlingPrompt = new PromptTemplate({
      inputVariables: ['question', 'error_message', 'database_schema'],
      template: `用户尝试查询数据库时遇到了错误。请帮助分析问题并提供解决方案。

用户问题：{question}

错误信息：{error_message}

数据库结构：
{database_schema}

请提供：
1. 错误原因分析
2. 可能的解决方案
3. 建议的查询修改
4. 如果无法解决，请建议用户如何重新描述问题

使用中文回答，要友好且有用。`
    })
  }

  async initialize() {
    try {
      // 测试数据库连接
      const isConnected = await this.databaseService.testConnection()
      if (!isConnected) {
        throw new Error('数据库连接失败')
      }

      // 获取数据库结构信息
      this.databaseInfo = await this.databaseService.getDatabaseInfo()
      console.log('✅ SQL 查询服务初始化完成')
    } catch (error) {
      console.error('❌ SQL 查询服务初始化失败:', error.message)
      throw error
    }
  }

  async generateSQL(question) {
    try {
      if (!this.databaseInfo) {
        await this.initialize()
      }

      // 构建数据库结构描述
      const schemaDescription = this.buildSchemaDescription()
      
      // 构建示例查询
      const examples = this.buildExamples()

      const sqlChain = new LLMChain({
        llm: this.llm,
        prompt: this.sqlGenerationPrompt
      })

      const response = await sqlChain.call({
        question,
        database_schema: schemaDescription,
        examples
      })

      // 提取 SQL 查询
      const sqlText = response.text.trim()
      const sqlMatch = sqlText.match(/(?:SELECT|select).*?(?:;|$)/s)
      
      if (!sqlMatch) {
        throw new Error('无法从 AI 响应中提取有效的 SQL 查询')
      }

      let sql = sqlMatch[0].trim()
      if (!sql.endsWith(';')) {
        sql += ';'
      }

      return sql
    } catch (error) {
      console.error('❌ SQL 生成失败:', error.message)
      throw error
    }
  }

  async executeQuery(question) {
    try {
      // 生成 SQL
      const sql = await this.generateSQL(question)
      console.log('🔍 生成的 SQL:', sql)

      // 执行查询
      const results = await this.databaseService.safeQuery(sql)
      
      // 解释结果
      const explanation = await this.explainResults(question, sql, results)
      
      return {
        success: true,
        sql,
        results,
        explanation,
        rowCount: results.length
      }
    } catch (error) {
      console.error('❌ 查询执行失败:', error.message)
      
      // 生成错误解释
      const errorExplanation = await this.explainError(question, error.message)
      
      return {
        success: false,
        error: error.message,
        explanation: errorExplanation
      }
    }
  }

  async explainResults(question, sql, results) {
    try {
      const explanationChain = new LLMChain({
        llm: this.llm,
        prompt: this.resultExplanationPrompt
      })

      // 限制结果展示数量，避免 token 过多
      const limitedResults = results.slice(0, 20)
      
      // 优化结果展示格式
      const resultsText = this.formatResultsForDisplay(limitedResults)

      const response = await explanationChain.call({
        question,
        sql,
        results: resultsText,
        row_count: results.length
      })

      return response.text
    } catch (error) {
      console.error('❌ 结果解释失败:', error.message)
      return '结果解释生成失败，但查询已成功执行。'
    }
  }

  // 格式化结果用于展示
  formatResultsForDisplay(results) {
    if (!results || results.length === 0) {
      return '查询结果为空'
    }

    // 获取所有字段名
    const fields = Object.keys(results[0])
    
    // 创建表格格式的展示
    let formattedText = '查询结果表格：\n\n'
    
    // 表头
    formattedText += '| ' + fields.join(' | ') + ' |\n'
    formattedText += '| ' + fields.map(() => '---').join(' | ') + ' |\n'
    
    // 数据行
    results.forEach(row => {
      const values = fields.map(field => {
        let value = row[field]
        // 处理特殊值
        if (value === null) return 'NULL'
        if (value === undefined) return 'undefined'
        if (typeof value === 'string' && value.length > 50) {
          return value.substring(0, 47) + '...'
        }
        return String(value)
      })
      formattedText += '| ' + values.join(' | ') + ' |\n'
    })
    
    formattedText += '\n原始JSON数据：\n'
    formattedText += JSON.stringify(results, null, 2)
    
    return formattedText
  }

  async explainError(question, errorMessage) {
    try {
      const errorChain = new LLMChain({
        llm: this.llm,
        prompt: this.errorHandlingPrompt
      })

      const schemaDescription = this.buildSchemaDescription()

      const response = await errorChain.call({
        question,
        error_message: errorMessage,
        database_schema: schemaDescription
      })

      return response.text
    } catch (error) {
      console.error('❌ 错误解释失败:', error.message)
      return '抱歉，查询执行失败。请检查问题描述或联系管理员。'
    }
  }

  buildSchemaDescription() {
    if (!this.databaseInfo) {
      return '数据库信息不可用'
    }

    let description = `数据库：${this.databaseInfo.database}\n\n`
    
    this.databaseInfo.tables.forEach(table => {
      description += `表名：${table.tableName}\n`
      if (table.comment) {
        description += `说明：${table.comment}\n`
      }
      description += `字段：\n`
      
      table.columns.forEach(column => {
        description += `  - ${column.name} (${column.type})`
        if (column.comment) {
          description += ` - ${column.comment}`
        }
        if (!column.nullable) {
          description += ` [必填]`
        }
        description += `\n`
      })
      description += `\n`
    })

    return description
  }

  buildExamples() {
    return `示例 1:
问题：查询所有用户的信息
SQL：SELECT * FROM users;

示例 2:
问题：统计每个部门的员工数量
SQL：SELECT department, COUNT(*) as employee_count FROM employees GROUP BY department;

示例 3:
问题：查找最近一周的订单
SQL：SELECT * FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) ORDER BY created_at DESC;

示例 4:
问题：查询销售额最高的前10个产品
SQL：SELECT product_name, SUM(sales_amount) as total_sales FROM sales GROUP BY product_name ORDER BY total_sales DESC LIMIT 10;`
  }

  // 获取数据库概览
  async getDatabaseOverview() {
    try {
      if (!this.databaseInfo) {
        await this.initialize()
      }

      return {
        database: this.databaseInfo.database,
        tableCount: this.databaseInfo.tables.length,
        tables: this.databaseInfo.tables.map(table => ({
          name: table.tableName,
          comment: table.comment,
          rowCount: table.rows,
          columnCount: table.columns.length
        }))
      }
    } catch (error) {
      console.error('❌ 获取数据库概览失败:', error.message)
      throw error
    }
  }

  // 验证查询问题
  validateQuestion(question) {
    if (!question || question.trim().length === 0) {
      throw new Error('查询问题不能为空')
    }

    if (question.length > 500) {
      throw new Error('查询问题过长，请简化描述')
    }

    return true
  }

  // 关闭服务
  async close() {
    try {
      await this.databaseService.disconnect()
      console.log('✅ SQL 查询服务已关闭')
    } catch (error) {
      console.error('❌ 关闭 SQL 查询服务失败:', error.message)
    }
  }
}

module.exports = { SQLQueryService }
