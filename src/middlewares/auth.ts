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