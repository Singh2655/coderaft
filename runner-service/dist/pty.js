"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalManager = void 0;
const node_pty_1 = require("node-pty");
const path_1 = __importDefault(require("path"));
const SHELL = process.platform === "win32" ? "cmd.exe" : "bash"; // Use appropriate shell based on OS
class TerminalManager {
    constructor() {
        this.sessions = {};
        this.sessions = {};
    }
    createPty(id, replId, onData) {
        try {
            const term = (0, node_pty_1.spawn)(SHELL, [], {
                cols: 100,
                rows: 30,
                name: "xterm-color",
                cwd: path_1.default.join(__dirname, `../tmp/${replId}`),
                env: process.env,
            });
            // Type assertion if TypeScript doesn't recognize `on` correctly
            term.on("data", (data) => onData(data, term.pid));
            this.sessions[id] = {
                terminal: term,
                replId,
            };
            // Correctly handle exit and session cleanup
            term.on("exit", () => {
                this.clear(id);
            });
            return term;
        }
        catch (error) {
            console.error("Failed to create PTY process:", error);
            throw new Error("Failed to create PTY process");
        }
    }
    write(terminalId, data) {
        const session = this.sessions[terminalId];
        if (session) {
            session.terminal.write(data);
        }
        else {
            console.warn(`No terminal session found with ID: ${terminalId}`);
        }
    }
    clear(terminalId) {
        const session = this.sessions[terminalId];
        if (session) {
            session.terminal.kill();
            delete this.sessions[terminalId];
        }
        else {
            console.warn(`No terminal session found with ID: ${terminalId}`);
        }
    }
}
exports.TerminalManager = TerminalManager;
