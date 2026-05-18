---
name: todo-app
description: 创建一个简单的待办事项应用，支持添加、删除和标记完成
category: web-apps
tags: [javascript, 待办事项, 交互]
---

# 待办事项应用

一个简单的待办事项应用，所有数据存储在浏览器本地，刷新页面不会丢失。

## 功能特性

- 添加新任务
- 标记任务完成/未完成
- 删除任务
- 数据持久化（localStorage）
- 响应式设计

## 使用步骤

1. 创建 `index.html` 文件
2. 创建 `style.css` 文件
3. 创建 `app.js` 文件

## 文件结构

```
project/
├── index.html
├── style.css
└── app.js
```

## index.html

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>待办事项</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <h1>我的待办事项</h1>
    
    <div class="input-section">
      <input type="text" id="taskInput" placeholder="添加新任务...">
      <button id="addBtn">添加</button>
    </div>

    <ul id="taskList"></ul>
  </div>

  <script src="app.js"></script>
</body>
</html>
```

## style.css

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #f5f5f5;
  padding: 2rem;
}

.container {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 2rem;
}

.input-section {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

#taskInput {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
}

#taskInput:focus {
  outline: none;
  border-color: #667eea;
}

#addBtn {
  padding: 0.75rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
}

#addBtn:hover {
  background: #5568d3;
}

#taskList {
  list-style: none;
}

.task-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s;
}

.task-item:hover {
  background: #e9ecef;
}

.task-item.completed {
  opacity: 0.6;
}

.task-item.completed .task-text {
  text-decoration: line-through;
}

.task-checkbox {
  width: 20px;
  height: 20px;
  margin-right: 1rem;
  cursor: pointer;
}

.task-text {
  flex: 1;
  color: #333;
}

.delete-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}

.delete-btn:hover {
  background: #c82333;
}
```

## app.js

```javascript
// 获取元素
const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');

// 从 localStorage 加载任务
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

// 渲染任务列表
function renderTasks() {
  taskList.innerHTML = '';
  
  tasks.forEach((task, index) => {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    
    li.innerHTML = `
      <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
      <span class="task-text">${task.text}</span>
      <button class="delete-btn">删除</button>
    `;
    
    // 复选框事件
    const checkbox = li.querySelector('.task-checkbox');
    checkbox.addEventListener('change', () => toggleTask(index));
    
    // 删除按钮事件
    const deleteBtn = li.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => deleteTask(index));
    
    taskList.appendChild(li);
  });
}

// 添加任务
function addTask() {
  const text = taskInput.value.trim();
  if (!text) return;
  
  tasks.push({ text, completed: false });
  saveTasks();
  renderTasks();
  taskInput.value = '';
}

// 切换任务状态
function toggleTask(index) {
  tasks[index].completed = !tasks[index].completed;
  saveTasks();
  renderTasks();
}

// 删除任务
function deleteTask(index) {
  tasks.splice(index, 1);
  saveTasks();
  renderTasks();
}

// 保存到 localStorage
function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

// 事件监听
addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addTask();
});

// 初始渲染
renderTasks();
```

## 扩展建议

- 添加任务编辑功能
- 添加任务分类或标签
- 添加任务优先级
- 添加任务搜索功能
- 添加任务统计（已完成/未完成数量）
