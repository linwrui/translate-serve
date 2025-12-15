const fetch = require('node-fetch');

// 测试分批翻译功能
async function testBatchTranslate() {
  try {
    // 创建超过16个元素的测试数组
    const strList = [];
    for (let i = 0; i < 20; i++) {
      strList.push(`这是测试文本 ${i + 1}`);
    }
    
    console.log('发送翻译请求，包含', strList.length, '个文本');
    
    const response = await fetch('http://localhost:3001/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        strList: strList,
        fromKey: 'zh',
        toKey: 'en',
        engine: 'volc',
      }),
    });

    const result = await response.json();
    console.log('翻译结果:', result);
    
    if (result.success) {
      console.log('翻译成功，返回了', result.translations.length, '个结果');
      console.log('结果示例:', result.translations.slice(0, 3));
    } else {
      console.error('翻译失败:', result.error);
    }
  } catch (error) {
    console.error('测试失败:', error);
    console.error('注意：如果出现API密钥错误，这是正常的，因为我们没有配置实际的火山翻译API密钥');
    console.error('但我们可以通过服务日志看到分批处理的逻辑是否正常执行');
  }
}

// 执行测试
testBatchTranslate();
