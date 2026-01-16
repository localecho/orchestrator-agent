#!/usr/bin/env node
// Orchestrator Agent - Task coordination and agent management
import { loadConfig } from './config.js';
import { loadQueue, addTask, getNextTask, getPendingTasks, formatQueueDisplay } from './queue.js';
import { routeTask, listAgentCapabilities, suggestAgent } from './router.js';
import { executeTask, checkAllAgentsHealth } from './executor.js';

const command = process.argv[2] || 'status';
const args = process.argv.slice(3);

async function main() {
  console.log('');
  console.log('Orchestrator Agent - Task Coordinator');
  console.log('======================================');
  console.log('');

  switch (command) {
    case 'status':
      await showStatus();
      break;
    case 'queue':
      showQueue();
      break;
    case 'dispatch':
      await dispatchTask(args.join(' '));
      break;
    case 'add':
      await addNewTask(args.join(' '));
      break;
    case 'run':
      await runNextTask();
      break;
    case 'agents':
      showAgents();
      break;
    default:
      showHelp();
  }
}

async function showStatus() {
  console.log('Agent Health:');
  console.log('-------------');

  const health = await checkAllAgentsHealth();
  for (const agent of health) {
    const icon = agent.status === 'available' ? '✓' : '✗';
    console.log(`  ${icon} ${agent.name.padEnd(20)} ${agent.status}`);
  }

  console.log('');
  console.log('Queue Summary:');
  console.log('--------------');

  const queue = loadQueue();
  const pending = queue.filter(t => t.status === 'pending').length;
  const inProgress = queue.filter(t => t.status === 'in_progress').length;

  console.log(`  Pending:     ${pending}`);
  console.log(`  In Progress: ${inProgress}`);
  console.log(`  Total:       ${queue.length}`);
}

function showQueue() {
  const queue = loadQueue();
  console.log(formatQueueDisplay(queue));
}

async function dispatchTask(description) {
  if (!description) {
    console.log('Usage: npm run dispatch "<task description>"');
    return;
  }

  console.log(`Task: "${description}"`);
  console.log('');

  const suggestion = suggestAgent(description);
  console.log(suggestion.message);

  if (suggestion.suggestion) {
    console.log(`  Agent: ${suggestion.agent.name}`);
    console.log(`  Path: ${suggestion.agent.path}`);
    console.log(`  Command: ${suggestion.agent.command}`);
  }
}

async function addNewTask(description) {
  if (!description) {
    console.log('Usage: npm run add "<task description>"');
    return;
  }

  const suggestion = suggestAgent(description);
  if (!suggestion.suggestion) {
    console.log('Could not determine which agent to use.');
    console.log('Specify manually with: npm run add "description" --agent=scout');
    return;
  }

  const task = addTask({
    description,
    type: 'auto',
    agent: suggestion.suggestion,
    priority: 5
  });

  console.log('Task added to queue:');
  console.log(`  ID: ${task.id}`);
  console.log(`  Agent: ${suggestion.agent.name}`);
  console.log(`  Priority: ${task.priority}`);
}

async function runNextTask() {
  const task = getNextTask();

  if (!task) {
    console.log('No pending tasks in queue.');
    return;
  }

  console.log(`Running task: ${task.id}`);
  console.log(`  Description: ${task.description}`);
  console.log(`  Agent: ${task.agent}`);
  console.log('');

  const result = await executeTask(task);

  if (result.success) {
    console.log('Task completed successfully.');
    if (result.result?.stdout) {
      console.log('');
      console.log('Output:');
      console.log(result.result.stdout.slice(0, 500));
    }
  } else {
    console.log(`Task failed: ${result.error}`);
  }
}

function showAgents() {
  console.log(listAgentCapabilities());
}

function showHelp() {
  console.log('Available commands:');
  console.log('  status     - Show agent health and queue summary');
  console.log('  queue      - Display task queue');
  console.log('  agents     - List registered agents and capabilities');
  console.log('  dispatch   - Route a task to an agent (dry run)');
  console.log('  add        - Add a task to the queue');
  console.log('  run        - Execute the next pending task');
}

main().catch(console.error);
