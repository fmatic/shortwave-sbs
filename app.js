let allSchedules = [];
let userLocation = null;

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

const locationProfiles = {
  "Northern Europe": { lat: 62.0, lon: 25.0, label: "Northern Europe profile" },
  "Central Europe": { lat: 50.0, lon: 10.0, label: "Central Europe profile" },
  "Southern Europe": { lat: 41.0, lon: 12.0, label: "Southern Europe profile" },
  "North America": { lat: 40.0, lon: -95.0, label: "North America profile" },
  "South America": { lat: -15.0, lon: -60.0, label: "South America profile" },
  "East Asia": { lat: 35.0, lon: 135.0, label: "East Asia profile" },
  "Oceania": { lat: -25.0, lon: 135.0, label: "Oceania profile" }
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
aboutClose: document.getElementById("aboutClose"),
locationBtn: document.getElementById("locationBtn"),
regionSelect: document.getElementById("regionSelect"),
conditionLocation: document.getElementById("conditionLocation"),
pathMode: document.getElementById("pathMode"),
conditionBands: document.getElementById("conditionBands")
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

function degToRad(deg) {
  return deg * Math.PI / 180;
}

function radToDeg(rad) {
  return rad * 180 / Math.PI;
}

function dayOfYear(date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  const diff = date - start;
  return Math.floor(diff / 86400000);
}

function getSolarElevationApprox(lat, lon) {
  const now = new Date();
  const day = dayOfYear(now);
  const hourUtc = now.getUTCHours() + now.getUTCMinutes() / 60;

  const decl = 23.44 * Math.sin(degToRad((360 / 365) * (day - 81)));
  const solarTime = hourUtc + lon / 15;
  const hourAngle = 15 * (solarTime - 12);

  const elevation = radToDeg(Math.asin(
    Math.sin(degToRad(lat)) * Math.sin(degToRad(decl)) +
    Math.cos(degToRad(lat)) * Math.cos(degToRad(decl)) * Math.cos(degToRad(hourAngle))
  ));

  return elevation;
}

function getPathMode(elevation) {
  if (elevation > 8) return "Day";
  if (elevation > -6) return "Twilight";
  return "Night";
}

function getConditionScore(band, mode) {
  const scores = {
    Day: {
      "120m": 15, "90m": 20, "75m": 25, "60m": 35,
      "49m": 50, "41m": 65, "31m": 80, "25m": 75,
      "22m": 65, "19m": 55, "16m": 40, "13m": 25, "11m": 15
    },
    Twilight: {
      "120m": 35, "90m": 45, "75m": 55, "60m": 65,
      "49m": 85, "41m": 80, "31m": 75, "25m": 55,
      "22m": 40, "19m": 30, "16m": 20, "13m": 15, "11m": 10
    },
    Night: {
      "120m": 60, "90m": 70, "75m": 80, "60m": 85,
      "49m": 95, "41m": 88, "31m": 60, "25m": 35,
      "22m": 25, "19m": 15, "16m": 10, "13m": 5, "11m": 5
    }
  };

  return scores[mode]?.[band] ?? 0;
}

function conditionLabel(score) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Very good";
  if (score >= 55) return "Good";
  if (score >= 35) return "Fair";
  if (score >= 20) return "Weak";
  return "Poor";
}

function renderConditions() {
  const selectedRegion = els.regionSelect.value || "Northern Europe";
const fallback = locationProfiles[selectedRegion] || locationProfiles["Northern Europe"];

const loc = userLocation || fallback;
  const elevation = getSolarElevationApprox(loc.lat, loc.lon);
  const mode = getPathMode(elevation);

  els.conditionLocation.textContent = loc.label;
  els.pathMode.textContent = mode;

  els.conditionBands.innerHTML = bandOrder.map(band => {
    const score = getConditionScore(band, mode);
    const label = conditionLabel(score);

    return `
      <div class="condition-row">
        <div class="condition-name">${escapeHtml(band)}</div>
        <div class="condition-meter">
          <div class="condition-fill" style="width:${score}%"></div>
        </div>
        <div class="condition-label">${escapeHtml(label)}</div>
      </div>
    `;
  }).join("");
}

function requestLocation() {
  if (!navigator.geolocation) {
    els.conditionLocation.textContent = "Geolocation not supported • using fallback";
    userLocation = null;
    renderConditions();
    return;
  }

  els.locationBtn.textContent = "Locating…";

  navigator.geolocation.getCurrentPosition(
    position => {
      userLocation = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        label: `${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)}`
      };

      els.locationBtn.textContent = "Location active";
      renderConditions();
    },
    error => {
      els.locationBtn.textContent = "Use my location";
      userLocation = null;

      if (error.code === error.PERMISSION_DENIED) {
        els.conditionLocation.textContent = "Location denied • using fallback";
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        els.conditionLocation.textContent = "Location unavailable • using fallback";
      } else if (error.code === error.TIMEOUT) {
        els.conditionLocation.textContent = "Location timed out • using fallback";
      } else {
        els.conditionLocation.textContent = "Location error • using fallback";
      }

      console.warn("Geolocation error:", {
        code: error.code,
        message: error.message
      });

      renderConditions();
    },
    {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 3600000
    }
  );
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

const ituFlags = {
  A: "🇦🇹",
  AFS: "🇿🇦",
  AGL: "🇦🇴",
  ALB: "🇦🇱",
  ALG: "🇩🇿",
  AND: "🇦🇩",
  ARG: "🇦🇷",
  ARM: "🇦🇲",
  ARS: "🇸🇦",
  AUS: "🇦🇺",
  AZE: "🇦🇿",
  B: "🇧🇷",
  BEL: "🇧🇪",
  BEN: "🇧🇯",
  BFA: "🇧🇫",
  BGD: "🇧🇩",
  BHR: "🇧🇭",
  BIH: "🇧🇦",
  BLR: "🇧🇾",
  BOL: "🇧🇴",
  BUL: "🇧🇬",
  CAN: "🇨🇦",
  CHL: "🇨🇱",
  CHN: "🇨🇳",
  CLA: "📻",
  CLM: "🇨🇴",
  CME: "🇨🇲",
  COD: "🇨🇩",
  COG: "🇨🇬",
  CTR: "🇨🇷",
  CUB: "🇨🇺",
  CYP: "🇨🇾",
  CZE: "🇨🇿",
  D: "🇩🇪",
  DNK: "🇩🇰",
  E: "🇪🇸",
  EQA: "🇪🇨",
  EGY: "🇪🇬",
  ERI: "🇪🇷",
  EST: "🇪🇪",
  ETH: "🇪🇹",
  F: "🇫🇷",
  FIN: "🇫🇮",
  G: "🇬🇧",
  GEO: "🇬🇪",
  GRC: "🇬🇷",
  HNG: "🇭🇺",
  HOL: "🇳🇱",
  HRV: "🇭🇷",
  I: "🇮🇹",
  IND: "🇮🇳",
  INS: "🇮🇩",
  IRL: "🇮🇪",
  IRN: "🇮🇷",
  IRQ: "🇮🇶",
  ISL: "🇮🇸",
  ISR: "🇮🇱",
  J: "🇯🇵",
  KAZ: "🇰🇿",
  KEN: "🇰🇪",
  KGZ: "🇰🇬",
  KOR: "🇰🇷",
  KRE: "🇰🇵",
  KWT: "🇰🇼",
  LBY: "🇱🇾",
  LKA: "🇱🇰",
  LTU: "🇱🇹",
  LUX: "🇱🇺",
  LVA: "🇱🇻",
  MCO: "🇲🇨",
  MDG: "🇲🇬",
  MDA: "🇲🇩",
  MEX: "🇲🇽",
  MKD: "🇲🇰",
  MLA: "🇲🇾",
  MLI: "🇲🇱",
  MNG: "🇲🇳",
  MRC: "🇲🇦",
  MYA: "🇲🇲",
  MYS: "🇲🇾",
  NGR: "🇳🇬",
  NOR: "🇳🇴",
  NZL: "🇳🇿",
  OMA: "🇴🇲",
  PAK: "🇵🇰",
  PHL: "🇵🇭",
  POL: "🇵🇱",
  POR: "🇵🇹",
  PRU: "🇵🇪",
  ROU: "🇷🇴",
  RUS: "🇷🇺",
  S: "🇸🇪",
  SDN: "🇸🇩",
  SEN: "🇸🇳",
  SNG: "🇸🇬",
  SLM: "🇸🇧",
  SRB: "🇷🇸",
  SUI: "🇨🇭",
  SVK: "🇸🇰",
  SVN: "🇸🇮",
  SYR: "🇸🇾",
  THA: "🇹🇭",
  TJK: "🇹🇯",
  TUN: "🇹🇳",
  TUR: "🇹🇷",
  TWN: "🇹🇼",
  UAE: "🇦🇪",
  UKR: "🇺🇦",
  URG: "🇺🇾",
  USA: "🇺🇸",
  UZB: "🇺🇿",
  VTN: "🇻🇳",
  YEM: "🇾🇪",

  ASC: "🇦🇨",
  CNR: "🇮🇨",
  DGA: "🇮🇴",
  GUM: "🇬🇺",
  HWA: "🇺🇸",
  OCE: "🌊",
  ALS: "🇺🇸",
  PTR: "🇵🇷",
  GUF: "🇬🇫",
  NCL: "🇳🇨",
  REU: "🇷🇪",
  MDR: "🇵🇹",
  AZR: "🇵🇹",
  FRO: "🇫🇴",
  GRL: "🇬🇱",
  HKG: "🇭🇰",
  MAC: "🇲🇴"
};

function getFlag(code) {
  const key = String(code || "").trim().toUpperCase();
  return ituFlags[key] || "🌍";
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
		item.type,
		item.txSite,
item.txCode,
item.txCountry,
        item.source,
        item.remarks
      ].join(" ").toLowerCase();

      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

function formatTxSite(item) {
  if (item.txSite) {
    return item.txCode
      ? `${item.txSite} (${item.txCode})`
      : item.txSite;
  }

  return item.type || "—";
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

    <td>
      <span class="flag ${item.country === 'CLA' ? 'flag-cla' : ''}">
        ${getFlag(item.country)}
      </span>
      ${escapeHtml(item.country)}
    </td>

   <td>${escapeHtml(formatTxSite(item))}</td>
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
	["Type", item.type],
	["Tx Site", item.txSite],
	["Tx Code", item.txCode],
	["Tx Country", item.txCountry],
	["Tx Coordinates", item.txLat && item.txLon ? `${item.txLat}, ${item.txLon}` : ""],
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
  renderConditions();
  renderTable();
}
async function loadSchedules() {
  const res = await fetch("data/schedules.json");
  const data = await res.json();

  const savedRegion = localStorage.getItem("swRegion");
if (savedRegion && locationProfiles[savedRegion]) {
  els.regionSelect.value = savedRegion;
}

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
els.locationBtn.addEventListener("click", requestLocation);
els.aboutBtn.addEventListener("click", showAbout);
els.aboutClose.addEventListener("click", hideAbout);

els.regionSelect.addEventListener("change", () => {
  userLocation = null;
  localStorage.setItem("swRegion", els.regionSelect.value);
  els.locationBtn.textContent = "Use my location";
  renderConditions();
});

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