import winston from 'winston';
import config from '../config';
import util from 'util';

// 自定义格式化函数，确保对象被正确序列化
const formatObject = (obj: any): string => {
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (typeof obj === 'object') {
    try {
      // 使用util.inspect进行深度对象序列化，避免[object Object]
      return util.inspect(obj, { depth: 4, colors: false, maxArrayLength: 10 });
    } catch (err) {
      return String(obj);
    }
  }
  return String(obj);
};

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

  // 确保错误对象被正确序列化
  if (info.error && typeof info.error === 'object') {
    if (info.error instanceof Error) {
      info.errorMessage = info.error.message;
      info.errorStack = info.error.stack;
      info.errorName = info.error.name;
    } else {
      info.errorDetails = formatObject(info.error);
    }
    delete info.error;
  }

  return info;
});

// 创建自定义格式化器，确保所有消息都被正确序列化
const objectFormat = winston.format((info) => {
  const args = info[Symbol.for('splat')];

  // 如果有额外参数，格式化它们
  if (args && Array.isArray(args) && args.length > 0) {
    info.message = `${info.message} ${args.map(formatObject).join(' ')}`;
  }

  return info;
});

const logger = winston.createLogger({
  level: config.server.env === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    objectFormat(),
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