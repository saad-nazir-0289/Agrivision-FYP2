# Data Acquisition

Retrieves MODIS and Sentinel-2 image collections from Google Earth Engine for a given
AOI polygon and date range, and records retrieval status/metadata.

- **Implements:** PB-01, PB-02 · UC-01 (Select Date and Region), UC-02 (Retrieve
  Multi-Sensor Imagery)
- **Key requirement:** handle GEE rate limits / missing data gracefully (see risk R-01 -
  pre-download a representative patch set as a local fallback).
- **Output contract:** raw image collection + metadata (sensor, acquisition date, cloud
  cover, GEE asset ID) consumed by `../preprocessing/`.
