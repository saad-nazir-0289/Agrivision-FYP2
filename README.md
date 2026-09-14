# AgriVision - AI-Powered Crop Health Monitoring

Final Year Project (BS-CS), Group S26CS007, University of Central Punjab.
Product Owner: Dr. M. Umair. Team: Muhammad Raafay (Scrum Master / Data Preprocessing),
Muhammad Saad Nazir (Backend / Deep Learning Lead), Areeba Najam (Integration & Cloud / Visualizations Lead).

## What this is

AgriVision fuses MODIS (daily, 250 m) and Sentinel-2 (10–20 m, 5–7 day revisit) NDVI imagery
with a deep learning spatiotemporal fusion model to produce synthetic, Sentinel-2-quality NDVI
maps on dates where only coarse MODIS data is available - closing the temporal gaps that
monsoon cloud cover creates over Punjab's growing seasons. Outputs are served through a
MERN dashboard with role-based views for farmers, government/planning users, and admins,
including NDVI maps, historical trend charts, generic rule-based crop-stress alerts, and
exportable evaluation reports (RMSE, R², SSIM, PSNR vs. classical fusion baselines).

Full requirements and design are in [`docs/`](docs/) - see [`docs/README.md`](docs/README.md)
for an index, and [`PROJECT_STATUS.md`](PROJECT_STATUS.md) for where the project currently
stands and what's next.

## Stack

| Layer | Technology |
|---|---|
| Data acquisition & preprocessing | Python, Google Earth Engine (GEE) |
| Model training & evaluation | Python (TensorFlow/Keras), GPU (Colab Pro / Kaggle) |
| Inference service | Python REST API, Dockerized, deployed on Hugging Face Inference Endpoint |
| Backend | Node.js, Express.js, MongoDB, JWT auth |
| Frontend | React |
| Hosting | Frontend: Vercel/Netlify · Backend: Render/Railway · DB: MongoDB Atlas |

## Repository layout

```
AgriVision/
├── docs/                 SRS (Phase 1) + SDS (Phase 2) documents and extracted diagrams
├── ml-pipeline/          GEE data acquisition, preprocessing/NDVI, model, evaluation
├── inference-service/    Dockerized REST wrapper around the frozen model checkpoint
├── backend/              Node/Express API (auth, AOIs, requests, results, alerts, reports)
├── frontend/             React dashboard
└── PROJECT_STATUS.md     Current status, gaps, and next steps
```

Each subfolder has its own README describing what belongs there and which SRS/SDS
requirements it implements (e.g. `PB-01`, `UC-04`, `US-06`) so implementation stays traceable
back to the spec.

## Status

📋 **Planning & design complete (Phase 1 SRS + Phase 2 SDS). No implementation yet.**
See [`PROJECT_STATUS.md`](PROJECT_STATUS.md) for details and the recommended next steps.
