# GitHub Action 自动部署配置说明

## 概述

此GitHub Action工作流会在`zww`分支有新的push时自动触发，将最新代码部署到远程服务器。

## 工作流程

1. **代码检出**: 检出最新的zww分支代码
2. **环境准备**: 设置Node.js和pnpm环境
3. **本地构建**: 安装依赖并构建项目
4. **脚本上传**: 将部署脚本上传到远程服务器
5. **远程部署**: 在远程服务器执行部署脚本
   - 拉取最新代码
   - 安装依赖 (`pnpm install`)
   - 构建项目 (`pnpm build`)
   - 启动应用 (`./appStart.sh start`)

## GitHub Secrets 配置

在GitHub仓库中需要配置以下Secrets：

### 必需配置

1. **REMOTE_HOST**: 远程服务器IP地址或域名
   - 例如: `192.168.1.100` 或 `your-server.com`

2. **REMOTE_USERNAME**: SSH用户名
   - 例如: `ubuntu` 或 `root`

3. **REMOTE_PASSWORD**: SSH密码
   - 例如: `your_password_here`

4. **REMOTE_PROJECT_PATH**: 远程服务器上的项目路径
   - 例如: `/home/ubuntu/Flowise` 或 `/var/www/Flowise`

### 可选配置

5. **REMOTE_PORT**: SSH端口 (默认: 22)
   - 例如: `2222` (如果使用非标准端口)

## 配置步骤

1. 进入GitHub仓库页面
2. 点击 **Settings** 标签
3. 在左侧菜单中找到 **Secrets and variables** → **Actions**
4. 点击 **New repository secret**
5. 添加上述所有必需的Secrets

## 远程服务器要求

### 软件要求
- Git (用于拉取代码)
- Node.js 18.15.0+
- pnpm 9.0.4+
- SSH服务运行中

### 目录结构
远程服务器上的项目目录应该是一个Git仓库，并且：
- 已配置好远程origin
- 有zww分支
- 包含`appStart.sh`启动脚本

### appStart.sh脚本要求
启动脚本应该支持以下命令：
- `./appStart.sh start` - 启动应用
- `./appStart.sh status` - 检查应用状态 (可选)

## 手动触发

除了自动触发外，也可以手动触发部署：
1. 进入GitHub仓库的 **Actions** 页面
2. 选择 **Deploy zww branch to remote server** 工作流
3. 点击 **Run workflow** 按钮

## 日志和监控

- 部署过程中的所有日志都会在GitHub Actions页面显示
- 远程服务器上会生成详细的部署日志文件
- 如果部署失败，会显示具体的错误信息

## 故障排除

### 常见问题

1. **SSH连接失败**
   - 检查REMOTE_HOST、REMOTE_USERNAME、REMOTE_PASSWORD是否正确
   - 确认SSH服务正在运行
   - 检查防火墙设置

2. **Git拉取失败**
   - 确认远程服务器上的Git仓库配置正确
   - 检查网络连接
   - 确认zww分支存在

3. **pnpm命令失败**
   - 确认远程服务器已安装pnpm
   - 检查Node.js版本
   - 确认项目依赖配置正确

4. **appStart.sh执行失败**
   - 确认脚本文件存在且有执行权限
   - 检查脚本内容是否正确
   - 查看应用启动日志

### 调试建议

1. 在GitHub Actions页面查看详细的执行日志
2. 登录远程服务器手动执行部署脚本进行调试
3. 检查远程服务器的系统日志
4. 确认所有必需的服务都在运行

## 安全注意事项

- 使用强密码保护SSH账户
- 考虑使用SSH密钥认证替代密码认证
- 定期更新服务器和依赖包
- 限制SSH访问IP范围
- 监控部署日志，及时发现异常
