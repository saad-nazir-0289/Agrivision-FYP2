# Documents Index

| File | Version | What it is |
|---|---|---|
| [`01-SRS-phase1.docx`](01-SRS-phase1.docx) | 1.0, Jan 2026 | Software Requirements Specification - problem, objectives, backlog, user stories, use cases, NFRs, risks, sprint plan |
| [`02-SDS-phase2.docx`](02-SDS-phase2.docx) | 2.0, June 2026 | Agile Software Design Specification - architecture, module design, ERD/schema, API design, UI mockups, test design, deployment plan |

## Extracted diagrams

The SDS embeds its diagrams as images inside the `.docx`. The most load-bearing ones are
pulled out here as PNGs for quick reference without opening Word - the `.docx` remains
the source of truth and has more (class/sequence diagrams, full screen set, wireframes).

- [`diagrams/architecture-diagram.png`](diagrams/architecture-diagram.png) - full layered
  system architecture (presentation → backend → geospatial processing / ML inference →
  data → external GEE)
- [`diagrams/schema-erd.png`](diagrams/schema-erd.png) - clean entity-relationship schema
  (12 entities, PK/FK annotated)
- [`diagrams/er-diagram-raw.png`](diagrams/er-diagram-raw.png) - the fuller ER diagram
  variant with all attributes spelled out
- [`diagrams/ui-dashboard-mockup.png`](diagrams/ui-dashboard-mockup.png) - high-fidelity
  dashboard home mockup (the SDS also designs signup, NDVI map, alerts, and trends
  screens - extract those from the `.docx` media if/when needed)

## Reading order

Read the SRS first for *why* and *what* (requirements, backlog, use cases), then the SDS
for *how* (architecture, schema, API, UI). See [`../PROJECT_STATUS.md`](../PROJECT_STATUS.md)
for a distilled status summary and a couple of decisions the SDS made that revise the SRS
(role model, mainly).
