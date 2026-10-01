(() => {
  'use strict';

  const EVENTS = {
    april21: { file: './data/april21.geojson', date: 'April 21, 2025', label: 'Pre-flood reference', color: '#178b8b' },
    july15: { file: './data/july15.geojson', date: 'July 15, 2025', label: 'Flooding observation', color: '#cf513d' },
    nov2: { file: './data/nov2.geojson', date: 'November 2, 2025', label: 'Post-flood reference', color: '#315f75' }
  };
  const state = { selected: 'april21', map: null, eventLayer: null, exposedLayer: null, boundaryLayer: null, summary: null, eventData: {}, exposureData: null };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const escapeHTML = (value) => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const button = $('[data-theme-toggle]');
    const dark = theme === 'dark';
    button.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
    button.innerHTML = dark
      ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    return response.json();
  }

  function markerForTown(feature, latlng) {
    const marker = L.circleMarker(latlng, { radius: 5, color: '#f8faf9', weight: 2, fillColor: '#25312f', fillOpacity: 1 });
    const name = escapeHTML(feature.properties.name);
    marker.bindTooltip(name, { permanent: true, direction: 'top', className: 'town-label', offset: [0, -6] });
    return marker;
  }

  function eventSummary(id) {
    return state.summary.events.find(event => event.id === id);
  }

  function exposureFilter(feature) {
    return Boolean(feature.properties[state.selected]);
  }

  function drawEvent(fit = false) {
    const meta = EVENTS[state.selected];
    const summary = eventSummary(state.selected);
    if (state.eventLayer) state.map.removeLayer(state.eventLayer);
    if (state.exposedLayer) state.map.removeLayer(state.exposedLayer);

    state.eventLayer = L.geoJSON(state.eventData[state.selected], {
      style: { color: meta.color, weight: 2, opacity: 1, fillColor: meta.color, fillOpacity: 0.48 },
      onEachFeature: (_, layer) => layer.bindPopup(`<strong>${escapeHTML(meta.date)}</strong><br>${escapeHTML(meta.label)}<br>Mapped extent: ${summary.area_km2.toFixed(2)} km²`)
    }).addTo(state.map);

    state.exposedLayer = L.geoJSON(state.exposureData, {
      filter: exposureFilter,
      pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius: 2.6, color: '#6d4d00', weight: 0.7, fillColor: '#ffb11f', fillOpacity: 0.88 }),
      onEachFeature: (feature, layer) => {
        const label = feature.properties.name || `OSM building ${feature.properties.osm_id || 'unlabelled'}`;
        layer.bindPopup(`<strong>${escapeHTML(label)}</strong><br>Building centroid within selected extent`);
      }
    }).addTo(state.map);

    $('#mapped-area').textContent = summary.area_km2.toFixed(2);
    $('#building-count').textContent = summary.building_centroids_within.toLocaleString('en-NG');
    $('#map-date').textContent = meta.date;
    $('#map-label').textContent = meta.label;
    $('#map-status').style.background = meta.color;
    $('#map-status').style.boxShadow = `0 0 0 5px ${meta.color}2e`;
    $('#legend-flood').style.background = meta.color;
    $('#event-counter').textContent = `${Object.keys(EVENTS).indexOf(state.selected) + 1} / 3`;
    $$('[data-event]').forEach(button => button.setAttribute('aria-checked', String(button.dataset.event === state.selected)));
    if (fit) state.map.fitBounds(state.eventLayer.getBounds(), { padding: [30, 30] });
  }

  async function initMap() {
    try {
      const [summary, boundary, towns, exposure, ...events] = await Promise.all([
        fetchJSON('./data/summary.json'), fetchJSON('./data/boundary.geojson'), fetchJSON('./data/towns.geojson'), fetchJSON('./data/exposed-buildings.geojson'),
        ...Object.values(EVENTS).map(event => fetchJSON(event.file))
      ]);
      state.summary = summary;
      state.exposureData = exposure;
      Object.keys(EVENTS).forEach((key, index) => { state.eventData[key] = events[index]; });

      state.map = L.map('map', { zoomControl: false, preferCanvas: true, minZoom: 10 }).setView([7.795, 6.762], 13);
      L.control.zoom({ position: 'topright' }).addTo(state.map);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
      }).addTo(state.map);
      state.boundaryLayer = L.geoJSON(boundary, { style: { color: '#596965', weight: 2, dashArray: '7 6', fillOpacity: 0 } }).addTo(state.map);
      L.geoJSON(towns, { pointToLayer: markerForTown }).addTo(state.map);
      drawEvent(false);
      state.map.fitBounds(state.boundaryLayer.getBounds(), { padding: [20, 20] });
      $('#map-loading').hidden = true;
    } catch (error) {
      console.error(error);
      $('#map-loading').hidden = true;
      $('#map-error').hidden = false;
    }
  }

  const weatherSymbol = code => {
    if (code === 0) return '☀';
    if ([1,2,3].includes(code)) return '◒';
    if ([45,48].includes(code)) return '≋';
    if (code >= 51 && code <= 67) return '☂';
    if (code >= 80 && code <= 82) return '☔';
    if (code >= 95) return '⚡';
    return '·';
  };

  async function loadWeather() {
    const status = $('#weather-status');
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=7.80&longitude=6.73&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m&daily=precipitation_sum,precipitation_probability_max,weather_code&forecast_days=5&timezone=Africa%2FLagos';
    try {
      const data = await fetchJSON(url);
      const unit = data.current_units;
      $('#temperature').textContent = `${Math.round(data.current.temperature_2m)}${unit.temperature_2m}`;
      $('#precipitation').textContent = `${Number(data.current.precipitation).toFixed(1)} ${unit.precipitation}`;
      $('#humidity').textContent = `${Math.round(data.current.relative_humidity_2m)}${unit.relative_humidity_2m}`;
      $('#weather-code').textContent = weatherSymbol(data.current.weather_code);
      const maxRain = Math.max(...data.daily.precipitation_sum, 1);
      $('#forecast').innerHTML = data.daily.time.map((date, i) => {
        const day = new Intl.DateTimeFormat('en-NG', { weekday: 'short', timeZone: 'Africa/Lagos' }).format(new Date(`${date}T12:00:00+01:00`));
        const rain = Number(data.daily.precipitation_sum[i]);
        const probability = data.daily.precipitation_probability_max[i] ?? 0;
        return `<div class="forecast-row"><span>${escapeHTML(day)}</span><span class="forecast-track"><i style="width:${Math.max(3,(rain/maxRain)*100)}%"></i></span><span class="forecast-mm">${rain.toFixed(1)}mm</span><span class="forecast-prob">${probability}%</span></div>`;
      }).join('');
      $('#weather-updated').textContent = `Model conditions for ${new Date(data.current.time).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })} · Open-Meteo`;
      status.className = 'live-chip online';
      status.innerHTML = '<i></i>Live weather connected';
    } catch (error) {
      console.error(error);
      status.className = 'live-chip error';
      status.innerHTML = '<i></i>Weather unavailable';
      $('#forecast').innerHTML = '<p class="updated">Live weather could not be retrieved. The historical map remains available.</p>';
      $('#weather-updated').textContent = 'Try refreshing when an internet connection is available.';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTheme(matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    $('[data-theme-toggle]').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
    $$('[data-event]').forEach(button => button.addEventListener('click', () => { state.selected = button.dataset.event; drawEvent(false); }));
    $('#fit-map').addEventListener('click', () => state.map && state.map.fitBounds(state.boundaryLayer.getBounds(), { padding: [20, 20] }));
    initMap();
    loadWeather();
    setInterval(loadWeather, 30 * 60 * 1000);
  });
})();
