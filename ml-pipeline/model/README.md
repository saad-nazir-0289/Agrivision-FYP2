# Fusion Model

Deep learning spatiotemporal fusion model: trained offline on historical MODIS↔Sentinel-2
NDVI pairs, deployed as a **frozen** checkpoint (no runtime retraining).

- **Implements:** PB-05, PB-06 · UC-04 (Run Pre-trained Model Inference)
- **Architecture: proposed - `architectures/agrivision_stfnet/`.** A hybrid CNN +
  residual + multiscale + single-transformer-block + CBAM encoder-decoder, checked
  block-by-block against the project's own PRISMA SLR (`docs/PRISMA_SLR.xlsx`). See
  [`architectures/agrivision_stfnet/README.md`](architectures/agrivision_stfnet/README.md)
  for the full literature-grounded rationale and cost analysis, and
  [`../notebooks/01-agrivision-stfnet-outline.ipynb`](../notebooks/01-agrivision-stfnet-outline.ipynb)
  for the runnable code outline (shapes + parameter counts verified on dummy tensors -
  **not yet trained**, no dataset/training loop exists yet). SDS §3.1.5 still treats the
  model as a replaceable component, so this remains open to revision once real data and
  a training loop exist - put any alternative architecture experiments in their own
  `architectures/<name>/` subfolder alongside this one.
- `training/` - training loop, data loaders/callbacks, hyperparameter configs.
- `checkpoints/` - **gitignored.** Store trained weights externally (object storage or
  release artifacts) and reference by version; never commit large binaries here.
- **Acceptance target (SRS release criteria):** R² ≥ 0.80, RMSE < 0.10 against held-out
  Sentinel-2 ground truth. If unmet, the documented fallback is the classical baseline as
  primary inference method (risk R-03) - that's a valid, reportable academic outcome, not
  a failure state.
