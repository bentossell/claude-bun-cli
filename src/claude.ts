import { query } from "@anthropic-ai/claude-code/sdk.mjs";
import type { SDKMessage } from "@anthropic-ai/claude-code/sdk.mjs";

export class ClaudeSDKSession {
  private abortController: AbortController;
  
  constructor(
    public id: string,
    public workspace: string
  ) {
    this.abortController = new AbortController();
  }

  async *stream(prompt: string): AsyncGenerator<SDKMessage> {
    const response = query({
      prompt,
      abortController: this.abortController,
      options: {
        cwd: `./sandbox/${this.workspace}`,
        permissionMode: "bypassPermissions",
        model: "sonnet",
        allowedTools: ["*"],
        stderr: (data) => console.error("Claude stderr:", data)
      }
    });

    for await (const message of response) {
      yield message;
    }
  }

  abort() {
    this.abortController.abort();
  }
}