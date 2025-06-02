#!/bin/bash

# Git 提交脚本 - Veloera 转录服务改造
# 使用方法: chmod +x git_commands.sh && ./git_commands.sh

echo "🚀 开始提交 Veloera 转录服务改造..."

# 1. 检查 Git 状态
echo "📊 检查当前 Git 状态..."
git status

# 2. 添加所有新文件和修改
echo "📁 添加所有文件到暂存区..."

# 添加后端文件
git add model/transcription.go
git add service/transcription_service.go
git add service/transcription/
git add controller/transcription.go
git add controller/transcription_admin.go
git add constant/transcription.go
git add router/transcription.go

# 添加前端文件
git add web_v2/src/components/TranscriptionUpload.tsx
git add web_v2/src/components/TranscriptionTaskList.tsx
git add web_v2/src/pages/TranscriptionPage.tsx
git add web_v2/src/services/transcription.ts

# 添加数据库迁移
git add migration/001_transcription_tables.sql

# 添加部署配置
git add docker-compose.transcription.yml
git add nginx/transcription.conf
git add scripts/deploy-transcription.sh

# 添加文档
git add docs/转录服务部署指南.md

# 添加修改的现有文件
git add model/main.go
git add model/log.go
git add model/channel.go

# 添加其他配置文件
git add test_build.sh
git add commit_message.md
git add git_commands.sh

# 3. 检查暂存区状态
echo "📋 检查暂存区状态..."
git diff --cached --name-only

# 4. 执行提交
echo "💾 执行 Git 提交..."
git commit -m "feat: 完整改造 Veloera 为音视频转录服务平台

🎯 项目改造概述
将 Veloera 从 AI 服务中转平台改造为专业的音视频转录服务平台，
保留原有的用户管理、计费、配额管理等优秀基础设施，
新增完整的转录功能和现代化的用户界面。

📊 数据库层改造
• 新增 transcription_tasks 表 - 转录任务管理
• 新增 file_storage 表 - 文件存储管理  
• 扩展 channels 表 - 支持转录引擎配置
• 扩展 logs 表 - 支持转录相关日志记录
• 提供完整的数据库迁移脚本

🔧 后端核心功能
• service/transcription_service.go - 转录服务核心逻辑
• service/transcription/ - 转录引擎适配器系统
• controller/transcription.go - 用户转录 API
• controller/transcription_admin.go - 管理员转录 API
• model/transcription.go - 转录相关数据模型

🎨 前端界面改造
• components/TranscriptionUpload.tsx - 文件上传组件
• components/TranscriptionTaskList.tsx - 任务列表组件
• pages/TranscriptionPage.tsx - 转录服务主页面
• services/transcription.ts - 前端 API 服务层

🚀 部署配置
• docker-compose.transcription.yml - 容器化部署配置
• nginx/transcription.conf - Nginx 反向代理配置
• scripts/deploy-transcription.sh - 一键部署脚本
• docs/转录服务部署指南.md - 详细部署文档

✨ 核心特性
• 多格式支持: 音频(MP3,WAV,M4A,FLAC,AAC,OGG) + 视频(MP4,AVI,MOV,MKV,WMV,FLV,WebM)
• 多语言转录: 中文、英语、日语、韩语、西班牙语、法语、德语、俄语等
• 多引擎支持: OpenAI Whisper(已实现) + 阿里云/腾讯云/百度云(接口预留)
• 实时进度: 上传和转录进度实时跟踪
• 多种输出: JSON(详细结果) + SRT(字幕) + TXT(纯文本) + VTT(Web字幕)
• 智能调度: 多引擎负载均衡、故障转移、自动重试机制
• 精确计费: 按音视频时长计费，支持预扣费、失败退款、配额管理

🔒 安全与性能
• 文件格式验证和大小限制(默认100MB)
• 时长限制和配额控制(默认1小时)
• 文件自动清理(默认30天保留期)
• API 频率限制和权限控制
• 完整的错误处理和日志记录

📈 管理功能
• 转录引擎管理: 增删改查、状态监控、健康检查
• 任务监控: 实时任务状态、进度跟踪、错误诊断
• 统计分析: 用户使用统计、系统性能监控、计费统计

🛠️ 技术改进
• 模块化架构: 转录引擎适配器模式，易于扩展新引擎
• 异步处理: 文件上传和转录任务异步处理
• 容错机制: 多引擎备份、自动重试、故障转移
• 缓存优化: Redis 缓存任务状态和用户配额

📦 部署支持
• Docker 容器化: 完整的 Docker Compose 配置
• 一键部署: 自动化部署脚本，支持开发/生产环境
• 负载均衡: Nginx 反向代理和负载均衡配置
• SSL 支持: HTTPS 配置和安全头设置

🔄 向后兼容
• 保留所有原有用户数据和配置
• 保持原有 API 接口的兼容性
• 渐进式迁移，支持平滑升级

Breaking Changes: 无
Migration Required: 是 (需要运行数据库迁移脚本)
Backward Compatible: 是 (保持原有功能完整性)

Co-authored-by: Augment Agent <agent@augmentcode.com>"

# 5. 显示提交结果
if [ $? -eq 0 ]; then
    echo "✅ Git 提交成功！"
    echo ""
    echo "📋 提交信息:"
    git log --oneline -1
    echo ""
    echo "📊 提交统计:"
    git diff --stat HEAD~1 HEAD
    echo ""
    echo "🎉 Veloera 转录服务改造已成功提交到 Git 仓库！"
    echo ""
    echo "🔄 下一步操作建议:"
    echo "1. 推送到远程仓库: git push origin main"
    echo "2. 创建发布标签: git tag -a v2.0.0-transcription -m 'Veloera 转录服务版本'"
    echo "3. 推送标签: git push origin v2.0.0-transcription"
    echo "4. 开始部署测试: ./scripts/deploy-transcription.sh dev"
else
    echo "❌ Git 提交失败！请检查错误信息。"
    exit 1
fi
