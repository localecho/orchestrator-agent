/**
 * Slack Integration Module
 * Sends notifications and receives commands via Slack
 */

import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const SLACK_CONFIG_FILE = path.join(DATA_DIR, "slack-config.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface SlackConfig {
  webhookUrl: string | null;
  botToken: string | null;
  defaultChannel: string;
  enabled: boolean;
  notifications: {
    taskCreated: boolean;
    taskCompleted: boolean;
    taskBlocked: boolean;
    dailyStandup: boolean;
  };
}

/**
 * Load Slack configuration
 */
export function loadSlackConfig(): SlackConfig {
  const defaults: SlackConfig = {
    webhookUrl: null,
    botToken: null,
    defaultChannel: "#agent-updates",
    enabled: false,
    notifications: {
      taskCreated: true,
      taskCompleted: true,
      taskBlocked: true,
      dailyStandup: true
    }
  };

  try {
    if (fs.existsSync(SLACK_CONFIG_FILE)) {
      return { ...defaults, ...JSON.parse(fs.readFileSync(SLACK_CONFIG_FILE, "utf-8")) };
    }
  } catch {
    // Use defaults
  }

  return defaults;
}

/**
 * Save Slack configuration
 */
export function saveSlackConfig(config: Partial<SlackConfig>): SlackConfig {
  const current = loadSlackConfig();
  const updated = { ...current, ...config };
  fs.writeFileSync(SLACK_CONFIG_FILE, JSON.stringify(updated, null, 2));
  return updated;
}

/**
 * Send a message to Slack via webhook
 */
export async function sendSlackMessage(options: {
  text?: string;
  blocks?: any[];
  channel?: string;
}): Promise<{ success: boolean; error?: string }> {
  const config = loadSlackConfig();

  if (!config.enabled) {
    return { success: false, error: "Slack integration is disabled" };
  }

  if (!config.webhookUrl) {
    return { success: false, error: "Slack webhook URL not configured" };
  }

  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: options.text,
        blocks: options.blocks,
        channel: options.channel || config.defaultChannel
      })
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorText = await response.text();
      return { success: false, error: `Slack API error: ${errorText}` };
    }
  } catch (error) {
    return { success: false, error: `Network error: ${error}` };
  }
}

/**
 * Format a task for Slack
 */
function formatTaskBlock(task: any, action: string): any[] {
  const emoji = {
    created: ":clipboard:",
    completed: ":white_check_mark:",
    blocked: ":no_entry:",
    in_progress: ":hourglass_flowing_sand:"
  }[action] || ":pushpin:";

  const color = {
    created: "#0066cc",
    completed: "#00aa00",
    blocked: "#cc0000",
    in_progress: "#ffaa00"
  }[action] || "#cccccc";

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${emoji} *Task ${action.charAt(0).toUpperCase() + action.slice(1)}*`
      }
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Title:*\n${task.title}`
        },
        {
          type: "mrkdwn",
          text: `*Agent:*\n${task.agent}`
        },
        {
          type: "mrkdwn",
          text: `*Priority:*\n${task.priority}`
        },
        {
          type: "mrkdwn",
          text: `*ID:*\n\`${task.id}\``
        }
      ]
    },
    {
      type: "divider"
    }
  ];
}

/**
 * Notify task created
 */
export async function notifyTaskCreated(task: any): Promise<void> {
  const config = loadSlackConfig();
  if (!config.notifications.taskCreated) return;

  await sendSlackMessage({
    text: `New task created: ${task.title}`,
    blocks: formatTaskBlock(task, "created")
  });
}

/**
 * Notify task completed
 */
export async function notifyTaskCompleted(task: any): Promise<void> {
  const config = loadSlackConfig();
  if (!config.notifications.taskCompleted) return;

  await sendSlackMessage({
    text: `Task completed: ${task.title}`,
    blocks: formatTaskBlock(task, "completed")
  });
}

/**
 * Notify task blocked
 */
export async function notifyTaskBlocked(task: any, reason: string): Promise<void> {
  const config = loadSlackConfig();
  if (!config.notifications.taskBlocked) return;

  const blocks = formatTaskBlock(task, "blocked");
  blocks.splice(1, 0, {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Blocked Reason:* ${reason}`
    }
  });

  await sendSlackMessage({
    text: `Task blocked: ${task.title} - ${reason}`,
    blocks
  });
}

/**
 * Send daily standup to Slack
 */
export async function sendStandupToSlack(standup: {
  completed: any[];
  inProgress: any[];
  blocked: any[];
  upNext: any[];
}): Promise<{ success: boolean; error?: string }> {
  const config = loadSlackConfig();
  if (!config.notifications.dailyStandup) {
    return { success: false, error: "Daily standup notifications disabled" };
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric"
  });

  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `:sunrise: Daily Standup - ${today}`,
        emoji: true
      }
    },
    {
      type: "divider"
    }
  ];

  // Completed
  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `:white_check_mark: *Completed Yesterday (${standup.completed.length})*`
    }
  });

  if (standup.completed.length === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "_No tasks completed_" }
    });
  } else {
    const completedList = standup.completed
      .slice(0, 5)
      .map(t => `• ${t.title} _(${t.agent})_`)
      .join("\n");
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: completedList }
    });
  }

  // In Progress
  blocks.push({ type: "divider" });
  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `:hourglass_flowing_sand: *In Progress (${standup.inProgress.length})*`
    }
  });

  if (standup.inProgress.length === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "_No tasks in progress_" }
    });
  } else {
    const inProgressList = standup.inProgress
      .map(t => `• ${t.title} _(${t.agent})_`)
      .join("\n");
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: inProgressList }
    });
  }

  // Blocked
  if (standup.blocked.length > 0) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:no_entry: *Blocked (${standup.blocked.length})*`
      }
    });
    const blockedList = standup.blocked
      .map(t => `• ${t.title}: ${t.blockedReason || "No reason given"}`)
      .join("\n");
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: blockedList }
    });
  }

  // Up Next
  blocks.push({ type: "divider" });
  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: `:rocket: *Up Next - High Priority (${standup.upNext.length})*`
    }
  });

  if (standup.upNext.length === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "_No high priority tasks pending_" }
    });
  } else {
    const upNextList = standup.upNext
      .slice(0, 3)
      .map(t => `• ${t.priority === "critical" ? ":red_circle:" : ":large_yellow_circle:"} ${t.title} _(${t.agent})_`)
      .join("\n");
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: upNextList }
    });
  }

  return sendSlackMessage({
    text: `Daily Standup - ${today}`,
    blocks
  });
}

/**
 * Test Slack connection
 */
export async function testSlackConnection(): Promise<{ success: boolean; error?: string }> {
  return sendSlackMessage({
    text: ":robot_face: Orchestrator Agent connected successfully!",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: ":robot_face: *Orchestrator Agent* connected to Slack!"
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "I'll keep you updated on task progress, blockers, and daily standups."
        }
      }
    ]
  });
}

/**
 * Format Slack config for display
 */
export function formatSlackConfigDisplay(config: SlackConfig): string {
  const status = config.enabled ? "✓ Enabled" : "✗ Disabled";
  const webhook = config.webhookUrl ? "Configured" : "Not set";

  const lines = [
    "╔═══════════════════════════════════════════════════════════════╗",
    "║                  SLACK INTEGRATION CONFIG                     ║",
    "╠═══════════════════════════════════════════════════════════════╣",
    `║ Status:         ${status.padEnd(45)}║`,
    `║ Webhook:        ${webhook.padEnd(45)}║`,
    `║ Channel:        ${config.defaultChannel.padEnd(45)}║`,
    "╠═══════════════════════════════════════════════════════════════╣",
    "║                    NOTIFICATIONS                              ║",
    "╠═══════════════════════════════════════════════════════════════╣",
    `║ Task Created:   ${(config.notifications.taskCreated ? "On" : "Off").padEnd(45)}║`,
    `║ Task Completed: ${(config.notifications.taskCompleted ? "On" : "Off").padEnd(45)}║`,
    `║ Task Blocked:   ${(config.notifications.taskBlocked ? "On" : "Off").padEnd(45)}║`,
    `║ Daily Standup:  ${(config.notifications.dailyStandup ? "On" : "Off").padEnd(45)}║`,
    "╚═══════════════════════════════════════════════════════════════╝"
  ];

  return lines.join("\n");
}
