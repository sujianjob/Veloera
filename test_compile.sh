#!/bin/bash

# 测试编译脚本 - 检查所有编译错误是否已修复
echo "🔧 开始测试编译..."

# 设置 Go 环境
export GO111MODULE=on
export GOPROXY=https://goproxy.cn,direct

# 清理缓存
echo "🧹 清理 Go 模块缓存..."
go clean -modcache

# 下载依赖
echo "📦 下载依赖..."
go mod tidy

# 检查语法错误
echo "🔍 检查语法错误..."
go vet ./...
if [ $? -ne 0 ]; then
    echo "❌ 语法检查失败！"
    exit 1
fi

# 尝试编译
echo "🔨 开始编译..."
go build -v -o veloera_test

if [ $? -eq 0 ]; then
    echo "✅ 编译成功！"
    
    # 清理测试文件
    rm -f veloera_test
    
    echo ""
    echo "🎉 所有编译错误已修复！"
    echo ""
    echo "📋 修复的主要问题："
    echo "• 修复了 BaseAdaptor 缺失的方法实现"
    echo "• 添加了缺失的 time 包导入"
    echo "• 修复了字段类型不匹配问题"
    echo "• 修复了函数调用参数不匹配"
    echo "• 添加了缺失的数据库方法"
    echo ""
    echo "🚀 现在可以进行部署测试了！"
    
else
    echo "❌ 编译失败！请检查错误信息："
    echo ""
    go build -v -o veloera_test 2>&1
    exit 1
fi
