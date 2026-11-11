# 00 — Overview

## Target profile (from Skills.txt)

A backend / platform engineer who can ship **Spring microservices**, operate them with **Docker/K8s/CI/cloud**, and build **LLM + RAG + agent** features on top.

## What you already own (do not re-learn from zero)

| Area | Stance |
| --- | --- |
| Prompt engineering | Maintain; move into *systems* (RAG, tools, evals) |
| Docs-first delivery | Keep as your default project method |
| Spring Boot | Maintain; deepen Security, transactions, Cloud edges |
| Microservices / REST | Maintain; add gateway, discovery, resilience drills |

## Priority order (if time is short)

1. **GenAI systems** — RAG, agents, one cloud AI provider deep  
2. **DevOps platform** — Docker polish, Kubernetes, CI  
3. **SQL breadth** — PostgreSQL first  
4. **Distributed systems depth** — resilience + observability  
5. **Second cloud AI** + light Java concurrency / patterns refresh  

## Study loop (every week)

1. Open the phase file for that week.  
2. Write a **1-page Requirements** + **½-page Technical** in your portfolio repo `docs/`.  
3. Implement only that scope.  
4. Tick items in [08-skills-checklist.md](./08-skills-checklist.md).  
5. Optional: answer 5 interview bullets out loud or in writing.

## Suggested portfolio repo name

`ai-spring-ops-lab` (or reuse an existing personal lab repo).

Folders:

```text
docs/requirements/
docs/technical/
src/          # Spring Boot services
infra/        # Docker, k8s, CI
rag/          # notebooks or Python/Java RAG experiments
```

## Time budget

| Pace | Duration | Hours / week |
| --- | --- | --- |
| Focused | 8 weeks | 8–10 |
| Steady | 12 weeks | 5–6 |

Use [06-week-by-week-8weeks.md](./06-week-by-week-8weeks.md) for the focused track.

## Next

→ [01-phase0-java-spring-refresh.md](./01-phase0-java-spring-refresh.md) (optional short)  
→ or jump to [02-phase1-genai.md](./02-phase1-genai.md) if Java/Spring feel interview-ready.