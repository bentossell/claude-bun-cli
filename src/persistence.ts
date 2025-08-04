import { writeFile, readFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const SESSIONS_DIR = "./sessions";

export interface SessionData {
  id: string;
  workspace: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: number;
  }>;
  lastActive: number;
}

// Ensure sessions directory exists
if (!existsSync(SESSIONS_DIR)) {
  await mkdir(SESSIONS_DIR, { recursive: true });
}

export async function saveSession(sessionId: string, data: SessionData): Promise<void> {
  const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
  await writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function loadSession(sessionId: string): Promise<SessionData | null> {
  const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function addMessage(
  sessionId: string, 
  role: "user" | "assistant", 
  content: string
): Promise<void> {
  let session = await loadSession(sessionId);
  
  if (!session) {
    session = {
      id: sessionId,
      workspace: sessionId,
      messages: [],
      lastActive: Date.now()
    };
  }
  
  session.messages.push({
    role,
    content,
    timestamp: Date.now()
  });
  
  session.lastActive = Date.now();
  
  await saveSession(sessionId, session);
}