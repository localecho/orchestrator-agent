export interface Feature {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  priority: number;
  status: "backlog" | "planned" | "in_progress" | "completed" | "cancelled";
  dependencies?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureInput {
  name: string;
  description?: string;
  category?: string;
  priority?: number;
  enabled?: boolean;
}
