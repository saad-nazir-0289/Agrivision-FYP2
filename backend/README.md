# Backend (Node.js / Express / MongoDB)

MERN backend: authentication + RBAC, AOI management, orchestrates satellite
requests/preprocessing/inference runs, serves NDVI results, alerts, and reports.

- **Implements:** EP-05 (Web Dashboard & Visualization, backend half) · US-01–US-10
  (all of them touch the backend in some way - see SDS §2 "Mapping Design to User
  Stories" for the full table)
- **Roles (confirmed in Phase 2, supersedes the SRS's 3-role split):** `Farmer`,
  `Planner/Government User`, `Admin`. Admin absorbs what the SRS called the
  "Researcher" workflow (evaluation metrics, exports).
- **Auth:** JWT, OAuth-capable, 30-minute inactivity session expiry, RBAC enforced per
  route.
- **Deployment target:** Render or Railway. DB: MongoDB (Atlas).

## Suggested folder use

- `src/models/` - Mongoose schemas for the 12 entities in the ERD: `User`, `Role`,
  `AOI`, `SatelliteRequest`, `SatelliteImageMetadata`, `PreprocessingRun`, `ModelRun`,
  `NDVIResult`, `EvaluationMetric`, `Alert`, `Report`, `SystemLog`
  (see `../docs/diagrams/schema-erd.png`).
- `src/routes/` + `src/controllers/` - one pair per API group below.
- `src/middleware/` - JWT verification, RBAC guard, request validation.
- `src/config/` - env-based config (DB URI, JWT secret, GEE tokens, inference service
  URL) - **never hardcode credentials**, per the SRS security NFR.

## API design (from SDS §6 - build directly against this)

| Group | Endpoint | Method |
|---|---|---|
| Auth | `/api/auth/register` | POST |
| Auth | `/api/auth/login` | POST |
| Auth | `/api/auth/me` | GET |
| Auth | `/api/auth/logout` | POST |
| Users & Roles | `/api/users` | GET |
| Users & Roles | `/api/users/:userId` | GET |
| Users & Roles | `/api/users/:userId/role` | PATCH |
| Users & Roles | `/api/users/:userId/status` | PATCH |
| Users & Roles | `/api/roles` | GET |
| AOI | `/api/aois` | POST / GET |
| AOI | `/api/aois/:aoiId` | GET / PATCH / DELETE |
| Satellite Requests | `/api/satellite-requests` | POST / GET |
| Satellite Requests | `/api/satellite-requests/:requestId` | GET |
| Satellite Requests | `/api/satellite-requests/:requestId/status` | GET |
| Processing/Inference | `/api/processing/:requestId/preprocess` | POST |
| Processing/Inference | `/api/inference` | POST |
| Processing/Inference | `/api/model-runs` | GET |
| Processing/Inference | `/api/model-runs/:modelRunId` | GET |
| NDVI Results | `/api/ndvi-results` | GET |
| NDVI Results | `/api/ndvi-results/:resultId` | GET |
| NDVI Results | `/api/ndvi-results/:resultId/map` | GET |
| NDVI Results | `/api/ndvi-results/:resultId/download` | GET |
| Alerts | `/api/alerts` | GET |
| Alerts | `/api/alerts/:alertId` | GET |
| Alerts | `/api/alerts/:alertId/acknowledge` | PATCH |
| Alerts | `/api/admin/alert-rules` | GET / PATCH |
| Reports | `/api/reports` | POST / GET |
| Reports | `/api/reports/:reportId` | GET |
| Reports | `/api/reports/:reportId/download` | GET |
| Evaluation | `/api/evaluations` | POST / GET |
| Evaluation | `/api/evaluations/:evaluationId` | GET |
| Logs | `/api/logs` | GET |
| Logs | `/api/logs/:logId` | GET |

Full input/output payloads per endpoint are in `../docs/02-SDS-phase2.docx` §6.
