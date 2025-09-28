// DOM元素
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const loadingOverlay = document.getElementById('loadingOverlay');
const toast = document.getElementById('toast');

// 全局变量
let isLoading = false;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // 配置marked选项
    marked.setOptions({
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(code, { language: lang }).value;
                } catch (err) {
                    console.error('代码高亮错误:', err);
                }
            }
            return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true
    });

    // 绑定事件
    bindEvents();
    
    // 自动调整输入框高度
    autoResizeTextarea();
    
    // 更新字符计数
    updateCharCount();
}

function bindEvents() {
    console.log('绑定事件...');
    console.log('sendButton:', sendButton);
    console.log('messageInput:', messageInput);
    
    // 发送按钮点击事件
    sendButton.addEventListener('click', function(e) {
        console.log('发送按钮被点击');
        e.preventDefault();
        handleSendMessage();
    });
    
    // 输入框回车事件
    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            if (e.ctrlKey) {
                handleSendMessage();
            } else if (!e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        }
    });
    
    // 输入框输入事件
    messageInput.addEventListener('input', function() {
        autoResizeTextarea();
        updateCharCount();
    });
    
    // 阻止表单默认提交
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.target === messageInput) {
            e.preventDefault();
        }
    });
}

function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
}

function updateCharCount() {
    const count = messageInput.value.length;
    const charCountElement = document.querySelector('.char-count');
    charCountElement.textContent = `${count}/2000`;
    
    if (count > 1800) {
        charCountElement.style.color = '#f56565';
    } else if (count > 1500) {
        charCountElement.style.color = '#ed8936';
    } else {
        charCountElement.style.color = '#718096';
    }
}

async function handleSendMessage() {
    console.log('handleSendMessage 被调用');
    const message = messageInput.value.trim();
    console.log('输入的消息:', message);
    
    if (!message || isLoading) {
        console.log('消息为空或正在加载中，返回');
        return;
    }
    
    if (message.length > 2000) {
        console.log('消息长度超过限制');
        showToast('消息长度不能超过2000字符', 'error');
        return;
    }
    
    console.log('开始处理消息发送');
    
    // 添加用户消息
    addMessage(message, 'user');
    
    // 清空输入框
    messageInput.value = '';
    updateCharCount();
    autoResizeTextarea();
    
    // 设置加载状态
    setLoading(true);
    
    // 创建AI消息容器
    const assistantMessageElement = createMessageElement('', 'assistant');
    const contentElement = assistantMessageElement.querySelector('.message-content');
    
    try {
        console.log('发送流式请求到后端...');
        
        // 使用EventSource进行流式通信
        const response = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';
        
        // 添加流式效果类
        contentElement.classList.add('streaming');
        
        // 标记是否已经开始接收内容（用于控制加载状态）
        let hasStartedReceiving = false;
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // 保留不完整的行
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.error) {
                            throw new Error(data.error);
                        }
                        
                        if (data.content) {
                            // 第一次接收到内容时，立即关闭加载提示
                            if (!hasStartedReceiving) {
                                setLoading(false);
                                hasStartedReceiving = true;
                            }
                            
                            fullContent += data.content;
                            // 实时更新显示内容
                            contentElement.innerHTML = marked.parse(fullContent);
                            processCodeBlocks(contentElement);
                            scrollToBottom();
                        }
                        
                        if (data.done) {
                            console.log('流式响应完成');
                            // 移除流式效果类
                            contentElement.classList.remove('streaming');
                            break;
                        }
                    } catch (parseError) {
                        console.error('解析流式数据错误:', parseError);
                    }
                }
            }
        }
        
        console.log('AI回复添加成功');
        
    } catch (error) {
        console.error('发送消息错误:', error);
        showToast('发送消息失败: ' + error.message, 'error');
        
        // 如果已经创建了消息元素，显示错误信息
        if (contentElement) {
            contentElement.classList.remove('streaming');
            contentElement.innerHTML = '<p>抱歉，我遇到了一些问题，请稍后再试。</p>';
        } else {
            addMessage('抱歉，我遇到了一些问题，请稍后再试。', 'assistant');
        }
    } finally {
        // 确保加载状态被关闭（如果还没有在流式响应中关闭的话）
        if (isLoading) {
            setLoading(false);
        }
        console.log('消息发送处理完成');
    }
}

function createMessageElement(content, role) {
    // 移除欢迎消息
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    if (content) {
        if (role === 'assistant') {
            // 渲染Markdown
            const htmlContent = marked.parse(content);
            messageContent.innerHTML = htmlContent;
            
            // 处理代码块
            processCodeBlocks(messageContent);
        } else {
            messageContent.textContent = content;
        }
    }
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    
    chatMessages.appendChild(messageDiv);
    
    // 滚动到底部
    scrollToBottom();
    
    return messageDiv;
}

function addMessage(content, role) {
    return createMessageElement(content, role);
}

function processCodeBlocks(container) {
    const preElements = container.querySelectorAll('pre');
    
    preElements.forEach(pre => {
        const code = pre.querySelector('code');
        if (!code) return;
        
        // 获取语言类型
        const className = code.className || '';
        const langMatch = className.match(/language-(\w+)/);
        const language = langMatch ? langMatch[1] : 'text';
        
        // 创建代码头部
        const header = document.createElement('div');
        header.className = 'code-header';
        
        const langSpan = document.createElement('span');
        langSpan.className = 'code-language';
        langSpan.textContent = language.toUpperCase();
        
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.innerHTML = '<i class="fas fa-copy"></i> 复制';
        copyButton.addEventListener('click', () => copyCode(code, copyButton));
        
        header.appendChild(langSpan);
        header.appendChild(copyButton);
        
        // 重新组织结构
        pre.insertBefore(header, code);
    });
}

async function copyCode(codeElement, button) {
    const text = codeElement.textContent;
    
    try {
        await navigator.clipboard.writeText(text);
        
        // 更新按钮状态
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> 已复制';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.classList.remove('copied');
        }, 2000);
        
        showToast('代码已复制到剪贴板');
        
    } catch (err) {
        console.error('复制失败:', err);
        
        // 降级方案：使用传统方法
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            textArea.remove();
            
            showToast('代码已复制到剪贴板');
        } catch (fallbackErr) {
            console.error('降级复制也失败:', fallbackErr);
            showToast('复制失败，请手动选择复制', 'error');
        }
    }
}

function setLoading(loading) {
    isLoading = loading;
    sendButton.disabled = loading;
    
    if (loading) {
        loadingOverlay.style.display = 'flex';
        sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    } else {
        loadingOverlay.style.display = 'none';
        sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
    }
}

function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function scrollToBottom() {
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 100);
}

// 工具函数：格式化时间
function formatTime(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 工具函数：防抖
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 工具函数：节流
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// 错误处理
window.addEventListener('error', function(e) {
    console.error('全局错误:', e.error);
    showToast('发生了未知错误，请刷新页面重试', 'error');
});

// 网络状态监听
window.addEventListener('online', function() {
    showToast('网络连接已恢复');
});

window.addEventListener('offline', function() {
    showToast('网络连接已断开', 'error');
});

// 页面可见性变化监听
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        // 页面变为可见时，可以进行一些操作
        console.log('页面变为可见');
    }
});