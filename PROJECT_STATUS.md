# Project Status

_Last reviewed: 2026-08-23_

## Where we are

Two planning/design documents exist and both are substantively complete. **No code has
been written yet** - the repository (before this restructure) contained only the two
`.docx` deliverables.

### ✅ Phase 1 - SRS (`docs/01-SRS-phase1.docx`), v1.0

- Problem statement, proposed DL fusion solution, target users, objectives (O-1…O-4)
- Stakeholder analysis (farmers, researchers, government, system operator, advisor)
- 5 epics (EP-01…EP-05), 16-item product backlog (PB-01…PB-16)
- 10 user stories with acceptance criteria and story points (US-01…US-10, 54 points total)
- 10 use cases (UC-01…UC-10)
- Non-functional requirements (reliability, performance, usability, security,
  maintainability, traceability, scalability)
- Risk register - 9 risks (R-01…R-09) with likelihood/impact/mitigation
- 16-sprint plan (2 weeks each, ~32 weeks), release criteria, references, glossary

### ✅ Phase 2 - SDS (`docs/02-SDS-phase2.docx`), v2.0

- Layered architecture with a **complete architecture diagram**
  (extracted to `docs/diagrams/architecture-diagram.png`)
- Component overview, module decomposition (8 modules), data flow (10 steps)
- **Complete ER diagram + schema** (`docs/diagrams/schema-erd.png`,
  `docs/diagrams/er-diagram-raw.png`) - 12 entities: User, Role, AOI, SatelliteRequest,
  SatelliteImageMetadata, PreprocessingRun, ModelRun, NDVIResult, EvaluationMetric,
  Alert, Report, SystemLog
- **Full REST API design** - ~30 endpoints across auth, users/roles, AOIs, satellite
  requests, processing/inference, NDVI results, alerts, reports, evaluations, logs
- **High-fidelity UI mockups**, not just wireframes - dashboard home is done in detail
  (`docs/diagrams/ui-dashboard-mockup.png`); signup, NDVI map, alerts, and trends screens
  are also designed (still inside the docx - extract on demand if needed)
- 20-case test design (TC-01…TC-20)
- Deployment plan: Vercel/Netlify (frontend), Render/Railway (backend),
  Hugging Face Inference Endpoint (model), MongoDB (data)
- Future enhancements noted but deferred: AI chatbot, multilingual voice support

### ⚠️ Notable open decisions / things to reconcile

- **Model architecture: proposed, not yet trained.** A hybrid CNN + residual + multiscale
  + single-transformer-block + CBAM design (`ml-pipeline/model/architectures/agrivision_stfnet/`)
  has been checked block-by-block against `docs/PRISMA_SLR.xlsx` and outlined as runnable
  code in `ml-pipeline/notebooks/01-agrivision-stfnet-outline.ipynb` (shapes/param counts
  verified on dummy tensors, ~1.78M params). No dataset, training loop, or checkpoint
  exists yet - Phase 2 still treats the inference service as a replaceable module, so this
  stays open to revision once real data is flowing.
- **Roles were consolidated between phases.** Phase 1 defined Farmer / Researcher /
  Government as separate user groups; Phase 2's implementation design collapses this to
  **Farmer / Planner-Government / Admin**, with the "researcher" workflow (evaluation
  metrics, exports) folded into Admin rather than being a distinct front-end role. Build
  against the Phase 2 version - it's the one with the API/schema behind it.
- **Sprint dates vs. actual progress**: the SRS sprint plan runs Sprint 1 in "Jan 2026"
  through Sprint 16 around mid-2026 assuming continuous execution, and the SDS revision
  is dated "June 2026" - but based on repository contents, no data acquisition, model,
  or app code exists yet. Treat the sprint *numbers/goals* as the plan to execute, not
  as a record of what's already been done.
- Tracking artifacts (Kanban board snapshot, IV&V defect log, SDP meeting log in the
  appendices) are empty templates - fine, just don't mistake them for a done backlog.

## What's next

The design is solid enough to start building directly against it. Suggested order,
following the team's own sprint plan and risk register (R-01…R-03 flag data/model risk
as the biggest unknowns, so front-load them):

1. **Stand up the ML data pipeline first** (`ml-pipeline/data_acquisition`,
   `ml-pipeline/preprocessing`) - GEE access, AOI + date-range retrieval for MODIS and
   Sentinel-2 (PB-01, PB-02), cloud masking/alignment/NDVI computation (PB-03, PB-04).
   This is the critical path and the biggest project risk (R-01, R-02) - get real data
   flowing before anything else depends on it.
2. **Validate preprocessing outputs** before touching the model (alignment error,
   NDVI range checks) - cheap to fix now, expensive to debug after training starts.
3. **Implement and train `agrivision_stfnet`** (proposed architecture, see
   `ml-pipeline/model/architectures/agrivision_stfnet/README.md`) against real
   preprocessed data, and implement classical baselines (STARFM/Fit-FC/FSDAF per the
   glossary) in parallel for fair benchmarking.
4. **Train and checkpoint the model**, build the evaluation module (RMSE/R²/SSIM/PSNR)
   against held-out Sentinel-2 references (PB-08, PB-09).
5. **Wrap the frozen checkpoint in the inference service** (`inference-service/`) -
   the API contract for this is already defined in the SDS, so it can be built as soon
   as a checkpoint exists, even a weak first-pass one.
6. **Build the MERN backend in parallel with step 1–2** (`backend/`) - the schema and
   REST API are already fully specified, so backend scaffolding, auth/RBAC, and DB
   models don't need to wait on the ML side at all.
7. **Build the React frontend** against the existing mockups (`frontend/`) - dashboard
   home, NDVI map, alerts, and trends views are already designed.
8. **Wire in the alert engine, run the 20-case test suite (SDS §8), then deploy**
   per the plan in SDS §10.

Practical recommendation: since backend/frontend scaffolding has zero dependency on the
ML pipeline being finished, it's worth working the MERN side and the data/model side
**concurrently** rather than sequentially - that was implicitly the team's own plan
(Raafay on data/preprocessing, Saad on backend/DL, Areeba on integration/viz).

Also worth doing soon, low effort: `git init` this repo (currently not a git repo) and
push to the GitHub repository mentioned in the SRS/SDS version-control section, so the
work is tracked from the first commit.
