# AI 助手项目

一个基于 LangGraph 的 AI 助手，提供完整的前后端一体化解决方案。后端采用 Node.js/Express + WebSocket 构建，支持工具调用和网页内容提取等功能；前端使用原生 HTML/CSS/JavaScript 实现，提供现代化的聊天界面和会话管理功能。

## 🌟 功能特性

- 🤖 **智能对话**：基于大语言模型的自然语言交互
- 🔧 **工具调用**：支持搜索工具和网页内容提取工具
- 📱 **现代化 UI**：美观易用的原生 HTML/CSS/JavaScript 前端界面
- 🔌 **完整集成**：前端与后端无缝连接，实现完整的 AI 助手工作流
- 🔐 **安全配置**：通过环境变量管理 API 密钥
- 📝 **对话历史**：自动保存和管理对话历史
- 💬 **会话管理**：支持新建会话、切换会话和管理历史对话
- 🎨 **响应式设计**：适配不同屏幕尺寸
- ⚡ **实时通信**：基于 WebSocket 的实时消息传递

## 🛠️ 技术栈

### 后端

- **Node.js**：服务器运行环境
- **Express + ws**：HTTP + WebSocket 服务
- **LangChain/LangGraph**：构建 Agent 工作流
- **Tavily**：搜索和网页提取服务

### 前端

- **原生 HTML/CSS/JavaScript**：现代化聊天界面
- **Marked.js**：Markdown 渲染
- **Font Awesome**：图标库

## 📦 安装和运行

### 前提条件

- **Node.js** (v16 或更高版本)
- **npm** 包管理器
- **Tavily API Key**：用于搜索和网页提取功能
- **大语言模型 API Key**：根据配置使用的模型

### 安装步骤

1. **克隆仓库**

   ```bash
   git clone <repository-url>
   cd myagent
   ```

2. **安装依赖**

   ```bash
   npm install
   ```

3. **配置环境变量**（创建 `.env`）

   ```env
   # 大语言模型
   ARK_API_KEY=<必填>
   ARK_MODEL_ID=<可选，默认 doubao-seed-1-6-251015>
   ARK_BASE_URL=<可选，默认 https://ark.cn-beijing.volces.com/api/v3>

   # Tavily 搜索
   TAVILY_API_KEY=<必填>

   # 服务器配置
   PORT=<可选，默认 3001>
   ```

4. **启动服务器（HTTP + WebSocket）**

   ```bash
   npm start
   ```

   服务器将在 `http://localhost:3001` 启动，前端页面可直接通过 `http://localhost:3001` 访问

5. **（可选）本地 CLI 交互**

   ```bash
   npm run agent
   ```

## 🚀 使用说明

### 基本对话

1. 打开浏览器访问 `http://localhost:3001`
2. 在聊天输入框中输入您的问题
3. 点击发送按钮或按 Enter 键
4. 等待 AI 助手的回复

### 会话管理

- **新建会话**：点击左侧边栏底部的「新建会话」按钮，创建一个全新的对话
- **查看历史对话**：左侧边栏显示所有历史对话，点击即可切换查看
- **清除历史记录**：点击左侧边栏顶部的清除按钮，可清空所有对话历史

### 使用工具

#### 搜索工具

当您需要获取最新信息时，AI 助手会自动调用搜索工具：

```
用户：2024年最新的技术趋势是什么？
AI：[自动调用搜索工具]
AI：根据最新搜索结果，2024年的技术趋势包括...
```

#### 网页内容提取工具

当您需要获取特定网页的内容时，可以要求 AI 助手提取：

```
用户：请帮我提取这个网页的内容：https://www.example.com
AI：[自动调用网页提取工具]
AI：以下是从https://www.example.com提取的内容...
```

## 📁 项目结构

```
myagent/
├── agent/        # Agent 工作流与工具
│   ├── graph.js  # 工作流定义
│   ├── llm.js    # LLM 适配
│   ├── main.js   # CLI/运行入口
│   ├── nodes.js  # 节点定义
│   └── tools.js  # 工具定义
├── public/       # 前端静态文件
│   ├── index.html   # 主页面
│   ├── style.css    # 样式文件
│   └── script.js    # JavaScript 逻辑
├── server.js     # Express + WebSocket 服务器
├── .env          # 环境变量（需手动创建）
├── .gitignore    # Git 忽略文件
├── README.md     # 项目说明文档
├── package.json  # 依赖与脚本
└── package-lock.json
```

## 🔧 工具说明

### 搜索工具

- **名称**：`searchTool`
- **描述**：用于搜索网络获取最新信息
- **参数**：
  - `query`：搜索查询字符串
- **返回**：搜索结果的摘要

### 网页提取工具

- **名称**：`extractTool`
- **描述**：从指定 URL 提取网页内容
- **参数**：
  - `url`：要提取内容的 URL
- **返回**：提取的网页内容（自动截断过长内容）

## ⚙️ 配置说明

### 环境变量

| 变量名           | 描述                | 示例值                                     |
| ---------------- | ------------------- | ------------------------------------------ |
| `ARK_API_KEY`    | 大语言模型 API 密钥 | `sk-xxxxxxxxxxxxxxxx`                      |
| `ARK_MODEL_ID`   | 大语言模型 ID       | `doubao-seed-1-6-251015`                   |
| `ARK_BASE_URL`   | 大语言模型 API 地址 | `https://ark.cn-beijing.volces.com/api/v3` |
| `TAVILY_API_KEY` | Tavily API 密钥     | `tvly-xxxxxxxxxxxxxxxx`                    |
| `PORT`           | 服务器端口          | `3001`                                     |

## 🔧 开发和测试

### 开发命令

- **安装依赖**：`npm install`
- **启动服务器**：`npm start`
- **CLI 交互**：`npm run agent`

### 前端开发

前端代码位于 `public/` 目录下，可以直接编辑 HTML、CSS 和 JavaScript 文件，无需构建过程。修改后刷新浏览器即可看到效果。

### 后端开发

后端代码主要位于 `server.js` 和 `agent/` 目录下，修改后需要重启服务器才能生效。
