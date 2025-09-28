# 智谱AI 问答助手

一个基于智谱AI GLM-4.5模型的网页版问答系统，支持Markdown渲染和代码块复制功能。

## 功能特性

- 🤖 基于智谱AI GLM-4.5模型
- 💬 实时问答对话
- 📝 完整的Markdown渲染支持
- 💻 代码语法高亮
- 📋 一键复制代码块
- 🎨 现代化响应式UI设计
- ⚡ 快速响应和流畅体验

## 安装和运行

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 配置API Key

在 `app.py` 文件中，将API Key替换为您自己的智谱AI API Key：

```python
client = ZhipuAiClient(api_key="您的API_KEY")
```

### 3. 运行应用

```bash
python app.py
```

### 4. 访问应用

打开浏览器访问：http://localhost:5000

## 项目结构

```
智谱AI/
├── app.py                 # Flask后端应用
├── main.py               # 原始测试文件
├── requirements.txt      # Python依赖
├── README.md            # 项目说明
├── templates/           # HTML模板
│   └── index.html      # 主页面
└── static/             # 静态资源
    ├── css/
    │   └── style.css   # 样式文件
    └── js/
        └── script.js   # JavaScript脚本
```

## 使用说明

1. 在输入框中输入您的问题
2. 点击发送按钮或按Enter键发送消息
3. AI将返回Markdown格式的回答
4. 代码块支持语法高亮和一键复制
5. 支持Ctrl+Enter快速发送

## 技术栈

- **后端**: Flask + 智谱AI SDK
- **前端**: HTML5 + CSS3 + JavaScript
- **Markdown渲染**: Marked.js
- **代码高亮**: Highlight.js
- **图标**: Font Awesome

## 注意事项

- 请确保您有有效的智谱AI API Key
- 消息长度限制为2000字符
- 建议在稳定的网络环境下使用

## 许可证

MIT License