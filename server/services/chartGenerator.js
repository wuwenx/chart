const { createCanvas } = require('canvas')
const { PromptTemplate } = require('langchain/prompts')
const { LLMChain } = require('langchain/chains')
const { AIModelManager } = require('./aiModelManager')
const fs = require('fs')
const path = require('path')

class ChartGenerator {
  constructor() {
    this.width = 1200
    this.height = 800
    this.aiManager = new AIModelManager()
    this.llm = this.aiManager.getLLM()
    this.setupPrompts()
  }

  setupPrompts() {
    // ECharts 配置生成提示模板
    this.echartsConfigPrompt = new PromptTemplate({
      inputVariables: ['question', 'queryData', 'dataFields'],
      template: `你是一个专业的 ECharts 图表配置专家。根据用户的查询问题和数据结果，生成最适合的 ECharts 图表配置。

用户问题：{question}

查询数据示例（前5条）：
{queryData}

数据字段说明：
{dataFields}

请根据数据特征和用户问题的意图，选择最合适的图表类型，并生成完整的 ECharts 配置 JSON。

可选图表类型：
- bar（柱状图）：适用于分类数据对比
- line（折线图）：适用于趋势分析、时间序列
- pie（饼图）：适用于占比分析
- scatter（散点图）：适用于相关性分析
- radar（雷达图）：适用于多维度对比
- gauge（仪表盘）：适用于单一指标展示
- funnel（漏斗图）：适用于流程分析
- heatmap（热力图）：适用于二维数据展示

要求：
1. 选择最符合用户问题意图的图表类型
2. 合理设置标题、图例、坐标轴等
3. 使用美观的颜色方案
4. 根据数据特点设置合适的 tooltip、数据标签等
5. 返回标准的 ECharts option JSON 配置
6. 只返回 JSON 配置，不要其他解释文字
7. 确保所有字段名与实际数据字段名完全匹配

ECharts 配置 JSON（只返回 JSON，不要 markdown 代码块）：
`
    })
  }

  // 根据查询结果和用户问题生成 ECharts 图表
  async generateChart(queryResult, question = '', chartType = 'auto') {
    try {
      if (!queryResult || queryResult.length === 0) {
        throw new Error('没有数据可以生成图表')
      }

      console.log('📊 开始生成图表，数据条数:', queryResult.length)
      console.log('📝 用户问题:', question)
      
      // 使用 AI 生成 ECharts 配置
      const echartsOption = await this.generateEChartsConfig(queryResult, question, chartType)
      
      console.log('✅ ECharts 配置生成完成，图表类型:', echartsOption.series?.[0]?.type || 'unknown')
      
      // 渲染图表为图片
      console.log('🎨 开始渲染图表...')
      const imageBuffer = await this.renderEChartsToImage(echartsOption)
      
      console.log('✅ 图表渲染完成，图片大小:', imageBuffer.length, 'bytes')
      
      // 返回图片缓冲区和 ECharts 配置，供前端使用
      return {
        imageBuffer: imageBuffer,
        echartsOption: echartsOption,
        rawData: queryResult  // 同时返回原始数据
      }
    } catch (error) {
      console.error('❌ 图表生成失败:', error)
      console.error('错误堆栈:', error.stack)
      throw error
    }
  }

  // 使用 AI 生成 ECharts 配置
  async generateEChartsConfig(data, question, chartType = 'auto') {
    try {
      // 准备数据示例（前5条）
      const sampleData = data.slice(0, Math.min(5, data.length))
      
      // 获取数据字段信息
      const fields = Object.keys(data[0])
      const fieldsDescription = fields.map(field => {
        const sampleValue = data[0][field]
        const fieldType = typeof sampleValue === 'number' ? '数值' : '文本'
        return `- ${field}: ${fieldType}类型`
      }).join('\n')

      // 构建 AI 提示
      const chain = new LLMChain({
        llm: this.llm,
        prompt: this.echartsConfigPrompt
      })

      const response = await chain.call({
        question: question || '数据可视化',
        queryData: JSON.stringify(sampleData, null, 2),
        dataFields: fieldsDescription
      })

      // 提取 JSON 配置
      let configText = response.text.trim()
      
      // 移除可能的 markdown 代码块标记
      configText = configText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      
      // 解析 JSON
      let echartsOption
      try {
        echartsOption = JSON.parse(configText)
        console.log('✅ AI 生成的配置解析成功')
      } catch (parseError) {
        console.error('⚠️ AI 返回的配置解析失败，错误:', parseError.message)
        console.error('AI 返回的原始文本:', configText.substring(0, 500))
        // 如果解析失败，使用默认配置
        console.log('📋 使用默认配置生成图表')
        echartsOption = this.generateDefaultConfig(data, chartType)
      }

      // 确保数据正确设置
      console.log('📊 处理数据到配置中...')
      echartsOption = this.processDataIntoConfig(echartsOption, data)
      console.log('✅ 数据填充完成')
      
      return echartsOption
    } catch (error) {
      console.error('生成 ECharts 配置失败:', error)
      // 失败时使用默认配置
      return this.generateDefaultConfig(data, chartType)
    }
  }

  // 将查询结果数据设置到 ECharts 配置中
  processDataIntoConfig(config, data) {
    const fields = Object.keys(data[0])
    
    // 检测图表类型
    const detectedType = config.series?.[0]?.type || 'bar'
    
    // 如果是饼图
    if (detectedType === 'pie') {
      const labelField = fields[0]
      const valueField = fields[1] || fields.find(f => {
        const val = data[0][f]
        return typeof val === 'number'
      }) || fields[1]
      
      config.series = [{
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}: {c} ({d}%)'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold'
          }
        },
        data: data.map(row => ({
          value: row[valueField],
          name: String(row[labelField] || '')
        }))
      }]
    }
    // 如果是柱状图或折线图
    else if (detectedType === 'bar' || detectedType === 'line') {
      const xField = fields[0]
      const yFields = fields.slice(1).filter(f => {
        const val = data[0][f]
        return typeof val === 'number' || !isNaN(parseFloat(val))
      })
      
      // 如果没有找到数值字段，尝试使用所有字段
      if (yFields.length === 0 && fields.length > 1) {
        yFields.push(fields[1])
      }
      
      const categories = data.map(row => String(row[xField] || ''))
      
      config.xAxis = config.xAxis || { type: 'category', data: categories }
      config.xAxis.data = categories
      
      // 如果 AI 已经生成了 series，保留它们但更新数据
      const existingSeries = config.series || []
      const hasExistingSeries = existingSeries.length > 0 && existingSeries[0].data && existingSeries[0].data.length > 0
      
      if (hasExistingSeries) {
        // AI 已经生成了数据，只需要确保格式正确
        config.series = existingSeries.map((s, index) => ({
          ...s,
          type: detectedType,
          data: s.data || []
        }))
      } else {
        // 使用实际数据填充
        config.series = yFields.map((field, index) => ({
          name: field,
          type: detectedType,
          data: data.map(row => {
            const val = row[field]
            return typeof val === 'number' ? val : parseFloat(val) || 0
          }),
          itemStyle: {
            color: this.generateColor(index)
          },
          smooth: detectedType === 'line',
          ...(existingSeries[index] || {})
        }))
      }
    }
    // 如果是散点图
    else if (detectedType === 'scatter') {
      const xField = fields[0]
      const yField = fields[1] || fields.find(f => {
        const val = data[0][f]
        return typeof val === 'number'
      })
      
      config.xAxis = config.xAxis || { type: 'value' }
      config.yAxis = config.yAxis || { type: 'value' }
      
      config.series = [{
        type: 'scatter',
        data: data.map(row => [row[xField], row[yField]]),
        symbolSize: (data) => {
          return 20
        },
        ...config.series?.[0]
      }]
    }
    
    // 确保标题
    if (!config.title) {
      config.title = {
        text: '数据可视化图表',
        left: 'center',
        textStyle: {
          fontSize: 18,
          fontWeight: 'bold'
        }
      }
    }
    
    // 确保 tooltip
    if (!config.tooltip) {
      config.tooltip = {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      }
    }
    
    // 确保有图例
    if (!config.legend && config.series.length > 1) {
      config.legend = {
        top: '10%',
        left: 'center'
      }
    }
    
    return config
  }

  // 生成默认 ECharts 配置
  generateDefaultConfig(data, chartType = 'auto') {
    const fields = Object.keys(data[0])
    
    // 自动检测图表类型
    if (chartType === 'auto') {
      chartType = this.detectChartType(data)
    }
    
    const xField = fields[0]
    const numericFields = fields.filter(f => {
      const val = data[0][f]
      return typeof val === 'number' || !isNaN(parseFloat(val))
    })
    const yField = numericFields[0] || fields[1]
    
    const categories = data.map(row => String(row[xField] || ''))
    const values = data.map(row => {
      const val = row[yField]
      return typeof val === 'number' ? val : parseFloat(val) || 0
    })
    
    const baseConfig = {
      title: {
        text: '数据查询结果可视化',
        left: 'center',
        textStyle: {
          fontSize: 18,
          fontWeight: 'bold',
          color: '#333'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      }
    }
    
    if (chartType === 'pie') {
      return {
        ...baseConfig,
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
          orient: 'vertical',
          left: 'left'
        },
        series: [{
          name: yField,
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: '{b}: {c} ({d}%)'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 20,
              fontWeight: 'bold'
            }
          },
          data: data.map((row, index) => ({
            value: values[index],
            name: categories[index]
          }))
        }]
      }
    } else if (chartType === 'line') {
      return {
        ...baseConfig,
        xAxis: {
          type: 'category',
          data: categories,
          axisTick: {
            alignWithLabel: true
          }
        },
        yAxis: {
          type: 'value'
        },
        series: [{
          name: yField,
          type: 'line',
          smooth: true,
          data: values,
          itemStyle: {
            color: '#667eea'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                offset: 0,
                color: 'rgba(102, 126, 234, 0.3)'
              }, {
                offset: 1,
                color: 'rgba(102, 126, 234, 0.1)'
              }]
            }
          }
        }]
      }
    } else {
      // 默认柱状图
      return {
        ...baseConfig,
        xAxis: {
          type: 'category',
          data: categories,
          axisTick: {
            alignWithLabel: true
          }
        },
        yAxis: {
          type: 'value'
        },
        series: [{
          name: yField,
          type: 'bar',
          data: values,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [{
                offset: 0,
                color: '#667eea'
              }, {
                offset: 1,
                color: '#764ba2'
              }]
            }
          }
        }]
      }
    }
  }

  // 检测最适合的图表类型
  detectChartType(data) {
    if (data.length === 0) return 'bar'

    const firstRow = data[0]
    const keys = Object.keys(firstRow)
    
    const numericFields = keys.filter(key => {
      const value = firstRow[key]
      return typeof value === 'number' || !isNaN(parseFloat(value))
    })

    if (numericFields.length >= 2) {
      return 'line'
    } else if (numericFields.length === 1 && keys.length >= 2) {
      return 'bar'
    } else if (numericFields.length === 1) {
      return 'pie'
    } else {
      return 'bar'
    }
  }

  // 渲染 ECharts 图表为图片
  async renderEChartsToImage(option) {
    try {
      // ECharts 在 Node.js 环境中的渲染比较复杂
      // 我们使用一个简化的方法：将 ECharts 配置转换为 Chart.js 配置
      // 这样可以保持 ECharts 的配置灵活性，同时确保渲染成功
      console.log('📊 转换 ECharts 配置为 Chart.js 配置...')
      console.log('配置信息:', JSON.stringify({
        type: option.series?.[0]?.type,
        seriesCount: option.series?.length || 0,
        hasXAxis: !!option.xAxis,
        hasTitle: !!option.title
      }))
      
      // 尝试使用 Chart.js 渲染（因为它在 Node.js 中更稳定）
      // 但配置风格遵循 ECharts
      const buffer = await this.renderWithChartJS(option)
      
      if (!buffer || buffer.length === 0) {
        throw new Error('图表渲染返回空缓冲区')
      }
      
      return buffer
    } catch (error) {
      console.error('❌ 图表渲染失败:', error.message)
      console.error('错误堆栈:', error.stack)
      throw error
    }
  }

  // 备用渲染方案：将 ECharts 配置转换为 Chart.js 配置
  async renderWithChartJS(echartsOption) {
    try {
      const { ChartJSNodeCanvas } = require('chartjs-node-canvas')
      const chartJSNodeCanvas = new ChartJSNodeCanvas({
        width: this.width,
        height: this.height,
        backgroundColour: 'white'
      })
      
      // 转换 ECharts 配置到 Chart.js
      console.log('🔄 转换配置格式...')
      const chartData = this.convertEChartsToChartJS(echartsOption)
      
      console.log('📊 Chart.js 配置:', JSON.stringify({
        type: chartData.type,
        labelsCount: chartData.data?.labels?.length || 0,
        datasetsCount: chartData.data?.datasets?.length || 0
      }))
      
      console.log('🎨 开始渲染图片...')
      const imageBuffer = await chartJSNodeCanvas.renderToBuffer(chartData)
      
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Chart.js 返回空图片缓冲区')
      }
      
      console.log('✅ Chart.js 渲染成功，图片大小:', imageBuffer.length, 'bytes')
      return imageBuffer
    } catch (error) {
      console.error('❌ Chart.js 渲染失败:', error.message)
      console.error('错误详情:', error)
      throw error
    }
  }

  // 将 ECharts 配置转换为 Chart.js 配置
  convertEChartsToChartJS(echartsOption) {
    const series = echartsOption.series?.[0] || {}
    const chartType = series.type || 'bar'
    const xAxis = echartsOption.xAxis?.data || []
    const seriesData = echartsOption.series || []
    
    console.log('🔄 转换配置，图表类型:', chartType)
    console.log('   - X轴数据条数:', xAxis.length)
    console.log('   - 系列数量:', seriesData.length)
    
    // 如果图表类型是饼图
    if (chartType === 'pie') {
      const pieData = series.data || []
      return {
        type: 'pie',
        data: {
          labels: pieData.map(d => (d && d.name) ? d.name : String(d)),
          datasets: [{
            data: pieData.map(d => (d && d.value) ? d.value : Number(d) || 0),
            backgroundColor: this.generateColors(pieData.length),
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: echartsOption.title?.text || '数据图表',
              font: {
                size: 16,
                weight: 'bold'
              }
            },
            legend: {
              display: true,
              position: 'right'
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${label}: ${value} (${percentage}%)`;
                }
              }
            }
          }
        }
      }
    }
    
    // 柱状图或折线图
    const datasets = seriesData.map((s, index) => {
      const color = this.generateColor(index)
      
      return {
        label: s.name || `系列${index + 1}`,
        data: s.data || [],
        backgroundColor: s.type === 'line' ? color + '80' : color, // 80 是透明度
        borderColor: color,
        borderWidth: 2,
        fill: s.type === 'line' && s.areaStyle ? true : false,
        tension: s.smooth ? 0.4 : 0
      }
    })
    
    return {
      type: chartType === 'line' ? 'line' : 'bar',
      data: {
        labels: xAxis,
        datasets: datasets
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: echartsOption.title?.text || '数据图表',
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: datasets.length > 1,
            position: 'top'
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: chartType !== 'pie' ? {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: echartsOption.yAxis?.name || ''
            }
          },
          x: {
            title: {
              display: true,
              text: echartsOption.xAxis?.name || ''
            }
          }
        } : {}
      }
    }
  }

  // 生成颜色
  generateColor(index) {
    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#f5576c',
      '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
      '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
    ]
    return colors[index % colors.length]
  }

  // 生成颜色数组（用于饼图等）
  generateColors(count) {
    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#f5576c',
      '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
      '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3',
      '#d299c2', '#fef9d7', '#a8c0ff', '#ffd1dc'
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
