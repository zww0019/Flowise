#!/bin/bash

# 部署脚本 - 用于GitHub Action远程执行
# 此脚本将在远程服务器上执行

set -e  # 遇到错误立即退出

# 配置变量
PROJECT_PATH="${{ secrets.REMOTE_PROJECT_PATH }}"
BRANCH="zww"
LOG_FILE="/tmp/deploy-$(date +%Y%m%d-%H%M%S).log"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "开始部署流程..."
log "项目路径: $PROJECT_PATH"
log "分支: $BRANCH"
log "提交: ${{ github.sha }}"

# 检查项目目录是否存在
if [ ! -d "$PROJECT_PATH" ]; then
    log "错误: 项目目录不存在: $PROJECT_PATH"
    exit 1
fi

# 进入项目目录
cd "$PROJECT_PATH" || {
    log "错误: 无法进入项目目录: $PROJECT_PATH"
    exit 1
}

# 检查git仓库
if [ ! -d ".git" ]; then
    log "错误: 当前目录不是git仓库"
    exit 1
fi

# 拉取最新代码
log "拉取最新代码..."
git fetch origin || {
    log "错误: git fetch 失败"
    exit 1
}

git reset --hard origin/$BRANCH || {
    log "错误: git reset 失败"
    exit 1
}

log "代码更新完成"

# 检查pnpm是否安装
if ! command -v pnpm &> /dev/null; then
    log "错误: pnpm 未安装"
    exit 1
fi

# 安装依赖
log "安装依赖..."
pnpm install || {
    log "错误: pnpm install 失败"
    exit 1
}

log "依赖安装完成"

# 构建项目
log "构建项目..."
pnpm build || {
    log "错误: pnpm build 失败"
    exit 1
}

log "项目构建完成"

# 检查appStart.sh是否存在
if [ ! -f "appStart.sh" ]; then
    log "错误: appStart.sh 文件不存在"
    exit 1
fi

# 确保appStart.sh有执行权限
chmod +x appStart.sh

# 启动应用
log "启动应用..."
./appStart.sh start || {
    log "错误: 应用启动失败"
    exit 1
}

log "应用启动完成"

# 部署完成
log "部署成功完成!"
log "分支: $BRANCH"
log "提交: ${{ github.sha }}"
log "部署时间: $(date)"
log "日志文件: $LOG_FILE"

# 显示应用状态（如果appStart.sh支持status命令）
if ./appStart.sh status 2>/dev/null; then
    log "应用状态检查完成"
fi

log "部署流程结束"
