# Orchestrator Agent - Codebase Memory

## Project Identity
**Name:** Orchestrator Agent  
**Purpose:** Task Routing & Prioritization - the meta-agent coordinating the 6-agent team  
**Role:** Decides which agent handles what, triages requests, maintains queue

## The 6-Agent Team

```
You (Strategic Decisions, Creative Work, Architecture)
         |
         v
    Orchestrator ─────────────────────────────┐
         |                                    |
    ┌────┴────┬─────────┬─────────┐          |
    v         v         v         v          v
 Scout    Builder   Marketer   Analyst   Archivist
(finds)   (ships)   (sells)    (tracks)  (remembers)
```

## Architecture

```
src/
├── index.ts           # CLI entry point
├── orchestrator.ts    # Main Orchestrator class
├── classifier.ts      # Task → Agent classification
├── queue.ts           # Task queue management
├── agents/
│   └── registry.ts    # Agent definitions and capabilities
└── types/
    └── task.ts        # TypeScript interfaces
```

## Classification Algorithm

1. Extract text from title + description
2. Match against each agent's keywords
3. Check explicit tags and agent mentions
4. Calculate confidence score (0-100)
5. Route to Human if confidence < 20%

## Agent Keywords

- **Scout**: job, grant, research, monitor, competitor
- **Builder**: build, code, deploy, feature, bug, api
- **Marketer**: marketing, copy, social, launch, outreach
- **Analyst**: portfolio, investment, metrics, runway
- **Archivist**: document, knowledge, context, notes

## Task Priorities

- **critical**: Blocking other work, immediate attention
- **high**: Important, do today
- **medium**: Standard priority
- **low**: Nice to have, backlog

## Commands Reference

```bash
npm run orch add "title" -p high     # Add task
npm run orch list                     # View queue
npm run orch next -a builder          # Get next for agent
npm run orch complete <id>            # Mark done
npm run orch block <id> "reason"      # Mark blocked
npm run orch stats                    # Queue statistics
npm run orch classify "text"          # Test classification
```

## Integration Points

- Scout: Feeds opportunities into queue
- Builder: Pulls code tasks, marks complete
- Marketer: Pulls marketing tasks
- Analyst: Pulls analysis tasks
- Archivist: Documents completed work
