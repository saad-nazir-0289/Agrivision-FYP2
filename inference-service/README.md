# Inference Service

Dockerized Python REST API that wraps the frozen model checkpoint (`../ml-pipeline/model/checkpoints/`).
Accepts a preprocessed NDVI payload and returns a synthetic high-resolution NDVI map - no
training or retraining happens here.

- **Implements:** UC-04 (Run Pre-trained Model Inference)
- **Contract (per SDS API design):** `POST /api/inference` - input `preprocessingRunId`
  + optional `modelVersion`; output `modelRunId` + status. Backing detail lives in the
  `ModelRun` entity (checkpointPath, architectureType, modelVersion, inferenceDate).
- **Performance target:** return a synthetic NDVI map within 5 s for a 10 km × 10 km AOI
  on a GPU-enabled instance.
- **Reliability:** deterministic output for identical input + checkpoint (needed for
  reproducibility); reject malformed input with HTTP 400 and a descriptive error, never a
  crash.
- **Deployment target:** Hugging Face Inference Endpoint (per SDS §10). Communicates with
  the Node.js backend (`../backend/`) as a plain HTTP service on a fixed internal port
  (risk R-07 - no shared runtime required between Python and Node).
