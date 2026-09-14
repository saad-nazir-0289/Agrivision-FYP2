# Evaluation

Quantitative benchmarking of the fusion model against classical baselines.

- **Implements:** PB-07, PB-08, PB-09 · UC-05 (Evaluate Reconstruction Quality)
- **Metrics:** RMSE, R², SSIM, PSNR - computed against held-out Sentinel-2 reference
  imagery, for both the DL model and classical baselines (STARFM, Fit-FC, FSDAF).
- **Correctness gate (risk R-08):** assert spatial extent and date metadata match between
  prediction and reference arrays *before* computing any metric - misaligned arrays
  produce misleadingly favorable results. Include manual pixel-level spot-checks.
- **Output:** comparison tables + visual difference maps, consumed by the Report module
  in the backend (`../../backend/`) for export as CSV/PDF.
