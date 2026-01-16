// Task queue management
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const QUEUE_PATH = join(process.cwd(), 'data', 'queue.json');
const COMPLETED_PATH = join(process.cwd(), 'data', 'completed.json');

function ensureDataDir() {
  const dataDir = join(process.cwd(), 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
}

export function loadQueue() {
  ensureDataDir();
  if (!existsSync(QUEUE_PATH)) {
    return [];
  }
  try {
    const data = JSON.parse(readFileSync(QUEUE_PATH, 'utf-8'));
    // Handle both array format and {tasks: []} format
    return Array.isArray(data) ? data : (data.tasks || []);
  } catch {
    return [];
  }
}

export function saveQueue(queue) {
  ensureDataDir();
  writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2));
}

export function addTask(task) {
  const queue = loadQueue();
  const newTask = {
    id: generateId(),
    ...task,
    status: 'pending',
    priority: task.priority || 5,
    createdAt: new Date().toISOString(),
    attempts: 0
  };
  queue.push(newTask);
  queue.sort((a, b) => a.priority - b.priority);
  saveQueue(queue);
  return newTask;
}

export function getNextTask() {
  const queue = loadQueue();
  return queue.find(t => t.status === 'pending') || null;
}

export function updateTaskStatus(taskId, status, result = null) {
  const queue = loadQueue();
  const task = queue.find(t => t.id === taskId);
  if (task) {
    task.status = status;
    task.updatedAt = new Date().toISOString();
    if (result) task.result = result;
    if (status === 'in_progress') task.startedAt = new Date().toISOString();
    if (status === 'completed' || status === 'failed') {
      task.completedAt = new Date().toISOString();
      moveToCompleted(task);
      const newQueue = queue.filter(t => t.id !== taskId);
      saveQueue(newQueue);
    } else {
      saveQueue(queue);
    }
  }
  return task;
}

function moveToCompleted(task) {
  let completed = [];
  if (existsSync(COMPLETED_PATH)) {
    try {
      completed = JSON.parse(readFileSync(COMPLETED_PATH, 'utf-8'));
    } catch {}
  }
  completed.push(task);
  writeFileSync(COMPLETED_PATH, JSON.stringify(completed, null, 2));
}

export function getPendingTasks() {
  return loadQueue().filter(t => t.status === 'pending');
}

export function getInProgressTasks() {
  return loadQueue().filter(t => t.status === 'in_progress');
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export function formatQueueDisplay(queue) {
  if (queue.length === 0) {
    return 'Queue is empty';
  }

  const lines = [
    '╔═══════════════════════════════════════════════════════════════╗',
    '║                      Task Queue                               ║',
    '╠═══════════════════════════════════════════════════════════════╣',
    '║  ID          Pri  Status       Agent       Description        ║',
    '╠═══════════════════════════════════════════════════════════════╣'
  ];

  for (const task of queue.slice(0, 10)) {
    const id = task.id.padEnd(10).slice(0, 10);
    const pri = task.priority.toString().padStart(3);
    const status = task.status.padEnd(12).slice(0, 12);
    const agent = (task.agent || '?').padEnd(10).slice(0, 10);
    const desc = (task.description || task.type || '').padEnd(18).slice(0, 18);
    lines.push(`║  ${id}  ${pri}  ${status}  ${agent}  ${desc} ║`);
  }

  if (queue.length > 10) {
    lines.push(`║  ... and ${queue.length - 10} more tasks                                    ║`);
  }

  lines.push('╚═══════════════════════════════════════════════════════════════╝');
  return lines.join('\n');
}
