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

export default async function (text: string, options: TranslateOptions) {
  const { fromKey = 'auto', toKey = 'en' } = options

  try {
    // 准备请求数据
    const requestData = {
      SourceLanguage: fromKey === 'zh-cn' ? 'zh' : fromKey === 'auto' ? '' : fromKey, // 空字符串表示自动检测
      TargetLanguage: toKey,
      TextList: [text],
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

    // 提取翻译结果
    if (responseData.TranslationList && responseData.TranslationList.length > 0) {
      return responseData.TranslationList[0].Translation || text
    } else {
      throw new Error('翻译结果为空')
    }
  } catch (error: any) {
    console.error('火山翻译 API 错误:', error)
    throw error
  }
}
