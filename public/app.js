const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("sendBtn");

let ws;
const session = crypto.randomUUID();
let currentAssistantMessage = null;
let thinkingIndicator = null;
let thinkingStartTime = null;
let thinkingTimerInterval = null;

function connect() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${location.host}/chat`);
  
  ws.addEventListener("open", () => {
    addMessage("Connected to server", "system");
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  });

  ws.addEventListener("message", e => {
    const m = JSON.parse(e.data);
    
    switch(m.type) {
      case "thinking_start":
        showThinkingIndicator();
        break;
        
      case "thinking_end":
        hideThinkingIndicator();
        break;
        
      case "assistant_text_delta":
        hideThinkingIndicator();
        if (!currentAssistantMessage) {
          currentAssistantMessage = addMessage("", "assistant");
        }
        currentAssistantMessage.textContent += m.text;
        scrollToBottom();
        break;
        
      case "thinking_delta":
        // Legacy support
        break;
        
      case "tool_call":
        addMessage(`Using ${m.tool.name}: ${JSON.stringify(m.tool.args)}`, "tool");
        break;
        
      case "tool_result":
        const result = truncate(m.tool.result?.output);
        addMessage(`Result: ${result}`, "tool");
        break;
        
      case "assistant_text_end":
        currentAssistantMessage = null;
        hideThinkingIndicator();
        break;
        
      case "done":
      case "error":
        hideThinkingIndicator();
        break;
    }
  });

  ws.addEventListener("close", () => {
    addMessage("Connection closed", "system");
    hideThinkingIndicator();
    input.disabled = true;
    sendBtn.disabled = true;
  });

  ws.addEventListener("error", (e) => {
    addMessage("Connection error - retrying...", "system");
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

function addMessage(text, type) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${type}`;
  
  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";
  contentDiv.textContent = text;
  
  messageDiv.appendChild(contentDiv);
  chat.appendChild(messageDiv);
  
  scrollToBottom();
  
  return contentDiv;
}

function scrollToBottom() {
  chat.scrollTop = chat.scrollHeight;
}

const truncate = s => typeof s === "string" && s.length > 160 ? s.slice(0, 160) + "…" : s;

function showThinkingIndicator() {
  if (thinkingIndicator) return;
  
  thinkingStartTime = Date.now();
  
  const messageDiv = document.createElement("div");
  messageDiv.className = "message thinking";
  messageDiv.id = "thinking-indicator";
  
  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";
  
  const thinkingText = document.createElement("span");
  thinkingText.className = "thinking-text";
  thinkingText.textContent = "Claude is thinking";
  
  const dotsSpan = document.createElement("span");
  dotsSpan.className = "thinking-dots";
  dotsSpan.innerHTML = '<span>.</span><span>.</span><span>.</span>';
  
  const timerSpan = document.createElement("span");
  timerSpan.className = "thinking-timer";
  timerSpan.textContent = " (0s)";
  
  contentDiv.appendChild(thinkingText);
  contentDiv.appendChild(dotsSpan);
  contentDiv.appendChild(timerSpan);
  messageDiv.appendChild(contentDiv);
  chat.appendChild(messageDiv);
  
  thinkingIndicator = messageDiv;
  
  // Update timer every 100ms for smooth display
  thinkingTimerInterval = setInterval(() => {
    if (thinkingIndicator) {
      const elapsed = ((Date.now() - thinkingStartTime) / 1000).toFixed(1);
      const timer = thinkingIndicator.querySelector('.thinking-timer');
      if (timer) {
        timer.textContent = ` (${elapsed}s)`;
      }
    }
  }, 100);
  
  scrollToBottom();
}

function hideThinkingIndicator() {
  if (thinkingTimerInterval) {
    clearInterval(thinkingTimerInterval);
    thinkingTimerInterval = null;
  }
  
  if (thinkingIndicator) {
    thinkingIndicator.remove();
    thinkingIndicator = null;
  }
  
  thinkingStartTime = null;
}

// Start connection
input.disabled = true;
sendBtn.disabled = true;
connect();

// Focus input on page load
window.addEventListener("load", () => {
  input.focus();
});

// Keep focus on input
document.addEventListener("click", (e) => {
  if (!e.target.closest("a, button:not(#sendBtn)")) {
    input.focus();
  }
});