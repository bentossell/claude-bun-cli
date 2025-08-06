const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("sendBtn");
const connectionStatus = document.getElementById("connection-status");

let ws;
const session = crypto.randomUUID();
let currentAssistantMessage = null;
let thinkingMessage = null;

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
        currentAssistantMessage.innerHTML += parseMarkdown(m.text);
        scrollToBottom();
        break;
        
      case "thinking_delta":
        if (!thinkingMessage) {
          const messageDiv = addMessageDiv("Claude is thinking...", "system");
          thinkingMessage = messageDiv;
        }
        break;
        
      case "tool_call":
        addToolMessage(m.tool.name, m.tool.args);
        break;
        
      case "tool_result":
        const result = m.tool.result?.output || m.tool.result;
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
    setTimeout(connect, 1000);
  });
}

function sendMessage() {
  const text = input.value.trim();
  input.value = "";
  
  if (!text) return;
  
  if (ws.readyState !== WebSocket.OPEN) {
    addMessage("Not connected. Please wait...", "system");
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
  // Simple markdown parsing for bold text
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
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
    contentDiv.innerHTML = parseMarkdown(text);
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
  
  // Format args based on tool name
  let detailsText = "";
  if (typeof args === "object" && args !== null) {
    if (toolName === "Edit" || toolName === "Write") {
      detailsText = args.file_path || JSON.stringify(args, null, 2);
    } else if (toolName === "Bash") {
      detailsText = args.command || JSON.stringify(args, null, 2);
    } else {
      detailsText = JSON.stringify(args, null, 2);
    }
  } else {
    detailsText = String(args);
  }
  
  detailsDiv.textContent = detailsText;
  
  contentDiv.appendChild(headerDiv);
  contentDiv.appendChild(detailsDiv);
  
  // Toggle expansion on click
  contentDiv.addEventListener("click", () => {
    icon.classList.toggle("expanded");
    detailsDiv.classList.toggle("show");
  });
  
  messageDiv.appendChild(contentDiv);
  chat.appendChild(messageDiv);
  
  // Store for result pairing
  messageDiv.dataset.toolCall = "pending";
  
  scrollToBottom();
}

function addToolResult(result) {
  // Find the last pending tool call
  const pendingToolCalls = chat.querySelectorAll('[data-tool-call="pending"]');
  const lastPendingCall = pendingToolCalls[pendingToolCalls.length - 1];
  
  if (lastPendingCall) {
    lastPendingCall.dataset.toolCall = "complete";
    const detailsDiv = lastPendingCall.querySelector('.tool-details');
    if (detailsDiv) {
      // Format result based on type
      let formattedResult = "";
      if (result === undefined || result === null) {
        formattedResult = "\n\nResult: (empty)";
      } else if (typeof result === "string") {
        formattedResult = "\n\nResult:\n" + truncate(result);
      } else {
        formattedResult = "\n\nResult:\n" + truncate(JSON.stringify(result, null, 2));
      }
      detailsDiv.textContent += formattedResult;
    }
  }
}

function scrollToBottom() {
  chat.scrollTop = chat.scrollHeight;
}

const truncate = s => {
  if (typeof s === "string" && s.length > 500) {
    return s.slice(0, 500) + "…";
  }
  return s || "";
};

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