import { Command } from "commander";
import chalk from "chalk";
import { Orchestrator } from "./orchestrator.js";
import { agentRegistry } from "./agents/registry.js";
import { addFeature, toggleFeature, updateFeatureStatus, listFeatures, printFeatures, seedDefaultFeatures } from "./features.js";
import type { AgentType, TaskStatus, TaskPriority } from "./types/task.js";
import type { Feature } from "./types/feature.js";

const program = new Command();
const orch = new Orchestrator();

program
  .name("orch")
  .description("Orchestrator Agent - Task Routing & Prioritization for the 6-Agent Team")
  .version("1.0.0");

program
  .command("add <title>")
  .description("Add a new task to the queue")
  .option("-d, --description <desc>", "Task description")
  .option("-p, --priority <priority>", "Priority: critical, high, medium, low", "medium")
  .option("-t, --tags <tags>", "Comma-separated tags")
  .option("-e, --estimate <minutes>", "Estimated minutes")
  .action((title, options) => {
    orch.add({
      title,
      description: options.description,
      priority: options.priority as TaskPriority,
      tags: options.tags ? options.tags.split(",").map((t: string) => t.trim()) : [],
      estimatedMinutes: options.estimate ? parseInt(options.estimate) : undefined
    });
  });

program
  .command("list")
  .description("List all tasks in the queue")
  .option("-a, --agent <agent>", "Filter by agent")
  .option("-s, --status <status>", "Filter by status")
  .action((options) => {
    orch.list({
      agent: options.agent as AgentType,
      status: options.status as TaskStatus
    });
  });

program
  .command("next")
  .description("Get the next task to work on")
  .option("-a, --agent <agent>", "Get next task for specific agent")
  .action((options) => {
    orch.next(options.agent as AgentType);
  });

program
  .command("complete <id>")
  .description("Mark a task as completed")
  .option("-o, --output <output>", "Output or result of the task")
  .action((id, options) => {
    orch.complete(id, options.output);
  });

program
  .command("block <id> <reason>")
  .description("Mark a task as blocked")
  .action((id, reason) => {
    orch.block(id, reason);
  });

program
  .command("stats")
  .description("Show queue statistics")
  .action(() => {
    orch.stats();
  });

program
  .command("classify <title>")
  .description("Test task classification without adding")
  .option("-d, --description <desc>", "Task description")
  .action((title, options) => {
    orch.classify({
      title,
      description: options.description
    });
  });

program
  .command("agents")
  .description("List available agents")
  .action(() => {
    console.log(chalk.blue("\n🤖 Available Agents\n"));
    for (const agent of agentRegistry) {
      console.log(chalk.cyan.bold("  " + agent.name) + " (" + agent.type + ")");
      console.log(chalk.gray("    " + agent.description));
      console.log(chalk.gray("    Capabilities: " + agent.capabilities.slice(0, 3).join(", ")));
      console.log();
    }
  });

program
  .command("standup")
  .description("Generate daily standup summary")
  .action(() => {
    orch.standup();
  });

// Feature Backlog Commands
program
  .command("features")
  .description("List feature backlog")
  .option("-e, --enabled", "Show only enabled features")
  .option("-d, --disabled", "Show only disabled features")
  .option("-c, --category <cat>", "Filter by category")
  .action((options) => {
    printFeatures({
      enabled: options.enabled ? true : options.disabled ? false : undefined,
      category: options.category
    });
  });

program
  .command("feature-add <name>")
  .description("Add a new feature to backlog")
  .option("-d, --description <desc>", "Feature description")
  .option("-c, --category <cat>", "Category", "general")
  .option("-p, --priority <num>", "Priority number")
  .option("--disabled", "Add as disabled")
  .action((name, options) => {
    const feature = addFeature({
      name,
      description: options.description,
      category: options.category,
      priority: options.priority ? parseInt(options.priority) : undefined,
      enabled: !options.disabled
    });
    console.log(chalk.green("\n✓ Added feature: ") + feature.name);
    console.log(chalk.gray("  ID: " + feature.id + " | Category: " + feature.category));
  });

program
  .command("feature-toggle <id>")
  .description("Toggle a feature on/off")
  .action((id) => {
    const feature = toggleFeature(id);
    if (feature) {
      const status = feature.enabled ? chalk.green("ON") : chalk.gray("OFF");
      console.log(chalk.blue("\n⚡ Toggled: ") + feature.name + " → " + status);
    } else {
      console.log(chalk.red("\n✗ Feature not found: ") + id);
    }
  });

program
  .command("feature-status <id> <status>")
  .description("Update feature status (backlog, planned, in_progress, completed, cancelled)")
  .action((id, status) => {
    const feature = updateFeatureStatus(id, status as Feature["status"]);
    if (feature) {
      console.log(chalk.green("\n✓ Updated: ") + feature.name + " → " + status);
    } else {
      console.log(chalk.red("\n✗ Feature not found: ") + id);
    }
  });

program
  .command("features-seed")
  .description("Seed the 31 default features")
  .action(() => {
    seedDefaultFeatures();
  });

program.parse();
