import { spawn } from "bun";
import { mkdirSync } from "fs";
import type { ReadableStream } from "node:stream/web";
import { setTimeout } from "timers/promises";

// -- CLI constants --
const CLAUDE_BIN =
  Bun.resolveSync?.("@anthropic-ai/claude-code/cli.js", import.meta.dir) ??
  "claude";

export interface ClaudeEvent {
  type: string;        // thinking_delta | tool_call | tool_result | assistant_text_delta | done …
  [k: string]: any;
}

export class ClaudeSession {
  private proc: Bun.Subprocess<"pipe", "pipe", "pipe">;
  private reader: ReadableStreamDefaultReader<string>;

  constructor(
    public id: string,
    public workspace: string
  ) {
    mkdirSync(`./sandbox/${workspace}`, { recursive: true });

    console.log("Spawning CLI with:", CLAUDE_BIN);
    
    this.proc = spawn([
      CLAUDE_BIN,
      "--print",                       // Non-interactive mode
      "--output-format", "stream-json", // Stream JSON output
      "--dangerously-skip-permissions",
      "--model", "sonnet"              // or omit flag → defaults to sonnet
    ], {
      cwd: `./sandbox/${workspace}`,
      stderr: "inherit",
      stdout: "pipe",
      stdin: "pipe",
      env: { ...process.env, COLUMNS: "120", LINES: "40" }
    });

    if (this.proc.exitCode !== null) {
      console.error("⚠️  Claude CLI failed", this.proc.exitCode);
    }

    console.log("CLI process started, PID:", this.proc.pid);
    this.reader = this.proc.stdout.getReader();
  }

  /** Send a user prompt or tool-level command */
  write(line: string) {
    this.proc.stdin.write(new TextEncoder().encode(line + "\n"));
  }

  /** Async generator that yields parsed CLI JSON lines */
  async *stream(): AsyncGenerator<ClaudeEvent> {
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await this.reader.read();
      if (done) break;
      buffer += decoder.decode(value);
      let nl;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl).trim(); buffer = buffer.slice(nl + 1);
        if (!line) continue;
        try { yield JSON.parse(line); }
        catch { /* ignore non-JSON noise */ }
      }
    }
  }

  kill() { this.proc.kill(); }
}