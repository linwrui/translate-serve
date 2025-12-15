import { TranslateOptions } from './options'
import { Signer } from '@volcengine/openapi'
import dotenv from 'dotenv'
import fetch from 'node-fetch'

// 加载环境变量
dotenv.config({ path: '.env.local' })

// 从环境变量获取火山翻译的密钥
const VOLC_ACCESS_KEY = process.env.VOLC_ACCESS_KEY || ''
const VOLC_SECRET_KEY = process.env.VOLC_SECRET_KEY || ''

// 火山翻译 API 配置
const API_HOST = 'translate.volcengineapi.com'
const API_PATH = '/'
const SERVICE_NAME = 'translate'
const REGION = 'cn-north-1'

// 将数组按每16个元素分组
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

// 延迟函数
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 发送单个批次的翻译请求
async function sendTranslateRequest(textList: string[], fromKey: string, toKey: string) {
  // 准备请求数据
  const requestData = {
    SourceLanguage: fromKey === 'zh-cn' ? 'zh' : fromKey === 'auto' ? '' : fromKey, // 空字符串表示自动检测
    TargetLanguage: toKey,
    TextList: textList, // 火山引擎按 Token 计费，使用分隔符会增加冗余 Token 使用
  }

  // 准备请求配置
  const requestConfig = {
    method: 'POST',
    region: REGION,
    params: {
      Action: 'TranslateText',
      Version: '2020-06-01',
    },
    headers: {
      'Content-Type': 'application/json',
      'Host': API_HOST,
    },
    body: JSON.stringify(requestData),
  }

  // 创建签名器
  const signer = new Signer(requestConfig, SERVICE_NAME)

  // 添加签名
  signer.addAuthorization({ 
    accessKeyId: VOLC_ACCESS_KEY, 
    secretKey: VOLC_SECRET_KEY,
    sessionToken: '',
  })

  // 构建完整的请求 URL
  const queryString = Object.keys(requestConfig.params)
    .map(key => `${key}=${encodeURIComponent(requestConfig.params[key as keyof typeof requestConfig.params])}`)
    .join('&')
  const url = `https://${API_HOST}${API_PATH}?${queryString}`

  // 发送请求
  const response = await fetch(url, {
    method: requestConfig.method,
    headers: requestConfig.headers,
    body: requestConfig.body,
  })

  // 处理响应
  const responseData = await response.json()

  // 检查是否有错误
  if (responseData.ResponseMetadata && responseData.ResponseMetadata.Error) {
    const error = responseData.ResponseMetadata.Error
    throw new Error(`${error.Code}: ${error.Message}`)
  }

  // 返回翻译结果
  if (responseData.TranslationList && responseData.TranslationList.length > 0) {
    return responseData.TranslationList
  } else {
    throw new Error('翻译结果为空')
  }
}

export default async function (text: string, options: TranslateOptions) {
  const { fromKey = 'auto', toKey = 'en', separator = '' } = options
  const transList = text.split(separator)
  
  // 如果没有需要翻译的内容，直接返回
  if (transList.length === 0) {
    return ''
  }
  
  // 如果只有一个元素且为空，直接返回
  if (transList.length === 1 && transList[0] === '') {
    return ''
  }
  
  try {
    // 将文本列表按每16个分组
    const chunks = chunkArray(transList, 16)
    const allResults: string[] = []
    
    console.log(`[火山翻译] 开始分批翻译，共 ${transList.length} 个文本，分为 ${chunks.length} 批`)
    
    // 分批发送请求，每批间隔1秒
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      console.log(`[火山翻译] 发送第 ${i + 1}/${chunks.length} 批请求，包含 ${chunk.length} 个文本`)
      
      const results = await sendTranslateRequest(chunk, fromKey, toKey)
      
      // 提取翻译结果并添加到总结果中
      results.forEach((result: { Translation: string }) => {
        allResults.push(result.Translation || chunk[results.indexOf(result)])
      })
      
      console.log(`[火山翻译] 第 ${i + 1}/${chunks.length} 批请求完成，翻译了 ${results.length} 个文本`)
      
      // 如果不是最后一批，等待1秒
      if (i < chunks.length - 1) {
        console.log(`[火山翻译] 等待1秒后发送下一批请求`)
        await delay(1000)
      }
    }
    
    console.log(`[火山翻译] 所有批次翻译完成，共处理 ${allResults.length} 个文本`)
    
    // 合并结果并返回
    return allResults.join(separator)
  } catch (error: any) {
    console.error('火山翻译 API 错误:', error)
    throw error
  }
}
