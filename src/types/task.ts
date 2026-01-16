export type AgentType = "scout" | "builder" | "marketer" | "analyst" | "archivist" | "human";

export type TaskPriority = "critical" | "high" | "medium" | "low";

export type TaskStatus = "pending" | "assigned" | "in_progress" | "blocked" | "completed" | "cancelled";

export interface Task {
  id: string;
  title: string;
  description: string;
  agent: AgentType;
  priority: TaskPriority;
  status: TaskStatus;
  tags: string[];
  dependencies: string[];
  blockedBy?: string;
  blockedReason?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  estimatedMinutes?: number;
  actualMinutes?: number;
  output?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  tags?: string[];
  dependencies?: string[];
  estimatedMinutes?: number;
}

export interface AgentConfig {
  type: AgentType;
  name: string;
  description: string;
  keywords: string[];
  capabilities: string[];
  available: boolean;
  command?: string;
}

export interface OrchestratorConfig {
  agents: AgentConfig[];
  defaultPriority: TaskPriority;
  autoAssign: boolean;
}
