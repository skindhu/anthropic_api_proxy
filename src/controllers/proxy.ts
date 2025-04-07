import { Request, Response, NextFunction } from 'express';
import anthropicService from '../services/anthropic';
import logger from '../utils/logger';

export const proxyRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 提取路径和基本请求信息，用于日志记录
    const path = req.path;
    const method = req.method;
    const hasApiKey = !!req.headers['x-api-key'];

    logger.info(`处理API请求: ${method} ${path}`, {
      path,
      method,
      hasApiKey,
      hasAnthropicVersion: !!req.headers['anthropic-version'],
      contentType: req.headers['content-type'],
      bodySize: req.body ? JSON.stringify(req.body).length : 0
    });

    // 调用Anthropic服务
    const response = await anthropicService.proxyRequest(
      path,
      method,
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

    logger.info(`成功代理请求: ${method} ${path}`, {
      status: response.status,
      path,
      method
    });

    // 将Anthropic API的响应体转发给客户端
    response.data.pipe(res);
  } catch (error: any) {
    // 如果Anthropic API返回错误，将错误转发给客户端
    if (error.response) {
      const { status, headers, data } = error.response;

      logger.warn(`Anthropic API返回错误状态码: ${status}`, {
        status,
        path: req.path,
        method: req.method
      });

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
      // 对于网络错误等，记录详细错误并传递给错误处理中间件
      const errorDetails = {
        path: req.path,
        method: req.method,
        errorName: error.name || '未知错误',
        errorMessage: error.message || '未提供错误消息',
        stack: error.stack
      };

      logger.error('代理请求时发生错误:', errorDetails);

      // 创建新的错误对象，包含更多信息
      const enhancedError = new Error(`代理请求失败: ${error.message}`);
      (enhancedError as any).originalError = error;
      (enhancedError as any).requestInfo = {
        path: req.path,
        method: req.method
      };

      next(enhancedError);
    }
  }
};