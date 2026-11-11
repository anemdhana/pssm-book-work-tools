# 01 — Phase 0: Java & Spring refresh (optional)

**Duration:** 1–2 weeks  
**Goal:** Speak fluently to “strong Core Java / Spring” without rebuilding basics.

Skip entirely if you can already whiteboard these without notes.

## Outcomes

- Explain multithreading choices (pool vs virtual threads, when synchronized vs concurrent collections).  
- Name and sketch 5–6 design patterns with a real Spring example each.  
- Demo Spring Security (session *or* JWT) and one JPA pitfall fix (N+1 or transaction boundary).

## Topics

### Core Java

- Collections: `HashMap` internals story, `ConcurrentHashMap`, immutability  
- Multithreading: executors, futures, CompletableFuture, virtual threads (Java 21)  
- Design patterns: Strategy, Factory, Template Method, Observer, Decorator, Circuit Breaker (resilience)

### Spring Boot / JPA / Security

- Transaction boundaries (`@Transactional` placement, self-invocation trap)  
- JPA: lazy loading, N+1, `EntityGraph` / join fetch  
- Spring Security filter chain; method security; password encoding  
- Optional: Spring Cloud Gateway route + one discovery client (Eureka/Consul) — light touch; deepen in Phase 4

## Docs-first mini task

**Title:** `orders-concurrency-lab`

**Requirements (write first):**  
API accepts concurrent stock decrements; must not oversell; expose metrics of rejected updates.

**Technical:**  
Service + repository; optimistic locking *or* DB constraint; thread-pool load test script.

## Done when

- [ ] One short README with sequence diagram (happy + race)  
- [ ] Load test shows no oversell  
- [ ] You can explain the race without opening the code  

## Checklist link

Mark Java / Spring / Design Patterns rows in [08-skills-checklist.md](./08-skills-checklist.md).

## Next

→ [02-phase1-genai.md](./02-phase1-genai.md)