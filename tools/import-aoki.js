const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const { formatDays } = require("./day-utils");

const inputPath = path.join(
  __dirname,
  "..",
  "sources",
  "xta26.xlsx"
);

const monthNumbers = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12"
};

function parseEnglishDate(value) {
  const match = String(value || "").match(
    /([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/i
  );

  if (!match) {
    return "";
  }

  const month =
    monthNumbers[match[1].slice(0, 3).toLowerCase()];

  if (!month) {
    return "";
  }

  const day = match[2].padStart(2, "0");
  const year = match[3];

  return `${year}-${month}-${day}`;
}

function readAokiMetadata(sheet) {
  const title = String(sheet["A1"]?.v || "").trim();

  const fallback = {
    season: "",
    publishedAt: "",
    publishedTime: "",
    label: "AOKI release information unavailable",
    title: ""
  };

  if (!title) {
    console.warn(
      "AOKI release information missing from cell A1"
    );

    return fallback;
  }

  const seasonMatch = title.match(/\b([AB]\d{2})\b/i);

  const timeMatch = title.match(
    /\b(\d{3,4})\s*UTC\b/i
  );

  const season = seasonMatch
    ? seasonMatch[1].toUpperCase()
    : "";

  const publishedAt = parseEnglishDate(title);

  const publishedTime = timeMatch
    ? timeMatch[1].padStart(4, "0")
    : "";

  return {
    season,
    publishedAt,
    publishedTime,
    label: [
      "AOKI",
      season,
      publishedAt
    ].filter(Boolean).join(" • "),
    title
  };
}

function detectBand(freqKHz) {
  if (freqKHz >= 2300 && freqKHz <= 2495)
    return "120m";

  if (freqKHz >= 3200 && freqKHz <= 3400)
    return "90m";

  if (freqKHz >= 3900 && freqKHz <= 4000)
    return "75m";

  if (freqKHz >= 4750 && freqKHz <= 5060)
    return "60m";

  if (freqKHz >= 5900 && freqKHz <= 6200)
    return "49m";

  if (freqKHz >= 7200 && freqKHz <= 7600)
    return "41m";

  if (freqKHz >= 9400 && freqKHz <= 9900)
    return "31m";

  if (freqKHz >= 11600 && freqKHz <= 12100)
    return "25m";

  if (freqKHz >= 13570 && freqKHz <= 13870)
    return "22m";

  if (freqKHz >= 15100 && freqKHz <= 15800)
    return "19m";

  if (freqKHz >= 17480 && freqKHz <= 17900)
    return "16m";

  if (freqKHz >= 21450 && freqKHz <= 21850)
    return "13m";

  if (freqKHz >= 25670 && freqKHz <= 26100)
    return "11m";

  return "";
}

function parseAokiLatLon(value) {
  const v = String(value || "").trim();

  const match = v.match(
    /^(\d{2})(\d{2})(\d{2})([NS])(\d{3})(\d{2})(\d{2})([EW])$/
  );

  if (!match) {
    return {
      lat: null,
      lon: null
    };
  }

  let lat =
    Number(match[1]) +
    Number(match[2]) / 60 +
    Number(match[3]) / 3600;

  let lon =
    Number(match[5]) +
    Number(match[6]) / 60 +
    Number(match[7]) / 3600;

  if (match[4] === "S") {
    lat *= -1;
  }

  if (match[8] === "W") {
    lon *= -1;
  }

  return {
    lat: Number(lat.toFixed(4)),
    lon: Number(lon.toFixed(4))
  };
}

function importAoki() {
  const schedules = [];

  const fallbackMeta = {
    season: "",
    publishedAt: "",
    publishedTime: "",
    label: "AOKI release information unavailable",
    title: ""
  };

  if (!fs.existsSync(inputPath)) {
    console.warn("AOKI file missing:", inputPath);

    return {
      schedules,
      meta: fallbackMeta
    };
  }

  const workbook = XLSX.readFile(inputPath);

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    console.warn(
      "AOKI workbook does not contain a readable worksheet"
    );

    return {
      schedules,
      meta: fallbackMeta
    };
  }

  const metadata = readAokiMetadata(sheet);

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false
  });

  /*
   * Rivi 1 sisältää julkaisun otsikon.
   * Rivi 2 sisältää sarakeotsikot.
   * Varsinainen data alkaa riviltä 3.
   */
  for (const row of rows.slice(2)) {
    const freq = Number(row[0]);

    if (!freq) {
      continue;
    }

    const utc = String(row[3] || "").trim();
    const [start, end] = utc.split("-");

    if (!start || !end) {
      continue;
    }

    const days = String(row[4] || "").trim();
    const coords = parseAokiLatLon(row[10]);

    schedules.push({
      freq,
      start,
      end,

      days,
      daysLabel: formatDays(days),

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
  console.log(`AOKI release: ${metadata.label}`);

  if (metadata.publishedTime) {
    console.log(
      `AOKI publication time: ${metadata.publishedTime} UTC`
    );
  }

  return {
    schedules,
    meta: metadata
  };
}

module.exports = {
  importAoki
};