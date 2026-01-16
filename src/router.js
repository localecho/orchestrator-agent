// Task router - matches tasks to agent capabilities
import { loadConfig, getAgents } from './config.js';

export function routeTask(taskDescription) {
  const config = loadConfig();
  const agents = getAgents(config);
  const words = taskDescription.toLowerCase().split(/\s+/);

  let bestMatch = null;
  let bestScore = 0;

  for (const [agentId, agent] of Object.entries(agents)) {
    let score = 0;
    for (const word of words) {
      for (const capability of agent.capabilities) {
        if (word.includes(capability) || capability.includes(word)) {
          score += 1;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = { agentId, agent, score };
    }
  }

  return bestMatch;
}

export function listAgentCapabilities() {
  const config = loadConfig();
  const agents = getAgents(config);

  const lines = [
    '╔═══════════════════════════════════════════════════════════════╗',
    '║                    Agent Registry                             ║',
    '╠═══════════════════════════════════════════════════════════════╣'
  ];

  for (const [agentId, agent] of Object.entries(agents)) {
    lines.push(`║  ${agentId.toUpperCase().padEnd(10)} ${agent.name.padEnd(20)}              ║`);
    lines.push(`║    Path: ${agent.path.slice(-45).padEnd(50)}  ║`);
    lines.push(`║    Skills: ${agent.capabilities.join(', ').slice(0, 48).padEnd(48)}  ║`);
    lines.push('╠═══════════════════════════════════════════════════════════════╣');
  }

  lines[lines.length - 1] = '╚═══════════════════════════════════════════════════════════════╝';
  return lines.join('\n');
}

export function suggestAgent(keywords) {
  const match = routeTask(keywords);
  if (!match || match.score === 0) {
    return { suggestion: null, message: 'No matching agent found for those keywords' };
  }
  return {
    suggestion: match.agentId,
    agent: match.agent,
    confidence: match.score,
    message: `Suggested: ${match.agent.name} (confidence: ${match.score})`
  };
}
