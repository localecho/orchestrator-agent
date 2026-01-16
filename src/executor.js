// Task executor - invokes agents and collects results
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { loadConfig, getAgent } from './config.js';
import { updateTaskStatus } from './queue.js';

export async function executeTask(task) {
  const config = loadConfig();
  const agent = getAgent(config, task.agent);

  if (!agent) {
    return { success: false, error: `Unknown agent: ${task.agent}` };
  }

  if (!existsSync(agent.path)) {
    return { success: false, error: `Agent path not found: ${agent.path}` };
  }

  updateTaskStatus(task.id, 'in_progress');

  try {
    const result = await runAgentCommand(agent, task);
    updateTaskStatus(task.id, 'completed', result);
    return { success: true, result };
  } catch (err) {
    updateTaskStatus(task.id, 'failed', { error: err.message });
    return { success: false, error: err.message };
  }
}

function runAgentCommand(agent, task) {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = agent.command.split(' ');

    // Add task-specific args if provided
    if (task.args) {
      args.push(...task.args);
    }

    const child = spawn(cmd, args, {
      cwd: agent.path,
      shell: true,
      env: { ...process.env, TASK_ID: task.id }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, exitCode: code });
      } else {
        reject(new Error(`Agent exited with code ${code}: ${stderr || stdout}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });

    // Timeout handling
    const timeout = task.timeoutMs || 300000;
    setTimeout(() => {
      child.kill();
      reject(new Error(`Task timed out after ${timeout}ms`));
    }, timeout);
  });
}

export async function checkAgentHealth(agentId) {
  const config = loadConfig();
  const agent = getAgent(config, agentId);

  if (!agent) {
    return { agentId, status: 'unknown', error: 'Agent not found' };
  }

  const pathExists = existsSync(agent.path);

  return {
    agentId,
    name: agent.name,
    path: agent.path,
    status: pathExists ? 'available' : 'unavailable',
    capabilities: agent.capabilities
  };
}

export async function checkAllAgentsHealth() {
  const config = loadConfig();
  const agents = Object.keys(config.agents || {});

  const results = await Promise.all(agents.map(checkAgentHealth));
  return results;
}
