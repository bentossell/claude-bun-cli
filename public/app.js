const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("sendBtn");

let ws;
const session = crypto.randomUUID();
let currentAssistantMessage = null;
let currentAssistantText = "";

// Cache for URL conversion to optimize performance during streaming
let lastProcessedText = "";
let lastProcessedResult = "";

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
      case "assistant_text_delta":
        if (!currentAssistantMessage) {
          currentAssistantMessage = addMessage("", "assistant");
          currentAssistantText = "";
        }
        currentAssistantText += m.text;
        // Convert URLs to clickable links for assistant messages during streaming
        currentAssistantMessage.innerHTML = convertUrlsToLinks(currentAssistantText);
        scrollToBottom();
        break;
        
      case "thinking_delta":
        addMessage("Claude is thinking...", "system");
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
        currentAssistantText = "";
        // Clear cache when assistant message ends
        lastProcessedText = "";
        lastProcessedResult = "";
        break;
    }
  });

  ws.addEventListener("close", () => {
    addMessage("Connection closed", "system");
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
  currentAssistantText = "";
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
  
  // For assistant messages, convert URLs to clickable links
  if (type === "assistant") {
    contentDiv.innerHTML = convertUrlsToLinks(text);
  } else {
    contentDiv.textContent = text;
  }
  
  messageDiv.appendChild(contentDiv);
  chat.appendChild(messageDiv);
  
  scrollToBottom();
  
  return contentDiv;
}

function convertUrlsToLinks(text) {
  // Performance optimization: return cached result if text hasn't changed
  if (text === lastProcessedText) {
    return lastProcessedResult;
  }
  
  // Escape HTML to prevent XSS
  const escaped = text.replace(/&/g, '&amp;')
                     .replace(/</g, '&lt;')
                     .replace(/>/g, '&gt;')
                     .replace(/"/g, '&quot;')
                     .replace(/'/g, '&#039;');
  
  // Enhanced URL regex that excludes quotes to prevent HTML attribute issues
  const urlRegex = /(https?:\/\/[^\s<>"']+)/g;
  
  // Convert URLs to links with validation
  const result = escaped.replace(urlRegex, (match) => {
    try {
      // Validate the URL to avoid creating links for malformed URLs
      new URL(match);
      return `<a href="${match}" target="_blank" rel="noopener noreferrer">${match}</a>`;
    } catch {
      // Return original text if invalid URL
      return match;
    }
  });
  
  // Cache the result for performance during streaming
  lastProcessedText = text;
  lastProcessedResult = result;
  
  return result;
}

function scrollToBottom() {
  chat.scrollTop = chat.scrollHeight;
}

const truncate = s => typeof s === "string" && s.length > 160 ? s.slice(0, 160) + "…" : s;

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