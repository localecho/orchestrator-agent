import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { v4 as uuid } from "uuid";
import type { Task, TaskInput, TaskStatus, TaskPriority, AgentType } from "./types/task.js";
import { classifyTask } from "./classifier.js";

const DATA_DIR = "./data";
const QUEUE_FILE = DATA_DIR + "/queue.json";

interface QueueData {
  tasks: Task[];
  lastUpdated: string;
}

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadQueue(): Task[] {
  ensureDataDir();
  if (!existsSync(QUEUE_FILE)) {
    return [];
  }
  try {
    const data = JSON.parse(readFileSync(QUEUE_FILE, "utf-8")) as QueueData;
    return data.tasks.map(t => ({
      ...t,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
      completedAt: t.completedAt ? new Date(t.completedAt) : undefined
    }));
  } catch {
    return [];
  }
}

export function saveQueue(tasks: Task[]): void {
  ensureDataDir();
  const data: QueueData = {
    tasks,
    lastUpdated: new Date().toISOString()
  };
  writeFileSync(QUEUE_FILE, JSON.stringify(data, null, 2));
}

export function addTask(input: TaskInput): Task {
  const tasks = loadQueue();
  const classification = classifyTask(input);
  
  const task: Task = {
    id: uuid().substring(0, 8),
    title: input.title,
    description: input.description || "",
    agent: classification.agent,
    priority: input.priority || "medium",
    status: "pending",
    tags: input.tags || [],
    dependencies: input.dependencies || [],
    createdAt: new Date(),
    updatedAt: new Date(),
    estimatedMinutes: input.estimatedMinutes,
    metadata: {
      classificationConfidence: classification.confidence,
      classificationReasoning: classification.reasoning
    }
  };
  
  tasks.push(task);
  saveQueue(tasks);
  return task;
}

export function updateTask(id: string, updates: Partial<Task>): Task | null {
  const tasks = loadQueue();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx < 0) return null;
  
  tasks[idx] = {
    ...tasks[idx],
    ...updates,
    updatedAt: new Date()
  };
  
  if (updates.status === "completed") {
    tasks[idx].completedAt = new Date();
  }
  
  saveQueue(tasks);
  return tasks[idx];
}

export function getNextTask(agent?: AgentType): Task | null {
  const tasks = loadQueue();
  
  const priorityOrder: TaskPriority[] = ["critical", "high", "medium", "low"];
  
  for (const priority of priorityOrder) {
    const candidates = tasks.filter(t => 
      t.status === "pending" &&
      t.priority === priority &&
      (!agent || t.agent === agent) &&
      t.dependencies.every(depId => {
        const dep = tasks.find(d => d.id === depId);
        return dep && dep.status === "completed";
      })
    );
    
    if (candidates.length > 0) {
      return candidates[0];
    }
  }
  
  return null;
}

export function getTasksByAgent(agent: AgentType): Task[] {
  return loadQueue().filter(t => t.agent === agent);
}

export function getTasksByStatus(status: TaskStatus): Task[] {
  return loadQueue().filter(t => t.status === status);
}

export function getTaskStats(): Record<string, number> {
  const tasks = loadQueue();
  const stats: Record<string, number> = {
    total: tasks.length,
    pending: 0,
    in_progress: 0,
    completed: 0,
    blocked: 0
  };
  
  for (const task of tasks) {
    stats[task.status] = (stats[task.status] || 0) + 1;
  }
  
  return stats;
}
