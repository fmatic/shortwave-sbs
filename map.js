const mapInfo = document.getElementById("mapInfo");

const map = L.map("txMap", {
  worldCopyJump: true
}).setView([35, 20], 2);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 12,
  attribution: "&copy; OpenStreetMap contributors"
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
            <small>${escapeHtml(item.start || "----")}–${escapeHtml(item.end || "----")} · ${escapeHtml(item.source)}</small>
          </li>
        `).join("")}
      </ul>
    </div>
  `;
}

async function loadMap() {
  const res = await fetch("data/schedules.json");
  const data = await res.json();

  const sites = new Map();

  for (const item of data.schedules || []) {
    if (!item.txLat || !item.txLon) continue;

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

  let activeSites = 0;

  for (const site of sites.values()) {
    const activeCount = site.items.filter(isOnAir).length;
    if (activeCount) activeSites++;

    const marker = L.circleMarker([site.lat, site.lon], {
      radius: activeCount ? 6 : 4,
      weight: 1,
      color: activeCount ? "#5eead4" : "#7d8da8",
      fillColor: activeCount ? "#5eead4" : "#7d8da8",
      fillOpacity: activeCount ? 0.75 : 0.35
    });

    marker.bindPopup(buildPopup(site), {
      maxWidth: 360
    });

    marker.addTo(map);
  }

  mapInfo.textContent = `${sites.size} transmitter sites · ${activeSites} active now`;
}

loadMap().catch(err => {
  console.error(err);
  mapInfo.textContent = "Could not load transmitter map";
});