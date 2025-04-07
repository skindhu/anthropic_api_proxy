#!/bin/bash

# 检查PM2是否安装
if ! command -v pm2 &> /dev/null; then
  echo "PM2未安装，无需停止服务"
  exit 0
fi

# 检查服务是否在运行
if ! pm2 list | grep -q "anthropic-proxy"; then
  echo "Anthropic API代理服务未运行"
  exit 0
fi

# 停止服务
echo "正在停止Anthropic API代理服务..."
pm2 stop anthropic-proxy

# 可选: 删除服务
# echo "正在删除服务..."
# pm2 delete anthropic-proxy

# 显示服务状态
pm2 status

echo "服务已停止!"