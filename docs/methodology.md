# Methodology

This document expands on the methodology summary in the repository `README.md`. It is intended to be defensible during academic assessment and reproducible by another GIS analyst given the source files.

## 1. Data preparation

### 1.1 Source preservation

A shapefile is not just the `.shp` file. Geometry, indexing, attributes, coordinate-system information, and optional metadata are distributed across files with the same base name. The repository therefore retains every component for each source dataset under `source-data/`:

- `.shp` — geometry
- `.shx` — spatial index
- `.dbf` — attribute table
- `.prj` — coordinate-reference-system definition
- `.sbn`, `.sbx` — spatial index (Esri)
- `.cpg` — character encoding
- `.shp.xml` — Esri metadata

Original filenames are preserved for traceability, including the `juky15` typo for the July flood layer. The processed web layer uses the corrected name `july15.geojson`.

### 1.2 Coordinate reference system

The original layers were supplied in **WGS 84 / UTM Zone 32N** (EPSG:32632), which is appropriate for area calculation in this region. For browser visualization in Leaflet, all web-facing GeoJSON layers were transformed to **WGS 84 geographic coordinates** (EPSG:4326):

- Coordinates are stored as `[longitude, latitude]` (longitude first).
- Values around Lokoja fall in the expected Nigerian geographic range (≈ 6.72° – 6.81° E, ≈ 7.75° – 7.84° N).
- Projected UTM coordinates are **never** passed directly into Leaflet as latitude and longitude.

### 1.3 Geometry validation

All flood polygons were checked for:

- Self-intersections
- Empty geometries
- Invalid rings
- Duplicate polygons
- Unclosed polygon rings
- Geometry collections
- Features outside the study area
- Excessive coordinate precision
- Unexpected overlaps between multipart features

Invalid geometry was repaired before area calculation and building-intersection analysis. The current README reports that self-intersections were repaired during processing.

### 1.4 Area calculation

Area is **not** recomputed in the browser from unprojected longitude/latitude coordinates. Areas were calculated in UTM Zone 32N and stored as summary attributes in `data/summary.json`. The JavaScript reads these values at runtime so the cards, table and chart remain internally consistent.

### 1.5 Web-ready export

The browser never interprets the source shapefiles directly. It loads:

```text
data/april21.geojson
data/july15.geojson
data/nov2.geojson
data/boundary.geojson
data/towns.geojson
data/exposed-buildings.geojson
data/summary.json
```

---

## 2. Flood comparison

The dashboard compares three dated spatial observations and does **not** continuously monitor flood boundaries. Each polygon is presented as a historical snapshot:

| Observation | Date | Interpretation |
|---|---|---|
| April 21 | 2025-04-21 | Baseline water extent. May contain permanent river water. Do not treat the entire polygon as newly flooded land. |
| July 15  | 2025-07-15 | Principal flooding observation. Mapped water / flood extent. |
| November 2 | 2025-11-02 | Post-flood observation. Water may remain elevated; permanent river water remains present year-round. |

### 2.1 Derived products (future work)

Where future work requires newly flooded land, the defensible operation is:

```
Potential inundation (July) = July mapped water − April baseline water
```

This result represents areas mapped as water in July that were not mapped as water in April. It is still called **potential** inundation because classification errors, differing acquisition conditions, and imperfect spatial alignment may affect the result.

A similar recession product can be calculated as:

```
Receded area = July mapped water − November mapped water
```

The dashboard does not display these derived products unless they have actually been calculated and saved.

---

## 3. Building-exposure screening

### 3.1 Method

Building exposure uses the **centroid-in-polygon** method:

```
E(i, t) = 1 if the centroid of building i lies inside the flood polygon at time t, else 0
N(t)    = Σ E(i, t) for all buildings i
```

The exposed-building count for date `t` is the sum of `E(i, t)` across all buildings.

### 3.2 Advantages

- Straightforward to explain.
- Faster than calculating polygon intersection for every building.
- Less sensitive to minor boundary contact.
- Appropriate for preliminary screening.
- Suitable for a static student dashboard.

### 3.3 Limitations

The centroid method can miss:

- Buildings partially intersected by water when the centroid remains outside.
- Long or irregular structures crossing the flood boundary.
- Small spatial-alignment errors between building and flood layers.
- Differences between mapped roof footprints and actual occupied structures.

It can also include structures whose centroid lies within a polygon even if the source polygon represents permanent water or classification noise.

### 3.4 Required wording

The dashboard uses **"Potentially exposed buildings"**. It does not use:

- Destroyed buildings
- Damaged buildings
- Flood victims
- Confirmed affected households

No damage survey or field verification is identified in the repository.

### 3.5 Recommended future improvement

The system should offer two exposure measures in future work:

1. **Centroid exposure** — building centroid lies within the flood polygon.
2. **Intersection exposure** — any part of the building footprint intersects the flood polygon.

For the current assignment, the centroid method remains the official dashboard statistic because it is already documented. The methodology panel explains it.

---

## 4. Weather integration

Current temperature, precipitation, humidity, weather code, and a five-day precipitation forecast are retrieved from the Open-Meteo API for Lokoja (latitude 7.80, longitude 6.73, timezone Africa/Lagos).

- **Refresh interval:** the request fires on page load and every 30 minutes.
- **Manual refresh:** a button is exposed in the weather panel.
- **Last updated:** a timestamp distinguishes observation time from browser retrieval time.
- **Loading state:** the panel shows a skeleton while the request is in flight.
- **Offline state:** if the weather service cannot be reached, historical GIS layers continue working, weather cards display "Temporarily unavailable", previous values are not presented as current without a timestamp, raw technical errors are written only to the developer console, and the interface does not become blank.

Weather is retrieved independently and is **never** used to redraw the historical flood polygons.

---

## 5. Map interface

### 5.1 Timeline control

Three clearly labelled controls — `Apr 21`, `Jul 15`, `Nov 2` — are presented as a segmented radiogroup. Selecting a date simultaneously updates:

- Active flood layer
- Map legend
- Observation label
- Flood-area statistic
- Potentially exposed-building count
- Change from the previous observation
- Methodology note
- Screen-reader live region

The active date uses `aria-checked`, `aria-pressed`, an outline, and a background change — not just colour.

### 5.2 Layer controls

Users can show or hide:

- Study boundary
- Settlement locations
- Potentially exposed buildings
- Flood extent
- OpenStreetMap basemap

The complete building dataset does **not** load automatically on mobile devices. The web package displays exposed-building centroids only, while retaining the original building shapefile in `source-data/buildings/`.

### 5.3 Feature popups

- **Settlement popups** show settlement name, feature type, and relationship to the study area.
- **Flood-feature popups** show observation date, dataset status, polygon area, source description, and a warning that it is historical.
- **Building popups** show building identifier, exposure date(s), method used to determine exposure, and a screening-status disclaimer.

---

## 6. Statistical dashboard

The selected observation displays:

- Mapped water/flood area in square kilometres.
- Number of potentially exposed buildings.
- Percentage of mapped buildings potentially exposed.
- Change in mapped area from the preceding date.
- Number of settlements in the study area.
- Dataset date and processing status.

A comparison table and a comparison bar chart display the three dates side by side. **No figures are typed manually into the HTML.** The JavaScript reads `data/summary.json` so the cards, table, chart and map remain internally consistent.

### 6.1 Derived percentages

If `summary.json` provides total buildings and exposed buildings, the exposure percentage is:

```
P(t) = (N(t) / N_total) × 100
```

If the total building count is unavailable or refers only to a subset, the percentage is omitted rather than estimated. In this dashboard the total is the count of features in `exposed-buildings.geojson` (2,293), so the percentage is meaningful.

### 6.2 Change calculation

The percentage change between two non-zero observations is:

```
C = (A₂ − A₁) / A₁ × 100
```

Where the earlier area is zero or missing, the dashboard displays "Not applicable" rather than dividing by zero.

---

## 7. Performance strategy

The building dataset is the greatest likely performance risk. The dashboard therefore:

1. Keeps the original `building.*` shapefile components in `source-data/buildings/`.
2. Uses the precomputed `exposed-buildings.geojson` for the default map.
3. Loads the exposed-building layer only after the main flood map is ready (via `Promise.all`).
4. Allows users to switch the building layer off.
5. Simplifies geometries only for visualization, not for authoritative analysis.
6. Stores statistical results in `summary.json`.
7. Avoids recalculating thousands of spatial intersections in the browser.
8. Caches successfully loaded static files through normal browser behaviour.
9. Uses `preferCanvas: true` for fast point rendering of 2,293 building centroids.
10. Tested on a mobile connection as well as desktop broadband.

---

## 8. Accessibility

- One clear page-level heading.
- Keyboard-accessible controls; visible focus indicators.
- Proper `<button>` elements instead of clickable text.
- `aria-pressed` and `aria-checked` for timeline selections.
- Alternative text for every reference map.
- Labels that do not depend exclusively on colour.
- Sufficient text contrast.
- Reduced-motion support.
- Skip-to-map and skip-to-statistics links.
- A textual summary of map results (live region) for users who cannot interpret the visual map.
- Light and dark modes via the `prefers-color-scheme` media query and a manual toggle.
