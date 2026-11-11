# 02 — Phase 1: Generative AI (primary focus)

**Duration:** 4–6 weeks  
**Goal:** Move from “good at prompting” to “can ship RAG + tools + agents on a backend.”

## Outcomes

- Design a RAG pipeline (ingest → chunk → embed → retrieve → generate → cite).  
- Build a tool-calling agent that hits your Spring APIs.  
- Use **one** cloud AI deeply (recommended: Azure OpenAI); know OpenAI API + Bedrock *or* Vertex at compare level.  
- Write evals for retrieval and answer quality (even a spreadsheet is fine at first).

## Learning blocks

### A. LLM application patterns (week-ish)

- Chat vs completion vs structured JSON output  
- Temperature, max tokens, system vs user vs tool messages  
- Cost, latency, rate limits, safety / PII  

### B. RAG

- Chunking strategies (size, overlap, by heading)  
- Embeddings; vector store (start: **pgvector** or Chroma)  
- Hybrid search (keyword + vector) — conceptual OK first  
- Citations / “answer only from context”  
- Failure modes: empty retrieval, conflicting chunks, hallucination  

### C. Orchestration & agents

- Prefer **LangGraph** or LangChain expression language — pick one stack and stick  
- Tools: HTTP to Spring Boot, SQL read-only, doc search  
- Memory: short-term thread vs long-term store  
- Multi-agent later; master single agent + tools first  

### D. Cloud AI services

| Provider | Learn enough to… |
| --- | --- |
| **Azure OpenAI** (primary) | Deploy model, keys/RBAC, chat + embeddings endpoints |
| **OpenAI** | Same API shapes; org keys; Assistants vs Chat |
| **AWS Bedrock** *or* **Vertex AI** | Auth model, list models, one chat + one embedding call |

## Docs-first mini projects

### Project 1 — `rag-handbook`

Requirements: answer questions from a folder of markdown (your learning docs + Skills notes).  
Must show sources.  
Technical: ingest script + query API (Java *or* Python for RAG layer is fine; Spring as BFF optional).

### Project 2 — `ops-agent`

Requirements: agent can call tools: `listHotels`, `findGuestByRoom`, `summarizeStay` (stub or real).  
Technical: Spring Boot tool endpoints + agent loop; log every tool call.

## Practice prompts for yourself (meta)

Keep a `docs/prompt-playbook.md`:

- System prompt for “strict RAG”  
- System prompt for “tool-using hotel desk assistant”  
- Rubric: faithfulness, completeness, refusal when unknown  

## Done when

- [ ] RAG demo with citations  
- [ ] Agent with ≥3 tools against Spring  
- [ ] One Azure OpenAI (or chosen primary) runbook in `docs/technical/`  
- [ ] Half-page comparison table: Azure vs OpenAI vs Bedrock/Vertex  

## Checklist link

GenAI / LLM / LangChain / Agents / RAG / Prompt / AI services rows in [08-skills-checklist.md](./08-skills-checklist.md).

## Next

→ [03-phase2-databases.md](./03-phase2-databases.md)  
Calendar: [06-week-by-week-8weeks.md](./06-week-by-week-8weeks.md) weeks 1–4.