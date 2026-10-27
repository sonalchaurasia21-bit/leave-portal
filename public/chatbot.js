(function () {
  "use strict";

  // ============ STATE ============
  let isOpen = false;
  let isLoading = false;
  let messages = [];
  const STORAGE_KEY = "crce_chat_history";

  // Restore session messages
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) messages = JSON.parse(saved);
  } catch (e) {}

  function saveMessages() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch (e) {}
  }

  // ============ CREATE DOM ============
  function createChatWidget() {
    // FAB Button
    const fab = document.createElement("button");
    fab.id = "chatbot-fab";
    fab.setAttribute("aria-label", "Open chat assistant");
    fab.innerHTML = `
      <span class="chatbot-fab__icon chatbot-fab__icon--chat"><i class="fa-solid fa-comments"></i></span>
      <span class="chatbot-fab__icon chatbot-fab__icon--close"><i class="fa-solid fa-xmark"></i></span>
      <span class="chatbot-fab__pulse"></span>
    `;
    document.body.appendChild(fab);

    // Chat Window
    const chatWindow = document.createElement("div");
    chatWindow.id = "chatbot-window";
    chatWindow.innerHTML = `
      <div class="chatbot__header">
        <div class="chatbot__header-info">
          <div class="chatbot__avatar">
            <i class="fa-solid fa-robot"></i>
          </div>
          <div>
            <div class="chatbot__title">CRCE Assistant</div>
            <div class="chatbot__status"><span class="chatbot__status-dot"></span> Online</div>
          </div>
        </div>
        <div class="chatbot__header-actions">
          <button class="chatbot__clear-btn" id="chatbot-clear" title="Clear chat">
            <i class="fa-solid fa-trash-can"></i>
          </button>
          <button class="chatbot__close-btn" id="chatbot-close" title="Close">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
      <div class="chatbot__messages" id="chatbot-messages"></div>
      <div class="chatbot__input-area">
        <div class="chatbot__input-wrapper">
          <textarea id="chatbot-input" placeholder="Ask me anything about leaves..." rows="1"></textarea>
          <button class="chatbot__send-btn" id="chatbot-send" title="Send message">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </div>
        <div class="chatbot__powered">Powered by AI · CRCE Leave Portal</div>
      </div>
    `;
    document.body.appendChild(chatWindow);

    // Bind events
    fab.addEventListener("click", toggleChat);
    document.getElementById("chatbot-close").addEventListener("click", toggleChat);
    document.getElementById("chatbot-clear").addEventListener("click", clearChat);
    document.getElementById("chatbot-send").addEventListener("click", sendMessage);

    const input = document.getElementById("chatbot-input");
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Auto-resize textarea
    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 100) + "px";
    });

    // Render existing messages
    renderAllMessages();

    // Show welcome if no messages
    if (messages.length === 0) {
      showWelcome();
    }
  }

  // ============ TOGGLE ============
  function toggleChat() {
    isOpen = !isOpen;
    const fab = document.getElementById("chatbot-fab");
    const win = document.getElementById("chatbot-window");
    if (isOpen) {
      fab.classList.add("chatbot-fab--open");
      win.classList.add("chatbot-window--open");
      setTimeout(() => {
        document.getElementById("chatbot-input").focus();
        scrollToBottom();
      }, 300);
    } else {
      fab.classList.remove("chatbot-fab--open");
      win.classList.remove("chatbot-window--open");
    }
  }

  // ============ WELCOME ============
  function showWelcome() {
    const container = document.getElementById("chatbot-messages");
    const welcome = document.createElement("div");
    welcome.className = "chatbot__welcome";
    welcome.innerHTML = `
      <div class="chatbot__welcome-icon"><i class="fa-solid fa-graduation-cap"></i></div>
      <h3>Welcome to CRCE Assistant! 👋</h3>
      <p>I can help you with leave applications, balance inquiries, and portal navigation.</p>
      <div class="chatbot__quick-actions">
        <button class="chatbot__quick-btn" data-q="How do I apply for leave?">📝 How to apply?</button>
        <button class="chatbot__quick-btn" data-q="What are the available leave types?">📋 Leave types</button>
        <button class="chatbot__quick-btn" data-q="How can I check my leave balance?">📊 Check balance</button>
        <button class="chatbot__quick-btn" data-q="What is the leave approval process?">✅ Approval process</button>
      </div>
    `;
    container.appendChild(welcome);

    // Bind quick action buttons
    welcome.querySelectorAll(".chatbot__quick-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const q = btn.dataset.q;
        document.getElementById("chatbot-input").value = q;
        // Remove welcome
        const w = container.querySelector(".chatbot__welcome");
        if (w) w.remove();
        sendMessage();
      });
    });
  }

  // ============ RENDER ============
  function renderAllMessages() {
    const container = document.getElementById("chatbot-messages");
    container.innerHTML = "";
    messages.forEach((msg) => appendMessageBubble(msg.role, msg.content));
  }

  function appendMessageBubble(role, content) {
    const container = document.getElementById("chatbot-messages");
    const bubble = document.createElement("div");
    bubble.className = `chatbot__msg chatbot__msg--${role === "user" ? "user" : "bot"}`;

    const avatar = document.createElement("div");
    avatar.className = "chatbot__msg-avatar";
    avatar.innerHTML =
      role === "user"
        ? '<i class="fa-solid fa-user"></i>'
        : '<i class="fa-solid fa-robot"></i>';

    const text = document.createElement("div");
    text.className = "chatbot__msg-text";
    text.innerHTML = formatMessage(content);

    const time = document.createElement("div");
    time.className = "chatbot__msg-time";
    time.textContent = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (role === "user") {
      bubble.appendChild(text);
      bubble.appendChild(avatar);
    } else {
      bubble.appendChild(avatar);
      bubble.appendChild(text);
    }
    text.appendChild(time);

    container.appendChild(bubble);
    scrollToBottom();
  }

  function formatMessage(text) {
    // Basic markdown-lite rendering
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, '<code style="background:rgba(0,0,0,.06);padding:.1rem .3rem;border-radius:3px;font-size:.82em">$1</code>')
      .replace(/\n/g, "<br>");
  }

  function showTypingIndicator() {
    const container = document.getElementById("chatbot-messages");
    const typing = document.createElement("div");
    typing.className = "chatbot__msg chatbot__msg--bot chatbot__typing";
    typing.id = "chatbot-typing";
    typing.innerHTML = `
      <div class="chatbot__msg-avatar"><i class="fa-solid fa-robot"></i></div>
      <div class="chatbot__msg-text chatbot__typing-dots">
        <span></span><span></span><span></span>
      </div>
    `;
    container.appendChild(typing);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const el = document.getElementById("chatbot-typing");
    if (el) el.remove();
  }

  function scrollToBottom() {
    const container = document.getElementById("chatbot-messages");
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 50);
  }

  // ============ SEND ============
  async function sendMessage() {
    if (isLoading) return;
    const input = document.getElementById("chatbot-input");
    const text = input.value.trim();
    if (!text) return;

    // Remove welcome if present
    const welcome = document.querySelector(".chatbot__welcome");
    if (welcome) welcome.remove();

    // Add user message
    messages.push({ role: "user", content: text });
    appendMessageBubble("user", text);
    input.value = "";
    input.style.height = "auto";
    saveMessages();

    // Show typing
    isLoading = true;
    updateSendButton();
    showTypingIndicator();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      removeTypingIndicator();

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get response");
      }

      const data = await res.json();
      messages.push({ role: "assistant", content: data.reply });
      appendMessageBubble("assistant", data.reply);
      saveMessages();
    } catch (err) {
      removeTypingIndicator();
      const errorMsg =
        "Sorry, I'm having trouble connecting right now. Please try again in a moment. 🔄";
      appendMessageBubble("assistant", errorMsg);
    }

    isLoading = false;
    updateSendButton();
    input.focus();
  }

  function updateSendButton() {
    const btn = document.getElementById("chatbot-send");
    if (isLoading) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    } else {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
    }
  }

  // ============ CLEAR ============
  function clearChat() {
    messages = [];
    saveMessages();
    renderAllMessages();
    showWelcome();
  }

  // ============ INIT ============
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createChatWidget);
  } else {
    createChatWidget();
  }
})();
