const mapInfo = document.getElementById("mapInfo");
const mapTitle = document.getElementById("mapTitle");
const mapBandSwitcher = document.getElementById("mapBandSwitcher");

const bandOrder = [
  "120m", "90m", "75m", "60m",
  "49m", "41m", "31m", "25m",
  "22m", "19m", "16m", "13m", "11m"
];

const params = new URLSearchParams(location.search);
let selectedBand = params.get("band") || "all";

let allSchedules = [];
let markerLayer = null;

const map = L.map("txMap", {
  worldCopyJump: true
}).setView([35, 20], 2);

L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution: "&copy; OpenStreetMap &copy; CARTO",
  subdomains: "abcd",
  maxZoom: 19
}).addTo(map);

function utcMinutesNow() {
  const now = new Date();
  return now.getUTCHours() * 60 + now.getUTCMinutes();
}

function timeToMinutes(value) {
  if (!value) return null;

  let v = String(value).trim();

  if (v === "2400") return 1440;
  if (v.length < 4) v = v.padStart(4, "0");

  const h = Number(v.slice(0, 2));
  const m = Number(v.slice(2, 4));

  if (Number.isNaN(h) || Number.isNaN(m)) return null;

  return h * 60 + m;
}

function isOnAir(item) {
  const now = utcMinutesNow();
  const start = timeToMinutes(item.start);
  const end = timeToMinutes(item.end);

  if (start === null || end === null) return false;

  if (start === end) return true;
  if (start < end) return now >= start && now < end;

  return now >= start || now < end;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getSiteKey(item) {
  return [
    item.txLat,
    item.txLon,
    item.txSite || item.txCode || "Unknown"
  ].join("|");
}

function formatSiteName(item) {
  return item.txSite || item.txCode || "Unknown transmitter site";
}

function buildBandSwitcher() {
  const bands = ["all", ...bandOrder];

  mapBandSwitcher.innerHTML = bands.map(band => `
    <button
      class="map-band-btn ${band === selectedBand ? "active" : ""}"
      type="button"
      data-band="${escapeHtml(band)}">
      ${band === "all" ? "Show all" : escapeHtml(band)}
    </button>
  `).join("");

  [...mapBandSwitcher.querySelectorAll(".map-band-btn")].forEach(btn => {
    btn.addEventListener("click", () => {
      selectedBand = btn.dataset.band || "all";

      const url = selectedBand === "all"
        ? "map.html"
        : `map.html?band=${encodeURIComponent(selectedBand)}`;

      history.replaceState(null, "", url);

      buildBandSwitcher();
      renderMap();
    });
  });
}

function buildPopup(site) {
  const active = site.items.filter(isOnAir);
  const shown = active.length ? active : site.items.slice(0, 8);

  return `
    <div class="tx-popup">
      <strong>${escapeHtml(site.name)}</strong>
      <small>
        ${escapeHtml(site.country || "—")} ·
        ${site.lat.toFixed(4)}, ${site.lon.toFixed(4)}
      </small>
      <small>
        ${active.length} active now · ${site.items.length} total schedules
      </small>

      <ul>
        ${shown.slice(0, 10).map(item => `
          <li>
            <b>${escapeHtml(item.freq)} kHz</b>
            ${escapeHtml(item.station || "Unknown")}
            <small>
              ${escapeHtml(item.start || "----")}–${escapeHtml(item.end || "----")}
              · ${escapeHtml(item.band || "—")}
              · ${escapeHtml(item.source)}
            </small>
          </li>
        `).join("")}
      </ul>
    </div>
  `;
}

function getFilteredSchedules() {
  return allSchedules.filter(item => {
    if (!item.txLat || !item.txLon) return false;
    if (!isOnAir(item)) return false;

    if (selectedBand !== "all" && item.band !== selectedBand) {
      return false;
    }

    return true;
  });
}

function buildSites(items) {
  const sites = new Map();

  for (const item of items) {
    const lat = Number(item.txLat);
    const lon = Number(item.txLon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const key = getSiteKey(item);

    if (!sites.has(key)) {
      sites.set(key, {
        name: formatSiteName(item),
        country: item.txCountry || item.country || "",
        lat,
        lon,
        items: []
      });
    }

    sites.get(key).items.push(item);
  }

  return sites;
}

function renderMap() {
  if (markerLayer) {
    markerLayer.remove();
  }

  markerLayer = L.layerGroup().addTo(map);

  const filtered = getFilteredSchedules();
  const sites = buildSites(filtered);

  for (const site of sites.values()) {
    const activeCount = site.items.filter(isOnAir).length;

    const marker = L.circleMarker([site.lat, site.lon], {
      radius: Math.min(10, 4 + activeCount * 0.7),
      weight: 1,
      color: "#5eead4",
      fillColor: "#5eead4",
      fillOpacity: 0.72
    });

    marker.bindPopup(buildPopup(site), {
      maxWidth: 360
    });

    marker.addTo(markerLayer);
  }

  const label = selectedBand === "all" ? "All active bands" : `${selectedBand} band`;

  mapTitle.textContent = selectedBand === "all"
    ? "shortwave.sbs TX Map"
    : `shortwave.sbs ${selectedBand} TX Map`;

  mapInfo.textContent = `${label} · ${sites.size} transmitter sites · ${filtered.length} active broadcasts`;
}

async function loadMap() {
  const res = await fetch("data/schedules.json");
  const data = await res.json();

  allSchedules = data.schedules || [];

  buildBandSwitcher();
  renderMap();
}

loadMap().catch(err => {
  console.error(err);
  mapInfo.textContent = "Could not load transmitter map";
});