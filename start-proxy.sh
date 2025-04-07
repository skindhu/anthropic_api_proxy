#!/bin/bash

# 检查PM2是否安装
if ! command -v pm2 &> /dev/null; then
  echo "PM2未安装，正在安装..."
  npm install -g pm2
fi

# 检查项目是否已构建
if [ ! -d "dist" ]; then
  echo "构建项目..."
  npm run build
fi

# 创建logs目录（如果不存在）
mkdir -p logs

# 启动服务
echo "正在启动Anthropic API代理服务..."
pm2 start ecosystem.config.js

# 显示服务状态
pm2 status

echo "服务已启动! 访问地址: http://localhost:$(grep PORT .env | cut -d= -f2)/health"