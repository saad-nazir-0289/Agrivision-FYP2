# Frontend (React)

Role-based dashboard for Farmers, Planner/Government users, and Admins.

- **Implements:** EP-05 (Web Dashboard & Visualization, frontend half) · UC-06 (Alerts),
  UC-07 (NDVI Map View), UC-08 (Historical Trends), UC-09 (Export), UC-10 (Auth)
- **Usability requirement:** interpretable by non-specialist users (farmers) - standard
  vegetation-index color convention (red = severe stress, yellow = moderate, green =
  healthy); every alert must carry a visible disclaimer that it's a generic NDVI anomaly,
  not a diagnosis.
- **Deployment target:** Vercel or Netlify.

## Screens already designed (SDS §"UI/UX Design")

High-fidelity mockups exist for: Signup, Dashboard/Homepage, NDVI Maps page, Alerts page,
Trends page. The dashboard homepage mockup is extracted at
`../docs/diagrams/ui-dashboard-mockup.png` for quick reference - it shows the intended
layout: current NDVI status card, latest alert card, 30-day NDVI trend sparkline, AOI map
with NDVI color overlay, and an NDVI color-scale legend. Pull the remaining screens from
`../docs/02-SDS-phase2.docx` as they're implemented.

## Suggested folder use

- `src/pages/` - one per screen (Signup, Dashboard, NDVIMap, Alerts, Trends, Reports…)
- `src/components/` - shared pieces (NDVI legend, map viewer, alert card, trend chart)
- `src/services/` - API client wrapping the backend endpoints in `../backend/README.md`
- `src/assets/` - logo, imagery, static assets
