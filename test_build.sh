#!/bin/bash

# 测试编译脚本
echo "开始测试编译..."

# 检查 Go 版本
go version

# 清理模块缓存
go clean -modcache

# 下载依赖
go mod tidy

# 尝试编译
echo "开始编译..."
go build -o veloera_test

if [ $? -eq 0 ]; then
    echo "编译成功！"
    rm -f veloera_test
else
    echo "编译失败！"
    exit 1
fi
