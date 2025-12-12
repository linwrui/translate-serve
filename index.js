const express = require('express');
const { translate: googleTranslate } = require('@vitalets/google-translate-api');
const tunnel = require('tunnel');
const cors = require('cors');

const app = express();

// 代理配置
const USE_PROXY = true; // 设置为false以禁用代理
const proxyOption = {
    host: '127.0.0.1',
    port: 10809,
    headers: {
        'User-Agent': 'Node'
    }
};

// 允许跨域
app.use(cors());

// 解析 JSON 请求体
app.use(express.json());
const transMap = {}
app.post('/clearCache', (req, res) => {
  for (const engine in transMap) {
    transMap[engine] = {}
  }
  console.log(`${colors.cyan}[信息]${colors.reset} 缓存已清空`)
  res.json({ success: true, message: '缓存已清空' });
})
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
  white: '\x1b[37m'
};

// 翻译接口
app.post('/translate', async (req, res) => {
  try {
    const { strList, fromKey = 'zh-cn', toKey = 'en', useProxy = USE_PROXY, engine='google', dict={} } = req.body;
    if (!transMap[engine]) {
      transMap[engine] = {}
    }
    const engineTransMap = transMap[engine]
    const targetDic = {}
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
      return res.status(400).json({ error: 'strList 必须是非空数组' });
    }
    
   
    // 准备翻译配置
    const translateOptions = {
      from: fromKey,
      to: toKey
    };
    
    // 如果使用代理，添加代理配置
    if (useProxy) {
      translateOptions.fetchOptions = {
        agent: tunnel.httpsOverHttp({
          proxy: proxyOption
        })
      };
    }
    
    // 使用特殊分隔符连接字符串，一次性翻译
    const SEPARATOR = '\n--$$$--\n';

    console.log(`${colors.cyan}[信息]${colors.reset} 翻译请求:`, JSON.stringify({ fromKey, toKey, strList, useProxy }));

    const unTransList = strList.filter(o => !engineTransMap[o]).map(txt => {
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
      return res.json({ success: true, translations: strList.map(o => engineTransMap[o] || o) });
    }
    const joinedStr = unTransList.map(o => o.transText).join(SEPARATOR);
    let text = ''
    // 调用 Google 翻译 API
    switch(engine){
      case 'google':
        console.log(`${colors.blue}[调用]${colors.reset} ---调用 Google 翻译 API---`)
        text = await googleTranslate(joinedStr, translateOptions).then(res => res.text);
        break;
      default:
        // TODO 接入其他引擎
        break;
    }
    const results = text.split(SEPARATOR);
    results.forEach((o, index) => {
      engineTransMap[unTransList[index].sourceText] = o
    })
    const transResult = strList.map(o => engineTransMap[o] || o)
    console.log(`${colors.green}[成功]${colors.reset} ---翻译完成---`)
    res.json({ success: true, translations: transResult });
  } catch (error) {
    console.error(`${colors.red}[错误]${colors.reset} ---翻译失败---`);
    console.error(`${colors.red}[错误]${colors.reset} 错误详情:`, error.message, error.code);
    
    // 处理代理连接错误
    if (error.message.includes('tunneling socket could not be established') || error.message.includes('ECONNREFUSED')) {
      res.status(500).json({ 
        error: '代理连接失败，请检查代理服务器是否运行', 
        details: error.message 
      });
    } else {
      res.status(500).json({ 
        error: '翻译失败，请稍后重试', 
        details: error.message 
      });
    }
  }
});

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '翻译服务运行正常' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`${colors.green}[成功]${colors.reset} 翻译服务已启动，监听端口 ${PORT}`);
  console.log(`${colors.blue}[地址]${colors.reset} 健康检查: http://localhost:${PORT}/health`);
  console.log(`${colors.blue}[地址]${colors.reset} 健康检查: http://0.0.0.0:${PORT}/health`);
  console.log(`${colors.blue}[地址]${colors.reset} 翻译接口: http://localhost:${PORT}/translate`);
  console.log(`${colors.blue}[地址]${colors.reset} 翻译接口: http://0.0.0.0:${PORT}/translate`);
});
