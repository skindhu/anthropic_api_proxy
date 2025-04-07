import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  anthropic: {
    baseUrl: process.env.ANTHROPIC_API_BASE_URL || 'https://api.anthropic.com',
  },
  auth: {
    proxyApiKey: process.env.PROXY_API_KEY, // 可选的代理服务认证密钥
  },
};