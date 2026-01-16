# Orchestrator Agent

The meta-agent that routes tasks to the right agent and maintains a prioritized backlog.

## Part of the 6-Agent Team

| Agent | Purpose |
|-------|---------|
| **Scout** | Research & Opportunity Detection |
| **Builder** | Code Generation & Deployment |
| **Marketer** | GTM & Distribution |
| **Analyst** | Portfolio & Financial Monitoring |
| **Archivist** | Knowledge & Context Management |
| **Orchestrator** | Task Routing & Prioritization (this one) |

## Quick Start

```bash
npm install
npm run orch add "Build user authentication"
npm run orch list
npm run orch next
npm run orch complete <task-id>
```

## Commands

### Add a task
```bash
npm run orch add "Task title" -d "Description" -p high -t "feature,api"
```

Options:
- `-d, --description` - Task description
- `-p, --priority` - critical, high, medium, low
- `-t, --tags` - Comma-separated tags
- `-e, --estimate` - Estimated minutes

### List tasks
```bash
npm run orch list                    # All tasks
npm run orch list -a builder         # Filter by agent
npm run orch list -s pending         # Filter by status
```

### Get next task
```bash
npm run orch next                    # Next task for any agent
npm run orch next -a scout           # Next task for Scout
```

### Complete a task
```bash
npm run orch complete abc123 -o "Deployed to production"
```

### Block a task
```bash
npm run orch block abc123 "Waiting for API credentials"
```

### View statistics
```bash
npm run orch stats
```

### Test classification
```bash
npm run orch classify "Find senior engineer jobs in SF"
npm run orch classify "Deploy the new landing page"
```

### List agents
```bash
npm run orch agents
```

## How Classification Works

The Orchestrator analyzes task titles and descriptions to determine the best agent:

1. **Keyword matching** - Each agent has keywords (e.g., Scout: "job", "grant", "research")
2. **Tag matching** - Explicit tags boost specific agents
3. **Explicit mention** - Saying "Scout" or "Builder" routes directly
4. **Confidence threshold** - Low confidence routes to Human

## Task Lifecycle

```
pending -> in_progress -> completed
                      -> blocked (with reason)
```

## Data Storage

Tasks stored in `data/queue.json` with full history.

## Integration with Other Agents

The Orchestrator coordinates but does not execute. Each agent has its own runtime:

- **Scout**: `npm run scout scan` (scout-agent repo)
- **Builder**: Claude CLI or automated pipelines
- **Marketer**: Claude CLI with marketing prompts
- **Analyst**: Python scripts or Claude CLI
- **Archivist**: Documentation tools, Claude CLI
