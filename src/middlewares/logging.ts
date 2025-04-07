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