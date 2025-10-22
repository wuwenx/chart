const { ChartJSNodeCanvas } = require('chartjs-node-canvas')
const fs = require('fs')
const path = require('path')

class ChartGenerator {
  constructor() {
    this.width = 800
    this.height = 600
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({
      width: this.width,
      height: this.height,
      backgroundColour: 'white'
    })
  }

  // 根据查询结果生成图表
  async generateChart(queryResult, chartType = 'auto') {
    try {
      if (!queryResult || queryResult.length === 0) {
        throw new Error('没有数据可以生成图表')
      }

      // 自动选择图表类型
      if (chartType === 'auto') {
        chartType = this.detectChartType(queryResult)
      }

      const chartConfig = this.buildChartConfig(queryResult, chartType)
      const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(chartConfig)
      
      return imageBuffer
    } catch (error) {
      console.error('图表生成失败:', error)
      throw error
    }
  }

  // 检测最适合的图表类型
  detectChartType(data) {
    if (data.length === 0) return 'bar'

    const firstRow = data[0]
    const keys = Object.keys(firstRow)
    
    // 检查是否有数值字段
    const numericFields = keys.filter(key => {
      const value = firstRow[key]
      return typeof value === 'number' || !isNaN(parseFloat(value))
    })

    // 检查是否有分类字段
    const categoricalFields = keys.filter(key => {
      const value = firstRow[key]
      return typeof value === 'string' || typeof value === 'number'
    })

    if (numericFields.length >= 2) {
      return 'line' // 多数值字段用折线图
    } else if (numericFields.length === 1 && categoricalFields.length >= 1) {
      return 'bar' // 单数值字段用柱状图
    } else if (numericFields.length === 1) {
      return 'pie' // 单数值字段用饼图
    } else {
      return 'bar' // 默认柱状图
    }
  }

  // 构建图表配置
  buildChartConfig(data, chartType) {
    const keys = Object.keys(data[0])
    
    // 尝试找到标签字段（通常是第一个非数值字段）
    let labelField = keys[0]
    let valueField = keys[1]

    // 寻找数值字段
    for (let i = 1; i < keys.length; i++) {
      const value = data[0][keys[i]]
      if (typeof value === 'number' || !isNaN(parseFloat(value))) {
        valueField = keys[i]
        break
      }
    }

    // 准备数据
    const labels = data.map(row => String(row[labelField] || ''))
    const values = data.map(row => {
      const val = row[valueField]
      return typeof val === 'number' ? val : parseFloat(val) || 0
    })

    const config = {
      type: chartType,
      data: {
        labels: labels,
        datasets: [{
          label: valueField,
          data: values,
          backgroundColor: this.generateColors(data.length),
          borderColor: this.generateColors(data.length),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `数据查询结果 - ${chartType.toUpperCase()}图`,
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: chartType === 'pie',
            position: 'top'
          }
        },
        scales: chartType !== 'pie' ? {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: valueField
            }
          },
          x: {
            title: {
              display: true,
              text: labelField
            }
          }
        } : {}
      }
    }

    return config
  }

  // 生成颜色数组
  generateColors(count) {
    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#f5576c',
      '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
      '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3',
      '#d299c2', '#fef9d7', '#667eea', '#764ba2'
    ]
    
    const result = []
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length])
    }
    return result
  }

  // 保存图表到文件
  async saveChart(imageBuffer, filename) {
    const uploadsDir = path.join(__dirname, '../uploads')
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    const filepath = path.join(uploadsDir, filename)
    fs.writeFileSync(filepath, imageBuffer)
    
    return filepath
  }

  // 生成图表文件名
  generateFilename(queryType = 'query') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    return `chart-${queryType}-${timestamp}.png`
  }
}

module.exports = { ChartGenerator }
