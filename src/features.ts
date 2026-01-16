import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { v4 as uuid } from "uuid";
import chalk from "chalk";
import type { Feature, FeatureInput } from "./types/feature.js";

const DATA_DIR = "./data";
const FEATURES_FILE = DATA_DIR + "/features.json";

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadFeatures(): Feature[] {
  ensureDataDir();
  if (!existsSync(FEATURES_FILE)) {
    return [];
  }
  try {
    const features = JSON.parse(readFileSync(FEATURES_FILE, "utf-8")) as Feature[];
    return features.map(f => ({
      ...f,
      createdAt: new Date(f.createdAt),
      updatedAt: new Date(f.updatedAt)
    }));
  } catch {
    return [];
  }
}

function saveFeatures(features: Feature[]): void {
  ensureDataDir();
  writeFileSync(FEATURES_FILE, JSON.stringify(features, null, 2));
}

export function addFeature(input: FeatureInput): Feature {
  const features = loadFeatures();
  
  const feature: Feature = {
    id: uuid().substring(0, 6),
    name: input.name,
    description: input.description || "",
    category: input.category || "general",
    enabled: input.enabled !== false,
    priority: input.priority || features.length + 1,
    status: "backlog",
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  features.push(feature);
  saveFeatures(features);
  return feature;
}

export function toggleFeature(id: string): Feature | null {
  const features = loadFeatures();
  const idx = features.findIndex(f => f.id === id);
  if (idx < 0) return null;
  
  features[idx].enabled = !features[idx].enabled;
  features[idx].updatedAt = new Date();
  saveFeatures(features);
  return features[idx];
}

export function updateFeatureStatus(id: string, status: Feature["status"]): Feature | null {
  const features = loadFeatures();
  const idx = features.findIndex(f => f.id === id);
  if (idx < 0) return null;
  
  features[idx].status = status;
  features[idx].updatedAt = new Date();
  saveFeatures(features);
  return features[idx];
}

export function listFeatures(filter?: { enabled?: boolean; category?: string; status?: Feature["status"] }): Feature[] {
  let features = loadFeatures();
  
  if (filter?.enabled !== undefined) {
    features = features.filter(f => f.enabled === filter.enabled);
  }
  if (filter?.category) {
    features = features.filter(f => f.category === filter.category);
  }
  if (filter?.status) {
    features = features.filter(f => f.status === filter.status);
  }
  
  return features.sort((a, b) => a.priority - b.priority);
}

export function printFeatures(filter?: { enabled?: boolean; category?: string }): void {
  const features = listFeatures(filter);
  
  console.log(chalk.blue("\n🚀 Feature Backlog (" + features.length + " features)\n"));
  
  if (features.length === 0) {
    console.log(chalk.gray("  No features found.\n"));
    return;
  }
  
  // Group by category
  const byCategory: Map<string, Feature[]> = new Map();
  for (const f of features) {
    if (!byCategory.has(f.category)) byCategory.set(f.category, []);
    byCategory.get(f.category)!.push(f);
  }
  
  for (const [category, catFeatures] of byCategory) {
    console.log(chalk.cyan.bold("  " + category.toUpperCase()));
    for (const f of catFeatures) {
      const toggle = f.enabled ? chalk.green("●") : chalk.gray("○");
      const statusIcon = getStatusIcon(f.status);
      console.log(
        "    " + toggle + " " +
        chalk.gray("[" + f.id + "]") + " " +
        statusIcon + " " +
        (f.enabled ? chalk.white(f.name) : chalk.gray(f.name))
      );
      if (f.description) {
        console.log(chalk.gray("      " + f.description));
      }
    }
    console.log();
  }
}

function getStatusIcon(status: Feature["status"]): string {
  switch (status) {
    case "backlog": return chalk.gray("□");
    case "planned": return chalk.yellow("◇");
    case "in_progress": return chalk.blue("▷");
    case "completed": return chalk.green("✓");
    case "cancelled": return chalk.red("✗");
    default: return "?";
  }
}

export function seedDefaultFeatures(): void {
  const features = loadFeatures();
  if (features.length > 0) {
    console.log(chalk.yellow("\nFeatures already seeded. Use 'features list' to view.\n"));
    return;
  }
  
  const defaultFeatures: FeatureInput[] = [
    // Scout Features
    { name: "HackerNews Who is Hiring scraper", category: "scout", priority: 1 },
    { name: "We Work Remotely integration", category: "scout", priority: 2 },
    { name: "LinkedIn job alerts", category: "scout", priority: 3 },
    { name: "Grant deadline tracking", category: "scout", priority: 4 },
    { name: "Competitor monitoring", category: "scout", priority: 5 },
    { name: "Email digest of opportunities", category: "scout", priority: 6 },
    
    // Builder Features
    { name: "Auto PR creation", category: "builder", priority: 7 },
    { name: "Test generation", category: "builder", priority: 8 },
    { name: "Code review automation", category: "builder", priority: 9 },
    { name: "Deployment pipelines", category: "builder", priority: 10 },
    { name: "Error monitoring integration", category: "builder", priority: 11 },
    
    // Marketer Features
    { name: "LinkedIn post scheduler", category: "marketer", priority: 12 },
    { name: "Twitter/X automation", category: "marketer", priority: 13 },
    { name: "Email sequence builder", category: "marketer", priority: 14 },
    { name: "Landing page A/B testing", category: "marketer", priority: 15 },
    { name: "Product Hunt launch automation", category: "marketer", priority: 16 },
    { name: "SEO content optimization", category: "marketer", priority: 17 },
    
    // Analyst Features
    { name: "mNAV calculator", category: "analyst", priority: 18 },
    { name: "Portfolio drift alerts", category: "analyst", priority: 19 },
    { name: "Monte Carlo simulations", category: "analyst", priority: 20 },
    { name: "Rebalancing recommendations", category: "analyst", priority: 21 },
    { name: "Burn rate tracking", category: "analyst", priority: 22 },
    { name: "Tax loss harvesting alerts", category: "analyst", priority: 23 },
    
    // Archivist Features
    { name: "Auto-capture from conversations", category: "archivist", priority: 24 },
    { name: "Semantic search with embeddings", category: "archivist", priority: 25 },
    { name: "Knowledge graph visualization", category: "archivist", priority: 26 },
    { name: "Markdown export", category: "archivist", priority: 27 },
    
    // Orchestrator Features
    { name: "Slack integration", category: "orchestrator", priority: 28 },
    { name: "Voice command support", category: "orchestrator", priority: 29 },
    { name: "Multi-agent parallel execution", category: "orchestrator", priority: 30 },
    { name: "Daily standup summary", category: "orchestrator", priority: 31 }
  ];
  
  for (const input of defaultFeatures) {
    addFeature(input);
  }
  
  console.log(chalk.green("\n✓ Seeded " + defaultFeatures.length + " features to backlog.\n"));
}
