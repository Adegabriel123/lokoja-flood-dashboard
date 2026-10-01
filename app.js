/* Lokoja 2025 Flood Event Viewer — application logic
 * State-driven dashboard: map, timeline, layer toggles, stats from summary.json,
 * comparison table + chart, weather (refresh + failure handling), gallery lightbox, downloads.
 * No figures are typed into the HTML; the JS reads summary.json so cards, table and map stay consistent.
 */
(() => {
  'use strict';

  // ---------- Configuration ----------
  const EVENTS = {
    april21: { file: './data/april21.geojson', date: 'April 21, 2025', short: 'Apr 21', label: 'Pre-flood reference', chartLabel: 'Apr 21',
      note: 'Pre-flood water observation. May contain permanent river water; do not treat the entire polygon as newly flooded land.',
      interpretation: 'Baseline water extent', color: '#178b8b' },
    july15:  { file: './data/july15.geojson',  date: 'July 15, 2025',  short: 'Jul 15', label: 'Flooding observation', chartLabel: 'Jul 15',
      note: 'Principal flooding observation. Mapped water / flood extent — the peak of the three supplied observations.',
      interpretation: 'Peak flood observation', color: '#cf513d' },
    nov2:    { file: './data/nov2.geojson',    date: 'November 2, 2025', short: 'Nov 2', label: 'Post-flood reference', chartLabel: 'Nov 2',
      note: 'Post-flood observation. Water may remain elevated; permanent river water remains present year-round.',
      interpretation: 'Recession observation', color: '#315f75' }
  };
  const ORDER = ['april21', 'july15', 'nov2'];

  const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast?latitude=7.80&longitude=6.73'
    + '&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m'
    + '&daily=precipitation_sum,precipitation_probability_max,weather_code'
    + '&forecast_days=5&timezone=Africa%2FLagos';
  const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes — matches existing README

  // ---------- State ----------
  const state = {
    selected: 'july15', // default to peak flooding observation per acceptance criteria
    layers: { flood: true, boundary: true, towns: true, buildings: true, basemap: true },
    map: null,
    floodLayer: null,
    exposedLayer: null,
    boundaryLayer: null,
    townsLayer: null,
    basemapLayer: null,
    summary: null,
    townsData: null,
    exposureData: null,
    eventData: {},
    weather: null,
    weatherTimer: null
  };

  // ---------- Utilities ----------
  const $  = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const escapeHTML = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmt = (n) => Number(n).toLocaleString('en-NG');
  const fmtArea = (n) => Number(n).toFixed(2);

  async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return res.json();
  }

  // Validate a parsed GeoJSON object minimally
  function isValidGeoJSON(obj) {
    if (!obj || typeof obj !== 'object') return false;
    if (obj.type !== 'FeatureCollection') return false;
    if (!Array.isArray(obj.features)) return false;
    return true;
  }

  // ---------- Theme ----------
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const button = $('[data-theme-toggle]');
    if (!button) return;
    const dark = theme === 'dark';
    button.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
    button.innerHTML = dark
      ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  // ---------- Map helpers ----------
  function townMarker(feature, latlng) {
    const marker = L.circleMarker(latlng, {
      radius: 5, color: '#f8faf9', weight: 2, fillColor: '#25312f', fillOpacity: 1
    });
    const name = escapeHTML(feature.properties.name || 'Settlement');
    const type = escapeHTML(feature.properties.type || 'Settlement');
    marker.bindTooltip(name, { permanent: true, direction: 'top', className: 'town-label', offset: [0, -6] });
    marker.bindPopup(`<strong>${name}</strong><br>Type: ${type}<br>Feature class: Settlement location<br>Relationship: inside the study-area boundary.`);
    return marker;
  }

  function eventSummary(id) {
    return state.summary.events.find(e => e.id === id);
  }

  function exposureFilter(feature) {
    return Boolean(feature.properties[state.selected]);
  }

  // ---------- Draw active flood + exposure layers ----------
  function drawEvent(fit = false) {
    const meta = EVENTS[state.selected];
    const summary = eventSummary(state.selected);
    if (!state.map || !summary) return;

    if (state.floodLayer) state.map.removeLayer(state.floodLayer);
    if (state.exposedLayer) state.map.removeLayer(state.exposedLayer);

    state.floodLayer = L.geoJSON(state.eventData[state.selected], {
      style: { color: meta.color, weight: 2, opacity: 1, fillColor: meta.color, fillOpacity: 0.48 },
      onEachFeature: (_, layer) => layer.bindPopup(
        `<strong>${escapeHTML(meta.date)}</strong><br>${escapeHTML(meta.label)}<br>`
        + `Mapped area: ${fmtArea(summary.area_km2)} km²<br>`
        + `Dataset status: Historical GIS observation<br>`
        + `Source: User-supplied shapefile, reprojected to WGS 84.<br>`
        + `<em>Historical — not a live flood feed.</em>`
      )
    });
    if (state.layers.flood) state.floodLayer.addTo(state.map);

    // Exposed buildings: only render if toggle is on AND layer enabled
    state.exposedLayer = L.geoJSON(state.exposureData, {
      filter: exposureFilter,
      pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
        radius: 2.6, color: '#6d4d00', weight: 0.7, fillColor: '#ff8a3d', fillOpacity: 0.88
      }),
      onEachFeature: (feature, layer) => {
        const label = feature.properties.name || `OSM building ${feature.properties.osm_id || 'unlabelled'}`;
        const dates = ORDER.filter(k => feature.properties[k]).map(k => EVENTS[k].short).join(', ');
        layer.bindPopup(
          `<strong>${escapeHTML(label)}</strong><br>`
          + `Exposure date(s): ${escapeHTML(dates)}<br>`
          + `Method: centroid-in-polygon screening<br>`
          + `Status: <em>potentially exposed — not confirmed damage.</em>`
        );
      }
    });
    if (state.layers.buildings) state.exposedLayer.addTo(state.map);

    updateMetrics();
    updateTimelineUI();
    updateMapOverlays();
    updateComparisonTable();
    updateComparisonChart();
    updateSRSummary();
    if (fit && state.floodLayer && state.layers.flood) {
      state.map.fitBounds(state.floodLayer.getBounds(), { padding: [30, 30] });
    }
  }

  // ---------- Metrics & timeline UI ----------
  function updateMetrics() {
    const meta = EVENTS[state.selected];
    const summary = eventSummary(state.selected);
    if (!summary) return;
    const idx = ORDER.indexOf(state.selected);

    $('#mapped-area').textContent = fmtArea(summary.area_km2);
    $('#building-count').textContent = fmt(summary.building_centroids_within);

    // Exposure rate (percentage of total mapped buildings)
    const totalBuildings = state.exposureData ? state.exposureData.features.length : 0;
    if (totalBuildings > 0) {
      const pct = (summary.building_centroids_within / totalBuildings) * 100;
      $('#exposure-rate').textContent = pct < 1 ? pct.toFixed(2) + '%' : pct.toFixed(1) + '%';
    } else {
      $('#exposure-rate').textContent = '—';
    }

    // Change from previous observation
    if (idx === 0) {
      $('#area-change').textContent = 'Baseline';
    } else {
      const prev = eventSummary(ORDER[idx - 1]);
      if (!prev || prev.area_km2 === 0) {
        $('#area-change').textContent = 'Not applicable';
      } else {
        const c = ((summary.area_km2 - prev.area_km2) / prev.area_km2) * 100;
        const sign = c > 0 ? '+' : '';
        $('#area-change').textContent = `${sign}${c.toFixed(1)}%`;
      }
    }

    $('#map-date').textContent = meta.date;
    $('#map-label').textContent = `${meta.label} · ${meta.interpretation}`;
    $('#map-status').style.background = meta.color;
    $('#map-status').style.boxShadow = `0 0 0 5px ${meta.color}2e`;
    $('#legend-flood').style.background = meta.color;
    $('#legend-flood-label').textContent = `${meta.short} mapped water`;
    $('#observation-note').textContent = meta.note;
    $('#event-counter').textContent = `${idx + 1} / 3`;
    $('#active-status').textContent = summary.status;

    // Stats section
    $('#settlement-count').textContent = state.townsData ? state.townsData.features.length : '—';
    $('#total-buildings').textContent = totalBuildings.toLocaleString('en-NG');

    // Peak event detection
    const peak = state.summary.events.reduce((a, b) => a.area_km2 > b.area_km2 ? a : b);
    $('#peak-event').textContent = EVENTS[peak.id].short;
  }

  function updateTimelineUI() {
    $$('[data-event]').forEach(btn => {
      const isActive = btn.dataset.event === state.selected;
      btn.setAttribute('aria-checked', String(isActive));
      btn.setAttribute('aria-pressed', String(isActive));
    });
  }

  function updateMapOverlays() {
    if (!state.map) return;
    state.floodLayer   && (state.layers.flood     ? state.floodLayer.addTo(state.map)     : state.map.removeLayer(state.floodLayer));
    state.boundaryLayer && (state.layers.boundary ? state.boundaryLayer.addTo(state.map)  : state.map.removeLayer(state.boundaryLayer));
    state.townsLayer   && (state.layers.towns     ? state.townsLayer.addTo(state.map)     : state.map.removeLayer(state.townsLayer));
    state.exposedLayer && (state.layers.buildings ? state.exposedLayer.addTo(state.map)   : state.map.removeLayer(state.exposedLayer));
    if (state.basemapLayer) {
      if (state.layers.basemap) state.map.addLayer(state.basemapLayer);
      else state.map.removeLayer(state.basemapLayer);
    }
  }

  // ---------- Comparison table ----------
  function updateComparisonTable() {
    const tbody = $('#comparison-body');
    if (!tbody || !state.summary) return;
    tbody.innerHTML = state.summary.events.map(e => {
      const isActive = e.id === state.selected ? 'active' : '';
      const meta = EVENTS[e.id];
      return `<tr class="${isActive}">
        <td><strong>${escapeHTML(meta.short)}</strong><br><span class="tag">${escapeHTML(e.status)}</span></td>
        <td class="num">${fmtArea(e.area_km2)}</td>
        <td class="num">${fmt(e.building_centroids_within)}</td>
        <td>${escapeHTML(meta.interpretation)}</td>
      </tr>`;
    }).join('');
  }

  // ---------- Comparison chart ----------
  function updateComparisonChart() {
    const chart = $('#comparison-chart');
    if (!chart || !state.summary) return;
    const events = state.summary.events;
    const maxArea = Math.max(...events.map(e => e.area_km2));
    const maxExp  = Math.max(...events.map(e => e.building_centroids_within));

    chart.innerHTML = events.map(e => {
      const meta = EVENTS[e.id];
      const areaH = (e.area_km2 / maxArea) * 100;
      const expH  = (e.building_centroids_within / maxExp) * 100;
      const activeClass = e.id === state.selected ? ' is-active' : '';
      return `<div class="chart-bar-group${activeClass}">
        <div class="chart-bar-stack">
          <div class="chart-bar area" style="height:${areaH}%" title="Mapped area: ${fmtArea(e.area_km2)} km²"></div>
          <div class="chart-bar exp"  style="height:${expH}%" title="Exposed buildings: ${fmt(e.building_centroids_within)}"></div>
        </div>
        <div class="chart-bar-value">${fmtArea(e.area_km2)} km²</div>
        <div class="chart-bar-value">${fmt(e.building_centroids_within)} bldg</div>
        <div class="chart-bar-label">${escapeHTML(meta.chartLabel)}</div>
      </div>`;
    }).join('') + `
      <div style="grid-column:1/-1" class="chart-legend">
        <span><i style="background:linear-gradient(180deg,var(--blue),color-mix(in oklab,var(--blue) 60%,var(--bg)))"></i> Mapped area (km²)</span>
        <span><i style="background:linear-gradient(180deg,var(--exposure),color-mix(in oklab,var(--exposure) 60%,var(--bg)))"></i> Exposed buildings</span>
      </div>`;
  }

  // ---------- Screen-reader summary ----------
  function updateSRSummary() {
    const meta = EVENTS[state.selected];
    const summary = eventSummary(state.selected);
    if (!summary || !state.exposureData) return;
    const el = $('#sr-summary');
    if (!el) return;
    el.textContent = `Observation ${meta.date}, ${meta.label}. Mapped water area ${fmtArea(summary.area_km2)} square kilometres. ${fmt(summary.building_centroids_within)} potentially exposed buildings out of ${state.exposureData.features.length.toLocaleString('en-NG')} mapped buildings.`;
  }

  // ---------- Initialize map & load all data ----------
  async function initMap() {
    try {
      const [summary, boundary, towns, exposure, ...events] = await Promise.all([
        fetchJSON('./data/summary.json'),
        fetchJSON('./data/boundary.geojson'),
        fetchJSON('./data/towns.geojson'),
        fetchJSON('./data/exposed-buildings.geojson'),
        ...ORDER.map(id => fetchJSON(EVENTS[id].file))
      ]);

      // Validate
      if (!summary || !Array.isArray(summary.events) || summary.events.length !== 3) {
        throw new Error('summary.json is missing the expected events array.');
      }
      [boundary, towns, exposure, ...events].forEach((d, i) => {
        if (!isValidGeoJSON(d)) throw new Error(`Invalid GeoJSON for dataset index ${i}`);
      });

      state.summary = summary;
      state.townsData = towns;
      state.exposureData = exposure;
      ORDER.forEach((key, i) => { state.eventData[key] = events[i]; });

      // Map setup
      state.map = L.map('map', { zoomControl: false, preferCanvas: true, minZoom: 10 }).setView([7.795, 6.762], 13);
      L.control.zoom({ position: 'topright' }).addTo(state.map);

      state.basemapLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
      }).addTo(state.map);

      state.boundaryLayer = L.geoJSON(boundary, {
        style: { color: '#596965', weight: 2, dashArray: '7 6', fillOpacity: 0 }
      });
      state.boundaryLayer.bindPopup('<strong>Study-area boundary</strong><br>Supplied reference GIS data.<br>Defines the area of interest for flood observation.');

      state.townsLayer = L.geoJSON(towns, { pointToLayer: townMarker });

      drawEvent(false);
      // Fit to boundary, not to flood, so all dates show consistent framing
      state.map.fitBounds(state.boundaryLayer.getBounds(), { padding: [20, 20] });
      $('#map-loading').hidden = true;
    } catch (error) {
      console.error('[initMap]', error);
      $('#map-loading').hidden = true;
      $('#map-error').hidden = false;
    }
  }

  // ---------- Weather ----------
  const weatherSymbol = (code) => {
    if (code === 0) return '☀';
    if ([1, 2, 3].includes(code)) return '◒';
    if ([45, 48].includes(code)) return '≋';
    if (code >= 51 && code <= 67) return '☂';
    if (code >= 80 && code <= 82) return '☔';
    if (code >= 95) return '⚡';
    return '·';
  };

  async function loadWeather() {
    const status = $('#weather-status');
    const refreshBtn = $('#weather-refresh');
    if (refreshBtn) { refreshBtn.disabled = true; refreshBtn.textContent = 'Refreshing…'; }

    try {
      const data = await fetchJSON(OPEN_METEO_URL);
      state.weather = data;
      const unit = data.current_units;

      $('#temperature').textContent   = `${Math.round(data.current.temperature_2m)}${unit.temperature_2m}`;
      $('#precipitation').textContent = `${Number(data.current.precipitation).toFixed(1)} ${unit.precipitation}`;
      $('#humidity').textContent      = `${Math.round(data.current.relative_humidity_2m)}${unit.relative_humidity_2m}`;
      $('#weather-code').textContent  = weatherSymbol(data.current.weather_code);

      const maxRain = Math.max(...data.daily.precipitation_sum, 1);
      $('#forecast').innerHTML = data.daily.time.map((date, i) => {
        const day = new Intl.DateTimeFormat('en-NG', { weekday: 'short', timeZone: 'Africa/Lagos' })
          .format(new Date(`${date}T12:00:00+01:00`));
        const rain = Number(data.daily.precipitation_sum[i]);
        const probability = data.daily.precipitation_probability_max[i] ?? 0;
        return `<div class="forecast-row">
          <span>${escapeHTML(day)}</span>
          <span class="forecast-track"><i style="width:${Math.max(3, (rain / maxRain) * 100)}%"></i></span>
          <span class="forecast-mm">${rain.toFixed(1)}mm</span>
          <span class="forecast-prob">${probability}%</span>
        </div>`;
      }).join('');

      const obsTime = new Date(data.current.time).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' });
      const retrievalTime = new Date().toLocaleTimeString('en-NG', { timeStyle: 'short', timeZone: 'Africa/Lagos' });
      $('#weather-updated').textContent = `Model observation: ${obsTime} · Retrieved: ${retrievalTime} · Open-Meteo`;

      status.className = 'live-chip online';
      status.innerHTML = '<i></i>Live weather connected';
    } catch (error) {
      console.error('[loadWeather]', error);
      status.className = 'live-chip error';
      status.innerHTML = '<i></i>Weather unavailable';
      // Keep historical map working — only update weather UI
      if (!state.weather) {
        $('#temperature').textContent   = 'Temporarily unavailable';
        $('#precipitation').textContent = 'Temporarily unavailable';
        $('#humidity').textContent      = 'Temporarily unavailable';
        $('#weather-code').textContent  = '—';
      }
      $('#forecast').innerHTML = '<p class="updated">Live weather could not be retrieved. The historical map remains available. Try the refresh button when you are back online.</p>';
      $('#weather-updated').textContent = 'Last attempt: ' + new Date().toLocaleTimeString('en-NG', { timeStyle: 'short', timeZone: 'Africa/Lagos' });
    } finally {
      if (refreshBtn) { refreshBtn.disabled = false; refreshBtn.textContent = 'Refresh weather now'; }
    }
  }

  // ---------- Gallery lightbox ----------
  function openLightbox(src, alt, caption) {
    const lb = $('#lightbox');
    const img = $('#lightbox-img');
    const cap = $('#lightbox-caption');
    img.src = src; img.alt = alt; cap.textContent = caption;
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    $('[data-close-lightbox]').focus();
  }
  function closeLightbox() {
    const lb = $('#lightbox');
    lb.hidden = true;
    document.body.style.overflow = '';
  }

  // ---------- Wire up DOM events ----------
  function bindEvents() {
    // Theme toggle
    $('[data-theme-toggle]').addEventListener('click', () => {
      setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    });

    // Timeline buttons
    $$('[data-event]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.selected = btn.dataset.event;
        drawEvent(false);
      });
    });

    // Layer toggles
    $$('[data-layer]').forEach(input => {
      input.addEventListener('change', () => {
        state.layers[input.dataset.layer] = input.checked;
        updateMapOverlays();
      });
    });

    // Fit map button
    $('#fit-map').addEventListener('click', () => {
      if (state.map && state.boundaryLayer) {
        state.map.fitBounds(state.boundaryLayer.getBounds(), { padding: [20, 20] });
      }
    });

    // Weather refresh
    $('#weather-refresh').addEventListener('click', loadWeather);

    // Gallery
    $$('[data-open-image]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.openImage;
        const map = {
          april:   { src: './images/april-21-2025.jpg',     alt: 'Pre-flood reference map of Lokoja, 21 April 2025.', cap: 'Pre-flood reference map — April 21, 2025. Supplied static cartographic output.' },
          july:    { src: './images/july-15-2025.jpg',      alt: 'Flooding reference map of Lokoja, 15 July 2025.',  cap: 'Flooding observation map — July 15, 2025. Supplied static cartographic output.' },
          november:{ src: './images/november-02-2025.jpg', alt: 'Post-flood reference map of Lokoja, 2 November 2025.', cap: 'Post-flood observation map — November 2, 2025. Supplied static cartographic output.' },
          events:  { src: './images/flood-events-2025.jpg', alt: 'Overview of 2025 flood events for Lokoja.', cap: '2025 flood events overview — supplied static cartographic output combining all three observations.' }
        }[key];
        if (map) openLightbox(map.src, map.alt, map.cap);
      });
    });
    $('[data-close-lightbox]').addEventListener('click', closeLightbox);
    $('#lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox') closeLightbox(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('#lightbox').hidden) closeLightbox();
    });

    // Image fallback for missing thumbnails
    $$('img').forEach(img => {
      img.addEventListener('error', () => {
        img.style.background = 'var(--surface-offset)';
        img.alt = 'Image could not be loaded. See the source repository for the original file.';
      });
    });
  }

  // ---------- Boot ----------
  document.addEventListener('DOMContentLoaded', () => {
    setTheme(matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    bindEvents();
    initMap();
    loadWeather();
    state.weatherTimer = setInterval(loadWeather, REFRESH_INTERVAL_MS);
  });
})();
