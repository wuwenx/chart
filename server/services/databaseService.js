const mysql = require('mysql2/promise')

class DatabaseService {
  constructor() {
    this.connection = null
    this.config = {
      host: 'db.test1.wcsbapp.com',
      port: 3306,
      user: 'admin',
      password: '0YvoGUzwhumnf2KGQvjN',
      database: 'mm_data_center', // 默认数据库，可以根据需要修改
      charset: 'utf8mb4',
      timezone: '+08:00',
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true
    }
  }

  async connect() {
    try {
      if (!this.connection) {
        this.connection = await mysql.createConnection(this.config)
        console.log('✅ 数据库连接成功')
      }
      return this.connection
    } catch (error) {
      console.error('❌ 数据库连接失败:', error.message)
      throw error
    }
  }

  // 切换数据库
  async setDatabase(databaseName) {
    try {
      // 如果连接的数据库名称相同，不需要切换
      if (this.config.database === databaseName && this.connection) {
        return true
      }

      // 关闭现有连接
      if (this.connection) {
        await this.disconnect()
      }

      // 更新配置
      this.config.database = databaseName

      // 重新连接
      await this.connect()
      
      console.log(`✅ 已切换到数据库: ${databaseName}`)
      return true
    } catch (error) {
      console.error('❌ 切换数据库失败:', error.message)
      throw error
    }
  }

  // 获取所有数据库列表
  async getAllDatabases() {
    try {
      // 先连接到一个默认数据库（information_schema）来获取数据库列表
      const tempConfig = {
        ...this.config,
        database: 'information_schema'
      }
      const tempConnection = await mysql.createConnection(tempConfig)
      
      const [rows] = await tempConnection.execute(
        `SELECT SCHEMA_NAME as name 
         FROM SCHEMATA 
         WHERE SCHEMA_NAME NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
         ORDER BY SCHEMA_NAME`
      )
      
      await tempConnection.end()
      
      return rows.map(row => row.name)
    } catch (error) {
      console.error('❌ 获取数据库列表失败:', error.message)
      throw error
    }
  }

  // 获取当前数据库名称
  getCurrentDatabase() {
    return this.config.database
  }

  async disconnect() {
    try {
      if (this.connection) {
        await this.connection.end()
        this.connection = null
        console.log('✅ 数据库连接已关闭')
      }
    } catch (error) {
      console.error('❌ 关闭数据库连接失败:', error.message)
    }
  }

  async executeQuery(sql, params = []) {
    try {
      const connection = await this.connect()
      const [rows] = await connection.execute(sql, params)
      return rows
    } catch (error) {
      console.error('❌ SQL 执行失败:', error.message)
      throw error
    }
  }

  async getTableSchema(tableName, databaseName = null) {
    try {
      const dbName = databaseName || this.config.database
      const sql = `
        SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          IS_NULLABLE,
          COLUMN_DEFAULT,
          COLUMN_COMMENT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `
      const rows = await this.executeQuery(sql, [dbName, tableName])
      return rows
    } catch (error) {
      console.error('❌ 获取表结构失败:', error.message)
      throw error
    }
  }

  async getAllTables(databaseName = null) {
    try {
      const dbName = databaseName || this.config.database
      const sql = `
        SELECT 
          TABLE_NAME,
          TABLE_COMMENT,
          TABLE_ROWS,
          CREATE_TIME,
          UPDATE_TIME
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME
      `
      const rows = await this.executeQuery(sql, [dbName])
      return rows
    } catch (error) {
      console.error('❌ 获取表列表失败:', error.message)
      throw error
    }
  }

  async getDatabaseInfo() {
    try {
      const tables = await this.getAllTables()
      const tableInfo = []
      
      for (const table of tables) {
        const schema = await this.getTableSchema(table.TABLE_NAME)
        tableInfo.push({
          tableName: table.TABLE_NAME,
          comment: table.TABLE_COMMENT,
          rows: table.TABLE_ROWS,
          columns: schema.map(col => ({
            name: col.COLUMN_NAME,
            type: col.DATA_TYPE,
            nullable: col.IS_NULLABLE === 'YES',
            default: col.COLUMN_DEFAULT,
            comment: col.COLUMN_COMMENT
          }))
        })
      }
      
      return {
        database: this.config.database,
        tables: tableInfo
      }
    } catch (error) {
      console.error('❌ 获取数据库信息失败:', error.message)
      throw error
    }
  }

  // 验证 SQL 查询的安全性
  validateSQL(sql) {
    const dangerousPatterns = [
      /DROP\s+TABLE/i,
      /DELETE\s+FROM/i,
      /UPDATE\s+.*\s+SET/i,
      /INSERT\s+INTO/i,
      /ALTER\s+TABLE/i,
      /CREATE\s+TABLE/i,
      /TRUNCATE/i,
      /GRANT/i,
      /REVOKE/i
    ]
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(sql)) {
        throw new Error('检测到危险的 SQL 操作，只允许 SELECT 查询')
      }
    }
    
    // 确保是 SELECT 查询
    if (!sql.trim().toUpperCase().startsWith('SELECT')) {
      throw new Error('只允许 SELECT 查询操作')
    }
    
    return true
  }

  // 安全的查询执行
  async safeQuery(sql, params = []) {
    this.validateSQL(sql)
    return await this.executeQuery(sql, params)
  }

  // 获取连接状态
  isConnected() {
    return this.connection !== null
  }

  // 测试连接
  async testConnection() {
    try {
      await this.connect()
      const result = await this.executeQuery('SELECT 1 as test')
      return result[0].test === 1
    } catch (error) {
      console.error('❌ 数据库连接测试失败:', error.message)
      return false
    }
  }
}

module.exports = { DatabaseService }
