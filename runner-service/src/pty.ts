// @ts-ignore
import { spawn, IPty } from "node-pty";
import path from "path";

const SHELL = process.platform === "win32" ? "cmd.exe" : "/bin/sh"; // Use 'sh' on Alpine
// Use appropriate shell based on OS

export class TerminalManager {
  private sessions: { [id: string]: { terminal: IPty; replId: string } } = {};

  constructor() {
    this.sessions = {};
  }

  createPty(
    id: string,
    replId: string,
    onData: (data: string, id: number) => void
  ) {
    const term = spawn(SHELL, [], {
      cols: 100,
      name: "xterm",
      cwd: "/workspace",
    });

    (term as any).on("data", (data: string) => onData(data, term.pid));
    this.sessions[id] = {
      terminal: term,
      replId,
    };
    (term as any).on("exit", () => {
      delete this.sessions[term.pid];
    });
    return term;
  }

  write(terminalId: string, data: string) {
    this.sessions[terminalId]?.terminal.write(data);
  }

  clear(terminalId: string) {
    this.sessions[terminalId].terminal.kill();
    delete this.sessions[terminalId];
  }
}
