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