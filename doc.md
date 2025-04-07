# Anthropic API 代理服务器实现方案（修订版）

## 1. 需求分析（更新）

搭建一个代理服务，使客户端能够通过此服务访问Anthropic的API，主要功能包括：

1. 接收客户端的请求，包括客户端提供的Anthropic API密钥
2. 将请求（包括API密钥）转发到Anthropic API
3. 将Anthropic API的响应返回给客户端
4. 处理错误和异常情况
5. 提供基本的请求日志和监控（注意不记录敏感信息如API密钥）

## 2. 技术栈

- 运行环境: Node.js (推荐v18+)
- 开发语言: TypeScript
- Web框架: Express.js
- HTTP客户端: Axios
- 配置管理: dotenv
- 日志管理: Winston

## 3. 项目结构

```
anthropic-proxy/
├── src/
│   ├── config/
│   │   └── index.ts       # 配置文件
│   ├── controllers/
│   │   └── proxy.ts       # 代理控制器
│   ├── middlewares/
│   │   ├── auth.ts        # 认证中间件（可选）
│   │   ├── error.ts       # 错误处理中间件
│   │   └── logging.ts     # 日志中间件
│   ├── services/
│   │   └── anthropic.ts   # Anthropic API 服务
│   ├── utils/
│   │   └── logger.ts      # 日志工具
│   └── app.ts             # 应用入口
├── .env                   # 环境变量
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## 4. 环境准备

### 4.1 系统要求

- 操作系统: Linux (CentOS, Ubuntu等)
- Node.js: v18.0.0或更高版本
- npm: v8.0.0或更高版本

### 4.2 安装Node.js和npm

在CentOS上:

```bash
# 安装Node.js和npm
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 验证安装
node -v
npm -v
```

在Ubuntu上:

```bash
# 安装Node.js和npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node -v
npm -v
```

## 5. 项目初始化

```bash
# 创建项目目录
mkdir anthropic-proxy
cd anthropic-proxy

# 初始化npm项目
npm init -y

# 安装依赖
npm install express axios dotenv winston cors helmet
npm install --save-dev typescript @types/node @types/express ts-node nodemon @types/cors

# 初始化TypeScript配置
npx tsc --init
```

## 6. 配置文件

### 6.1 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### 6.2 .env

```
# Server settings
PORT=3000
NODE_ENV=production

# Anthropic API settings
ANTHROPIC_API_BASE_URL=https://api.anthropic.com

# Auth settings (optional - for proxy access, not Anthropic API)
PROXY_API_KEY=your_proxy_api_key
```

## 7. 代码实现

### 7.1 配置管理 (src/config/index.ts)

```typescript
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  anthropic: {
    baseUrl: process.env.ANTHROPIC_API_BASE_URL || 'https://api.anthropic.com',
  },
  auth: {
    proxyApiKey: process.env.PROXY_API_KEY, // 可选的代理服务认证密钥
  },
};
```

### 7.2 日志工具 (src/utils/logger.ts)

```typescript
import winston from 'winston';
import config from '../config';

// 创建一个日志格式化器，排除敏感信息
const sanitizeLogFormat = winston.format((info) => {
  // 如果info对象包含headers，创建一个不包含敏感信息的副本
  if (info.headers) {
    const sanitizedHeaders = { ...info.headers };
    // 删除可能包含API密钥的头信息
    delete sanitizedHeaders['x-api-key'];
    delete sanitizedHeaders['authorization'];
    info.headers = sanitizedHeaders;
  }

  // 如果日志中包含请求体，也要删除可能的敏感信息
  if (info.body && typeof info.body === 'object') {
    const sanitizedBody = { ...info.body };
    delete sanitizedBody.api_key;
    info.body = sanitizedBody;
  }

  return info;
});

const logger = winston.createLogger({
  level: config.server.env === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    sanitizeLogFormat(),
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

export default logger;
```

### 7.3 认证中间件 (src/middlewares/auth.ts)

```typescript
import { Request, Response, NextFunction } from 'express';
import config from '../config';

// 注意：这是可选的代理服务认证，不是Anthropic API认证
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 如果未设置代理API密钥，则跳过认证
  if (!config.auth.proxyApiKey) {
    return next();
  }

  const proxyApiKey = req.headers['proxy-api-key'];

  if (!proxyApiKey || proxyApiKey !== config.auth.proxyApiKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid proxy API key' });
  }

  next();
};

// 验证请求中是否包含Anthropic API密钥
export const validateAnthropicApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Missing Anthropic API key. Please provide it in the x-api-key header.'
    });
  }

  next();
};
```

### 7.4 日志中间件 (src/middlewares/logging.ts)

```typescript
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // 创建一个不包含敏感信息的请求对象副本
  const sanitizedReq = {
    method: req.method,
    url: req.url,
    // 不记录请求头和请求体中的敏感信息
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      ...sanitizedReq,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
};
```

### 7.5 错误处理中间件 (src/middlewares/error.ts)

```typescript
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 创建一个不包含敏感信息的请求对象副本
  const sanitizedReq = {
    method: req.method,
    url: req.url,
    // 不记录请求头和请求体中的敏感信息
  };

  logger.error({
    message: err.message,
    stack: err.stack,
    ...sanitizedReq,
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};
```

### 7.6 Anthropic API 服务 (src/services/anthropic.ts)

```typescript
import axios, { AxiosRequestConfig } from 'axios';
import config from '../config';
import logger from '../utils/logger';

class AnthropicService {
  private baseURL: string;

  constructor() {
    this.baseURL = config.anthropic.baseUrl;
  }

  async proxyRequest(path: string, method: string, headers: any, body: any) {
    try {
      // 从请求头中获取Anthropic API密钥
      const anthropicApiKey = headers['x-api-key'];

      // 创建新的请求头，保留原始头信息
      const forwardHeaders = { ...headers };

      // 移除不需要转发的头信息
      delete forwardHeaders.host;
      delete forwardHeaders['content-length'];
      delete forwardHeaders['proxy-api-key']; // 移除代理的API密钥（如果有）

      // 确保x-api-key和anthropic-version存在
      if (!forwardHeaders['anthropic-version']) {
        forwardHeaders['anthropic-version'] = '2023-06-01';
      }

      // 确保content-type正确
      if (!forwardHeaders['content-type']) {
        forwardHeaders['content-type'] = 'application/json';
      }

      const requestConfig: AxiosRequestConfig = {
        method: method as any,
        url: this.baseURL + path,
        headers: forwardHeaders,
        data: method !== 'GET' ? body : undefined,
        params: method === 'GET' ? body : undefined,
        responseType: 'stream', // 使用流处理以支持SSE
      };

      logger.debug(`Proxying request to Anthropic API: ${method} ${path}`);
      return await axios.request(requestConfig);
    } catch (error: any) {
      logger.error('Error proxying request to Anthropic API:', error.message);
      throw error;
    }
  }
}

export default new AnthropicService();
```

### 7.7 代理控制器 (src/controllers/proxy.ts)

```typescript
import { Request, Response } from 'express';
import anthropicService from '../services/anthropic';
import logger from '../utils/logger';

export const proxyRequest = async (req: Request, res: Response) => {
  try {
    // 提取路径，移除前导的/v1前缀
    const path = req.path;

    // 调用Anthropic服务
    const response = await anthropicService.proxyRequest(
      path,
      req.method,
      req.headers,
      req.body
    );

    // 将Anthropic API的响应头转发给客户端
    Object.entries(response.headers).forEach(([key, value]) => {
      if (value !== undefined) {
        res.setHeader(key, value as string);
      }
    });

    // 将响应状态码设置为Anthropic API的状态码
    res.status(response.status);

    // 将Anthropic API的响应体转发给客户端
    response.data.pipe(res);
  } catch (error: any) {
    // 如果Anthropic API返回错误，将错误转发给客户端
    if (error.response) {
      const { status, headers, data } = error.response;

      // 设置响应头
      Object.entries(headers).forEach(([key, value]) => {
        if (value !== undefined) {
          res.setHeader(key, value as string);
        }
      });

      // 设置状态码并返回错误数据
      res.status(status);

      // 如果响应是流，则转发流
      if (data && typeof data.pipe === 'function') {
        data.pipe(res);
      } else {
        res.json(data);
      }
    } else {
      // 对于网络错误等，返回500错误
      logger.error('Proxy error:', error.message);
      res.status(500).json({
        error: 'Proxy Error',
        message: error.message,
      });
    }
  }
};
```

### 7.8 应用入口 (src/app.ts)

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authMiddleware, validateAnthropicApiKey } from './middlewares/auth';
import { loggingMiddleware } from './middlewares/logging';
import { errorHandler } from './middlewares/error';
import { proxyRequest } from './controllers/proxy';
import config from './config';
import logger from './utils/logger';

// 创建Express应用
const app = express();

// 应用中间件
app.use(helmet()); // 安全头
app.use(cors()); // CORS
app.use(express.json({ limit: '10mb' })); // 解析JSON请求体
app.use(loggingMiddleware); // 请求日志
app.use(authMiddleware); // 可选的代理服务认证

// 代理所有/v1路径的请求到Anthropic API，验证API密钥存在
app.all('/v1/*', validateAnthropicApiKey, proxyRequest);

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 错误处理中间件
app.use(errorHandler);

// 启动服务器
const PORT = config.server.port;
app.listen(PORT, () => {
  logger.info(`Anthropic API Proxy server running on port ${PORT}`);
});

export default app;
```

## 8. 项目运行和部署

### 8.1 添加npm脚本 (package.json)

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/app.js",
    "dev": "nodemon --exec ts-node src/app.ts",
    "lint": "eslint src/**/*.ts"
  }
}
```

### 8.2 开发环境运行

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev
```

### 8.3 生产环境部署

```bash
# 构建项目
npm run build

# 创建logs目录
mkdir -p logs

# 启动服务
npm start
```

### 8.4 使用PM2进行进程管理

```bash
# 安装PM2
npm install -g pm2

# 创建PM2配置文件 ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'anthropic-proxy',
    script: 'dist/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF

# 启动服务
pm2 start ecosystem.config.js
```

## 9. 使用示例

### 9.1 使用curl调用代理

```bash
curl -X POST http://your-proxy-domain/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk-ant-api03-xxxxxxxxxxxx" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "Hello, Claude!"}
    ]
  }'
```

### 9.2 SSE流式响应

```bash
curl -X POST http://your-proxy-domain/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk-ant-api03-xxxxxxxxxxxx" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "stream": true,
    "messages": [
      {"role": "user", "content": "Hello, Claude!"}
    ]
  }'
```

## 10. 安全考虑

1. **保护客户端API密钥**:
   - 确保使用HTTPS来加密传输数据，防止API密钥被拦截
   - 日志中不记录包含API密钥的信息
   - 考虑在服务器端对常用的API密钥进行缓存，减少传输次数（可选）

2. **代理服务安全**:
   - 考虑添加额外的认证机制（如PROXY_API_KEY）来保护代理服务
   - 定期更新依赖以修复安全漏洞
   - 考虑添加请求速率限制以防止滥用
   - 不要在日志中记录敏感信息

## 11. 监控和维护

1. 设置日志轮换以避免磁盘空间耗尽
2. 定期检查日志文件了解系统健康状况
3. 考虑使用监控工具如Prometheus或Grafana
4. 定期备份配置文件和日志

## 12. 故障排除

常见问题及解决方案：

1. **连接超时**：检查网络连接和防火墙设置
2. **认证失败**：确认客户端提供的Anthropic API密钥格式正确
3. **内存溢出**：调整Node.js内存限制或优化代码
4. **请求失败**：检查请求格式是否符合Anthropic API的要求