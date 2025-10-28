#!/bin/bash

# 基于端口号自动杀死程序并启动指定程序的脚本
# 配置区域 - 请根据需要修改以下配置
PORT=3000                                  # 要监控的端口号
PROGRAM_CMD="./pnpmStart.sh"  # 要启动的完整命令
PROGRAM_NAME="Flowise"                        # 程序名称（用于日志显示）

# 使用方法: ./app_restart.sh [start|stop|restart|status]

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

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -i:$port >/dev/null 2>&1; then
        return 0  # 端口被占用
    else
        return 1  # 端口未被占用
    fi
}

# 根据端口号查找并杀死进程
kill_process_by_port() {
    local port=$1
    local killed_count=0
    
    log_info "检查端口 $port 是否被占用..."
    
    if ! check_port $port; then
        log_info "端口 $port 未被占用，无需杀死进程"
        return 0
    fi
    
    log_warning "端口 $port 被占用，正在查找相关进程..."
    
    # 查找占用指定端口的进程
    local pids=$(lsof -ti:$port 2>/dev/null)
    
    if [ -z "$pids" ]; then
        log_warning "未找到占用端口 $port 的进程"
        return 1
    fi
    
    # 杀死所有占用该端口的进程
    for pid in $pids; do
        if ps -p $pid >/dev/null 2>&1; then
            log_info "正在杀死进程 PID: $pid"
            if kill -9 $pid 2>/dev/null; then
                log_success "成功杀死进程 PID: $pid"
                ((killed_count++))
            else
                log_error "无法杀死进程 PID: $pid"
            fi
        fi
    done
    
    # 等待进程完全退出
    sleep 2
    
    # 再次检查端口是否还被占用
    if check_port $port; then
        log_warning "端口 $port 仍然被占用，尝试强制清理..."
        # 使用 fuser 强制杀死进程
        fuser -k $port/tcp 2>/dev/null
        sleep 1
    fi
    
    log_success "共杀死了 $killed_count 个进程"
    return 0
}

# 启动程序
start_program() {
    log_info "准备启动程序: $PROGRAM_NAME"
    log_info "启动命令: $PROGRAM_CMD"
    
    # 启动程序
    nohup $PROGRAM_CMD > /dev/null 2>&1 &
    local new_pid=$!
    
    # 等待程序启动
    sleep 2
    
    # 检查程序是否成功启动
    if ps -p $new_pid >/dev/null 2>&1; then
        log_success "$PROGRAM_NAME 启动成功，PID: $new_pid"
        return 0
    else
        log_error "$PROGRAM_NAME 启动失败"
        return 1
    fi
}

# 显示使用帮助
show_help() {
    echo "基于端口号自动杀死程序并启动指定程序的脚本"
    echo ""
    echo "当前配置:"
    echo "  程序名称: $PROGRAM_NAME"
    echo "  端口号: $PORT"
    echo "  启动命令: $PROGRAM_CMD"
    echo ""
    echo "使用方法:"
    echo "  $0 {start|stop|restart|status}"
    echo ""
    echo "命令说明:"
    echo "  start    启动程序（先杀死占用端口的进程）"
    echo "  stop     停止程序（杀死占用端口的进程）"
    echo "  restart  重启程序（停止后重新启动）"
    echo "  status   查看程序状态"
    echo ""
    echo "功能:"
    echo "  1. 检查指定端口是否被占用"
    echo "  2. 如果被占用，杀死占用该端口的所有进程"
    echo "  3. 启动指定的程序"
    echo "  4. 验证程序是否成功启动"
}

# 停止程序
stop_program() {
    log_info "停止 $PROGRAM_NAME..."
    if ! kill_process_by_port $PORT; then
        log_error "停止程序失败"
        return 1
    fi
    log_success "$PROGRAM_NAME 已停止"
}

# 查看程序状态
show_status() {
    log_info "检查 $PROGRAM_NAME 状态..."
    log_info "目标端口: $PORT"
    
    if check_port $PORT; then
        local pids=$(lsof -ti:$PORT 2>/dev/null)
        if [ -n "$pids" ]; then
            log_success "$PROGRAM_NAME 正在运行"
            log_info "占用端口 $PORT 的进程 PID: $pids"
            for pid in $pids; do
                if ps -p $pid >/dev/null 2>&1; then
                    local cmd=$(ps -p $pid -o comm= 2>/dev/null)
                    log_info "  PID $pid: $cmd"
                fi
            done
        else
            log_warning "端口 $PORT 被占用，但无法获取进程信息"
        fi
    else
        log_info "$PROGRAM_NAME 未运行"
    fi
}

# 主函数
main() {
    case "$1" in
        start)
            log_info "开始启动 $PROGRAM_NAME..."
            # 步骤1: 杀死占用端口的进程
            log_info "步骤1: 检查并杀死占用端口 $PORT 的进程"
            if ! kill_process_by_port $PORT; then
                log_error "杀死进程失败"
                exit 1
            fi
            
            # 步骤2: 启动新程序
            log_info "步骤2: 启动新程序"
            if ! start_program; then
                log_error "启动程序失败"
                exit 1
            fi
            
            # 步骤3: 验证程序是否在指定端口运行
            log_info "步骤3: 验证程序是否在端口 $PORT 运行"
            sleep 10
            if check_port $PORT; then
                log_success "$PROGRAM_NAME 已成功在端口 $PORT 运行"
            else
                log_warning "$PROGRAM_NAME 可能未在端口 $PORT 运行，请手动检查"
            fi
            ;;
        stop)
            stop_program
            ;;
        restart)
            log_info "重启 $PROGRAM_NAME..."
            stop_program
            sleep 2
            main start
            ;;
        status)
            show_status
            ;;
        *)
            show_help
            exit 1
            ;;
    esac
}

# 检查依赖命令
check_dependencies() {
    local missing_deps=()
    
    if ! command -v lsof >/dev/null 2>&1; then
        missing_deps+=("lsof")
    fi
    
    if ! command -v fuser >/dev/null 2>&1; then
        missing_deps+=("fuser")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "缺少必要的依赖命令: ${missing_deps[*]}"
        log_info "请安装缺少的命令:"
        for dep in "${missing_deps[@]}"; do
            case $dep in
                "lsof")
                    echo "  Ubuntu/Debian: sudo apt-get install lsof"
                    echo "  CentOS/RHEL: sudo yum install lsof"
                    echo "  macOS: brew install lsof"
                    ;;
                "fuser")
                    echo "  Ubuntu/Debian: sudo apt-get install psmisc"
                    echo "  CentOS/RHEL: sudo yum install psmisc"
                    echo "  macOS: 通常已预装"
                    ;;
            esac
        done
        exit 1
    fi
}

# 脚本入口
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    # 检查依赖
    check_dependencies
    
    # 显示配置信息
    log_info "当前配置:"
    log_info "  程序名称: $PROGRAM_NAME"
    log_info "  端口号: $PORT"
    log_info "  启动命令: $PROGRAM_CMD"
    echo ""
    
    # 执行主函数
    main "$@"
fi
