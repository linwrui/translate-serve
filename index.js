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
// 翻译接口
app.post('/translate', async (req, res) => {
  try {
    const { strList, fromKey = 'zh-cn', toKey = 'en', useProxy = USE_PROXY, engine='google' } = req.body;
    
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
    const SEPARATOR = '\n------\n';

    console.log('翻译请求:', JSON.stringify({ fromKey, toKey, strList, useProxy }));

    const unTransList = strList.filter(o => !transMap[o])
    const joinedStr = unTransList.join(SEPARATOR);
    let text = ''
    // 调用 Google 翻译 API
    switch(engine){
      case 'google':
        text = await googleTranslate(joinedStr, translateOptions);
        break;
      default:
        // TODO 接入其他引擎
        break;
    }
    const results = text.split(SEPARATOR);
    results.forEach((o, index) => {
      transMap[unTransList[index]] = o
    })
    const transResult = strList.map(o => transMap[o] || o)
    
    res.json({ success: true, translations: transResult });
  } catch (error) {
    console.error('翻译失败:', error);
    console.error('错误详情:', error.message, error.code);
    
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
  console.log(`翻译服务已启动，监听端口 ${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/health`);
  console.log(`健康检查: http://0.0.0.0:${PORT}/health`);
  console.log(`翻译接口: http://localhost:${PORT}/translate`);
  console.log(`翻译接口: http://0.0.0.0:${PORT}/translate`);
});
