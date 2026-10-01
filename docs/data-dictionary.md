# Data dictionary

Every dataset in this repository, with its status, source, coordinate system, processing status, intended use, and limitations.

## Web-ready datasets (`data/`)

### `april21.geojson`

| Field | Value |
|---|---|
| Format | GeoJSON |
| Geometry type | Polygon |
| Coordinate system | WGS 84 (EPSG:4326), longitude/latitude |
| Observation date | April 21, 2025 |
| Status | Historical GIS observation |
| Label | "April 21, 2025 observation" |
| Mapped area | 15.09 km² (calculated in UTM Zone 32N) |
| Source | User-supplied shapefile `april21.shp` (UTM Zone 32N) |
| Processing | Reprojected to WGS 84; self-intersections repaired; exported as GeoJSON |
| Intended use | Baseline water-extent observation on the dashboard timeline |
| Limitations | May contain permanent river water; do not treat the entire polygon as newly flooded land |

### `july15.geojson`

| Field | Value |
|---|---|
| Format | GeoJSON |
| Geometry type | MultiPolygon |
| Coordinate system | WGS 84 (EPSG:4326), longitude/latitude |
| Observation date | July 15, 2025 |
| Status | Historical GIS observation |
| Label | "July 15, 2025 observation" |
| Mapped area | 22.88 km² (calculated in UTM Zone 32N) |
| Source | User-supplied shapefile `juky15.shp` (UTM Zone 32N) — filename typo retained in source |
| Processing | Reprojected to WGS 84; self-intersections repaired; exported as GeoJSON |
| Intended use | Principal flooding observation on the dashboard timeline |
| Limitations | Classification accuracy not independently verified; no ground validation |

### `nov2.geojson`

| Field | Value |
|---|---|
| Format | GeoJSON |
| Geometry type | Polygon |
| Coordinate system | WGS 84 (EPSG:4326), longitude/latitude |
| Observation date | November 2, 2025 |
| Status | Historical GIS observation |
| Label | "November 2, 2025 observation" |
| Mapped area | 26.72 km² (calculated in UTM Zone 32N) |
| Source | User-supplied shapefile `nov2.shp` (UTM Zone 32N) |
| Processing | Reprojected to WGS 84; self-intersections repaired; exported as GeoJSON |
| Intended use | Post-flood observation on the dashboard timeline |
| Limitations | Water may remain elevated; permanent river water remains present year-round |

### `boundary.geojson`

| Field | Value |
|---|---|
| Format | GeoJSON |
| Geometry type | Polygon |
| Coordinate system | WGS 84 (EPSG:4326), longitude/latitude |
| Status | Supplied reference GIS data |
| Label | "Study-area boundary" |
| Source | User-supplied shapefile `Boundary.shp` (UTM Zone 32N) |
| Processing | Reprojected to WGS 84 |
| Intended use | Defines the area of interest for flood observation |
| Limitations | Boundary precision depends on source data |

### `towns.geojson`

| Field | Value |
|---|---|
| Format | GeoJSON |
| Geometry type | Point |
| Coordinate system | WGS 84 (EPSG:4326), longitude/latitude |
| Status | Supplied reference GIS data |
| Label | "Settlement locations" |
| Features | 4 settlements: Numai, Kpatakpoli, Atakpa, Lokoja |
| Source | User-supplied shapefile `Towns.shp` (UTM Zone 32N) |
| Processing | Reprojected to WGS 84 |
| Intended use | Settlement context on the map and in the statistics panel |
| Limitations | Not exhaustive — only the four supplied settlements |

### `exposed-buildings.geojson`

| Field | Value |
|---|---|
| Format | GeoJSON |
| Geometry type | Point (building centroids) |
| Coordinate system | WGS 84 (EPSG:4326), longitude/latitude |
| Status | Calculated screening result |
| Label | "Potentially exposed buildings" |
| Features | 2,293 building centroids |
| Attributes per feature | `osm_id`, `name`, `april21` (boolean), `july15` (boolean), `nov2` (boolean) |
| Source | User-supplied building shapefile `building.shp` (UTM Zone 32N) |
| Processing | Building-footprint centroids computed; centroid-in-polygon test against each flood layer |
| Intended use | Visualize potentially exposed buildings and drive the exposure statistics |
| Limitations | Centroid method — may miss buildings partially intersected by water when the centroid remains outside; may include structures whose centroid falls within permanent water. **Not confirmed damage.** |

### `summary.json`

| Field | Value |
|---|---|
| Format | JSON |
| Status | Calculated summary statistics |
| Source | User-supplied GIS layers processed in UTM Zone 32N |
| Contents | `source`, `method`, `events[]` with `id`, `date`, `status`, `area_km2`, `building_centroids_within`, `color` |
| Intended use | Drive the dashboard cards, comparison table and comparison chart at runtime |
| Limitations | Reflects the centroid method; not a verified damage count |

#### Summary contents

| id | date | status | area_km2 | building_centroids_within | color |
|---|---|---|---:|---:|---|
| april21 | April 21, 2025 | Pre-flood reference | 15.09 | 8 | #178b8b |
| july15 | July 15, 2025 | Flooding observation | 22.88 | 2,285 | #cf513d |
| nov2 | November 2, 2025 | Post-flood reference | 26.72 | 29 | #315f75 |

---

## Reference images (`images/`)

| File | Title | Source | Status |
|---|---|---|---|
| `april-21-2025.jpg` | Pre-flood reference — April 21, 2025 | User-supplied (originally `PRE-FLOOD 1PRIL 2025.jpg`) | Static reference output |
| `july-15-2025.jpg` | Flooding observation — July 15, 2025 | User-supplied (originally `FLOODING JULY 2025.jpg`) | Static reference output |
| `november-02-2025.jpg` | Post-flood observation — November 2, 2025 | User-supplied (originally `POST-FLOOD NOVEMBER 2025.jpg`) | Static reference output |
| `flood-events-2025.jpg` | 2025 flood events overview | User-supplied (originally `2025 FLOOD EVENTS.jpg`) | Static reference output |

Each image has a corrected human-readable title, observation date, descriptive alternative text, click-to-enlarge function, caption identifying it as a supplied static map, download button, and graceful fallback if the image fails to load.

The filename typo "1PRIL" is preserved in storage history by renaming to `april-21-2025.jpg`; the displayed caption always says "April".

---

## Source data (`source-data/`)

Original shapefile components retained for traceability. Each subfolder contains the complete shapefile set (`.shp`, `.shx`, `.dbf`, `.prj`, `.sbn`, `.sbx`, `.cpg`, `.shp.xml`) for the named layer.

| Path | Layer | Original filename |
|---|---|---|
| `source-data/flood/april/` | April 21 flood | `april21.*` |
| `source-data/flood/july/` | July 15 flood | `juky15.*` (typo retained) |
| `source-data/flood/november/` | November 2 flood | `nov2.*` |
| `source-data/buildings/` | Building footprints | `building.*` |
| `source-data/towns/` | Settlements | `Towns.*` |
| `source-data/boundary/` | Study-area boundary | `Boundary.*` |

---

## External services

| Service | Purpose | URL |
|---|---|---|
| OpenStreetMap tiles | Basemap | https://tile.openstreetmap.org/{z}/{x}/{y}.png |
| Open-Meteo | Current temperature, precipitation, humidity, weather code, 5-day forecast | https://api.open-meteo.com/v1/forecast |
| Leaflet 1.9.4 (CDN) | Mapping library | https://unpkg.com/leaflet@1.9.4/dist/leaflet.js |
| Fontshare (CDN) | Satoshi and JetBrains Mono web fonts | https://api.fontshare.com/v2/css |

All historical GIS data is stored within the repository so that results remain reproducible even if an external data service changes.
