# 05 — Phase 4: Distributed systems depth

**Duration:** 2–3 weeks focused (or ongoing alongside Phase 3)  
**Goal:** JD phrases — API Gateway, Service Discovery, Distributed Systems — with demos, not buzzwords.

## Outcomes

- Route traffic through a gateway to ≥2 services.  
- Show discovery *or* clearly document why you use Compose DNS / K8s Services instead.  
- Implement timeouts, retries with backoff, and idempotent POST where needed.  
- Basic observability: structured logs + one metrics endpoint + optional trace.  

## Topics

### Microservices plumbing

- API Gateway (Spring Cloud Gateway)  
- Service discovery (Eureka/Consul) **or** K8s Service discovery — know tradeoffs  
- Config externalization  

### Resilience & correctness

- Timeouts, retries, circuit breaker (Resilience4j)  
- Idempotency keys  
- Outbox / dual-write problem (conceptual + tiny demo OK)  
- Saga vs choreography (whiteboard)  

### Observability

- Correlation IDs  
- Micrometer + Prometheus scrape *or* cloud metrics  
- One distributed trace (OpenTelemetry) optional but impressive  

## Docs-first mini task

**Title:** `gateway-resilience-drill`

Requirements: Client → Gateway → `booking-service` + `hotel-service`; kill hotel-service; booking still returns degraded response; dashboard/log shows failure.  
Technical: Compose or K8s; Resilience4j on Feign/WebClient; runbook for the drill.

## Done when

- [ ] Architecture diagram (C4 or simple boxes)  
- [ ] Resilience drill recorded in README (steps + expected result)  
- [ ] You can explain discovery vs K8s DNS in one minute  

## Checklist link

Microservices / REST / Gateway / Discovery / Distributed Systems rows in [08-skills-checklist.md](./08-skills-checklist.md).

## Next

→ Capstone polish [07-capstone-portfolio.md](./07-capstone-portfolio.md)