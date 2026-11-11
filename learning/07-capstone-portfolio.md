# 07 — Capstone portfolio project

## Name

**Working title:** Event Ops Copilot (rename freely)

## One-sentence pitch

> Docs-first Spring system that allots event hotel guests and exposes a **RAG + tool-calling agent** for desk/volunteer questions, shipped with **Docker, K8s, and CI**.

## Why this fits you

Reuses your Buddha Sangha / hotel-desk domain knowledge without copying proprietary code — **rebuild a slim public lab** with fake data.

## Modules (keep thin)

| Module | Role |
| --- | --- |
| `hotel-api` | Spring Boot: hotels, rooms, desk people, guest status stubs |
| `rag-service` | Ingest docs + query (Java or Python) |
| `agent-bff` | Orchestrates LLM + tools → hotel-api + rag-service |
| `infra` | Compose, k8s, CI |
| `docs` | Requirements, Technical, UI notes, ADRs, demo script |

## Docs to write first (your style)

1. `docs/requirements/FR-agent.md` — what the agent may / must not do  
2. `docs/technical/architecture.md` — boxes + sequence for “Where is guest X?”  
3. `docs/technical/rag.md` — corpus, chunking, store  
4. `docs/ui/agent-cli.md` — even if CLI-only: prompts and sample sessions  
5. `docs/demo-script.md` — 5-minute walkthrough  

## Demo script (target)

1. Show Requirements snippet (docs-first).  
2. Ask RAG a policy question → citations.  
3. Ask “Who is in room 231?” → tool call → JSON → natural answer.  
4. Mark did-not-arrive (stub) → volunteer reclaim note.  
5. Show Compose/K8s + CI green.  

## README badges / proof

- Architecture diagram  
- Link to checklist export or filled [08-skills-checklist.md](./08-skills-checklist.md)  
- “How to run” with one command  

## Non-goals (protect scope)

- Full WhatsApp / realtime  
- Pixel-perfect web UI  
- Multi-cloud production HA  

## Success criteria

- [ ] Stranger can run from README in &lt;30 minutes  
- [ ] Agent + RAG both demoable  
- [ ] Skills.txt coverage ≥ 80% ticked with links to this repo  
