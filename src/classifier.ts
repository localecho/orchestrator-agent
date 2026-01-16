import type { AgentType, TaskInput } from "./types/task.js";
import { agentRegistry, getAvailableAgents } from "./agents/registry.js";

interface ClassificationResult {
  agent: AgentType;
  confidence: number;
  reasoning: string[];
}

export function classifyTask(input: TaskInput): ClassificationResult {
  const text = (input.title + " " + (input.description || "")).toLowerCase();
  const tags = (input.tags || []).map(t => t.toLowerCase());
  
  const scores: Map<AgentType, { score: number; reasons: string[] }> = new Map();
  
  for (const agent of getAvailableAgents()) {
    let score = 0;
    const reasons: string[] = [];
    
    // Check keyword matches
    for (const keyword of agent.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += 10;
        reasons.push("Matches keyword: " + keyword);
      }
    }
    
    // Check tag matches
    for (const tag of tags) {
      if (agent.keywords.some(k => k.toLowerCase() === tag)) {
        score += 15;
        reasons.push("Tag matches: " + tag);
      }
    }
    
    // Boost for explicit agent mention
    if (text.includes(agent.type) || text.includes(agent.name.toLowerCase())) {
      score += 25;
      reasons.push("Explicitly mentions " + agent.name);
    }
    
    scores.set(agent.type, { score, reasons });
  }
  
  // Find highest scoring agent
  let bestAgent: AgentType = "human";
  let bestScore = 0;
  let bestReasons: string[] = ["No clear agent match - routing to human"];
  
  for (const [agentType, { score, reasons }] of scores) {
    if (score > bestScore) {
      bestScore = score;
      bestAgent = agentType;
      bestReasons = reasons;
    }
  }
  
  // Calculate confidence (0-100)
  const confidence = Math.min(100, Math.round(bestScore * 2));
  
  // If very low confidence, route to human
  if (confidence < 20) {
    return {
      agent: "human",
      confidence: 100 - confidence,
      reasoning: ["Low confidence in automated classification", "Routing to human for decision"]
    };
  }
  
  return {
    agent: bestAgent,
    confidence,
    reasoning: bestReasons.slice(0, 3)
  };
}
