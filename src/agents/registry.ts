import type { AgentConfig, AgentType } from "../types/task.js";

export const agentRegistry: AgentConfig[] = [
  {
    type: "scout",
    name: "Scout",
    description: "Research & Opportunity Detection - monitors job boards, grants, market signals",
    keywords: [
      "job", "jobs", "hiring", "opportunity", "grant", "funding", "research",
      "find", "search", "monitor", "track", "competitor", "market", "signal"
    ],
    capabilities: [
      "Monitor job boards",
      "Track grant deadlines", 
      "Watch market signals",
      "Competitor analysis",
      "Surface opportunities"
    ],
    available: true,
    command: "npm run scout scan"
  },
  {
    type: "builder",
    name: "Builder",
    description: "Code Generation & Deployment - takes specs and ships working code",
    keywords: [
      "build", "code", "implement", "create", "deploy", "ship", "develop",
      "feature", "bug", "fix", "refactor", "api", "frontend", "backend",
      "database", "test", "mvp", "prototype"
    ],
    capabilities: [
      "Generate code from specs",
      "Deploy to production",
      "Fix bugs",
      "Build MVPs",
      "Refactor code"
    ],
    available: true,
    command: "claude"
  },
  {
    type: "marketer",
    name: "Marketer",
    description: "GTM & Distribution - writes copy, manages social, crafts outreach",
    keywords: [
      "marketing", "copy", "social", "linkedin", "twitter", "post", "launch",
      "outreach", "email", "campaign", "landing", "page", "content", "seo",
      "product hunt", "announcement", "promotion"
    ],
    capabilities: [
      "Write marketing copy",
      "Manage social posts",
      "Craft cold outreach",
      "Optimize landing pages",
      "Plan launches"
    ],
    available: true,
    command: "claude"
  },
  {
    type: "analyst",
    name: "Analyst", 
    description: "Portfolio & Financial Monitoring - runs mNAV checks, tracks metrics",
    keywords: [
      "portfolio", "investment", "stock", "crypto", "btc", "mstr", "nav",
      "rebalance", "metrics", "runway", "burn", "monte carlo", "analysis",
      "financial", "trade", "position"
    ],
    capabilities: [
      "Run mNAV calculations",
      "Monitor portfolio drift",
      "Calculate rebalancing triggers",
      "Track burn rate",
      "Monte Carlo simulations"
    ],
    available: true,
    command: "claude"
  },
  {
    type: "archivist",
    name: "Archivist",
    description: "Knowledge & Context Management - maintains second brain, documentation",
    keywords: [
      "document", "documentation", "knowledge", "context", "remember", "recall",
      "notes", "archive", "index", "search", "history", "decision", "learning",
      "snippet", "reference"
    ],
    capabilities: [
      "Index past decisions",
      "Maintain documentation",
      "Provide context to agents",
      "Store code snippets",
      "Track learnings"
    ],
    available: true,
    command: "claude"
  },
  {
    type: "human",
    name: "Human",
    description: "Tasks requiring human judgment, creativity, or decision-making",
    keywords: [
      "review", "approve", "decide", "creative", "strategy", "meeting",
      "call", "interview", "negotiate", "present"
    ],
    capabilities: [
      "Strategic decisions",
      "Creative work",
      "Architecture review",
      "Stakeholder meetings"
    ],
    available: true
  }
];

export function getAgent(type: AgentType): AgentConfig | undefined {
  return agentRegistry.find(a => a.type === type);
}

export function getAvailableAgents(): AgentConfig[] {
  return agentRegistry.filter(a => a.available);
}
