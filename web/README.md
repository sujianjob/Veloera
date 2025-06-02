# Veloera 音视频转录服务 - 前端

这是 Veloera 音视频转录服务的前端应用，基于 Next.js 15 + React 19 + TypeScript + Tailwind CSS 构建。

## 功能特性

- 🎵 **多格式支持**: 支持 MP3, MP4, WAV, M4A, FLAC, AAC, OGG, AVI, MOV, MKV 等多种音视频格式
- 🌍 **多语言识别**: 支持中文、英语、日语、韩语等多种语言的自动识别
- 📝 **多种输出格式**: 支持 JSON, TXT, SRT, VTT 等多种输出格式
- ⚡ **实时状态**: 实时显示转录进度和状态
- 📱 **响应式设计**: 适配桌面端和移动端
- 🎨 **现代化UI**: 基于 shadcn/ui 的现代化界面设计

## 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **UI组件**: Radix UI + shadcn/ui
- **图标**: Lucide React
- **HTTP客户端**: Axios
- **文件上传**: React Dropzone

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
npm install --legacy-peer-deps
```

### 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
npm run build
npm start
```

## 项目结构

```
src/
├── app/                    # Next.js App Router 页面
│   ├── page.tsx           # 首页 - 文件上传和转录
│   ├── tasks/             # 任务相关页面
│   │   ├── page.tsx       # 任务列表页
│   │   └── [id]/page.tsx  # 任务详情页
│   ├── layout.tsx         # 根布局
│   └── globals.css        # 全局样式
├── components/            # React 组件
│   ├── ui/               # 基础 UI 组件
│   ├── file-upload.tsx   # 文件上传组件
│   └── task-status.tsx   # 任务状态组件
├── lib/                  # 工具库
│   ├── api.ts           # API 客户端
│   └── utils.ts         # 工具函数
├── types/               # TypeScript 类型定义
│   └── transcription.ts # 转录相关类型
└── hooks/               # React Hooks
    └── use-toast.ts     # 通知 Hook
```

## 主要页面

### 首页 (`/`)
- 文件上传区域（支持拖拽上传）
- 转录配置选项（语言、质量、输出格式等）
- 实时任务状态显示
- 使用说明

### 任务列表 (`/tasks`)
- 显示所有转录任务
- 支持按状态筛选和搜索
- 任务操作（下载、预览、取消、删除）
- 分页显示

### 任务详情 (`/tasks/[id]`)
- 详细的任务信息
- 转录结果预览
- 文件信息和配置详情
- 下载和复制功能

## API 集成

前端通过 `/api` 路径与后端 API 通信：

- `POST /api/user/self/transcription/tasks` - 创建转录任务
- `GET /api/user/self/transcription/tasks` - 获取任务列表
- `GET /api/user/self/transcription/tasks/:id` - 获取任务详情
- `GET /api/user/self/transcription/tasks/:id/download` - 下载结果
- `GET /api/user/self/transcription/tasks/:id/preview` - 预览结果

## 配置说明

### 环境变量

创建 `.env.local` 文件：

```env
# API 基础URL（如果需要）
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

### 自定义配置

可以在 `src/lib/api.ts` 中修改 API 客户端配置：

```typescript
const client = axios.create({
  baseURL: '/api',  // 修改为实际的 API 地址
  timeout: 30000,
})
```

## 开发指南

### 添加新页面

1. 在 `src/app` 目录下创建新的页面文件
2. 使用 TypeScript 和 React 19 的新特性
3. 遵循现有的代码风格和组件结构

### 添加新组件

1. 在 `src/components` 目录下创建组件
2. 使用 shadcn/ui 的设计系统
3. 添加适当的 TypeScript 类型定义

### 样式开发

- 使用 Tailwind CSS 进行样式开发
- 遵循 shadcn/ui 的设计规范
- 支持深色模式（通过 CSS 变量）

## 部署

### Vercel 部署

1. 将代码推送到 GitHub
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 自动部署

### Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### 静态导出

```bash
npm run build
npm run export
```

## 故障排除

### 常见问题

1. **依赖安装失败**: 使用 `--legacy-peer-deps` 标志
2. **API 请求失败**: 检查后端服务是否运行
3. **文件上传失败**: 检查文件大小和格式限制

### 调试

启用开发者工具中的网络面板查看 API 请求，检查控制台错误信息。

## 贡献

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License
