const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const inputPath = path.join(__dirname, "..", "sources", "xta26.xlsx");

function detectBand(freqKHz) {
  if (freqKHz >= 2300 && freqKHz <= 2495) return "120m";
  if (freqKHz >= 3200 && freqKHz <= 3400) return "90m";
  if (freqKHz >= 3900 && freqKHz <= 4000) return "75m";
  if (freqKHz >= 4750 && freqKHz <= 5060) return "60m";
  if (freqKHz >= 5900 && freqKHz <= 6200) return "49m";
  if (freqKHz >= 7200 && freqKHz <= 7600) return "41m";
  if (freqKHz >= 9400 && freqKHz <= 9900) return "31m";
  if (freqKHz >= 11600 && freqKHz <= 12100) return "25m";
  if (freqKHz >= 13570 && freqKHz <= 13870) return "22m";
  if (freqKHz >= 15100 && freqKHz <= 15800) return "19m";
  if (freqKHz >= 17480 && freqKHz <= 17900) return "16m";
  if (freqKHz >= 21450 && freqKHz <= 21850) return "13m";
  if (freqKHz >= 25670 && freqKHz <= 26100) return "11m";
  return "";
}

function parseAokiLatLon(value) {
  const v = String(value || "").trim();
  const match = v.match(/^(\d{2})(\d{2})(\d{2})([NS])(\d{3})(\d{2})(\d{2})([EW])$/);

  if (!match) return { lat: null, lon: null };

  let lat =
    Number(match[1]) +
    Number(match[2]) / 60 +
    Number(match[3]) / 3600;

  let lon =
    Number(match[5]) +
    Number(match[6]) / 60 +
    Number(match[7]) / 3600;

  if (match[4] === "S") lat *= -1;
  if (match[8] === "W") lon *= -1;

  return {
    lat: Number(lat.toFixed(4)),
    lon: Number(lon.toFixed(4))
  };
}

function importAoki() {
  if (!fs.existsSync(inputPath)) {
    console.warn("AOKI file missing:", inputPath);
    return [];
  }

  const workbook = XLSX.readFile(inputPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: ""
  });

  const schedules = [];

  for (const row of rows.slice(2)) {
    const freq = Number(row[0]);
    if (!freq) continue;

    const utc = String(row[3] || "");
    const [start, end] = utc.split("-");

    const coords = parseAokiLatLon(row[10]);

    schedules.push({
      freq,
      start: start || "",
      end: end || "",
      days: row[4] || "",
      country: row[9] || "",
      countryName: "",
      station: row[2] || "",
      language: row[5] || "",
      target: "",
      type: "",
      power: row[6] || "",
      azimuth: row[7] || "",

      txCode: "",
      txSite: row[8] || "",
      txCountry: row[9] || "",
      txLat: coords.lat,
      txLon: coords.lon,

      remarks: row[11] || "",
      band: detectBand(freq),
      source: "AOKI"
    });
  }

  console.log(`AOKI: ${schedules.length} rows`);

  return schedules;
}

module.exports = {
  importAoki
};