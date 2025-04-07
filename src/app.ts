import express, { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
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
app.use(loggingMiddleware as RequestHandler); // 请求日志
app.use(authMiddleware as RequestHandler); // 可选的代理服务认证

// 代理所有/v1路径的请求到Anthropic API，验证API密钥存在
app.use('/v1', validateAnthropicApiKey as RequestHandler, proxyRequest as RequestHandler);

// 健康检查端点
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// 错误处理中间件
app.use(errorHandler as ErrorRequestHandler);

// 启动服务器
const PORT = config.server.port;
app.listen(PORT, () => {
  logger.info(`Anthropic API Proxy server running on port ${PORT}`);
});

export default app;