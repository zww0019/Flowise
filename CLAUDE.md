# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**Flowise** 是一个可视化拖拽式 AI Agent 构建平台，使用 Turborepo 管理的 Monorepo 架构。

**技术栈：**
- 构建工具：Turborepo + TypeScript
- 后端：Node.js + Express + TypeORM
- 前端：React 18 + Vite + Material-UI + ReactFlow
- AI 框架：LangChain + LangGraph
- 包管理：PNPM (要求 v9+)
- Node 版本：>= 18.15.0 < 19.0.0 || ^20

## 常用命令

### 根级别命令

```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 强制重新构建（遇到内存问题时使用）
export NODE_OPTIONS="--max-old-space-size=4096" && pnpm build

# 开发模式（并行启动所有服务，代码变更自动重载）
pnpm dev

# 生产启动
pnpm start

# 启动 Worker（队列模式）
pnpm start-worker

# 运行测试
pnpm test

# 代码检查和修复
pnpm lint
pnpm lint-fix

# 代码格式化
pnpm format

# 清理构建产物
pnpm clean    # 清理 dist 目录
pnpm nuke     # 完全清理包括 node_modules 和 .turbo

# 数据库迁移（在 packages/server 下运行）
pnpm typeorm:migration-generate  # 生成迁移
pnpm typeorm:migration-run       # 运行迁移
pnpm typeorm:migration-revert    # 回滚迁移
```

### 包级别命令

**Server** (`packages/server/`)：
```bash
pnpm dev      # 开发模式 (nodemon)
pnpm build    # 构建 (TypeScript + gulp)
pnpm test     # 运行测试
```

**Components** (`packages/components/`)：
```bash
pnpm build          # 构建 (TypeScript + gulp 复制图标)
pnpm test           # 运行测试
pnpm test:coverage  # 测试覆盖率
```

**UI** (`packages/ui/`)：
```bash
pnpm dev    # 开发模式 (Vite)
pnpm build  # 构建生产版本
```

## 架构概览

### Monorepo 结构

```
Flowise/
├── packages/
│   ├── server/          # 后端服务 (Express API + TypeORM)
│   ├── components/      # 节点组件库 (核心集成)
│   ├── ui/              # 前端界面 (React + Vite)
│   └── api-documentation/ # API 文档 (Swagger)
├── docker/              # Docker 配置
├── turbo.json           # Turborepo 配置
└── flowise/             # CLI 工具输出目录
```

**主要包的职责：**

1. **flowise-components** (`packages/components/`)
   - 所有可复用的节点组件定义
   - 凭据管理（110+ 预定义凭据）
   - 工具函数和核心类型定义
   - 输出：`dist/src` 和 `dist/nodes`

2. **flowise-ui** (`packages/ui/`)
   - React 前端应用
   - 基于 ReactFlow v11 的可视化编辑器
   - Redux Toolkit 状态管理
   - Vite 开发服务器

3. **flowise (server)** (`packages/server/`)
   - Express 后端 API
   - 数据库管理（支持 SQLite/PostgreSQL/MySQL/MariaDB）
   - 节点池管理（动态加载所有节点）
   - 流程执行引擎（Chatflow + Agentflow）

### 核心架构模式

#### 节点系统

**节点接口定义** (`packages/components/src/Interface.ts:140-154`)：

```typescript
export interface INode extends INodeProperties {
    credential?: INodeParams           // 凭据配置
    inputs?: INodeParams[]             // 输入参数定义
    output?: INodeOutputsValue[]       // 输出定义
    loadMethods?: { ... }              // 异步加载方法
    vectorStoreMethods?: { ... }       // 向量存储方法
    init?(nodeData, input, options): Promise<any>      // 初始化
    run?(nodeData, input, options): Promise<string | object>  // 执行
}
```

**节点类别** (`packages/components/nodes/`)：
- `agentflow/` - Agent 流程节点（循环、条件、人工输入、动态表单等）
- `agents/` - AI 代理节点
- `chatmodels/` - 聊天模型（OpenAI、Anthropic、Google 等 31 个提供商）
- `tools/` - 工具节点（43+ 个工具）
- `documentloaders/` - 文档加载器
- `vectorstores/` - 向量存储
- `embeddings/` - 嵌入模型
- `retrievers/` - 检索器
- `chains/` - 链式调用
- `memory/` - 记忆管理
- `templates/` - 提示词模板

#### 节点池管理

**NodesPool** (`packages/server/src/NodesPool.ts`)：
- 服务器启动时动态加载所有节点
- 支持社区节点控制（`SHOW_COMMUNITY_NODES` 环境变量）
- 支持禁用特定节点（`DISABLED_NODES` 环境变量）
- 自动处理图标路径解析

**加载流程：**
1. 扫描 `flowise-components/dist/nodes` 目录
2. 加载所有 `.js` 节点文件
3. 实例化节点类
4. 根据配置过滤节点
5. 注册到 `componentNodes` 字典

#### 流程执行引擎

**两种执行模式：**

1. **Chatflow 执行** (`packages/server/src/utils/buildChatflow.ts`)
   - 传统的聊天流程执行
   - 支持流式响应（SSE）
   - 记忆管理
   - 多语言支持

2. **Agentflow 执行** (`packages/server/src/utils/buildAgentflow.ts`)
   - 基于 Agent 的复杂流程
   - 支持循环、条件、人工输入
   - 动态表单（Dynamic Form）
   - 节点间数据传递队列

**执行流程：**
```
用户输入
  → 构建依赖图
  → 拓扑排序节点
  → 依次执行节点
  → 处理节点输出
  → 流式返回结果
```

### 前后端通信

**API 路由** (`packages/server/src/routes/`)：
- 59+ 个路由目录，按功能组织
- 控制器位于 `packages/server/src/controllers/`
- RESTful API 设计
- 支持 Server-Sent Events (SSE) 用于流式响应

**前端 API 调用** (`packages/ui/src/api/`)：
- Axios HTTP 客户端
- 统一的错误处理
- TypeScript 类型定义

### 状态管理

**Redux Store** (`packages/ui/src/store/reducers/`)：
- `chatflowReducer.jsx` - 聊天流程状态
- `canvasReducer.jsx` - 画布状态
- `credentialsReducer.jsx` - 凭据状态

**Context** (`packages/ui/src/store/context/`)：
- 节点组件上下文
- 对话上下文

## 添加新节点

### 步骤

1. 在 `packages/components/nodes/[category]/` 创建新文件夹
2. 创建节点文件（例如 `MyNode.ts`）：

```typescript
import { INode } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { MyNodeClass } from './core'

class MyNode_Tools implements INode {
    label = 'My Node'
    name = 'myNode'
    version = 1.0
    type = 'MyNode'
    icon = 'myicon.svg'
    category = 'Tools'
    description = 'Node description'
    baseClasses = [this.type, ...getBaseClasses(MyNodeClass)]

    async init() {
        return new MyNodeClass()
    }
}

module.exports = { nodeClass: MyNode_Tools }
```

3. 将图标放入同一目录
4. 重新构建：`pnpm build`

### 示例节点

参考 `packages/components/nodes/tools/Calculator/Calculator.ts`

## 配置系统

### 环境变量

**服务器配置** (`packages/server/.env`)：
```bash
PORT=3000
HOST=localhost

# 数据库
DATABASE_TYPE=sqlite  # 或 postgres/mysql/mariadb

# 认证
FLOWISE_USERNAME=admin
FLOWISE_PASSWORD=xxxx

# 功能开关
SHOW_COMMUNITY_NODES=true
DISABLED_NODES=node1,node2

# 日志
LOG_LEVEL=info
LOG_PATH=./logs
```

**UI 配置** (`packages/ui/.env`)：
```bash
VITE_PORT=8080
VITE_HOST=localhost
```

### Docker 配置

**Docker Compose** (`docker/`)：
- `docker-compose.yml` - 基础配置
- `docker-compose-queue-source.yml` - 使用队列
- `docker-compose-queue-prebuilt.yml` - 预构建镜像

## 数据库架构

**实体定义** (`packages/server/src/database/entities/`)：
- `ChatFlow` - 聊天流程
- `ChatMessage` - 聊天消息
- `Credential` - 凭据
- `Tool` - 自定义工具
- `Assistant` - 助手
- `Variable` - 变量
- `Execution` - 执行记录
- `DocumentStore` - 文档存储

## 重要文件路径

**核心配置：**
- `/package.json` - 根 package.json
- `/turbo.json` - Turborepo 配置
- `/packages/components/src/Interface.ts` - 核心类型定义
- `/packages/server/src/Interface.ts` - 服务器接口

**入口文件：**
- `/packages/server/src/index.ts` - 服务器入口
- `/packages/ui/src/index.jsx` - UI 入口
- `/packages/components/src/index.ts` - 组件导出

**关键目录：**
- `/packages/components/nodes/` - 所有节点
- `/packages/components/credentials/` - 所有凭据
- `/packages/server/src/routes/` - API 路由
- `/packages/ui/src/views/` - UI 页面

## 构建系统

### TypeScript 配置

- **Components**: 目标 ES2020，CommonJS 模块，输出 `dist/`
- **Server**: 目标 ES2021，CommonJS 模块，输出 `dist/`

### Turbo 配置

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false
    }
  }
}
```

## 构建节点

详见 [Building Node](#building-node) 章节提供的完整指南。

### Install Git

First, install Git and clone Flowise repository. You can follow the steps from the [Get Started](https://docs.flowiseai.com/contributing/broken-reference) guide.

### Structure

Flowise separate every node integration under the folder `packages/components/nodes`. Let's try to create a simple Tool!

### Create Calculator Tool

Create a new folder named `Calculator` under the `packages/components/nodes/tools` folder. Then create a new file named `Calculator.ts`. Inside the file, we will first write the base class.

```javascript
import { INode } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'

class Calculator_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    author: string
    baseClasses: string[]

    constructor() {
        this.label = 'Calculator'
        this.name = 'calculator'
        this.version = 1.0
        this.type = 'Calculator'
        this.icon = 'calculator.svg'
        this.category = 'Tools'
        this.author = 'Your Name'
        this.description = 'Perform calculations on response'
        this.baseClasses = [this.type, ...getBaseClasses(Calculator)]
    }
}

module.exports = { nodeClass: Calculator_Tools }
```

Every node will implements the `INode` base class. Breakdown of what each property means:

<table><thead><tr><th width="271">Property</th><th>Description</th></tr></thead><tbody><tr><td>label</td><td>The name of the node that appears on the UI</td></tr><tr><td>name</td><td>The name that is used by code. Must be <strong>camelCase</strong></td></tr><tr><td>version</td><td>Version of the node</td></tr><tr><td>type</td><td>Usually the same as label. To define which node can be connected to this specific type on UI</td></tr><tr><td>icon</td><td>Icon of the node</td></tr><tr><td>category</td><td>Category of the node</td></tr><tr><td>author</td><td>Creator of the node</td></tr><tr><td>description</td><td>Node description</td></tr><tr><td>baseClasses</td><td>The base classes from the node, since a node can extends from a base component. Used to define which node can be connected to this node on UI</td></tr></tbody></table>

### Define Class

Now the component class is partially finished, we can go ahead to define the actual Tool class, in this case - `Calculator`.

Create a new file under the same `Calculator` folder, and named as `core.ts`

```javascript
import { Parser } from "expr-eval"
import { Tool } from "@langchain/core/tools"

export class Calculator extends Tool {
    name = "calculator"
    description = `Useful for getting the result of a math expression. The input to this tool should be a valid mathematical expression that could be executed by a simple calculator.`

    async _call(input: string) {
        try {
            return Parser.evaluate(input).toString()
        } catch (error) {
            return "I don't know how to do that."
        }
    }
}
```

### Finishing

Head back to the `Calculator.ts` file, we can finish this up by having the `async init` function. In this function, we will initialize the Calculator class we created above. When the flow is being executed, the `init` function in each node will be called, and the `_call` function will be executed when LLM decides to call this tool.

```javascript
import { INode } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { Calculator } from './core'

class Calculator_Tools implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    author: string
    baseClasses: string[]

    constructor() {
        this.label = 'Calculator'
        this.name = 'calculator'
        this.version = 1.0
        this.type = 'Calculator'
        this.icon = 'calculator.svg'
        this.category = 'Tools'
        this.author = 'Your Name'
        this.description = 'Perform calculations on response'
        this.baseClasses = [this.type, ...getBaseClasses(Calculator)]
    }


    async init() {
        return new Calculator()
    }
}

module.exports = { nodeClass: Calculator_Tools }
```

### Build and Run

In the `.env` file inside `packages/server`, create a new env variable:

```javascript
SHOW_COMMUNITY_NODES=true
```

Now we can use `pnpm build` and `pnpm start` to bring the component alive!
