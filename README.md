# translate-serve
基于 nodejs 的翻译服务，支持多种翻译引擎，提供批量翻译功能。

## 功能特点
- 🚀 基于 Express 框架，轻量高效
- 🌐 支持 Google 翻译引擎
- 🔥 支持火山翻译引擎
- 🔄 支持批量翻译
- 📦 内置缓存机制，提高翻译效率
- 🔌 支持代理配置
- 📡 支持跨域请求
- 📊 提供健康检查接口

## 安装步骤

### 1. 克隆仓库
```bash
git clone https://github.com/linwrui/translate-serve.git
cd translate-serve
```

### 2. 安装依赖
```bash
npm install
```

## 配置说明

### 代理配置
在 `index.js` 文件中可以配置代理：

```javascript
// 代理配置
const USE_PROXY = true; // 设置为false以禁用代理
const proxyOption = {
    host: '127.0.0.1',
    port: 10809,
    headers: {
        'User-Agent': 'Node'
    }
};
```

### 火山翻译配置

1. **创建环境变量文件**：在项目根目录创建 `.env.local` 文件

2. **配置密钥**：在 `.env.local` 文件中添加火山翻译的密钥信息：

```env
VOLC_ACCESS_KEY=your_access_key
VOLC_SECRET_KEY=your_secret_key
```

3. **获取密钥**：请从火山引擎控制台获取您的 Access Key 和 Secret Key

## 接口文档

### 1. 翻译接口
**请求地址**：`POST /translate`

**请求参数**：
| 参数名 | 类型 | 必填 | 默认值 | 描述 |
| --- | --- | --- | --- | --- |
| strList | Array<string> | 是 | - | 需要翻译的字符串数组 |
| fromKey | string | 否 | zh-cn | 源语言代码 |
| toKey | string | 否 | en | 目标语言代码 |
| useProxy | boolean | 否 | true | 是否使用代理 |
| useCache | boolean | 否 | true | 是否使用缓存 |
| engine | string | 否 | google | 翻译引擎，支持 google 和 volc |
| dict | object | 否 | {} | 自定义词典，用于覆盖翻译结果 |

**响应示例**：
```json
{
  "success": true,
  "translations": ["Hello", "World"]
}
```

### 2. 清空缓存接口
**请求地址**：`POST /clearCache`

**响应示例**：
```json
{
  "success": true,
  "message": "缓存已清空"
}
```

### 3. 健康检查接口
**请求地址**：`GET /health`

**响应示例**：
```json
{
  "status": "ok",
  "message": "翻译服务运行正常"
}
```

## 使用示例

### 示例1：基本翻译
```bash
curl -X POST http://localhost:3001/translate \
  -H "Content-Type: application/json" \
  -d '{"strList": ["你好", "世界"], "fromKey": "zh-cn", "toKey": "en"}'
```

### 示例2：使用自定义词典
```bash
curl -X POST http://localhost:3001/translate \
  -H "Content-Type: application/json" \
  -d '{"strList": ["你好", "世界"], "fromKey": "zh-cn", "toKey": "en", "dict": {"你好": "Hello"}}'
```

### 示例3：使用火山翻译引擎
```bash
curl -X POST http://localhost:3001/translate \
  -H "Content-Type: application/json" \
  -d '{"strList": ["Hello", "World"], "fromKey": "en", "toKey": "zh", "engine": "volc"}'
```

### 示例4：清空缓存
```bash
curl -X POST http://localhost:3001/clearCache
```

### 示例5：健康检查
```bash
curl http://localhost:3001/health
```

## 运行方式

### 1. 直接运行
```bash
npm start
```

### 2. 开发模式（带热重载）
```bash
npm run dev
```

### 3. 使用环境变量指定端口
```bash
PORT=3000 node index.js
```

## 项目结构

```
translate-serve/
├── index.ts                  # 主程序入口
├── package.json              # 项目配置和依赖
├── README.md                 # 项目说明文档
└── translate/                # 翻译引擎实现
    ├── google-translate.ts   # Google 翻译实现
    ├── volc-translate.ts     # 火山翻译实现
    └── options.ts            # 翻译选项类型定义
```

## 技术栈

- Node.js
- Express
- @vitalets/google-translate-api
- @volcengine/openapi
- cors
- tunnel
- dotenv
- node-fetch
- lodash

## 日志输出

服务运行时会输出彩色日志，便于区分不同类型的信息：
- 🔵 [信息] - 普通信息日志
- 🟢 [成功] - 成功状态日志
- 🔷 [调用] - API调用日志
- 🔴 [错误] - 错误日志

## 注意事项

1. 确保代理服务（如果使用）运行正常
2. 翻译引擎可能有请求频率限制，请合理使用
3. 建议在生产环境中配置合适的错误处理和监控

## 许可证

MIT
