# AI 聊天应用 MVP

一个简单的前后端分离AI聊天应用，使用阿里云通义千问API。
cd "C:\Users\Administrator\Desktop\vibe"
## 项目结构

```
vibe/
├── backend/          # FastAPI 后端
│   ├── main.py      # 主应用文件
│   ├── .env         # 环境变量配置
│   └── requirements.txt
└── frontend/         # React 前端
    ├── src/
    │   ├── App.jsx  # 主聊天组件
    │   └── index.css
    └── package.json
```

## 快速开始

### 1. 启动后端

```bash
cd backend
npm start
```

后端运行在 `http://localhost:8000`

### 2. 启动前端

```bash
cd frontend
npm run dev
```

前端运行在 `http://localhost:5173`

### 3. 使用

打开浏览器访问 `http://localhost:5173`，开始与AI对话。

## 技术栈

- **后端**: FastAPI + Python
- **前端**: React + Vite + Tailwind CSS
- **AI模型**: 阿里云通义千问 (qwen3.6-plus)
