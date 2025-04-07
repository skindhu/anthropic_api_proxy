import winston from 'winston';
import config from '../config';

// 创建一个日志格式化器，排除敏感信息
const sanitizeLogFormat = winston.format((info) => {
  // 如果info对象包含headers，创建一个不包含敏感信息的副本
  if (info.headers && typeof info.headers === 'object') {
    const sanitizedHeaders: Record<string, any> = { ...info.headers };
    // 删除可能包含API密钥的头信息
    delete sanitizedHeaders['x-api-key'];
    delete sanitizedHeaders['authorization'];
    info.headers = sanitizedHeaders;
  }

  // 如果日志中包含请求体，也要删除可能的敏感信息
  if (info.body && typeof info.body === 'object') {
    const sanitizedBody: Record<string, any> = { ...info.body };
    delete sanitizedBody.api_key;
    info.body = sanitizedBody;
  }

  return info;
});

const logger = winston.createLogger({
  level: config.server.env === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    sanitizeLogFormat(),
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

export default logger;