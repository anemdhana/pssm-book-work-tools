# 04 — Phase 3: Docker, Kubernetes, CI, Cloud

**Duration:** 3–4 weeks  
**Goal:** Take the portfolio app from “runs on my laptop” to “image + K8s + pipeline.”

## Outcomes

- Multi-stage Docker builds for Spring Boot.  
- Deploy to local Kubernetes (kind/minikube/k3d).  
- CI builds, tests, pushes image (Jenkins **or** GitHub Actions — one is enough).  
- Use one cloud for registry + optional managed DB / AI endpoint.  

## Topics

### Docker

- Multi-stage Maven/Gradle build  
- Non-root user, healthcheck, Compose for app + DB + vector store  

### Kubernetes

- Deployment, Service, Ingress (or port-forward first)  
- ConfigMap, Secret  
- Resource requests/limits; probes (liveness/readiness)  
- Optional: simple Helm chart  

### CI (Jenkins or GitHub Actions)

- Trigger on push  
- `mvn test` / frontend test  
- Build & push image  
- Optional: deploy to K8s namespace  

### Cloud (pick one primary)

| Track | Focus |
| --- | --- |
| **Azure** | ACR, AKV or app settings, Azure OpenAI already from Phase 1, App Service *or* AKS light |
| **AWS** | ECR, EKS/ECS light, Bedrock skim, RDS Postgres |
| **GCP** | Artifact Registry, GKE Autopilot light, Vertex skim |

DevOps practices: IaC awareness (Terraform *optional*), environments (dev/stage), secrets not in git.

## Docs-first mini task

**Title:** `ship-the-lab`

Requirements: “Any clone can bring stack up with documented commands; CI is green on main.”  
Technical: `infra/docker`, `infra/k8s`, `.github/workflows` or `Jenkinsfile`; runbook.

## Done when

- [ ] `docker compose up` runs API + DB  
- [ ] Manifests deploy API to local K8s  
- [ ] CI badge or screenshot of green pipeline  
- [ ] Cloud: image in registry **or** AI endpoint used from deployed-style config  

## Checklist link

Docker / Kubernetes / Jenkins / Git / Maven / Cloud / DevOps rows in [08-skills-checklist.md](./08-skills-checklist.md).

## Next

→ [05-phase4-distributed-systems.md](./05-phase4-distributed-systems.md)