// Constants
const MAX_RESULT_LENGTH = 500;
const RECONNECT_DELAY = 1000;
const WEBSOCKET_OPEN = 1;

const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("sendBtn");
const connectionStatus = document.getElementById("connection-status");

let ws;
const session = crypto.randomUUID();
let currentAssistantMessage = null;
let thinkingMessage = null;

// Track event listeners for cleanup
const eventListeners = new WeakMap();

function updateConnectionStatus(connected) {
  if (connected) {
    connectionStatus.textContent = "Connected";
    connectionStatus.classList.add("connected");
  } else {
    connectionStatus.textContent = "Disconnected";
    connectionStatus.classList.remove("connected");
  }
}

function connect() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}/chat`);
  
  ws.addEventListener("open", () => {
    updateConnectionStatus(true);
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  });

  ws.addEventListener("message", e => {
    const m = JSON.parse(e.data);
    
    switch(m.type) {
      case "assistant_text_delta":
        // Remove thinking message when assistant starts responding
        if (thinkingMessage) {
          thinkingMessage.remove();
          thinkingMessage = null;
        }
        if (!currentAssistantMessage) {
          currentAssistantMessage = addMessage("", "assistant");
        }
        // Build content safely and append
        const sanitizedContent = parseMarkdown(m.text);
        currentAssistantMessage.innerHTML += sanitizedContent;
        scrollToBottom();
        break;
        
      case "thinking_delta":
        if (!thinkingMessage) {
          const messageDiv = addMessageDiv("Claude is thinking...", "system");
          thinkingMessage = messageDiv;
        }
        break;
        
      case "tool_call":
        // Reset current assistant message so next text starts fresh
        currentAssistantMessage = null;
        addToolMessage(m.tool.name, m.tool.args);
        break;
        
      case "tool_result":
        const result = m.tool.result?.output ?? m.tool.result ?? null;
        addToolResult(result);
        break;
        
      case "assistant_text_end":
        currentAssistantMessage = null;
        break;
        
      case "done":
        // Remove any lingering thinking message
        if (thinkingMessage) {
          thinkingMessage.remove();
          thinkingMessage = null;
        }
        break;
    }
  });

  ws.addEventListener("close", () => {
    updateConnectionStatus(false);
    input.disabled = true;
    sendBtn.disabled = true;
  });

  ws.addEventListener("error", (e) => {
    updateConnectionStatus(false);
    setTimeout(connect, RECONNECT_DELAY);
  });
}

function sendMessage() {
  const text = input.value.trim();
  input.value = "";
  
  if (!text) return;
  
  if (ws.readyState !== WEBSOCKET_OPEN) {
    addMessage("Connection lost. Reconnecting...", "system");
    return;
  }
  
  addMessage(text, "user");
  currentAssistantMessage = null;
  
  // Add thinking message immediately
  const messageDiv = addMessageDiv("Claude is thinking...", "system");
  thinkingMessage = messageDiv;
  
  ws.send(JSON.stringify({ type: "prompt", session, workspace: "demo", text }));
  input.focus();
}

input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener("click", sendMessage);

function parseMarkdown(text) {
  // Simple markdown parsing for bold text with basic escaping
  if (typeof text !== 'string') return String(text);
  
  return text
    // Escape HTML first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Then apply markdown
    .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
}

function addMessage(text, type) {
  const messageDiv = addMessageDiv(text, type);
  return messageDiv.querySelector('.message-content');
}

function addMessageDiv(text, type) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${type}`;
  
  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";
  
  if (type === "assistant") {
    // Build content safely to avoid XSS
    const sanitizedContent = parseMarkdown(text);
    contentDiv.innerHTML = sanitizedContent;
  } else {
    contentDiv.textContent = text;
  }
  
  messageDiv.appendChild(contentDiv);
  chat.appendChild(messageDiv);
  
  scrollToBottom();
  
  return messageDiv;
}

function addToolMessage(toolName, args) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "message tool";
  
  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";
  
  // Create header with icon
  const headerDiv = document.createElement("div");
  headerDiv.className = "tool-header";
  
  const icon = document.createElement("svg");
  icon.className = "tool-icon";
  icon.innerHTML = '<path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2" fill="none"/>';
  icon.setAttribute("viewBox", "0 0 24 24");
  
  const headerText = document.createElement("span");
  headerText.textContent = `Using ${toolName}`;
  
  headerDiv.appendChild(icon);
  headerDiv.appendChild(headerText);
  
  // Create details section
  const detailsDiv = document.createElement("div");
  detailsDiv.className = "tool-details";
  
  // Format args using extracted function
  const detailsText = formatToolArgs(toolName, args);
  
  detailsDiv.textContent = detailsText;
  
  contentDiv.appendChild(headerDiv);
  contentDiv.appendChild(detailsDiv);
  
  // Toggle expansion on click with cleanup tracking
  const toggleHandler = () => {
    icon.classList.toggle("expanded");
    detailsDiv.classList.toggle("show");
  };
  contentDiv.addEventListener("click", toggleHandler);
  
  // Store handler for cleanup
  eventListeners.set(contentDiv, { type: 'click', handler: toggleHandler });
  
  messageDiv.appendChild(contentDiv);
  chat.appendChild(messageDiv);
  
  // Store for result pairing using our tracking set
  messageDiv.dataset.toolCall = "pending";
  pendingToolCalls.add(messageDiv);
  
  scrollToBottom();
}

// Track pending tool calls to avoid DOM queries
const pendingToolCalls = new Set();

function addToolResult(result) {
  // Get the last pending call from our tracked set
  const pendingArray = Array.from(pendingToolCalls);
  const lastPendingCall = pendingArray[pendingArray.length - 1];
  
  if (lastPendingCall && lastPendingCall.isConnected) {
    lastPendingCall.dataset.toolCall = "complete";
    pendingToolCalls.delete(lastPendingCall);
    
    const detailsDiv = lastPendingCall.querySelector('.tool-details');
    if (detailsDiv) {
      const formattedResult = formatToolResult(result);
      detailsDiv.textContent += formattedResult;
    }
  }
}

function scrollToBottom() {
  throttledScrollToBottom();
}

const truncate = s => {
  if (typeof s === "string" && s.length > MAX_RESULT_LENGTH) {
    return s.slice(0, MAX_RESULT_LENGTH) + "…";
  }
  return s || "";
};

// Helper function to format tool arguments
function formatToolArgs(toolName, args) {
  if (typeof args !== "object" || args == null) {
    return String(args);
  }
  
  const formatters = {
    Edit: (args) => args.file_path || JSON.stringify(args, null, 2),
    Write: (args) => args.file_path || JSON.stringify(args, null, 2),
    Bash: (args) => args.command || JSON.stringify(args, null, 2)
  };
  
  const formatter = formatters[toolName];
  return formatter ? formatter(args) : JSON.stringify(args, null, 2);
}

// Helper function to format tool results
function formatToolResult(result) {
  if (result == null) {
    return "\n\nResult: (empty)";
  }
  
  if (typeof result === "string") {
    return "\n\nResult:\n" + truncate(result);
  }
  
  return "\n\nResult:\n" + truncate(JSON.stringify(result, null, 2));
}

// Throttled scroll function for better performance
let scrollTimeout;
function throttledScrollToBottom() {
  if (scrollTimeout) return;
  
  scrollTimeout = requestAnimationFrame(() => {
    chat.scrollTop = chat.scrollHeight;
    scrollTimeout = null;
  });
}

// Start connection
input.disabled = true;
sendBtn.disabled = true;
updateConnectionStatus(false);
connect();

// Focus input on page load
window.addEventListener("load", () => {
  input.focus();
});

// Keep focus on input
document.addEventListener("click", (e) => {
  if (!e.target.closest("a, button:not(#sendBtn), .message.tool")) {
    input.focus();
  }
});

// Cleanup function for when page is unloaded
window.addEventListener('beforeunload', () => {
  // Clean up pending tool calls
  pendingToolCalls.clear();
  
  // Clean up event listeners
  for (const [element, listenerInfo] of eventListeners) {
    if (element.isConnected) {
      element.removeEventListener(listenerInfo.type, listenerInfo.handler);
    }
  }
  eventListeners.clear();
  
  // Close WebSocket
  if (ws && ws.readyState === WEBSOCKET_OPEN) {
    ws.close();
  }
});