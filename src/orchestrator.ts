import chalk from "chalk";
import type { Task, TaskInput, AgentType, TaskStatus } from "./types/task.js";
import { addTask, updateTask, getNextTask, loadQueue, getTaskStats, getTasksByAgent } from "./queue.js";
import { getAgent, agentRegistry } from "./agents/registry.js";
import { classifyTask } from "./classifier.js";

export class Orchestrator {
  
  add(input: TaskInput): Task {
    const task = addTask(input);
    const agent = getAgent(task.agent);
    
    console.log(chalk.green("\n✓ Task added: ") + chalk.white(task.title));
    console.log(chalk.gray("  ID: ") + task.id);
    console.log(chalk.gray("  Assigned to: ") + chalk.cyan(agent?.name || task.agent));
    console.log(chalk.gray("  Priority: ") + this.formatPriority(task.priority));
    
    if (task.metadata?.classificationReasoning) {
      const reasons = task.metadata.classificationReasoning as string[];
      console.log(chalk.gray("  Reasoning: ") + reasons.join(", "));
    }
    console.log();
    
    return task;
  }
  
  next(agent?: AgentType): Task | null {
    const task = getNextTask(agent);
    
    if (!task) {
      console.log(chalk.yellow("\nNo tasks ready for " + (agent || "any agent")));
      return null;
    }
    
    updateTask(task.id, { status: "in_progress" });
    
    const agentConfig = getAgent(task.agent);
    console.log(chalk.blue("\n▶ Next task:"));
    console.log(chalk.white.bold("  " + task.title));
    console.log(chalk.gray("  ID: ") + task.id);
    console.log(chalk.gray("  Agent: ") + chalk.cyan(agentConfig?.name || task.agent));
    if (task.description) {
      console.log(chalk.gray("  Description: ") + task.description);
    }
    if (agentConfig?.command) {
      console.log(chalk.gray("  Command: ") + chalk.yellow(agentConfig.command));
    }
    console.log();
    
    return task;
  }
  
  complete(id: string, output?: string): Task | null {
    const task = updateTask(id, { 
      status: "completed",
      output
    });
    
    if (task) {
      console.log(chalk.green("\n✓ Completed: ") + task.title);
    } else {
      console.log(chalk.red("\n✗ Task not found: ") + id);
    }
    
    return task;
  }
  
  block(id: string, reason: string): Task | null {
    const task = updateTask(id, {
      status: "blocked",
      blockedReason: reason
    });
    
    if (task) {
      console.log(chalk.yellow("\n⚠ Blocked: ") + task.title);
      console.log(chalk.gray("  Reason: ") + reason);
    }
    
    return task;
  }
  
  list(filter?: { agent?: AgentType; status?: TaskStatus }): void {
    let tasks = loadQueue();
    
    if (filter?.agent) {
      tasks = tasks.filter(t => t.agent === filter.agent);
    }
    if (filter?.status) {
      tasks = tasks.filter(t => t.status === filter.status);
    }
    
    // Sort by priority then by created date
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    tasks.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
    
    console.log(chalk.blue("\n📋 Task Queue (" + tasks.length + " tasks)\n"));
    
    if (tasks.length === 0) {
      console.log(chalk.gray("  No tasks found.\n"));
      return;
    }
    
    for (const task of tasks) {
      const agent = getAgent(task.agent);
      const statusIcon = this.getStatusIcon(task.status);
      
      console.log(
        statusIcon + " " +
        chalk.gray("[" + task.id + "]") + " " +
        this.formatPriority(task.priority) + " " +
        chalk.white(task.title)
      );
      console.log(
        "   " +
        chalk.cyan(agent?.name || task.agent) +
        (task.blockedReason ? chalk.red(" (blocked: " + task.blockedReason + ")") : "")
      );
    }
    console.log();
  }
  
  stats(): void {
    const stats = getTaskStats();
    
    console.log(chalk.blue("\n📊 Queue Statistics\n"));
    console.log(chalk.gray("  Total:       ") + stats.total);
    console.log(chalk.yellow("  Pending:     ") + stats.pending);
    console.log(chalk.blue("  In Progress: ") + stats.in_progress);
    console.log(chalk.green("  Completed:   ") + stats.completed);
    console.log(chalk.red("  Blocked:     ") + stats.blocked);
    
    console.log(chalk.blue("\n📦 By Agent\n"));
    for (const agent of agentRegistry) {
      const agentTasks = getTasksByAgent(agent.type);
      const pending = agentTasks.filter(t => t.status === "pending").length;
      if (agentTasks.length > 0) {
        console.log(
          chalk.gray("  " + agent.name + ": ") +
          agentTasks.length + " total, " +
          pending + " pending"
        );
      }
    }
    console.log();
  }
  
  classify(input: TaskInput): void {
    const result = classifyTask(input);
    const agent = getAgent(result.agent);

    console.log(chalk.blue("\n🔍 Classification Result\n"));
    console.log(chalk.gray("  Agent: ") + chalk.cyan(agent?.name || result.agent));
    console.log(chalk.gray("  Confidence: ") + result.confidence + "%");
    console.log(chalk.gray("  Reasoning:"));
    for (const reason of result.reasoning) {
      console.log(chalk.gray("    - ") + reason);
    }
    console.log();
  }

  standup(): void {
    const tasks = loadQueue();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Tasks completed in last 24 hours
    const completed = tasks.filter(t =>
      t.status === "completed" &&
      t.completedAt &&
      new Date(t.completedAt) >= yesterday
    );

    // Currently in progress
    const inProgress = tasks.filter(t => t.status === "in_progress");

    // Blocked tasks
    const blocked = tasks.filter(t => t.status === "blocked");

    // High priority pending
    const highPriority = tasks.filter(t =>
      t.status === "pending" &&
      (t.priority === "critical" || t.priority === "high")
    );

    console.log(chalk.blue.bold("\n╔══════════════════════════════════════════╗"));
    console.log(chalk.blue.bold("║          📋 Daily Standup Summary         ║"));
    console.log(chalk.blue.bold("╠══════════════════════════════════════════╣"));
    console.log(chalk.blue.bold("║  " + today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }).padEnd(38) + "  ║"));
    console.log(chalk.blue.bold("╚══════════════════════════════════════════╝\n"));

    // Yesterday's accomplishments
    console.log(chalk.green.bold("✅ Completed Yesterday (" + completed.length + ")"));
    if (completed.length === 0) {
      console.log(chalk.gray("   No tasks completed"));
    } else {
      for (const task of completed.slice(0, 5)) {
        const agent = getAgent(task.agent);
        console.log(chalk.green("   • ") + task.title);
        console.log(chalk.gray("     " + (agent?.name || task.agent)));
      }
      if (completed.length > 5) {
        console.log(chalk.gray("   ... and " + (completed.length - 5) + " more"));
      }
    }
    console.log();

    // Currently working on
    console.log(chalk.blue.bold("🔄 In Progress (" + inProgress.length + ")"));
    if (inProgress.length === 0) {
      console.log(chalk.gray("   No tasks in progress"));
    } else {
      for (const task of inProgress) {
        const agent = getAgent(task.agent);
        console.log(chalk.blue("   • ") + task.title);
        console.log(chalk.gray("     " + (agent?.name || task.agent)));
      }
    }
    console.log();

    // Blockers
    if (blocked.length > 0) {
      console.log(chalk.red.bold("🚫 Blocked (" + blocked.length + ")"));
      for (const task of blocked) {
        console.log(chalk.red("   • ") + task.title);
        if (task.blockedReason) {
          console.log(chalk.gray("     Reason: " + task.blockedReason));
        }
      }
      console.log();
    }

    // Up next
    console.log(chalk.yellow.bold("📌 Up Next - High Priority (" + highPriority.length + ")"));
    if (highPriority.length === 0) {
      console.log(chalk.gray("   No high priority tasks pending"));
    } else {
      for (const task of highPriority.slice(0, 3)) {
        const agent = getAgent(task.agent);
        const icon = task.priority === "critical" ? "🔴" : "🟡";
        console.log(chalk.yellow("   " + icon + " ") + task.title);
        console.log(chalk.gray("     " + (agent?.name || task.agent)));
      }
    }
    console.log();
  }

  private formatPriority(priority: string): string {
    switch (priority) {
      case "critical": return chalk.red.bold("[!!!]");
      case "high": return chalk.red("[!!]");
      case "medium": return chalk.yellow("[!]");
      case "low": return chalk.gray("[·]");
      default: return chalk.gray("[?]");
    }
  }
  
  private getStatusIcon(status: TaskStatus): string {
    switch (status) {
      case "pending": return chalk.yellow("○");
      case "assigned": return chalk.blue("◐");
      case "in_progress": return chalk.blue("●");
      case "completed": return chalk.green("✓");
      case "blocked": return chalk.red("✗");
      case "cancelled": return chalk.gray("⊘");
      default: return chalk.gray("?");
    }
  }
}
