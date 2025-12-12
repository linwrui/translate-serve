import { TranslateOptions } from './options'

import { translate } from '@vitalets/google-translate-api'
import tunnel from 'tunnel'

// 代理配置
const USE_PROXY = true // 设置为false以禁用代理
const proxyOption = {
  host: '127.0.0.1',
  port: 10809,
  headers: {
    'User-Agent': 'Node',
  },
}

export default async function (text: string, options: TranslateOptions) {
  const { fromKey = 'zh-cn', toKey = 'en', useProxy = USE_PROXY } = options

  // 准备翻译配置
  const translateOptions = {
    from: fromKey,
    to: toKey,
    fetchOptions: {},
  }

  // 如果使用代理，添加代理配置
  if (useProxy) {
    translateOptions.fetchOptions = {
      agent: tunnel.httpsOverHttp({
        proxy: proxyOption,
      }),
    }
  }

  const res = await translate(text, translateOptions)
  return res.text
}