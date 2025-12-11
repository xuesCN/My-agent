// 全局变量
let ws = null;
let isConnected = false;
let isTyping = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 3000;

// 配置marked.js
marked.setOptions({
  sanitize: true, // 启用HTML清理，防止XSS攻击
  gfm: true, // 启用GitHub风格Markdown
  breaks: true, // 转换换行符为<br>
});

// 打字机效果相关变量（新增：当前AI气泡的唯一ID，解决冲突）
let typingInterval = null;
let messageBuffer = ""; // 存储从后端接收的所有内容
let currentIndex = 0; // 当前显示的字符索引
const typingSpeed = 30; // 打字速度（毫秒/字符）
let currentAssistantMessageId = ""; // 存储当前AI气泡的唯一ID，避免冲突
let currentConversationId = null; // 当前对话ID

// DOM元素
const messagesContainer = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const statusIndicator = document.getElementById("statusIndicator");
const statusText = document.getElementById("statusText");
const historyList = document.getElementById("historyList");
const clearHistoryButton = document.getElementById("clearHistory");

// DOM元素调试
console.log("[DOM] messagesContainer:", messagesContainer);
console.log("[DOM] messageInput:", messageInput);
console.log("[DOM] sendButton:", sendButton);
console.log("[DOM] statusIndicator:", statusIndicator);
console.log("[DOM] statusText:", statusText);

// 新建会话函数
function newConversation() {
  console.log("[newConversation] 创建新会话");

  // 生成新的会话ID（使用时间戳确保唯一性）
  const newConversationId = Date.now().toString();
  currentConversationId = newConversationId;

  // 清空当前聊天界面
  messagesContainer.innerHTML = "";

  // 显示系统欢迎消息
  addSystemMessage("欢迎使用AI助手！请输入您的问题，我会尽力为您解答。");

  // 更新历史对话列表
  renderHistoryList();

  // 清空输入框
  messageInput.value = "";
  adjustTextareaHeight();
}

// 初始化
function init() {
  console.log("[init] 开始初始化");

  // 添加事件监听
  console.log("[init] 添加发送按钮点击事件监听");
  sendButton.addEventListener("click", sendMessage);
  console.log("[init] 添加输入框按键事件监听");
  messageInput.addEventListener("keypress", handleKeyPress);
  console.log("[init] 添加输入框输入事件监听");
  messageInput.addEventListener("input", adjustTextareaHeight);

  // 获取新建会话按钮元素
  const newConversationButton = document.getElementById("newConversation");
  console.log("[DOM] newConversationButton:", newConversationButton);
  newConversationButton.addEventListener("click", newConversation);
  console.log("[init] 添加清除历史按钮事件监听");
  clearHistoryButton.addEventListener("click", clearHistory);

  // 初始化WebSocket连接
  console.log("[init] 初始化WebSocket连接");
  connectWebSocket();

  // 加载历史对话
  console.log("[init] 加载历史对话");
  loadHistory();

  // 添加系统欢迎消息
  console.log("[init] 添加系统欢迎消息");
  addSystemMessage("欢迎使用AI助手！请输入您的问题，我会尽力为您解答。");

  // 自动聚焦输入框
  console.log("[init] 自动聚焦输入框");
  messageInput.focus();

  console.log("[init] 初始化完成");
}

// 连接WebSocket
function connectWebSocket() {
  try {
    // 创建WebSocket连接，使用与HTTP服务器相同的端口
    ws = new WebSocket("ws://localhost:3002");

    // 连接打开事件
    ws.onopen = function () {
      console.log("WebSocket连接已建立");
      updateConnectionStatus(true, "已连接");
      reconnectAttempts = 0;
    };

    // 接收消息事件
    ws.onmessage = function (event) {
      try {
        const data = JSON.parse(event.data);
        handleIncomingMessage(data);
      } catch (error) {
        console.error("解析消息失败:", error);
        addErrorMessage("无法解析服务器响应，请稍后重试。");
      }
    };

    // 连接关闭事件
    ws.onclose = function (event) {
      console.log("WebSocket连接已关闭:", event.code, event.reason);
      updateConnectionStatus(false, "连接已断开");
      attemptReconnect();
    };

    // 连接错误事件
    ws.onerror = function (error) {
      console.error("WebSocket错误:", error);
      updateConnectionStatus(false, "连接错误");
    };
  } catch (error) {
    console.error("创建WebSocket连接失败:", error);
    updateConnectionStatus(false, "连接失败");
    attemptReconnect();
  }
}

// 更新连接状态
function updateConnectionStatus(connected, text) {
  isConnected = connected;
  statusText.textContent = text;

  // 更新状态指示器
  statusIndicator.className = "status-indicator";
  if (connected) {
    statusIndicator.classList.add("connected");
    sendButton.disabled = false;
  } else {
    statusIndicator.classList.add("error");
    sendButton.disabled = true;
  }
}

// 尝试重新连接
function attemptReconnect() {
  if (reconnectAttempts < maxReconnectAttempts) {
    reconnectAttempts++;
    console.log(
      `尝试重新连接... (${reconnectAttempts}/${maxReconnectAttempts})`
    );
    updateConnectionStatus(
      false,
      `正在重新连接... (${reconnectAttempts}/${maxReconnectAttempts})`
    );

    setTimeout(function () {
      connectWebSocket();
    }, reconnectDelay);
  } else {
    updateConnectionStatus(false, "连接失败，请刷新页面重试");
  }
}

// 处理按键事件
function handleKeyPress(event) {
  // 按Enter键发送消息，Shift+Enter换行
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

// 调整文本区域高度
function adjustTextareaHeight() {
  // 重置高度以获取正确的滚动高度
  messageInput.style.height = "auto";

  // 设置新高度，最大12rem
  const newHeight = Math.min(messageInput.scrollHeight, 192); // 12rem = 192px
  messageInput.style.height = newHeight + "px";
}

// 发送消息
function sendMessage() {
  console.log("[sendMessage] 函数被调用");
  const message = messageInput.value.trim();

  console.log("[sendMessage] 消息内容:", message);
  if (!message) {
    console.log("[sendMessage] 消息为空，返回");
    return;
  }

  console.log("[sendMessage] 连接状态:", isConnected);
  if (!isConnected) {
    console.log("[sendMessage] 连接已断开，显示错误消息");
    addErrorMessage("连接已断开，请检查网络连接后重试。");
    return;
  }

  // 只有当没有当前对话ID时，才创建新的对话ID
  if (!currentConversationId) {
    currentConversationId = Date.now().toString();
  }

  try {
    console.log("[sendMessage] 发送用户消息:", message);
    // 添加用户消息到界面（优化：用textContent防XSS）
    addMessage("user", "XU", message);

    // 清空输入框
    messageInput.value = "";
    adjustTextareaHeight();

    // 禁用发送按钮
    sendButton.disabled = true;

    // 重置打字机相关变量，确保每次新回复都创建新气泡
    console.log("[sendMessage] 重置打字机变量");
    if (typingInterval) {
      clearInterval(typingInterval);
      typingInterval = null;
    }
    messageBuffer = "";
    currentIndex = 0;
    currentAssistantMessageId = ""; // 重置唯一ID，避免复用

    // 获取当前对话的完整历史记录
    const history = getHistory();
    const currentConversation = history.find(
      (c) => c.id === currentConversationId
    );
    const conversationHistory = currentConversation
      ? currentConversation.messages
      : [];

    // 发送消息到服务器（包含当前对话的历史记录）
    ws.send(
      JSON.stringify({
        type: "message",
        content: message,
        conversationId: currentConversationId,
        history: conversationHistory,
      })
    );

    // 显示正在输入状态
    addTypingIndicator();

    // 保存用户消息到历史记录
    saveMessageToHistory(message, "user");
  } catch (error) {
    console.error("发送消息失败:", error);
    addErrorMessage("发送消息失败，请稍后重试。");
    sendButton.disabled = false;
  }
}

// 处理接收到的消息
function handleIncomingMessage(data) {
  console.log("[handleIncomingMessage] 收到消息:", data);
  // 移除正在输入指示器
  removeTypingIndicator();

  // 启用发送按钮
  sendButton.disabled = false;

  switch (data.type) {
    case "welcome":
      // 欢迎消息，只在控制台显示
      console.log("服务器欢迎消息:", data.message);
      break;
    case "start":
      // 开始处理消息，显示正在输入
      addTypingIndicator();
      // 重置打字机相关变量，确保每次新回复都创建新气泡
      console.log("[handleIncomingMessage] 重置打字机变量 (start)");
      if (typingInterval) {
        clearInterval(typingInterval);
        typingInterval = null;
      }
      messageBuffer = "";
      currentIndex = 0;
      currentAssistantMessageId = ""; // 重置唯一ID
      break;
    case "chunk":
      // 处理流式响应
      updateAssistantMessage(data.content);
      break;
    case "complete":
      // 响应完成，最终处理
      console.log("[handleIncomingMessage] 响应完成");

      // 先保存AI回复到历史记录（在finalizeAssistantMessage清空buffer之前）
      if (messageBuffer.length > 0) {
        saveMessageToHistory(messageBuffer, "assistant");
      }

      // 再最终化消息并重置变量
      finalizeAssistantMessage();
      break;
    case "error":
      addErrorMessage(data.message || "服务器错误，请稍后重试。");
      break;
    default:
      console.warn("未知消息类型:", data.type);
  }
}

// 添加消息到界面（优化：用DOM API+textContent防XSS，移除innerHTML风险，支持Markdown渲染）
function addMessage(role, name, content) {
  const messageElement = document.createElement("div");
  messageElement.className = `message ${role}`;

  const avatarInitial = role === "user" ? "XU" : "AI";

  // 用DOM API创建元素，避免innerHTML的XSS风险
  const avatarElement = document.createElement("div");
  avatarElement.className = "message-avatar";
  avatarElement.textContent = avatarInitial;

  const contentElement = document.createElement("div");
  contentElement.className = "message-content";

  const bodyElement = document.createElement("div");
  bodyElement.className = "message-body";

  // 仅对AI消息进行Markdown渲染
  if (role === "assistant") {
    const renderedHTML = marked.parse(content);
    bodyElement.innerHTML = renderedHTML; // marked已清理HTML，安全可靠
  } else {
    bodyElement.textContent = content; // 用户消息保持原样，自动转义特殊字符
  }

  // 组装DOM
  contentElement.appendChild(bodyElement);
  messageElement.appendChild(avatarElement);
  messageElement.appendChild(contentElement);

  messagesContainer.appendChild(messageElement);
  scrollToBottom();
}

// 历史对话相关函数

// 保存消息到历史记录
function saveMessageToHistory(content, role) {
  if (!currentConversationId) return;

  // 获取现有的历史记录
  const history = getHistory();

  // 查找当前对话
  let conversation = history.find((item) => item.id === currentConversationId);

  if (!conversation) {
    // 创建新对话
    conversation = {
      id: currentConversationId,
      date: new Date().toISOString(),
      messages: [],
    };
    history.push(conversation);
  }

  // 添加消息
  conversation.messages.push({
    role,
    content,
    timestamp: Date.now(),
  });

  // 更新对话日期
  conversation.date = new Date().toISOString();

  // 保存到localStorage
  localStorage.setItem("chatHistory", JSON.stringify(history));

  // 更新历史列表显示
  renderHistoryList();
}

// 获取历史记录
function getHistory() {
  const historyJson = localStorage.getItem("chatHistory");
  return historyJson ? JSON.parse(historyJson) : [];
}

// 渲染历史对话列表
function renderHistoryList() {
  const history = getHistory();
  historyList.innerHTML = "";

  // 倒序显示，最新的在前面
  const sortedHistory = [...history].reverse();

  sortedHistory.forEach((conversation) => {
    const historyItem = document.createElement("div");
    historyItem.className = "history-item";
    historyItem.dataset.id = conversation.id;

    // 显示第一条用户消息作为预览
    const userMessage = conversation.messages.find((m) => m.role === "user");
    const previewText = userMessage
      ? userMessage.content.substring(0, 50) +
        (userMessage.content.length > 50 ? "..." : "")
      : "空对话";

    // 格式化日期
    const date = new Date(conversation.date);
    const dateString = date.toLocaleDateString();
    const timeString = date.toLocaleTimeString();

    historyItem.innerHTML = `
      <div class="history-item-date">${dateString} ${timeString}</div>
      <div class="history-item-content">${previewText}</div>
    `;

    // 添加点击事件
    historyItem.addEventListener("click", () =>
      loadConversation(conversation.id)
    );

    historyList.appendChild(historyItem);
  });
}

// 加载对话
function loadConversation(conversationId) {
  const history = getHistory();
  const conversation = history.find((item) => item.id === conversationId);

  if (!conversation) return;

  // 清空当前消息
  messagesContainer.innerHTML = "";

  // 添加系统欢迎消息
  addSystemMessage("欢迎使用AI助手！请输入您的问题，我会尽力为您解答。");

  // 加载对话消息
  conversation.messages.forEach((message) => {
    if (message.role === "user") {
      addMessage("user", "XU", message.content);
    } else if (message.role === "assistant") {
      addMessage("assistant", "AI", message.content);
    }
  });

  // 更新当前对话ID
  currentConversationId = conversationId;

  // 更新历史列表选中状态
  document.querySelectorAll(".history-item").forEach((item) => {
    item.classList.remove("active");
  });
  document
    .querySelector(`[data-id="${conversationId}"]`)
    .classList.add("active");

  // 滚动到底部
  scrollToBottom();
}

// 清除历史记录
function clearHistory() {
  if (confirm("确定要清除所有历史对话吗？此操作不可恢复。")) {
    localStorage.removeItem("chatHistory");
    renderHistoryList();

    // 清空当前消息
    messagesContainer.innerHTML = "";
    addSystemMessage("欢迎使用AI助手！请输入您的问题，我会尽力为您解答。");

    // 重置当前对话ID
    currentConversationId = null;
  }
}

// 加载历史记录
function loadHistory() {
  renderHistoryList();
}

// 添加系统消息
function addSystemMessage(content) {
  const messageElement = document.createElement("div");
  messageElement.className = "system-message";
  messageElement.textContent = content;

  messagesContainer.appendChild(messageElement);
  scrollToBottom();
}

// 添加错误消息
function addErrorMessage(content) {
  addSystemMessage(`❌ ${content}`);
}

// 添加正在输入指示器
function addTypingIndicator() {
  if (isTyping) return;

  isTyping = true;

  const typingElement = document.createElement("div");
  typingElement.id = "typingIndicator";
  typingElement.className = "message assistant";

  // 用DOM API创建，避免innerHTML（可选优化，此处不影响核心功能）
  const avatarElement = document.createElement("div");
  avatarElement.className = "message-avatar";
  avatarElement.textContent = "AI";

  const contentElement = document.createElement("div");
  contentElement.className = "message-content";

  const bodyElement = document.createElement("div");
  bodyElement.className = "message-body";

  const typingElementInner = document.createElement("div");
  typingElementInner.className = "typing";
  for (let i = 0; i < 3; i++) {
    const span = document.createElement("span");
    typingElementInner.appendChild(span);
  }

  bodyElement.appendChild(typingElementInner);
  contentElement.appendChild(bodyElement);
  typingElement.appendChild(avatarElement);
  typingElement.appendChild(contentElement);

  messagesContainer.appendChild(typingElement);
  scrollToBottom();
}

// 移除正在输入指示器
function removeTypingIndicator() {
  const typingIndicator = document.getElementById("typingIndicator");
  if (typingIndicator) {
    typingIndicator.remove();
    isTyping = false;
  }
}

// 更新助手消息（用于流式响应）- 核心修复：动态唯一ID
function updateAssistantMessage(content) {
  console.log(
    "[updateAssistantMessage] 收到内容:",
    content,
    "当前buffer:",
    messageBuffer
  );
  // 将接收到的内容添加到缓冲区
  messageBuffer += content;

  // 如果打字机效果没有运行，启动它
  if (!typingInterval) {
    console.log(
      "[updateAssistantMessage] 启动打字机，当前ID:",
      currentAssistantMessageId
    );
    // 1. 生成唯一ID（时间戳+随机数，确保绝对不重复）
    currentAssistantMessageId = `assistant-message-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;
    console.log(
      "[updateAssistantMessage] 生成新ID:",
      currentAssistantMessageId
    );

    // 2. 创建AI气泡（用DOM API，避免innerHTML，同时绑定唯一ID）
    const messageElement = document.createElement("div");
    messageElement.className = "message assistant";

    const avatarElement = document.createElement("div");
    avatarElement.className = "message-avatar";
    avatarElement.textContent = "AI";

    const contentElement = document.createElement("div");
    contentElement.className = "message-content";

    const bodyElement = document.createElement("div");
    bodyElement.className = "message-body";
    bodyElement.id = currentAssistantMessageId; // 绑定唯一ID

    // 组装气泡结构
    contentElement.appendChild(bodyElement);
    messageElement.appendChild(avatarElement);
    messageElement.appendChild(contentElement);

    // 添加新气泡到容器
    console.log("[updateAssistantMessage] 添加新气泡到容器");
    messagesContainer.appendChild(messageElement);

    // 3. 根据唯一ID获取当前气泡的内容容器（精准定位，不找第一个）
    const messageBody = document.getElementById(currentAssistantMessageId);
    if (!messageBody) {
      console.error(
        "[updateAssistantMessage] 无法找到消息体元素，ID:",
        currentAssistantMessageId
      );
      return; // 容错：防止ID获取失败
    }
    console.log("[updateAssistantMessage] 找到消息体元素，准备逐字显示");

    // 4. 开始逐字显示（只填充当前气泡）
    typingInterval = setInterval(() => {
      if (currentIndex < messageBuffer.length) {
        messageBody.textContent += messageBuffer[currentIndex];
        currentIndex++;
        scrollToBottom();
      } else {
        console.log("[updateAssistantMessage] 打字机完成，清除定时器");
        clearInterval(typingInterval);
        typingInterval = null;
      }
    }, typingSpeed);
  } else {
    console.log(
      "[updateAssistantMessage] 打字机已在运行，当前ID:",
      currentAssistantMessageId
    );
  }
}

// 最终化助手消息 - 核心修复：通过唯一ID定位当前气泡，支持Markdown渲染
function finalizeAssistantMessage() {
  console.log(
    "[finalizeAssistantMessage] 开始最终化，当前ID:",
    currentAssistantMessageId,
    "buffer:",
    messageBuffer
  );
  // 清除打字机定时器
  if (typingInterval) {
    console.log("[finalizeAssistantMessage] 清除打字机定时器");
    clearInterval(typingInterval);
    typingInterval = null;
  }

  // 1. 根据唯一ID获取当前气泡（不再找第一个）
  const messageBody = document.getElementById(currentAssistantMessageId);
  if (messageBody) {
    console.log(
      "[finalizeAssistantMessage] 找到消息体，补全剩余内容并渲染Markdown"
    );
    // 将完整内容转换为Markdown并安全渲染
    const renderedHTML = marked.parse(messageBuffer);
    messageBody.innerHTML = renderedHTML; // marked已清理HTML，安全可靠
    scrollToBottom();
  } else {
    console.error(
      "[finalizeAssistantMessage] 无法找到消息体元素，ID:",
      currentAssistantMessageId
    );
  }

  // 2. 重置所有打字机相关变量，为下一次回复做准备
  console.log("[finalizeAssistantMessage] 重置所有打字机变量");
  messageBuffer = "";
  currentIndex = 0;
  currentAssistantMessageId = ""; // 清空唯一ID，避免复用
}

// 滚动到底部
function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", function () {
  console.log("[DOMContentLoaded] 事件已触发");
  init();
});

// 页面关闭时关闭WebSocket连接
document.addEventListener("beforeunload", function () {
  if (ws) {
    ws.close(1000, "页面已关闭");
  }
});

// 添加CSS样式到页面（用于正在输入指示器）
const style = document.createElement("style");
style.textContent = `
    .typing {
        display: flex;
        gap: 0.25rem;
    }
    
    .typing span {
        width: 0.5rem;
        height: 0.5rem;
        background-color: var(--text-muted);
        border-radius: 50%;
        animation: typingAnimation 1.4s infinite;
    }
    
    .typing span:nth-child(1) {
        animation-delay: -0.32s;
    }
    
    .typing span:nth-child(2) {
        animation-delay: -0.16s;
    }
    
    @keyframes typingAnimation {
        0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
        }
        40% {
            transform: scale(1);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
