// Config loader for orchestrator settings
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const CONFIG_PATH = join(process.cwd(), 'config.json');

export function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    console.error('config.json not found');
    process.exit(1);
  }

  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading config:', err.message);
    process.exit(1);
  }
}

export function getAgents(config) {
  return config.agents || {};
}

export function getAgent(config, agentId) {
  return config.agents?.[agentId] || null;
}

export function getQueueSettings(config) {
  return config.queue || { maxConcurrent: 1, retryAttempts: 3, timeoutMs: 300000 };
}
