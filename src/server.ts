import { ClaudeSDKSession } from "./claude";
import { mkdirSync } from "fs";

type ClientFrame =
  | { type: "prompt"; session: string; workspace: string; text: string }
  | { type: "cancel"; session: string };

const sessions = new Map<string, ClaudeSDKSession>();
const sessionStates = new Map<string, { hasStartedResponse: boolean }>();

Bun.serve({
  port: 3000,
  async fetch(req, server) {
    const url = new URL(req.url);
    
    /* ---- static ---- */
    if (url.pathname === "/" || url.pathname === "/index.html")
      return new Response(Bun.file("public/index.html"));
    if (url.pathname === "/app.js")
      return new Response(Bun.file("public/app.js"), { headers: { "content-type":"text/javascript" }});

    /* ---- WS upgrade ---- */
    if (url.pathname === "/chat") {
      if (server.upgrade(req)) {
        return; // connection upgraded
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    return new Response("404", { status: 404 });
  },
  websocket: {
    async message(ws, data) {
      console.log("Received WebSocket message:", data);
      const frame = JSON.parse(data as string);

      /* --- PROMPT --- */
      if (frame.type === "prompt") {
        const { session, workspace, text } = frame;
        console.log(`Processing prompt: "${text}" for session ${session}`);
        
        // Create workspace directory
        mkdirSync(`./sandbox/${workspace}`, { recursive: true });
        
        let s = sessions.get(session);
        if (!s) {
          s = new ClaudeSDKSession(session, workspace);
          sessions.set(session, s);
        }
        
        // Initialize session state
        if (!sessionStates.has(session)) {
          sessionStates.set(session, { hasStartedResponse: false });
        }
        
        // Reset state for new prompt
        sessionStates.get(session)!.hasStartedResponse = false;

        // Stream events → client
        (async () => {
          try {
            console.log("Starting stream for prompt:", text);
            
            // Send thinking start event
            ws.send(JSON.stringify({ type: "thinking_start" }));
            
            const state = sessionStates.get(session)!;
            
            for await (const msg of s!.stream(text)) {
              console.log("Received SDK message:", msg.type);
              
              // End thinking indicator when we get the first assistant message
              if (!state.hasStartedResponse && msg.type === "assistant") {
                ws.send(JSON.stringify({ type: "thinking_end" }));
                state.hasStartedResponse = true;
              }
              
              // Convert SDK messages to simplified format for client
              if (msg.type === "assistant" && msg.message.content) {
                for (const content of msg.message.content) {
                  if (content.type === "text") {
                    const message = JSON.stringify({ 
                      type: "assistant_text_delta", 
                      text: content.text 
                    });
                    console.log("Sending to client:", message);
                    ws.send(message);
                  } else if (content.type === "tool_use") {
                    ws.send(JSON.stringify({ 
                      type: "tool_call", 
                      tool: { 
                        name: content.name, 
                        args: content.input 
                      } 
                    }));
                  }
                }
              } else if (msg.type === "user" && msg.message.content) {
                // Tool results
                for (const content of msg.message.content) {
                  if (content.type === "tool_result") {
                    ws.send(JSON.stringify({ 
                      type: "tool_result", 
                      tool: { 
                        name: content.tool_use_id,
                        result: content 
                      } 
                    }));
                  }
                }
              } else if (msg.type === "result") {
                ws.send(JSON.stringify({ 
                  type: "done",
                  result: msg.subtype === "success" ? msg.result : "Error",
                  usage: msg.usage
                }));
              } else if (msg.type === "system") {
                ws.send(JSON.stringify({ 
                  type: "system",
                  info: msg
                }));
              }
            }
          } catch (error) {
            console.error("Stream error:", error);
            
            // Ensure thinking indicator is ended on error
            const state = sessionStates.get(session);
            if (state && !state.hasStartedResponse) {
              ws.send(JSON.stringify({ type: "thinking_end" }));
              state.hasStartedResponse = true;
            }
            
            ws.send(JSON.stringify({ 
              type: "error", 
              message: error instanceof Error ? error.message : "Unknown error" 
            }));
          }
        })();
      }

      /* --- CANCEL --- */
      if (frame.type === "cancel") {
        sessions.get(frame.session)?.abort();
        sessions.delete(frame.session);
        sessionStates.delete(frame.session);
      }
    },
    close(ws) { /* optional cleanup */ }
  }
});

console.log("🚀 http://localhost:3000");