# Lokoja Flood Event Viewer

A static, GitHub-Pages-ready dashboard combining user-supplied 2025 GIS observations for Lokoja with current weather-model data from Open-Meteo.

## What is live

- Current temperature, precipitation, humidity, and a five-day precipitation forecast are requested from Open-Meteo when the page loads and every 30 minutes.
- The OpenStreetMap basemap is loaded online.

## What is historical

- `april21.geojson`, `july15.geojson`, and `nov2.geojson` are dated GIS observations supplied with the assignment.
- They do not update automatically and are not an official warning feed.
- Building exposure values are screening estimates based on whether each building-footprint centroid falls inside a mapped polygon; they are not confirmed damage figures.

## Files

```text
index.html
style.css
app.js
data/
  april21.geojson
  july15.geojson
  nov2.geojson
  boundary.geojson
  towns.geojson
  exposed-buildings.geojson
  summary.json
```

## Publish on GitHub Pages

1. Upload all files and the `data` folder to the repository root.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select `main` and `/(root)`, then save.
5. Open `https://YOUR-USERNAME.github.io/lokoja-flood-dashboard/` after deployment finishes.

## Local testing

Do not double-click `index.html`, because browser security may block local GeoJSON requests. In this folder run:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Method

The original flood polygons were read from their complete shapefiles, reprojected from WGS 84 / UTM Zone 32N to WGS 84 longitude/latitude, repaired where self-intersections existed, and exported as GeoJSON. Mapped polygon areas were calculated in UTM Zone 32N. Only exposed-building centroids are included in the web package to keep it responsive.
