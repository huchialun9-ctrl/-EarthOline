let worldMap = null;
let geoJsonLayer = null;
let countryLayers = {};
let selectedCountryCode = null;
let onCountrySelect = null;
let gameData = { onlineCounts: {}, countryGps: {} };
let restCountriesData = {};

const FACTION_COLORS = {
  asia: { fill: '#cc3333', border: '#ff6666' },
  americas: { fill: '#3366cc', border: '#6699ff' },
  europe: { fill: '#33aa33', border: '#66dd66' },
};

const COUNTRY_CODE_MAP = {
  'US': 'USA', 'CA': 'CAN', 'BR': 'BRA', 'GB': 'GBR', 'FR': 'FRA',
  'DE': 'DEU', 'IT': 'ITA', 'ES': 'ESP', 'RU': 'RUS', 'CN': 'CHN',
  'JP': 'JPN', 'KR': 'KOR', 'IN': 'IND', 'AU': 'AUS', 'ZA': 'ZAF',
  'EG': 'EGY', 'NG': 'NGA', 'TW': 'TWN', 'AR': 'ARG', 'MX': 'MEX',
  'SE': 'SWE', 'NO': 'NOR', 'PL': 'POL', 'UA': 'UKR', 'TR': 'TUR',
  'SA': 'SAU', 'ID': 'IDN', 'PH': 'PHL', 'VN': 'VNM', 'TH': 'THA',
};

function initWorldMap(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  worldMap = L.map(containerId, {
    center: [20, 0],
    zoom: 2,
    minZoom: 2,
    maxZoom: 6,
    zoomControl: false,
    attributionControl: false,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 6,
    noWrap: true,
  }).addTo(worldMap);

  L.control.zoom({ position: 'bottomright' }).addTo(worldMap);

  loadGeoJSON();
  fetchRestCountriesData();

  return worldMap;
}

function loadGeoJSON() {
  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
    .then(r => r.json())
    .then(topology => {
      const geojson = topojson.feature(topology, topology.objects.countries);
      geoJsonLayer = L.geoJSON(geojson, {
        style: defaultCountryStyle,
        onEachFeature: onEachFeature,
      }).addTo(worldMap);
    })
    .catch(e => {
      console.error('GeoJSON load error:', e);
    });
}

function defaultCountryStyle(feature) {
  const code3 = feature.id;
  const code2 = Object.keys(COUNTRY_CODE_MAP).find(k => COUNTRY_CODE_MAP[k] === code3);
  const faction = gameData.countryFaction ? gameData.countryFaction[code2] : null;
  const online = gameData.onlineCounts ? gameData.onlineCounts[code2] : 0;
  const intensity = Math.min(online / 20, 1);

  if (faction && FACTION_COLORS[faction]) {
    const c = FACTION_COLORS[faction];
    return {
      fillColor: c.fill,
      weight: 1,
      opacity: 0.6,
      color: c.border,
      fillOpacity: 0.3 + intensity * 0.4,
    };
  }

  return {
    fillColor: '#1a1a2e',
    weight: 0.5,
    opacity: 0.3,
    color: '#444466',
    fillOpacity: 0.2 + intensity * 0.3,
  };
}

function onEachFeature(feature, layer) {
  const code3 = feature.id;
  const code2 = Object.keys(COUNTRY_CODE_MAP).find(k => COUNTRY_CODE_MAP[k] === code3);

  countryLayers[code2 || code3] = layer;

  layer.on('click', () => {
    const country = getGameCountryData(code2 || code3);
    const restData = restCountriesData[code3];

    if (country) {
      selectedCountryCode = country.code;
      updateCountryPanel(country, restData);
      if (onCountrySelect) onCountrySelect(country);
    }
  });

  layer.on('mouseover', (e) => {
    layer.setStyle({ weight: 2, opacity: 1, fillOpacity: 0.5 });
    if (e.target.getElement) {
      e.target.getElement().style.cursor = 'pointer';
    }
  });

  layer.on('mouseout', () => {
    geoJsonLayer.resetStyle(layer);
  });

  const name = feature.properties && feature.properties.name;
  if (name && code2) {
    layer.bindTooltip(name, {
      sticky: true,

      direction: 'top',
    });
  }
}

function getGameCountryData(code2) {
  if (!gameData.countries) return null;
  return gameData.countries.find(c => c.code === code2) || null;
}

function updateCountryPanel(country, restData) {
  const online = gameData.onlineCounts[country.code] || 0;
  const gps = gameData.countryGps[country.code] || 0;
  const faction = gameData.countryFaction ? gameData.countryFaction[country.code] : null;

  document.getElementById('country-name').innerHTML = `
    ${restData ? `<img src="${restData.flag}" style="width:24px;height:16px;image-rendering:auto;vertical-align:middle;margin-right:6px;">` : ''}
    ${restData ? restData.name : (country.name_cn || country.name)}
  `;
  document.getElementById('country-online').textContent = online;
  document.getElementById('country-gps').textContent = formatGold(gps);
  document.getElementById('country-continent').textContent = getContinentName(country.continent);

  const deployBtn = document.getElementById('btn-deploy');
  if (deployBtn) deployBtn.style.display = 'block';

  const restInfo = document.getElementById('country-rest-info');
  if (restInfo && restData) {
    restInfo.innerHTML = `
      <div class="info-row"><span class="pixel-icon icon-building"></span> <span style="color:var(--text-dim);font-size:11px;">首都:</span> <span>${restData.capital || '-'}</span></div>
      <div class="info-row"><span class="pixel-icon icon-users"></span> <span style="color:var(--text-dim);font-size:11px;">人口:</span> <span>${restData.population ? Number(restData.population).toLocaleString() : '-'}</span></div>
      <div class="info-row"><span class="pixel-icon icon-coin"></span> <span style="color:var(--text-dim);font-size:11px;">GDP:</span> <span>${restData.gdp ? '$' + Number(restData.gdp).toLocaleString() : '-'}</span></div>
      <div class="info-row"><span class="pixel-icon icon-globe"></span> <span style="color:var(--text-dim);font-size:11px;">地區:</span> <span>${restData.region || '-'}</span></div>
    `;
    restInfo.style.display = '';
  } else if (restInfo) {
    restInfo.style.display = 'none';
  }

  if (faction && FACTION_COLORS[faction]) {
    document.getElementById('country-continent').style.color = FACTION_COLORS[faction].fill;
  } else {
    document.getElementById('country-continent').style.color = '';
  }
}

function fetchRestCountriesData() {
  const codes = Object.values(COUNTRY_CODE_MAP).join(',');
  fetch(`https://restcountries.com/v3.1/alpha?codes=${codes}`)
    .then(r => r.json())
    .then(data => {
      if (!Array.isArray(data)) return;
      data.forEach(c => {
        const code3 = c.cca3;
        restCountriesData[code3] = {
          name: c.name.common,
          capital: c.capital ? c.capital[0] : null,
          population: c.population,
          region: c.region,
          flag: c.flags ? (c.flags.svg || c.flags.png) : null,
          gdp: c.gini ? Object.values(c.gini)[0] : null,
        };
      });
      updateAllCountryPanels();
    })
    .catch(e => console.error('REST Countries error:', e));
}

function updateAllCountryPanels() {
  if (selectedCountryCode) {
    const country = getGameCountryData(selectedCountryCode);
    const code3 = COUNTRY_CODE_MAP[selectedCountryCode];
    const restData = restCountriesData[code3];
    if (country) updateCountryPanel(country, restData);
  }
}

function updateMapData(onlineCounts, countryGps, countryFaction) {
  gameData.onlineCounts = onlineCounts || {};
  gameData.countryGps = countryGps || {};
  gameData.countryFaction = countryFaction || {};

  for (const [code2, layer] of Object.entries(countryLayers)) {
    if (geoJsonLayer && layer) {
      geoJsonLayer.resetStyle(layer);
    }
  }

  if (selectedCountryCode) {
    const country = getGameCountryData(selectedCountryCode);
    const code3 = COUNTRY_CODE_MAP[selectedCountryCode];
    const restData = restCountriesData[code3];
    if (country) updateCountryPanel(country, restData);
  }
}

function setGameCountries(countries) {
  gameData.countries = countries;
  const gpsMap = {};
  const factionMap = {};
  countries.forEach(c => {
    gpsMap[c.code] = c.total_gold_per_sec || 0;
    factionMap[c.code] = c.continent;
  });
  gameData.countryGps = gpsMap;
}

function flyToCountry(code2) {
  const code3 = COUNTRY_CODE_MAP[code2];
  if (!code3) return;
  const layer = countryLayers[code2];
  if (layer) {
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      worldMap.flyToBounds(bounds, { padding: [50, 50], maxZoom: 4 });
    }
  }
}

function getContinentName(cont) {
  const names = { americas: '美洲', europe: '歐洲', asia: '亞洲', africa: '非洲', oceania: '大洋洲' };
  return names[cont] || cont || '-';
}
