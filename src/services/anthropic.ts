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