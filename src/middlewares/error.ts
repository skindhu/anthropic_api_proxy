import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface ExtendedError extends Error {
  originalError?: any;
  requestInfo?: {
    path: string;
    method: string;
  };
  statusCode?: number;
}

export const errorHandler = (
  err: ExtendedError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 创建一个不包含敏感信息的请求对象副本
  const sanitizedReq = {
    method: req.method,
    url: req.url,
    path: req.path,
    query: req.query,
  };

  // 设置状态码，如果错误对象有自定义状态码则使用该状态码
  const statusCode = err.statusCode || 500;

  // 从错误中提取额外信息
  const errorDetails = {
    errorName: err.name,
    errorMessage: err.message,
    errorStack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    requestInfo: err.requestInfo || sanitizedReq,
    timestamp: new Date().toISOString(),
  };

  // 记录详细错误信息
  logger.error(`API错误 [${statusCode}]: ${err.message}`, errorDetails);

  // 向客户端返回友好的错误信息
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : err.name || 'Error',
    message: process.env.NODE_ENV === 'development' ? err.message : '处理请求时发生错误',
    requestId: req.headers['x-request-id'] || undefined,
    timestamp: new Date().toISOString(),
    path: req.path,
  });
};