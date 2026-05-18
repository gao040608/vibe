---
name: landing-page
description: 创建一个简单的落地页，包含标题、介绍和 CTA 按钮
category: web-templates
tags: [html, css, 落地页, 模板]
---

# 落地页模板

快速创建一个简单的落地页，适合产品介绍、活动宣传等场景。

## 包含内容

- 响应式布局
- 标题和副标题
- 特性介绍区域
- CTA（行动号召）按钮
- 简洁的 CSS 样式

## 使用步骤

1. 创建 `index.html` 文件
2. 创建 `style.css` 文件
3. 根据需求修改文案和颜色

## 文件结构

```
project/
├── index.html
└── style.css
```

## index.html 模板

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>产品名称 - 一句话介绍</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <h1>产品名称</h1>
    <p class="subtitle">一句话介绍你的产品</p>
  </header>

  <main>
    <section class="hero">
      <h2>解决什么问题</h2>
      <p>用简单的语言描述你的产品能帮用户做什么</p>
      <button class="cta">立即开始</button>
    </section>

    <section class="features">
      <div class="feature">
        <h3>特性 1</h3>
        <p>简短描述</p>
      </div>
      <div class="feature">
        <h3>特性 2</h3>
        <p>简短描述</p>
      </div>
      <div class="feature">
        <h3>特性 3</h3>
        <p>简短描述</p>
      </div>
    </section>
  </main>

  <footer>
    <p>&copy; 2024 产品名称</p>
  </footer>
</body>
</html>
```

## style.css 模板

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.6;
  color: #333;
}

header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
  padding: 3rem 1rem;
}

header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.2rem;
  opacity: 0.9;
}

.hero {
  text-align: center;
  padding: 4rem 1rem;
  max-width: 800px;
  margin: 0 auto;
}

.hero h2 {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.cta {
  background: #667eea;
  color: white;
  border: none;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 2rem;
}

.cta:hover {
  background: #5568d3;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  padding: 3rem 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.feature {
  text-align: center;
  padding: 2rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.feature h3 {
  margin-bottom: 0.5rem;
  color: #667eea;
}

footer {
  text-align: center;
  padding: 2rem;
  background: #f8f9fa;
  margin-top: 3rem;
}
```

## 自定义建议

- 修改 `header` 的渐变色来匹配品牌色
- 调整 `.cta` 按钮的颜色
- 根据需要增减特性卡片数量
- 添加图片或图标来丰富视觉效果
