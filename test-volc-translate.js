const fetch = require('node-fetch');

// 测试火山翻译功能
async function testVolcTranslate() {
  try {
    const response = await fetch('http://localhost:3001/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        strList: ['Hello world', 'This is a test'],
        fromKey: 'en',
        toKey: 'zh',
        engine: 'volc',
      }),
    });

    const result = await response.json();
    console.log('翻译结果:', result);
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 执行测试
testVolcTranslate();
