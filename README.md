# shortwave.sbs

Modern dark-themed shortwave broadcast schedule explorer.

shortwave.sbs is a lightweight static web app for browsing live shortwave broadcast schedules.

It uses imported schedule data and displays current on-air broadcasts, HF band activity, best DX targets, automatic band recommendations, and live broadcast insights.

## Features

- Dark responsive UI
- Live UTC clock
- On-air filtering
- HF band activity overview
- Auto Band recommendation
- Best DX targets
- Live snapshot statistics
- Station detail modal
- Source filters for EiBi, AOKI and HFCC
- Static JSON data model
- No backend required
- Cloudflare Pages friendly

## Current data source

Current version uses EiBi schedule database.

Planned / supported sources:

- EiBi
- HFCC
- AOKI

Raw schedule files are manually downloaded into sources/ and converted into a unified JSON structure.

## Project structure

    shortwave-sbs/
    ├─ index.html
    ├─ style.css
    ├─ app.js
    ├─ data/
    │  └─ schedules.json
    ├─ sources/
    │  └─ eibi.csv
    └─ tools/
       └─ import-eibi.js

## Updating schedules

Place the EiBi CSV file into:

    sources/eibi.csv

Then run:

    node .\tools\import-eibi.js

This generates:

    data/schedules.json

The frontend automatically displays the latest update timestamp from generatedAt.

## Local development

Run a local static server:

    python -m http.server 8080

Open:

    http://localhost:8080

## Deployment

The site is designed for static hosting.

Recommended platform:

- Cloudflare Pages

Recommended Cloudflare Pages settings:

    Framework preset: None
    Build command: exit 0
    Build output directory: /
    Root directory: /
    Production branch: main

## Planned features

- AOKI importer
- HFCC importer
- Geolocation-aware DX targets
- Greyline awareness
- HF propagation insights
- Solar / geomagnetic data
- Smart Auto Band logic
- DX weather layer
- Receiver integrations

## Author

Developed in Finland 🇫🇮 by Janne Heinikangas

GitHub: https://github.com/fmatic

Blog: https://fmatic.online

![VadelmaDZ](/logo/vadelmadx.png)