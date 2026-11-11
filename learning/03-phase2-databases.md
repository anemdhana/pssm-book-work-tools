# 03 — Phase 2: Databases

**Duration:** 2–3 weeks  
**Goal:** Mongo comfort + **PostgreSQL** confidence; enough MySQL/Oracle literacy for JD screens.

## Outcomes

- Model a relational schema for RAG metadata + app entities.  
- Write joins, indexes, explain plans at a basic level.  
- Know when Mongo document model wins vs SQL.  

## Topics

### PostgreSQL (primary new skill)

- Schema design, FKs, migrations (Flyway/Liquibase with Spring)  
- Indexes (B-tree; intro to GIN for JSON/full text)  
- Optional: **pgvector** for embeddings (ties to Phase 1)  
- Transactions isolation levels (read committed vs repeatable read story)

### MongoDB (deepen what you use)

- Indexing, aggregation pipeline one real use case  
- Transaction boundaries / when not to force multi-doc TX  

### MySQL / Oracle (familiarity)

- Connect, run SELECT/JOIN, read an ER diagram  
- Note dialect differences (sequences, `MERGE`, pagination)  
- No need to become a DBA  

## Docs-first mini task

**Title:** `catalog-sql-mongo`

Requirements: same “hotel + rooms + desk people” domain — one SQL schema + one Mongo collection design; document tradeoffs.  
Technical: Spring Data JPA module *or* plain SQL scripts + existing Mongo module; short ADR.

## Done when

- [ ] ER diagram in docs  
- [ ] Flyway/Liquibase (or SQL scripts) applied locally  
- [ ] One query shown with `EXPLAIN` / explain plan screenshot or paste  
- [ ] ADR: “Why SQL for X / Mongo for Y”  

## Checklist link

Database rows in [08-skills-checklist.md](./08-skills-checklist.md).

## Next

→ [04-phase3-devops-cloud.md](./04-phase3-devops-cloud.md)