import { ClaudeSession, type ClaudeEvent } from "./claude";

type ClientFrame =
  | { type: "prompt"; session: string; workspace: string; text: string }
  | { type: "cancel"; session: string };

const sessions = new Map<string, ClaudeSession>();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "localhost";
const DOMAIN = process.env.DOMAIN || `${HOST}:${PORT}`;

Bun.serve({
  port: PORT,
  hostname: HOST,
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
      const frame = JSON.parse(data as string);

      /* --- PROMPT --- */
      if (frame.type === "prompt") {
        const { session, workspace, text } = frame;
        let s = sessions.get(session);
        if (!s) {
          s = new ClaudeSession(session, workspace);
          sessions.set(session, s);

          // Stream events → client
          (async () => {
            for await (const evt of s!.stream()) ws.send(JSON.stringify(evt));
          })();
        }
        s.write(text);
      }

      /* --- CANCEL --- */
      if (frame.type === "cancel") {
        sessions.get(frame.session)?.kill();
        sessions.delete(frame.session);
      }
    },
    close(ws) { /* optional cleanup */ }
  }
});

console.log(`🚀 Server running on http://${HOST}:${PORT}`);