# Anthropic API 代理服务器

安全地将客户端请求转发到Anthropic API的代理服务器。

## 功能特点

- 将客户端请求转发到Anthropic API
- 支持流式响应返回到客户端
- 处理API认证
- 提供基本的请求日志（不记录敏感信息）
- 支持SSE（Server-Sent Events）

## 系统要求

- Node.js v18.0.0 或更高版本
- npm v8.0.0 或更高版本

## 安装配置

1. 克隆仓库
2. 安装依赖:
   ```bash
   npm install
   ```
3. 在`.env`文件中配置环境变量:
   ```
   PORT=3008
   NODE_ENV=production
   ANTHROPIC_API_BASE_URL=https://api.anthropic.com
   PROXY_API_KEY=your_proxy_api_key
   ```
4. 构建应用:
   ```bash
   npm run build
   ```

## 启动服务

### 开发模式

```bash
npm run dev
```

### 生产模式

```bash
npm start
```

### 使用PM2进行进程管理（推荐用于生产环境）

我们提供了便捷的脚本来管理服务:

#### 启动服务

```bash
./start-proxy.sh
```

此脚本会:
- 检查PM2是否安装，如果没有则自动安装
- 检查项目是否已构建，如果没有则构建项目
- 创建logs目录（如果不存在）
- 启动服务并显示状态
- 输出服务访问地址

#### 停止服务

```bash
./stop-proxy.sh
```

此脚本会:
- 检查服务是否在运行
- 安全停止服务并显示状态

## 使用方法

### 发送请求

向代理服务器发送请求的方式与直接调用Anthropic API相同，只需在`x-api-key`头部中包含您的Anthropic API密钥:

```bash
curl -X POST http://localhost:3008/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk-ant-api03-xxxxxxxxxxxx" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "你好，Claude!"}
    ]
  }'
```

### 使用流式响应（SSE）:

```bash
curl -X POST http://localhost:3008/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk-ant-api03-xxxxxxxxxxxx" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "stream": true,
    "messages": [
      {"role": "user", "content": "你好，Claude!"}
    ]
  }'
```

## 安全考虑

- 所有敏感信息（API密钥）在日志中被移除
- 生产环境建议配置HTTPS（通过反向代理）
- 可选的代理服务认证机制

## 健康检查

服务提供了健康检查端点:

```bash
curl http://localhost:3008/health
```

正常情况下会返回:
```json
{"status":"ok"}
```

## 维护

- 日志文件存储在`logs`目录中
- 定期监控错误和连接问题
- 保持依赖项更新
- 通过`pm2 logs`查看实时日志

## 故障排查

如果遇到问题:

1. 检查API密钥是否正确
2. 确保端口未被占用
3. 查看日志文件了解错误详情
4. 确保网络可以访问Anthropic API