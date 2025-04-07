import axios, { AxiosRequestConfig, AxiosError } from 'axios';
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

      // 记录请求信息（不包含密钥）
      logger.debug('Anthropic API请求配置:', {
        method,
        path,
        hasApiKey: !!anthropicApiKey,
        anthropicVersion: forwardHeaders['anthropic-version'],
        contentType: forwardHeaders['content-type'],
        bodyFields: body ? Object.keys(body) : []
      });

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
      // 详细记录错误信息
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        if (axiosError.response) {
          // 服务器返回了错误状态码
          logger.error('Anthropic API 返回错误:', {
            status: axiosError.response.status,
            statusText: axiosError.response.statusText,
            method,
            path,
            responseData: axiosError.response.data
          });
        } else if (axiosError.request) {
          // 请求已发送但未收到响应
          logger.error('未收到Anthropic API响应:', {
            method,
            path,
            request: axiosError.request,
            message: axiosError.message
          });
        } else {
          // 请求设置时出错
          logger.error('Anthropic API请求配置错误:', {
            method,
            path,
            message: axiosError.message
          });
        }
      } else {
        // 非Axios错误
        logger.error('调用Anthropic API时出现非HTTP错误:', {
          method,
          path,
          errorType: error.constructor.name,
          message: error.message,
          stack: error.stack
        });
      }

      // 重新抛出错误，让上层处理
      throw error;
    }
  }
}

export default new AnthropicService();