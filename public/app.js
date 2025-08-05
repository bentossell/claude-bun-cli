const chat = document.getElementById("chat");
const input = document.getElementById("msg");
const sendBtn = document.getElementById("sendBtn");

let ws;
const session = crypto.randomUUID();
let currentAssistantMessage = null;
let currentAssistantText = "";
let thinkingIndicator = null;
let thinkingTimer = null;
let thinkingStartTime = null;
let isThinking = false;
let isHidingThinking = false;

// Verify dependencies are loaded
function verifyDependencies() {
  if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
    console.warn('Markdown dependencies not loaded. Falling back to plain text.');
    return false;
  }
  return true;
}

// Safe markdown rendering with sanitization
function safeMarkdownRender(text) {
  if (!verifyDependencies()) {
    // Fallback to basic URL conversion if dependencies aren't loaded
    return convertUrlsToLinks(text);
  }
  
  try {
    // Parse markdown to HTML
    const rawHtml = marked.parse(text);
    // Sanitize HTML to prevent XSS attacks
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'hr',
        'strong', 'b', 'em', 'i', 'del', 's',
        'code', 'pre',
        'ul', 'ol', 'li',
        'blockquote',
        'a',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'img'
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title'],
      ALLOW_DATA_ATTR: false
    });
    return cleanHtml;
  } catch (error) {
    console.error('Markdown rendering error:', error);
    // Fallback to escaped text on error
    return escapeHtml(text);
  }
}

// HTML escape function for fallback
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

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
        // Hide thinking indicator when assistant starts responding
        if (isThinking) {
          hideThinkingIndicator();
        }
        
        if (!currentAssistantMessage) {
          // Create new assistant message element
          const messageDiv = document.createElement("div");
          messageDiv.className = "message assistant";
          
          const contentDiv = document.createElement("div");
          contentDiv.className = "message-content";
          
          messageDiv.appendChild(contentDiv);
          chat.appendChild(messageDiv);
          
          currentAssistantMessage = contentDiv;
          currentAssistantText = "";
        }
        
        // Accumulate text
        currentAssistantText += m.text;
        
        // Render markdown incrementally during streaming
        currentAssistantMessage.innerHTML = safeMarkdownRender(currentAssistantText);
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
        // Final render pass to ensure complete markdown parsing
        if (currentAssistantMessage && currentAssistantText) {
          currentAssistantMessage.innerHTML = safeMarkdownRender(currentAssistantText);
        }
        currentAssistantMessage = null;
        currentAssistantText = "";
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
  isThinking = false;
  isHidingThinking = false;
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
  
  // For assistant messages, render markdown
  if (type === "assistant" && text) {
    contentDiv.innerHTML = safeMarkdownRender(text);
  } else if (type === "assistant") {
    // Empty assistant message (will be filled during streaming)
    contentDiv.innerHTML = "";
  } else {
    // For non-assistant messages, use plain text
    contentDiv.textContent = text;
  }
  
  messageDiv.appendChild(contentDiv);
  chat.appendChild(messageDiv);
  
  scrollToBottom();
  
  return contentDiv;
}

function convertUrlsToLinks(text) {
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
  
  return result;
}

function showThinkingIndicator() {
  if (isThinking || thinkingIndicator) return;
  
  isThinking = true;
  thinkingStartTime = Date.now();
  
  const messageDiv = document.createElement("div");
  messageDiv.className = "message assistant thinking-message";
  
  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";
  
  const thinkingContent = document.createElement("span");
  thinkingContent.className = "thinking-content";
  thinkingContent.innerHTML = `
    <span>Claude is thinking</span>
    <span class="thinking-dots">
      <span class="dot">.</span>
      <span class="dot">.</span>
      <span class="dot">.</span>
    </span>
    <span class="thinking-timer"></span>
  `;
  
  contentDiv.appendChild(thinkingContent);
  messageDiv.appendChild(contentDiv);
  chat.appendChild(messageDiv);
  
  thinkingIndicator = messageDiv;
  
  // Cache the timer element for performance
  const timerElement = thinkingContent.querySelector('.thinking-timer');
  
  // Update timer every 500ms for better performance
  thinkingTimer = setInterval(() => {
    if (thinkingStartTime && timerElement) {
      const elapsed = ((Date.now() - thinkingStartTime) / 1000).toFixed(1);
      timerElement.textContent = ` (${elapsed}s)`;
    }
  }, 500);
  
  scrollToBottom();
}

function hideThinkingIndicator() {
  // Prevent multiple simultaneous hide calls
  if (isHidingThinking || !isThinking) return;
  
  isHidingThinking = true;
  isThinking = false;
  
  if (thinkingTimer) {
    clearInterval(thinkingTimer);
    thinkingTimer = null;
  }
  
  if (thinkingIndicator) {
    thinkingIndicator.remove();
    thinkingIndicator = null;
  }
  
  thinkingStartTime = null;
  isHidingThinking = false;
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