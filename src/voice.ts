/**
 * Voice Command Support Module
 * Provides voice command parsing and execution
 *
 * Note: Actual speech-to-text requires external services (like Whisper API).
 * This module focuses on natural language command parsing.
 */

import { addTask, loadQueue, updateTask, getNextTask } from "./queue.js";
import { classifyTask } from "./classifier.js";
import type { TaskInput, TaskPriority } from "./types/task.js";

interface VoiceCommand {
  type: "add" | "list" | "next" | "complete" | "status" | "help" | "unknown";
  parameters: Record<string, string>;
  confidence: number;
  originalText: string;
}

/**
 * Parse natural language into a command
 */
export function parseVoiceCommand(input: string): VoiceCommand {
  const text = input.toLowerCase().trim();

  // Add task patterns
  const addPatterns = [
    /^(?:add|create|new)\s+(?:a\s+)?(?:task\s+)?(?:to\s+)?(.+)$/i,
    /^(?:i\s+)?(?:need|want)\s+(?:to\s+)?(.+)$/i,
    /^(?:remind\s+me\s+to|schedule)\s+(.+)$/i,
    /^(?:put|add)\s+(.+)\s+(?:on\s+)?(?:the\s+)?(?:to-?do|list|queue)$/i,
  ];

  for (const pattern of addPatterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        type: "add",
        parameters: { title: match[1].trim() },
        confidence: 0.9,
        originalText: input
      };
    }
  }

  // List tasks patterns
  const listPatterns = [
    /^(?:show|list|what(?:'s| are| is))\s+(?:my\s+)?(?:all\s+)?(?:tasks?|queue|to-?do)/i,
    /^what(?:'s| is)\s+(?:on\s+)?(?:my\s+)?(?:the\s+)?(?:list|queue|agenda)/i,
    /^(?:get|fetch)\s+(?:all\s+)?tasks?/i,
  ];

  for (const pattern of listPatterns) {
    if (pattern.test(text)) {
      return {
        type: "list",
        parameters: {},
        confidence: 0.9,
        originalText: input
      };
    }
  }

  // Next task patterns
  const nextPatterns = [
    /^(?:what(?:'s| is)|get)\s+(?:the\s+)?next\s+(?:task|item)?$/i,
    /^next\s+(?:task|item|one)?$/i,
    /^what\s+should\s+i\s+(?:do|work on)\s+(?:next)?$/i,
  ];

  for (const pattern of nextPatterns) {
    if (pattern.test(text)) {
      return {
        type: "next",
        parameters: {},
        confidence: 0.9,
        originalText: input
      };
    }
  }

  // Complete task patterns
  const completePatterns = [
    /^(?:complete|finish|done|mark(?:\s+as)?\s+(?:done|complete))\s+(?:task\s+)?(.+)$/i,
    /^i(?:'ve|\s+have)\s+(?:finished|completed|done)\s+(.+)$/i,
    /^(.+)\s+is\s+(?:done|complete|finished)$/i,
  ];

  for (const pattern of completePatterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        type: "complete",
        parameters: { taskId: match[1].trim() },
        confidence: 0.8,
        originalText: input
      };
    }
  }

  // Status patterns
  const statusPatterns = [
    /^(?:give\s+me\s+)?(?:a\s+)?status(?:\s+update)?$/i,
    /^(?:show|get)\s+(?:queue\s+)?stats?(?:istics)?$/i,
    /^how(?:'s| is)\s+(?:the\s+)?(?:progress|queue|everything)(?:\s+going)?$/i,
  ];

  for (const pattern of statusPatterns) {
    if (pattern.test(text)) {
      return {
        type: "status",
        parameters: {},
        confidence: 0.85,
        originalText: input
      };
    }
  }

  // Help patterns
  const helpPatterns = [
    /^(?:help|commands?|what\s+can\s+(?:you|i)\s+(?:do|say))$/i,
    /^(?:show|list)\s+(?:available\s+)?commands?$/i,
  ];

  for (const pattern of helpPatterns) {
    if (pattern.test(text)) {
      return {
        type: "help",
        parameters: {},
        confidence: 0.95,
        originalText: input
      };
    }
  }

  return {
    type: "unknown",
    parameters: { text },
    confidence: 0.3,
    originalText: input
  };
}

/**
 * Extract priority from natural language
 */
export function extractPriority(text: string): TaskPriority | undefined {
  const lower = text.toLowerCase();

  if (lower.includes("urgent") || lower.includes("asap") || lower.includes("critical")) {
    return "critical";
  }
  if (lower.includes("high priority") || lower.includes("important")) {
    return "high";
  }
  if (lower.includes("low priority") || lower.includes("whenever") || lower.includes("not urgent")) {
    return "low";
  }

  return undefined;
}

/**
 * Execute a parsed voice command
 */
export async function executeVoiceCommand(command: VoiceCommand): Promise<string> {
  switch (command.type) {
    case "add": {
      const priority = extractPriority(command.parameters.title) || "medium";
      const input: TaskInput = {
        title: command.parameters.title,
        priority
      };

      const task = addTask(input);
      return `✓ Added task: "${task.title}" [${task.id}]\n  Assigned to: ${task.agent}\n  Priority: ${task.priority}`;
    }

    case "list": {
      const tasks = loadQueue().filter(t => t.status === "pending" || t.status === "in_progress");

      if (tasks.length === 0) {
        return "No pending tasks in the queue.";
      }

      const lines = [`📋 You have ${tasks.length} task(s):\n`];
      for (const task of tasks.slice(0, 5)) {
        const status = task.status === "in_progress" ? "🔄" : "○";
        lines.push(`  ${status} ${task.title} (${task.agent})`);
      }

      if (tasks.length > 5) {
        lines.push(`  ... and ${tasks.length - 5} more`);
      }

      return lines.join("\n");
    }

    case "next": {
      const task = getNextTask();

      if (!task) {
        return "No tasks available. Your queue is empty!";
      }

      updateTask(task.id, { status: "in_progress" });
      return `▶ Next task:\n  "${task.title}"\n  Agent: ${task.agent}\n  ID: ${task.id}`;
    }

    case "complete": {
      const taskId = command.parameters.taskId;
      const task = updateTask(taskId, { status: "completed" });

      if (task) {
        return `✓ Completed: "${task.title}"`;
      } else {
        return `✗ Task not found: ${taskId}`;
      }
    }

    case "status": {
      const tasks = loadQueue();
      const pending = tasks.filter(t => t.status === "pending").length;
      const inProgress = tasks.filter(t => t.status === "in_progress").length;
      const completed = tasks.filter(t => t.status === "completed").length;
      const blocked = tasks.filter(t => t.status === "blocked").length;

      return [
        "📊 Queue Status:",
        `  Pending: ${pending}`,
        `  In Progress: ${inProgress}`,
        `  Completed: ${completed}`,
        `  Blocked: ${blocked}`,
        `  Total: ${tasks.length}`
      ].join("\n");
    }

    case "help":
      return [
        "🎤 Voice Commands:",
        "",
        '  "Add [task description]" - Create a new task',
        '  "Show my tasks" - List pending tasks',
        '  "What\'s next?" - Get the next task',
        '  "Complete [task]" - Mark task as done',
        '  "Status" - Show queue statistics',
        "",
        "Tips:",
        '  - Say "urgent" or "high priority" to set priority',
        '  - Tasks are auto-assigned to the right agent'
      ].join("\n");

    case "unknown":
    default:
      return `🤔 I didn't understand: "${command.originalText}"\n   Try "help" for available commands.`;
  }
}

/**
 * Format voice command result for display
 */
export function formatVoiceResult(command: VoiceCommand, result: string): string {
  const lines = [
    "╔═══════════════════════════════════════════════════════════════╗",
    "║                    VOICE COMMAND RESULT                       ║",
    "╠═══════════════════════════════════════════════════════════════╣",
    `║ Input: "${command.originalText.substring(0, 45)}"`.padEnd(64) + "║",
    `║ Type: ${command.type.padEnd(15)} Confidence: ${(command.confidence * 100).toFixed(0)}%`.padEnd(64) + "║",
    "╠═══════════════════════════════════════════════════════════════╣",
  ];

  for (const line of result.split("\n")) {
    lines.push(`║ ${line}`.padEnd(64) + "║");
  }

  lines.push("╚═══════════════════════════════════════════════════════════════╝");

  return lines.join("\n");
}

/**
 * Simulate voice input for testing
 */
export async function simulateVoiceInput(text: string): Promise<{ command: VoiceCommand; result: string }> {
  const command = parseVoiceCommand(text);
  const result = await executeVoiceCommand(command);
  return { command, result };
}
