let allSchedules = [];

const bandRanges = {
  "120m": [2300, 2495],
  "90m": [3200, 3400],
  "75m": [3900, 4000],
  "60m": [4750, 5060],
  "49m": [5900, 6200],
  "41m": [7200, 7600],
  "31m": [9400, 9900],
  "25m": [11600, 12100],
  "22m": [13570, 13870],
  "19m": [15100, 15800],
  "16m": [17480, 17900],
  "13m": [21450, 21850],
  "11m": [25670, 26100]
};

const bandOrder = Object.keys(bandRanges);

const els = {
  utcClock: document.getElementById("utcClock"),
  dataInfo: document.getElementById("dataInfo"),
  searchInput: document.getElementById("searchInput"),
  bandSelect: document.getElementById("bandSelect"),
  onAirOnly: document.getElementById("onAirOnly"),
  scheduleBody: document.getElementById("scheduleBody"),
  bandTitle: document.getElementById("bandTitle"),
  bandRange: document.getElementById("bandRange"),
  bandFill: document.getElementById("bandFill"),
  bandActive: document.getElementById("bandActive"),
  activityBands: document.getElementById("activityBands"),
  detailModal: document.getElementById("detailModal"),
  modalClose: document.getElementById("modalClose"),
  modalStation: document.getElementById("modalStation"),
  modalMeta: document.getElementById("modalMeta"),
  targetList: document.getElementById("targetList"),
activeCountries: document.getElementById("activeCountries"),
activeStations: document.getElementById("activeStations"),
sourceToggles: document.querySelectorAll(".sourceToggle"),
autoBandBtn: document.getElementById("autoBandBtn"),
bandReason: document.getElementById("bandReason"),
aboutBtn: document.getElementById("aboutBtn"),
aboutModal: document.getElementById("aboutModal"),
aboutClose: document.getElementById("aboutClose")
};

function updateClock() {
  const now = new Date();
  els.utcClock.textContent = now.toISOString().slice(11, 16) + " UTC";
}

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

function showAbout() {
  els.aboutModal.classList.remove("hidden");
}

function hideAbout() {
  els.aboutModal.classList.add("hidden");
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

function fmtTime(start, end) {
  return `${start || "----"}–${end || "----"}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getFiltered() {
  const query = els.searchInput.value.trim().toLowerCase();
  const band = els.bandSelect.value;
  const onAirOnly = els.onAirOnly.checked;
  const selectedSources = getSelectedSources();

  return allSchedules.filter(item => {
    if (!selectedSources.includes(item.source)) return false;
    if (band && item.band !== band) return false;
    if (onAirOnly && !isOnAir(item)) return false;

    if (query) {
      const haystack = [
        item.freq,
        item.station,
        item.language,
        item.country,
        item.target,
        item.band,
        item.source,
        item.remarks
      ].join(" ").toLowerCase();

      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

function renderActivityOverview() {
  const counts = {};

  for (const band of bandOrder) counts[band] = 0;

  for (const item of allSchedules) {
    if (item.band && isOnAir(item)) {
      counts[item.band] = (counts[item.band] || 0) + 1;
    }
  }

  const max = Math.max(...Object.values(counts), 1);

  els.activityBands.innerHTML = bandOrder.map(band => {
    const count = counts[band] || 0;
    const pct = Math.round((count / max) * 100);

    return `
      <div class="activity-row" data-band="${escapeHtml(band)}">
        <div class="activity-name">${escapeHtml(band)}</div>
        <div class="activity-meter">
          <div class="activity-fill" style="width:${pct}%"></div>
        </div>
        <div class="activity-count">${count}</div>
      </div>
    `;
  }).join("");

  document.querySelectorAll(".activity-row").forEach(row => {
    row.addEventListener("click", () => {
      els.bandSelect.value = row.dataset.band;
      els.onAirOnly.checked = true;
      render();
    });
  });
}

function getSelectedSources() {
  return [...els.sourceToggles]
    .filter(input => input.checked)
    .map(input => input.value);
}

function getBandReason(band, count) {
  const hour = new Date().getUTCHours();

  if (band === "49m") {
    return hour >= 15 || hour <= 6
      ? `Best lower-band activity now • ${count} active broadcasts`
      : `Strong regional activity • ${count} active broadcasts`;
  }

  if (band === "41m") {
    return `Good evening and night coverage • ${count} active broadcasts`;
  }

  if (band === "31m") {
    return hour >= 6 && hour <= 18
      ? `Strong daytime/global activity • ${count} active broadcasts`
      : `Still active for long-distance paths • ${count} active broadcasts`;
  }

  if (["25m", "22m", "19m", "16m"].includes(band)) {
    return `Higher-band daytime DX potential • ${count} active broadcasts`;
  }

  if (["120m", "90m", "75m", "60m"].includes(band)) {
    return `Lower-band night path potential • ${count} active broadcasts`;
  }

  return `${count} active broadcasts`;
}

function getActiveBySources() {
  const selectedSources = getSelectedSources();

  return allSchedules.filter(item => {
    if (!selectedSources.includes(item.source)) return false;
    return isOnAir(item);
  });
}

function renderTargets() {
  const band = els.bandSelect.value;
  const active = getActiveBySources().filter(item => {
    if (band && item.band !== band) return false;
    return true;
  });

  const counts = new Map();

  for (const item of active) {
    const raw = item.target || item.country || "Unknown";
    const parts = String(raw)
      .split(/[,\s/]+/)
      .map(x => x.trim())
      .filter(Boolean);

    for (const part of parts.slice(0, 3)) {
      counts.set(part, (counts.get(part) || 0) + 1);
    }
  }

  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const max = Math.max(...top.map(x => x[1]), 1);

  if (!top.length) {
    els.targetList.innerHTML = `<div class="empty">No active targets found</div>`;
    return;
  }

  els.targetList.innerHTML = top.map(([name, count]) => {
    const pct = Math.round((count / max) * 100);

    return `
      <div class="target-row">
        <div class="target-name">${escapeHtml(name)}</div>
        <div class="target-meter">
          <div class="target-fill" style="width:${pct}%"></div>
        </div>
        <div class="target-count">${count}</div>
      </div>
    `;
  }).join("");
}

function getBestBandNow() {
  const counts = {};

  for (const band of bandOrder) {
    counts[band] = 0;
  }

  for (const item of allSchedules) {
    if (!item.band) continue;
    if (!isOnAir(item)) continue;

    counts[item.band]++;
  }

  const ranked = Object.entries(counts)
    .sort((a, b) => b[1] - a[1]);

  return ranked[0]?.[0] || "49m";
}

function applyAutoBand() {
  const bestBand = getBestBandNow();


  const option = [...els.bandSelect.options].find(opt => opt.value === bestBand);

  if (!option) {

    return;
  }

  els.bandSelect.value = bestBand;
  els.onAirOnly.checked = true;
  els.autoBandBtn.textContent = `Auto: ${bestBand}`;

  els.bandSelect.dispatchEvent(new Event("change"));
  render();
}

function renderSnapshot() {
  const active = getActiveBySources();

  const countries = new Set(
    active
      .map(item => item.country)
      .filter(Boolean)
  );

  const stations = new Set(
    active
      .map(item => item.station)
      .filter(Boolean)
  );

  els.activeCountries.textContent = countries.size;
  els.activeStations.textContent = stations.size;
}

function renderTable() {
  const rows = getFiltered()
    .sort((a, b) => a.freq - b.freq)
    .slice(0, 600);
	if (!rows.length) {
  els.scheduleBody.innerHTML = `
    <tr>
      <td colspan="8" class="empty-row">
        No broadcasts found with current filters
      </td>
    </tr>
  `;
  return;
}

  els.scheduleBody.innerHTML = rows.map((item, index) => {
    const live = isOnAir(item);

    return `
      <tr class="${live ? "live-row" : ""}" data-index="${index}">
        <td>${escapeHtml(item.freq)} kHz</td>
        <td>${escapeHtml(fmtTime(item.start, item.end))}</td>
        <td>${escapeHtml(item.station)}</td>
        <td>${escapeHtml(item.language)}</td>
        <td>${escapeHtml(item.target)}</td>
        <td>${escapeHtml(item.country)}</td>
        <td>${escapeHtml(item.band)}</td>
        <td>${escapeHtml(item.source)}</td>
      </tr>
    `;
  }).join("");

  [...els.scheduleBody.querySelectorAll("tr")].forEach((tr, index) => {
    tr.addEventListener("click", () => showDetails(rows[index]));
  });
}

function renderBandLive() {
  const band = els.bandSelect.value;
  const range = bandRanges[band];

  els.bandTitle.textContent = band ? `${band} Band Live` : "All Bands Live";
  els.bandRange.textContent = range ? `${range[0]}–${range[1]} kHz` : "All shortwave bands";

  const active = allSchedules.filter(item => {
    if (band && item.band !== band) return false;
    return isOnAir(item);
  });

  els.bandActive.textContent = active.length;
  els.bandReason.textContent = band
  ? getBandReason(band, active.length)
  : `${active.length} active broadcasts across all shortwave bands`;

  const maxReasonable = 100;
  const pct = Math.min(100, Math.round((active.length / maxReasonable) * 100));
  els.bandFill.style.width = pct + "%";
}

function showDetails(item) {
  if (!item) return;

  els.modalStation.textContent = item.station || "Unknown station";

  const rows = [
    ["Frequency", `${item.freq} kHz`],
    ["UTC", fmtTime(item.start, item.end)],
    ["Language", item.language],
    ["Target", item.target],
    ["Country", item.country],
    ["Band", item.band],
    ["Days", item.days],
    ["Power", item.power],
    ["Remarks", item.remarks],
    ["Source", item.source],
    ["Status", isOnAir(item) ? "ON AIR NOW" : "Off air"]
  ];

  els.modalMeta.innerHTML = rows.map(([label, value]) => `
    <div>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || "—")}</strong>
    </div>
  `).join("");

  els.detailModal.classList.remove("hidden");
}

function hideDetails() {
  els.detailModal.classList.add("hidden");
}

function render() {
  renderBandLive();
  renderActivityOverview();
  renderTargets();
  renderSnapshot();
  renderTable();
}

async function loadSchedules() {
  const res = await fetch("data/schedules.json");
  const data = await res.json();

  allSchedules = data.schedules || [];

  const updated = new Date(data.generatedAt).toLocaleString("fi-FI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

els.dataInfo.textContent = `${data.count} schedules • lists updated ${updated}`;
render();
}

els.searchInput.addEventListener("input", render);
els.bandSelect.addEventListener("change", render);
els.onAirOnly.addEventListener("change", render);
els.aboutBtn.addEventListener("click", showAbout);
els.aboutClose.addEventListener("click", hideAbout);

els.aboutModal.addEventListener("click", event => {
  if (event.target === els.aboutModal) hideAbout();
});
if (els.autoBandBtn) {
  els.autoBandBtn.addEventListener("click", applyAutoBand);
}
els.sourceToggles.forEach(input => {
  input.addEventListener("change", render);
});

els.modalClose.addEventListener("click", hideDetails);
els.detailModal.addEventListener("click", event => {
  if (event.target === els.detailModal) hideDetails();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    hideDetails();
    hideAbout();
  }
});

updateClock();
setInterval(updateClock, 1000);
setInterval(render, 60_000);

loadSchedules().catch(err => {
  console.error(err);
  els.dataInfo.textContent = "Could not load schedules.json";
});