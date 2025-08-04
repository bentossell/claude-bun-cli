const log = document.getElementById("log");
const input = document.getElementById("msg");

let ws;
const session = crypto.randomUUID();

function connect() {
  ws = new WebSocket(`ws://${location.host}/chat`);
  
  ws.addEventListener("open", () => {
    append("[Connected to server]\n");
    input.disabled = false;
  });

  ws.addEventListener("message", e => {
    const m = JSON.parse(e.data);
    if (m.type === "assistant_text_delta") append(m.text);
    if (m.type === "thinking_delta")       append("[thinking…]\n");
    if (m.type === "tool_call")            append(`[${m.tool.name} → ${JSON.stringify(m.tool.args)}]\n`);
    if (m.type === "tool_result")          append(`[result ⇐ ${truncate(m.tool.result?.output)}]\n`);
  });

  ws.addEventListener("close", () => {
    append("[Connection closed]\n");
    input.disabled = true;
  });

  ws.addEventListener("error", (e) => {
    append("[Connection error - retrying...]\n");
    setTimeout(connect, 1000);
  });
}

input.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  const text = input.value.trim(); input.value = "";
  if (!text) return;
  if (ws.readyState !== WebSocket.OPEN) {
    append("Not connected. Please wait...\n");
    return;
  }
  append(`You: ${text}\n`);
  ws.send(JSON.stringify({ type:"prompt", session, workspace:"demo", text }));
});

function append(t){ log.textContent += t; log.scrollTop = log.scrollHeight; }
const truncate = s => typeof s==="string"&&s.length>160 ? s.slice(0,160)+"…" : s;

// Start connection
input.disabled = true;
connect();