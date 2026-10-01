# Lokoja 2025 Flood Event Viewer

> **Historical flood mapping and exposure analysis supported by live meteorological information.**

A static, GitHub-Pages-ready geospatial dashboard comparing three supplied 2025 flood or water-extent observations for Lokoja, Kogi State — at the confluence of the Niger and Benue rivers — together with a study-area boundary, settlement locations, building-exposure screening, reference cartographic outputs and current weather-model information.

The system distinguishes **historical geospatial observations** from **live weather data** and is designed as a research and decision-support prototype rather than an official emergency-warning platform.

---

## Public deployment

- **Repository:** https://github.com/Adegabriel123/lokoja-flood-dashboard
- **Live page:** https://adegabriel123.github.io/lokoja-flood-dashboard/

---

## What is live

- Current temperature, precipitation, humidity, weather condition, and a five-day precipitation forecast are retrieved from the [Open-Meteo](https://open-meteo.com/) API for Lokoja (latitude 7.80, longitude 6.73, timezone Africa/Lagos) when the page loads and every 30 minutes.
- The OpenStreetMap basemap is loaded online.
- A manual **Refresh weather** button and a "last updated" timestamp are exposed.

## What is historical

- `april21.geojson`, `july15.geojson`, and `nov2.geojson` are dated GIS observations supplied with the assignment.
- They do **not** update automatically and are **not** an official warning feed.
- Building exposure values are screening estimates based on whether each building-footprint centroid falls inside a mapped polygon; they are **not** confirmed damage figures.

## Data-status disclaimer (visible on the dashboard)

> Flood extents are dated GIS observations supplied for this research project. Current weather information is obtained separately from an online weather service. Building exposure represents spatial screening and not confirmed structural damage. This dashboard is not an official emergency-warning system.

---

## Repository structure

```text
lokoja-flood-dashboard/
├── index.html              # Semantic structure, controls, panels, explanatory text
├── style.css               # Layout, colours, responsive behaviour, accessibility, dark mode
├── app.js                  # Map setup, data loading, timeline, statistics, weather
├── .nojekyll               # Prevents unnecessary Jekyll processing on GitHub Pages
├── README.md               # Methodology, data sources, limitations, deployment
├── data/
│   ├── april21.geojson     # April 21, 2025 — Pre-flood reference
│   ├── july15.geojson      # July 15, 2025 — Flooding observation
│   ├── nov2.geojson        # November 2, 2025 — Post-flood reference
│   ├── boundary.geojson    # Study-area boundary
│   ├── towns.geojson       # Settlement locations
│   ├── exposed-buildings.geojson  # Centroid screening result
│   └── summary.json        # Mapped areas, exposure counts, statuses
├── images/
│   ├── april-21-2025.jpg          # Pre-flood reference map
│   ├── july-15-2025.jpg           # Flooding observation map
│   ├── november-02-2025.jpg       # Post-flood reference map
│   └── flood-events-2025.jpg      # Combined overview
├── source-data/            # Original shapefiles (geometry, attributes, projection, metadata)
│   ├── flood/{april, july, november}/
│   ├── buildings/
│   ├── towns/
│   └── boundary/
└── docs/
    ├── methodology.md      # Detailed methodology
    └── data-dictionary.md  # Dataset descriptions, statuses, sources
```

---

## Publish on GitHub Pages

1. Upload all files and folders (including `data/`, `images/`, `source-data/`, `docs/`, `.nojekyll`) to the repository root.
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

---

## Method (summary)

The original flood polygons were read from their complete shapefile datasets (`.shp`, `.shx`, `.dbf`, `.prj`, `.sbn`, `. `.sbx`, `.cpg`, `.shp.xml`), checked for their coordinate-reference information (WGS 84 / UTM Zone 32N), reprojected to WGS 84 longitude/latitude for web display, repaired where self-intersections existed, and exported as GeoJSON. Mapped polygon areas were calculated in UTM Zone 32N and stored as summary attributes in `data/summary.json` — the browser does **not** recompute area from longitude/latitude. Only exposed-building centroids are included in the web package to keep the interface responsive; the original full building-footprint shapefile is retained in `source-data/buildings/`.

Building exposure uses the **centroid-in-polygon** method:

```
E(i, t) = 1 if centroid of building i lies inside flood polygon at time t, else 0
N(t)    = Σ E(i, t)
```

The displayed label is always **"Potentially exposed buildings"** — never "destroyed", "damaged" or "victims". No damage survey or field verification is identified in the repository.

See `docs/methodology.md` for the full methodology and `docs/data-dictionary.md` for the dataset dictionary.

---

## Data classification

Every dataset is assigned a clear status:

| Information | Status | Required label |
|---|---|---|
| April flood polygon | Historical GIS observation | "April 21, 2025 observation" |
| July flood polygon | Historical GIS observation | "July 15, 2025 observation" |
| November flood polygon | Historical GIS observation | "November 2, 2025 observation" |
| Building footprints | Supplied reference GIS data | "Building-footprint dataset" |
| Exposed buildings | Calculated screening result | "Potentially exposed buildings" |
| Town locations | Supplied reference GIS data | "Settlement locations" |
| Boundary | Supplied reference GIS data | "Study-area boundary" |
| Temperature | Current model/API value | "Current weather-model temperature" |
| Precipitation | Current model/API value | "Current precipitation estimate" |
| Five-day outlook | Forecast | "Weather-model forecast" |
| JPG maps | Static reference outputs | "Supplied reference maps" |
| OpenStreetMap | Online basemap | "OpenStreetMap basemap" |

The words **observed**, **calculated**, **forecast**, and **confirmed** are not used interchangeably.

---

## Filename correction

The source July files use `juky15`, which appears to be a typographical error. The source files are retained under their original names in `source-data/flood/july/` for traceability, but the processed web layer consistently uses `july15.geojson`. The application code, documentation and displayed labels all use "July".

The image filename typo "1PRIL" is preserved in storage history by renaming to `april-21-2025.jpg` — every HTML and JavaScript reference has been updated in the same commit.

---

## Limitations

- Unknown classification accuracy unless documented by the lecturer.
- Unknown ground-validation status.
- Potential differences in satellite acquisition conditions across the three dates.
- Possibility of permanent water being included in the baseline polygon.
- Building-footprint completeness depends on the supplied dataset.
- Positional uncertainty between building and flood layers.
- Weather-model uncertainty — Open-Meteo provides model output, not station observation.
- Absence of verified river-gauge information.
- Absence of an official emergency-warning feed.

---

## Suggested academic description

> The Lokoja Flood Event Viewer is a static web-based geospatial dashboard developed to compare supplied flood or water-extent observations for April 21, July 15 and November 2, 2025. The application combines the dated observations with a study-area boundary, settlement locations, building-exposure screening, reference cartographic outputs and current weather-model information. Source shapefiles are retained for traceability, while processed WGS 84 GeoJSON files are used for browser visualization. Potential building exposure is estimated using a centroid-in-polygon procedure and does not represent confirmed structural damage. The system distinguishes historical geospatial observations from live weather data and is designed as a research and decision-support prototype rather than an official emergency-warning platform.

---

## Attribution

- **Flood extents, boundary, settlements, building footprints:** user-supplied GIS data, 2025.
- **Weather:** [Open-Meteo](https://open-meteo.com/) — model output, not station observation.
- **Basemap:** © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
- **Mapping library:** [Leaflet 1.9.4](https://leafletjs.com/).
- **Typography:** Satoshi and JetBrains Mono via Fontshare.
