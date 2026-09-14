# ML Pipeline

Python side of AgriVision: retrieves MODIS/Sentinel-2 imagery, preprocesses it into
paired NDVI training data, trains and evaluates the spatiotemporal fusion model. Runs
offline (GPU, e.g. Colab Pro / Kaggle) - the deployed system only ever runs *inference*
against a frozen checkpoint (see `../inference-service/`).

Maps to SRS epics **EP-01** (Data Acquisition & Preprocessing), **EP-02** (Model
Inference), **EP-03** (Model Evaluation & Benchmarking).

| Folder | Purpose | Backlog / Use cases |
|---|---|---|
| `data_acquisition/` | GEE queries for MODIS + Sentinel-2 by AOI + date range | PB-01, PB-02 · UC-01, UC-02 |
| `preprocessing/` | Cloud masking, spatial alignment/resampling to a common 10 m grid, NDVI computation + range validation `[-1, 1]` | PB-03, PB-04 · UC-03 |
| `model/` | Fusion model - proposed architecture (`agrivision_stfnet`: CNN + residual + multiscale + transformer + CBAM), training scripts, checkpoints kept out of source control | PB-05, PB-06 · UC-04 |
| `evaluation/` | RMSE, R², SSIM, PSNR vs. classical baselines (STARFM, Fit-FC, FSDAF) on held-out Sentinel-2 | PB-07, PB-08, PB-09 · UC-05 |
| `notebooks/` | Exploratory analysis, not production code | - |

`model/checkpoints/` is gitignored - trained weights are large binaries and should be
versioned separately (object storage / release artifacts / Git LFS), per the
maintainability requirement that checkpoints are swappable without redeploying the app.
