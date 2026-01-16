# 6-Agent Team

A coordinated system of autonomous agents for opportunity detection, code generation, marketing, financial analysis, task orchestration, and knowledge management.

## Architecture

```
                    ┌─────────────────────┐
                    │    Orchestrator     │
                    │   (Task Router)     │
                    └──────────┬──────────┘
                               │
       ┌───────────┬───────────┼───────────┬───────────┐
       │           │           │           │           │
       ▼           ▼           ▼           ▼           ▼
   ┌───────┐   ┌───────┐   ┌───────┐   ┌───────┐   ┌──────────┐
   │ Scout │   │Builder│   │Marketer│  │Analyst│   │Archivist │
   └───────┘   └───────┘   └───────┘   └───────┘   └──────────┘
```

## Agents

| Agent | Purpose | Repo | Command |
|-------|---------|------|---------|
| **Scout** | Opportunity detection - jobs, grants, gigs | [scout-agent](https://github.com/localecho/scout-agent) | `npm run scan` |
| **Builder** | Code generation & templates | template-genie | `npm run build` |
| **Marketer** | Content creation - social, email, landing pages | [marketer-agent](https://github.com/localecho/marketer-agent) | `npm run generate` |
| **Analyst** | Portfolio monitoring - mNAV, drift, rebalancing | [analyst-agent](https://github.com/localecho/analyst-agent) | `npm run analyze` |
| **Orchestrator** | Task routing & coordination | [orchestrator-agent](https://github.com/localecho/orchestrator-agent) | `npm run status` |
| **Archivist** | Knowledge management & search | [archivist-agent](https://github.com/localecho/archivist-agent) | `npm run search` |

## Quick Start

### 1. Check Agent Status
```bash
cd orchestrator-agent
node src/index.js status
```

### 2. Route a Task
```bash
node src/index.js dispatch "find remote AI jobs"
# → Routes to Scout Agent (confidence: 3)

node src/index.js dispatch "write linkedin post"
# → Routes to Marketer Agent

node src/index.js dispatch "check portfolio drift"
# → Routes to Analyst Agent

node src/index.js dispatch "search documentation"
# → Routes to Archivist Agent
```

### 3. Add Task to Queue
```bash
node src/index.js add "find new grant opportunities"
node src/index.js queue  # View queue
node src/index.js run    # Execute next task
```

## Agent Details

### Scout Agent
Scans multiple sources for opportunities:
- HackerNews Who's Hiring
- RemoteOK
- WeWorkRemotely
- Grant databases

```bash
cd scout-agent
npm run scan        # Find opportunities
npm run daemon      # Continuous monitoring
```

**Capabilities:** `opportunities, jobs, grants, gigs, leads, research`

### Builder Agent
Web-based template generator (Vite app):
```bash
cd template-genie
npm run dev         # Development server
npm run build       # Production build
```

**Capabilities:** `code, templates, generation, scaffolding, build`

### Marketer Agent
AI-powered content generation:
```bash
cd marketer-agent
npm run generate social --platform linkedin
npm run generate social --platform twitter --variations 3
npm run generate email --type cold-outreach
npm run generate launch --type producthunt
npm run generate landing --section full
```

**Capabilities:** `content, copy, marketing, social, email, ads`

### Analyst Agent
Portfolio monitoring with live prices:
```bash
cd analyst-agent
npm run analyze     # Full analysis (mNAV + drift)
npm run prices      # Current prices only
npm run portfolio   # Portfolio breakdown
npm run rebalance   # Rebalancing recommendations
npm run alerts      # Active drift alerts
```

**Output includes:**
- mNAV ratio (MSTR market cap / BTC holdings value)
- Portfolio value with per-asset breakdown
- Drift detection vs target allocation
- Rebalancing alerts when thresholds exceeded

**Capabilities:** `portfolio, finance, analysis, metrics, mNAV, drift`

### Archivist Agent
Knowledge base management:
```bash
cd archivist-agent
npm run index /path/to/project   # Index documents
npm run search "query"           # Search knowledge base
npm run stats                    # Show statistics
npm run summary                  # Overview by category
npm run export                   # Export to markdown
```

**Capabilities:** `knowledge, docs, documentation, search, index, archive, memory, notes`

## Configuration

The orchestrator maintains agent registry in `config.json`:

```json
{
  "agents": {
    "scout": {
      "name": "Scout Agent",
      "path": "/path/to/scout-agent",
      "command": "npm run scan",
      "capabilities": ["opportunities", "jobs", "grants", "gigs"],
      "description": "Finds opportunities, jobs, grants, and leads"
    }
  }
}
```

### Task Routing
Tasks are routed based on keyword matching against agent capabilities:

| Keywords | Agent |
|----------|-------|
| jobs, grants, opportunities, research | Scout |
| code, templates, build | Builder |
| content, copy, social, email, marketing | Marketer |
| portfolio, finance, mNAV, drift, analysis | Analyst |
| docs, search, knowledge, archive | Archivist |

## Task Queue

Tasks are stored in `data/queue.json` with:
- Priority ordering (high → medium → low)
- Status tracking (pending, in_progress, completed, failed)
- Result logging to `data/completed.json`

## Orchestrator Commands

```bash
node src/index.js status    # Agent health + queue summary
node src/index.js queue     # Display task queue
node src/index.js agents    # List registered agents
node src/index.js dispatch  # Route a task (dry run)
node src/index.js add       # Add task to queue
node src/index.js run       # Execute next pending task
```

## Development

### Adding a New Agent

1. Create agent project with CLI interface
2. Add to orchestrator `config.json`:
```json
"new-agent": {
  "name": "New Agent",
  "path": "/path/to/new-agent",
  "command": "npm run execute",
  "capabilities": ["keyword1", "keyword2"],
  "description": "What the agent does"
}
```
3. Index with Archivist: `npm run index /path/to/new-agent`

### PRD-Driven Development
Each agent uses `plans/prd.json` for feature tracking:
```json
[
  {
    "story": "Feature description",
    "priority": 1,
    "passes": false,
    "verification": "How to verify it works"
  }
]
```

## End-to-End Workflow

```
User Request → Orchestrator (routes) → Agent (executes) → Results
     ↓              ↓                       ↓
"find jobs"    Scout Agent           163 listings scanned
"analyze"      Analyst Agent         Portfolio: $103K, drift alerts
"search docs"  Archivist Agent       70 documents indexed
```

## License

MIT
