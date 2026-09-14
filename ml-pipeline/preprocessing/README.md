# Preprocessing & NDVI

Turns raw MODIS/Sentinel-2 imagery into inference-ready, paired NDVI inputs.

- **Implements:** PB-03, PB-04 · UC-03 (Preprocess & Generate NDVI Inputs)
- **Steps:** cloud masking (mask invalid pixels without propagating NoData downstream),
  spatial alignment/co-registration of MODIS + Sentinel-2 onto a common **10 m grid**,
  resampling, NDVI computation with **range validation `[-1, 1]`**.
- **Quality gates (validate before model training depends on this):** alignment error
  < 1 pixel via pixel-level correlation checks on co-date pairs (risk R-06); reject
  inputs with major cloud cover; log quality metrics per run.
- **Output contract:** cloud-free, co-registered NDVI arrays consumed by
  `../model/` (training) and by `../../inference-service/` (runtime).
