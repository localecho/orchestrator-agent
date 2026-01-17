/**
 * Multi-Agent Parallel Execution Module
 * Enables running multiple agents simultaneously
 */

import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import { agentRegistry } from "./agents/registry.js";
import type { AgentType } from "./types/task.js";

interface AgentProcess {
  agent: AgentType;
  command: string;
  args: string[];
  process: ChildProcess | null;
  status: "pending" | "running" | "completed" | "failed";
  output: string;
  startTime: Date | null;
  endTime: Date | null;
  exitCode: number | null;
}

interface ParallelExecution {
  id: string;
  agents: AgentProcess[];
  startTime: Date;
  endTime: Date | null;
  status: "running" | "completed" | "partial" | "failed";
}

const AGENTS_BASE_PATH = path.join(process.cwd(), "..");

/**
 * Get agent command configuration
 */
function getAgentCommand(agentType: AgentType): { command: string; cwd: string } | null {
  const config = agentRegistry.find(a => a.type === agentType);
  if (!config?.command) return null;

  // Parse command like "npm run scout" or "node src/index.js"
  const agentDir = path.join(AGENTS_BASE_PATH, `${agentType}-agent`);

  if (!fs.existsSync(agentDir)) {
    return null;
  }

  return {
    command: config.command,
    cwd: agentDir
  };
}

/**
 * Run a single agent with given arguments
 */
function runAgent(agentType: AgentType, args: string[]): Promise<AgentProcess> {
  return new Promise((resolve) => {
    const agentConfig = getAgentCommand(agentType);

    const agentProcess: AgentProcess = {
      agent: agentType,
      command: agentConfig?.command || "unknown",
      args,
      process: null,
      status: "pending",
      output: "",
      startTime: null,
      endTime: null,
      exitCode: null
    };

    if (!agentConfig) {
      agentProcess.status = "failed";
      agentProcess.output = `Agent "${agentType}" not found or not configured`;
      resolve(agentProcess);
      return;
    }

    const cmdParts = agentConfig.command.split(" ");
    const cmd = cmdParts[0];
    const cmdArgs = [...cmdParts.slice(1), ...args];

    agentProcess.startTime = new Date();
    agentProcess.status = "running";

    const proc = spawn(cmd, cmdArgs, {
      cwd: agentConfig.cwd,
      shell: true,
      stdio: ["pipe", "pipe", "pipe"]
    });

    agentProcess.process = proc;

    proc.stdout?.on("data", (data) => {
      agentProcess.output += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      agentProcess.output += data.toString();
    });

    proc.on("close", (code) => {
      agentProcess.endTime = new Date();
      agentProcess.exitCode = code;
      agentProcess.status = code === 0 ? "completed" : "failed";
      resolve(agentProcess);
    });

    proc.on("error", (error) => {
      agentProcess.endTime = new Date();
      agentProcess.status = "failed";
      agentProcess.output += `\nError: ${error.message}`;
      resolve(agentProcess);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      if (agentProcess.status === "running") {
        proc.kill("SIGTERM");
        agentProcess.status = "failed";
        agentProcess.output += "\nTimeout: Agent took too long to complete";
        resolve(agentProcess);
      }
    }, 5 * 60 * 1000);
  });
}

/**
 * Run multiple agents in parallel
 */
export async function runParallel(
  agents: Array<{ type: AgentType; args: string[] }>
): Promise<ParallelExecution> {
  const execution: ParallelExecution = {
    id: Date.now().toString(36),
    agents: [],
    startTime: new Date(),
    endTime: null,
    status: "running"
  };

  // Start all agents in parallel
  const promises = agents.map(({ type, args }) => runAgent(type, args));

  // Wait for all to complete
  execution.agents = await Promise.all(promises);
  execution.endTime = new Date();

  // Determine overall status
  const statuses = execution.agents.map(a => a.status);
  if (statuses.every(s => s === "completed")) {
    execution.status = "completed";
  } else if (statuses.every(s => s === "failed")) {
    execution.status = "failed";
  } else {
    execution.status = "partial";
  }

  return execution;
}

/**
 * Run all configured agents for a common task (like scanning)
 */
export async function runAllAgents(command: string): Promise<ParallelExecution> {
  const agents = agentRegistry
    .filter(a => a.command) // Only agents with commands
    .map(a => ({
      type: a.type,
      args: [command]
    }));

  return runParallel(agents);
}

/**
 * Format parallel execution results
 */
export function formatParallelResults(execution: ParallelExecution): string {
  const duration = execution.endTime
    ? ((execution.endTime.getTime() - execution.startTime.getTime()) / 1000).toFixed(1)
    : "N/A";

  const statusIcon = {
    completed: "✅",
    partial: "⚠️",
    failed: "❌",
    running: "🔄"
  }[execution.status];

  const lines = [
    "╔═══════════════════════════════════════════════════════════════╗",
    "║              PARALLEL EXECUTION RESULTS                       ║",
    "╠═══════════════════════════════════════════════════════════════╣",
    `║ Status: ${statusIcon} ${execution.status.toUpperCase().padEnd(50)}║`,
    `║ Duration: ${duration}s`.padEnd(64) + "║",
    `║ Agents: ${execution.agents.length}`.padEnd(64) + "║",
    "╠═══════════════════════════════════════════════════════════════╣"
  ];

  for (const agent of execution.agents) {
    const agentIcon = {
      completed: "✅",
      failed: "❌",
      running: "🔄",
      pending: "○"
    }[agent.status];

    const agentDuration = agent.startTime && agent.endTime
      ? ((agent.endTime.getTime() - agent.startTime.getTime()) / 1000).toFixed(1) + "s"
      : "N/A";

    lines.push(`║ ${agentIcon} ${agent.agent.toUpperCase().padEnd(15)} ${agentDuration.padEnd(8)} exit:${agent.exitCode ?? "N/A"}`.padEnd(64) + "║");

    // Show first line of output
    const firstLine = agent.output.split("\n").find(l => l.trim()) || "(no output)";
    lines.push(`║   ${firstLine.substring(0, 55)}`.padEnd(64) + "║");
  }

  lines.push("╚═══════════════════════════════════════════════════════════════╝");

  return lines.join("\n");
}

/**
 * Get a list of available agents for parallel execution
 */
export function getAvailableAgents(): Array<{ type: AgentType; name: string; available: boolean }> {
  return agentRegistry.map(agent => {
    const config = getAgentCommand(agent.type);
    return {
      type: agent.type,
      name: agent.name,
      available: !!config
    };
  });
}

/**
 * Format available agents list
 */
export function formatAvailableAgents(): string {
  const agents = getAvailableAgents();

  const lines = [
    "╔═══════════════════════════════════════════════════════════════╗",
    "║                    AVAILABLE AGENTS                           ║",
    "╠═══════════════════════════════════════════════════════════════╣"
  ];

  for (const agent of agents) {
    const icon = agent.available ? "✅" : "❌";
    const status = agent.available ? "Ready" : "Not installed";
    lines.push(`║ ${icon} ${agent.name.padEnd(20)} (${agent.type}) - ${status}`.padEnd(64) + "║");
  }

  lines.push("╚═══════════════════════════════════════════════════════════════╝");

  return lines.join("\n");
}
