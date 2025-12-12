import express from 'express'
import cors from 'cors'
import _ from 'lodash'

import googleTranslate from './translate/google-translate'

// 日志颜色配置
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
}

const app = express()
// 允许跨域
app.use(cors())
// 解析 JSON 请求体
app.use(express.json())

const transMap: Record<string, Record<string, string>> = {}

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '翻译服务运行正常' })
})
app.post('/clearCache', (req, res) => {
  for (const engine in transMap) {
    transMap[engine] = {}
  }
  console.log(`${colors.cyan}[信息]${colors.reset} 缓存已清空`)
  res.json({ success: true, message: '缓存已清空' })
})

// 翻译接口
app.post('/translate', async (req, res) => {
  try {
    const { strList, fromKey='zh-cn', toKey='en', useCache = true, engine = 'google', dict = {} } = req.body
    const mapKey = `${engine}_${fromKey}-${toKey}`
    if (!transMap[mapKey]) {
      transMap[mapKey] = {}
    }
    const engineTransMap = useCache ? transMap[mapKey] : {}
    const targetDic: Record<string, string> = {}
    if (dict) {
      // 转换为目标字典格式
      for (const key in dict) {
        // 过滤空值
        if (!dict[key]) {
          continue
        }
        // 提取字典值
        const target = typeof dict[key] === 'object' ? dict[key][toKey] : dict[key]
        if (target) {
          targetDic[key] = target
        }
      }
      Object.assign(engineTransMap, targetDic)
    }
    // 验证参数
    if (!Array.isArray(strList) || strList.length === 0) {
      return res.status(400).json({ error: 'strList 必须是非空数组' })
    }

    // 使用特殊分隔符连接字符串，一次性翻译
    const SEPARATOR = '\n--$$$--\n'

    console.log(`${colors.cyan}[信息]${colors.reset} 翻译请求:`, JSON.stringify(req.body))

    const unTransList = strList
      .filter(o => !engineTransMap[o])
      .map(txt => {
        let transText = txt
        for (const key in targetDic) {
          // 替换文本中的专有名词
          while (transText.includes(key)) {
            console.log(`${colors.yellow}[替换]${colors.reset} 替换专有名词 "${key}" 为 "${targetDic[key]}"`)
            transText = transText.replace(key, targetDic[key])
          }
        }
        return { transText, sourceText: txt }
      })
    if (unTransList.length === 0) {
      console.log(`${colors.green}[成功]${colors.reset} 所有字符串已翻译，直接返回缓存结果`)
      return res.json({
        success: true,
        translations: strList.map(o => engineTransMap[o] || o),
      })
    }
    const joinedStr = unTransList.map(o => o.transText).join(SEPARATOR)
    let text = ''
    // 调用翻译 API

    console.log(`${colors.blue}[调用]${colors.reset} ---调用 ${_.upperFirst(engine)} 翻译 API---`)

    switch (_.upperFirst(_.camelCase(engine))) {
      case 'Google':
        text = await googleTranslate(joinedStr, req.body)
        break
      default:
        // TODO 接入其他引擎
        break
    }
    const results = text.split(SEPARATOR)
    results.forEach((o, index) => {
      engineTransMap[unTransList[index].sourceText] = o
    })
    const transResult = strList.map(o => engineTransMap[o] || o)
    console.log(`${colors.green}[成功]${colors.reset} ---翻译完成---`)
    res.json({ success: true, translations: transResult })
  } catch (error: any) {
    console.error(`${colors.red}[错误]${colors.reset} ---翻译失败---`)
    console.error(`${colors.red}[错误]${colors.reset} 错误详情:`, error.message, error.code)

    // 处理代理连接错误
    if (error.message.includes('tunneling socket could not be established') || error.message.includes('ECONNREFUSED')) {
      res.status(500).json({
        error: '代理连接失败，请检查代理服务器是否运行',
        details: error.message,
      })
    } else {
      res.status(500).json({
        error: '翻译失败，请稍后重试',
        details: error.message,
      })
    }
  }
})

const PORT = process.env.PORT || 3001
app.listen(+PORT, '0.0.0.0', () => {
  console.log(`${colors.green}[成功]${colors.reset} 翻译服务已启动，监听端口 ${PORT}`)
  console.log(`${colors.blue}[地址]${colors.reset} 健康检查: http://localhost:${PORT}/health`)
  console.log(`${colors.blue}[地址]${colors.reset} 健康检查: http://0.0.0.0:${PORT}/health`)
  console.log(`${colors.blue}[地址]${colors.reset} 翻译接口: http://localhost:${PORT}/translate`)
  console.log(`${colors.blue}[地址]${colors.reset} 翻译接口: http://0.0.0.0:${PORT}/translate`)
})
