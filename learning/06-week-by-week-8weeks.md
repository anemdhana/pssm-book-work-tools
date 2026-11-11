# 06 — Eight-week calendar (~8–10 hours / week)

Assumes Phase 0 is a light overlay or already done. Heavy focus: **GenAI → ship → harden**.

| Week | Theme | Phase file | Concrete deliverable |
| --- | --- | --- | --- |
| **1** | LLM patterns + Azure/OpenAI hello | [02](./02-phase1-genai.md) | Chat + embeddings call from a small Spring or Python client; runbook |
| **2** | RAG v1 | [02](./02-phase1-genai.md) | Ingest markdown → retrieve → answer with citations |
| **3** | Tools + agent | [02](./02-phase1-genai.md) | Agent calls 3 Spring stub tools; tool log |
| **4** | Evals + second AI provider skim | [02](./02-phase1-genai.md) | Eval sheet (10 questions); Bedrock *or* Vertex one-pager |
| **5** | PostgreSQL + pgvector (optional wire to RAG) | [03](./03-phase2-databases.md) | Schema + migrations; ADR SQL vs Mongo |
| **6** | Docker Compose full stack | [04](./04-phase3-devops-cloud.md) | Compose: API + DB (+ vector); README up path |
| **7** | Kubernetes + CI | [04](./04-phase3-devops-cloud.md) | K8s deploy local; pipeline builds image |
| **8** | Gateway/resilience + portfolio polish | [05](./05-phase4-distributed-systems.md), [07](./07-capstone-portfolio.md) | Drill + README demo script; checklist 80%+ |

## Weekly rhythm

| Day block | Activity |
| --- | --- |
| Start of week (1 hr) | Write/update Requirements + Technical for the week |
| Mid week (4–6 hrs) | Implement |
| End of week (1–2 hrs) | Demo notes, tick [08-skills-checklist.md](./08-skills-checklist.md), push |

## Stretch (if ahead)

- Helm chart  
- OpenTelemetry trace  
- Multi-agent sketch (docs only until week 8 done)  

## Behind? Cut in this order

1. Second cloud AI (keep comparison table only)  
2. Oracle/MySQL (SQL scripts only)  
3. Full discovery server (use K8s Services story)  
4. Fancy UI (CLI/API demos are enough)  

## After week 8

Maintain by adding one vertical slice per month (new tool, better evals, staging cloud deploy).