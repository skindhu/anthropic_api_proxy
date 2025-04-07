import { Request, Response, NextFunction } from 'express';
import anthropicService from '../services/anthropic';
import logger from '../utils/logger';

export const proxyRequest = async (req: Request, res: Response, next: NextFunction) => {
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
      next(error); // 将错误传递给错误处理中间件
    }
  }
};