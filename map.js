console.log("map.js loaded v0.5.3.4");
const mapInfo = document.getElementById("mapInfo");
const mapTitle = document.getElementById("mapTitle");
const mapBandSwitcher = document.getElementById("mapBandSwitcher");

const bandOrder = [
    "120m", "90m", "75m", "60m",
    "49m", "41m", "31m", "25m",
    "22m", "19m", "16m", "13m", "11m"
];

const bandColors = {
    "120m": "#60a5fa",
    "90m": "#818cf8",
    "75m": "#a78bfa",
    "60m": "#c084fc",
    "49m": "#5eead4",
    "41m": "#34d399",
    "31m": "#facc15",
    "25m": "#fb923c",
    "22m": "#f97316",
    "19m": "#f43f5e",
    "16m": "#ec4899",
    "13m": "#d946ef",
    "11m": "#e879f9",
    all: "#5eead4"
};

function getBandColor(band) {
    return bandColors[band] || bandColors.all;
}

const params = new URLSearchParams(location.search);
let selectedBand = params.get("band") || "all";

let allSchedules = [];
let markerLayer = null;
let terminatorLayer = null;

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
    if (!value)
        return null;

    let v = String(value).trim();

    if (v === "2400")
        return 1440;
    if (v.length < 4)
        v = v.padStart(4, "0");

    const h = Number(v.slice(0, 2));
    const m = Number(v.slice(2, 4));

    if (Number.isNaN(h) || Number.isNaN(m))
        return null;

    return h * 60 + m;
}

function isOnAir(item) {
    const now = utcMinutesNow();
    const start = timeToMinutes(item.start);
    const end = timeToMinutes(item.end);

    if (start === null || end === null)
        return false;

    if (start === end)
        return true;
    if (start < end)
        return now >= start && now < end;

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
    if (!mapBandSwitcher)
        return;

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
        if (!item.txLat || !item.txLon)
            return false;
        if (!isOnAir(item))
            return false;

        if (selectedBand !== "all" && item.band !== selectedBand) {
            return false;
        }

        return true;
    });
}

const regionTargetMap = {
    "Northern Europe": ["Eu", "NEu", "WEu", "EEu"],
    "Central Europe": ["Eu", "WEu", "CEu", "EEu"],

    "North America": ["NAm", "USA", "CAN"],
    "South America": ["SAm", "BRA", "ARG"],

    "East Asia": ["EAs", "FE", "CHN", "J", "KOR"],
    "Oceania": ["Oc", "AUS", "NZL"]
};

function getCurrentRegion() {
    return localStorage.getItem("swRegion") || "Northern Europe";
}

function isTargetingCurrentRegion(item) {
    const region = getCurrentRegion();

    const targets = regionTargetMap[region] || [];
    const targetText = String(item.target || "");

    return targets.some(code =>
        targetText.includes(code));
}

function buildSites(items) {
    const sites = new Map();

    for (const item of items) {
        const lat = Number(item.txLat);
        const lon = Number(item.txLon);

        if (!Number.isFinite(lat) || !Number.isFinite(lon))
            continue;

        const key = getSiteKey(item);

        if (!sites.has(key)) {
            sites.set(key, {
                name: formatSiteName(item),
                country: item.txCountry || item.country || "",
                lat,
                lon,
                items: [],
                bandCounts: {},
                mainBand: item.band || "all"
            });
        }

        const site = sites.get(key);
        site.items.push(item);

        if (item.band) {
            site.bandCounts[item.band] = (site.bandCounts[item.band] || 0) + 1;

            site.mainBand = Object.entries(site.bandCounts)
                .sort((a, b) => b[1] - a[1])[0][0];
        }

        continue;

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
        const activeItems = site.items.filter(isOnAir);
        const activeCount = activeItems.length;
        const targetingRegion = activeItems.some(isTargetingCurrentRegion);

        const marker = L.circleMarker([site.lat, site.lon], {
            radius: Math.min(10, 4 + activeCount * 0.7),
            weight: targetingRegion ? 2 : 1,

            color: getBandColor(
                selectedBand === "all"
                 ? site.mainBand
                 : selectedBand),

            fillColor: getBandColor(
                selectedBand === "all"
                 ? site.mainBand
                 : selectedBand),

            fillOpacity: 0.72,
            dashArray: targetingRegion ? null : "2 6"
        });

        marker.bindPopup(buildPopup(site), {
            maxWidth: 360
        });

        marker.addTo(markerLayer);
    }

    markerLayer.eachLayer(layer => {
        if (layer.bringToFront) {
            layer.bringToFront();
        }
    });

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

