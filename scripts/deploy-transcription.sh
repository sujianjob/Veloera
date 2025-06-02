#!/bin/bash

# Veloera 转录服务部署脚本
# 使用方法: ./scripts/deploy-transcription.sh [环境]
# 环境选项: dev, staging, prod

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    # 检查 Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    # 检查 Git
    if ! command -v git &> /dev/null; then
        log_error "Git 未安装，请先安装 Git"
        exit 1
    fi
    
    log_success "系统依赖检查完成"
}

# 设置环境变量
setup_environment() {
    local env=${1:-dev}
    log_info "设置 $env 环境..."
    
    # 创建环境变量文件
    if [ ! -f ".env.${env}" ]; then
        log_warning ".env.${env} 文件不存在，创建默认配置..."
        cat > ".env.${env}" << EOF
# Veloera 转录服务环境配置 - ${env}

# 数据库配置
MYSQL_ROOT_PASSWORD=veloera123456
MYSQL_DATABASE=veloera_transcription
SQL_DSN=root:veloera123456@tcp(mysql:3306)/veloera_transcription?charset=utf8mb4&parseTime=True&loc=Local

# Redis 配置
REDIS_CONN_STRING=redis://redis:6379

# 转录引擎配置
WHISPER_API_KEY=your_openai_api_key_here
WHISPER_BASE_URL=https://api.openai.com

# 阿里云配置 (可选)
ALICLOUD_ACCESS_KEY_ID=
ALICLOUD_ACCESS_KEY_SECRET=
ALICLOUD_REGION=cn-hangzhou

# 腾讯云配置 (可选)
TENCENT_SECRET_ID=
TENCENT_SECRET_KEY=
TENCENT_REGION=ap-beijing

# 百度云配置 (可选)
BAIDU_API_KEY=
BAIDU_SECRET_KEY=

# 系统配置
SESSION_SECRET=veloera-transcription-secret-$(date +%s)
SERVER_PORT=3000

# 邮件通知配置 (可选)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# 域名配置 (生产环境)
DOMAIN_NAME=localhost
EOF
        log_warning "请编辑 .env.${env} 文件，配置必要的参数"
    fi
    
    # 复制环境配置
    cp ".env.${env}" .env
    log_success "环境配置完成"
}

# 创建必要目录
create_directories() {
    log_info "创建必要目录..."
    
    mkdir -p data/transcription/uploads
    mkdir -p data/transcription/results
    mkdir -p logs
    mkdir -p ssl
    
    # 设置权限
    chmod 755 data/transcription
    chmod 755 data/transcription/uploads
    chmod 755 data/transcription/results
    chmod 755 logs
    
    log_success "目录创建完成"
}

# 构建应用
build_application() {
    log_info "构建应用..."
    
    # 构建后端
    log_info "构建后端应用..."
    docker-compose -f docker-compose.transcription.yml build veloera-transcription
    
    log_success "应用构建完成"
}

# 数据库初始化
init_database() {
    log_info "初始化数据库..."
    
    # 启动数据库
    docker-compose -f docker-compose.transcription.yml up -d mysql redis
    
    # 等待数据库启动
    log_info "等待数据库启动..."
    sleep 30
    
    # 检查数据库连接
    for i in {1..30}; do
        if docker-compose -f docker-compose.transcription.yml exec mysql mysqladmin ping -h localhost -u root -p${MYSQL_ROOT_PASSWORD:-veloera123456} --silent; then
            log_success "数据库连接成功"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "数据库连接失败"
            exit 1
        fi
        sleep 2
    done
    
    # 运行数据库迁移
    log_info "运行数据库迁移..."
    docker-compose -f docker-compose.transcription.yml exec mysql mysql -u root -p${MYSQL_ROOT_PASSWORD:-veloera123456} ${MYSQL_DATABASE:-veloera_transcription} < migration/001_transcription_tables.sql
    
    log_success "数据库初始化完成"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    # 启动所有服务
    docker-compose -f docker-compose.transcription.yml up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 20
    
    # 检查服务状态
    log_info "检查服务状态..."
    docker-compose -f docker-compose.transcription.yml ps
    
    # 健康检查
    for i in {1..30}; do
        if curl -f http://localhost:3000/api/status &> /dev/null; then
            log_success "服务启动成功"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "服务启动失败"
            docker-compose -f docker-compose.transcription.yml logs veloera-transcription
            exit 1
        fi
        sleep 2
    done
}

# 配置 Nginx (可选)
setup_nginx() {
    local env=${1:-dev}
    
    if [ "$env" = "prod" ]; then
        log_info "配置 Nginx..."
        
        # 复制 Nginx 配置
        mkdir -p nginx/conf.d
        cp nginx/transcription.conf nginx/conf.d/default.conf
        
        # 替换域名
        if [ -n "$DOMAIN_NAME" ]; then
            sed -i "s/your-domain.com/$DOMAIN_NAME/g" nginx/conf.d/default.conf
        fi
        
        log_success "Nginx 配置完成"
    fi
}

# 显示部署信息
show_deployment_info() {
    local env=${1:-dev}
    
    log_success "部署完成！"
    echo
    echo "==================================="
    echo "  Veloera 转录服务部署信息"
    echo "==================================="
    echo "环境: $env"
    echo "访问地址: http://localhost:3000"
    echo "管理后台: http://localhost:3000/dashboard"
    echo
    echo "默认管理员账户:"
    echo "用户名: root"
    echo "密码: 123456"
    echo
    echo "服务状态检查:"
    echo "docker-compose -f docker-compose.transcription.yml ps"
    echo
    echo "查看日志:"
    echo "docker-compose -f docker-compose.transcription.yml logs -f veloera-transcription"
    echo
    echo "停止服务:"
    echo "docker-compose -f docker-compose.transcription.yml down"
    echo "==================================="
}

# 主函数
main() {
    local env=${1:-dev}
    
    log_info "开始部署 Veloera 转录服务 ($env 环境)..."
    
    # 检查依赖
    check_dependencies
    
    # 设置环境
    setup_environment "$env"
    
    # 创建目录
    create_directories
    
    # 构建应用
    build_application
    
    # 初始化数据库
    init_database
    
    # 配置 Nginx
    setup_nginx "$env"
    
    # 启动服务
    start_services
    
    # 显示部署信息
    show_deployment_info "$env"
}

# 脚本入口
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
