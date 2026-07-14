const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

const inputPath = path.join(__dirname, "..", "sources", "hfcc.zip");

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

function parseCoord(value) {
  const m = String(value || "").match(/^(\d{2,3})([NSEW])(\d{2})$/);
  if (!m) return null;

  const deg = Number(m[1]);
  const min = Number(m[3]);
  const dir = m[2];

  let result = deg + min / 60;

  if (dir === "S" || dir === "W") result *= -1;

  return Number(result.toFixed(4));
}

function parseSites(zip) {
  const entry = zip.getEntry("site.txt");
  if (!entry) return {};

  const raw = entry.getData().toString("latin1");
  const lines = raw.split(/\r?\n/);

  const sites = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(";")) continue;

    const match = trimmed.match(/^([A-Z0-9-]{2,6})\s+(.+?)\s+([A-Z]{1,3})\s+(\d{2}[NS]\d{2})\s+(\d{3}[EW]\d{2})$/);

    if (!match) continue;

    const [, code, name, country, latRaw, lonRaw] = match;

    sites[code] = {
      code,
      name: name.trim(),
      country,
      lat: parseCoord(latRaw),
      lon: parseCoord(lonRaw)
    };
  }

  console.log(`HFCC sites: ${Object.keys(sites).length}`);

  return sites;
}

function parseBroadcasters(zip) {
  const entry = zip.getEntry("broadcas.txt");
  if (!entry) return {};

  const raw = entry.getData().toString("latin1");
  const lines = raw.split(/\r?\n/);

  const broadcasters = {};

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith(";")) continue;

    const match = trimmed.match(/^([A-Z0-9]{2,6})\s+(.+)$/);
    if (!match) continue;

    const [, code, name] = match;

    broadcasters[code] = name.trim();
  }

  console.log(`HFCC broadcasters: ${Object.keys(broadcasters).length}`);

  return broadcasters;
}

function parseAdmins(zip) {
  const entry = zip.getEntry("admin.txt");
  if (!entry) return {};

  const raw = entry.getData().toString("latin1");
  const lines = raw.split(/\r?\n/);

  const admins = {};

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith(";")) continue;

    const match = trimmed.match(/^([A-Z0-9]{1,3})\s+(.+?)\s{2,}/);
    if (!match) continue;

    const [, code, name] = match;

    admins[code] = {
      code,
      name: name.trim()
    };
  }

  console.log(`HFCC admins: ${Object.keys(admins).length}`);

  return admins;
}

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

function parseHfccDate(value) {
  const match = String(value || "")
    .trim()
    .match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/i);

  if (!match) {
    return "";
  }

  const day = match[1].padStart(2, "0");
  const month = monthNumbers[match[2].toLowerCase()];
  const year = match[3];

  if (!month) {
    return "";
  }

  return `${year}-${month}-${day}`;
}

function readHfccMetadata(raw, entryName = "") {
  const fallback = {
    season: "",
    publishedAt: "",
    processedAt: "",
    processedTime: "",
    label: "HFCC release information unavailable",
    sourceFile: entryName
  };

  const lines = String(raw || "")
    .split(/\r?\n/)
    .slice(0, 10);

  const headerText = lines.join("\n");

  const releaseMatch = headerText.match(
    /\b([AB]\d{2})\s+ALL\s+(\d{1,2}-[A-Za-z]{3}-\d{4})/i
  );

  const processedMatch = headerText.match(
    /Processed\s+on\s+(\d{1,2}-[A-Za-z]{3}-\d{4})\s+at\s+(\d{1,2}):(\d{2})\s*UTC/i
  );

  const season = releaseMatch
    ? releaseMatch[1].toUpperCase()
    : "";

  const publishedAt = releaseMatch
    ? parseHfccDate(releaseMatch[2])
    : "";

  const processedAt = processedMatch
    ? parseHfccDate(processedMatch[1])
    : "";

  const processedTime = processedMatch
    ? `${processedMatch[2].padStart(2, "0")}${processedMatch[3]}`
    : "";

  if (!season && !publishedAt) {
    console.warn(
      "HFCC release information could not be detected from:",
      entryName
    );

    return fallback;
  }

  return {
    season,
    publishedAt,
    processedAt,
    processedTime,
    label: [
      "HFCC",
      season,
      publishedAt
    ].filter(Boolean).join(" • "),
    sourceFile: entryName
  };
}

function importHfcc() {
  const schedules = [];

  const fallbackMeta = {
    season: "",
    publishedAt: "",
    processedAt: "",
    processedTime: "",
    label: "HFCC release information unavailable",
    sourceFile: ""
  };

  if (!fs.existsSync(inputPath)) {
    console.warn("HFCC file missing:", inputPath);

    return {
      schedules,
      meta: fallbackMeta
    };
  }

  const zip = new AdmZip(inputPath);

  const sites = parseSites(zip);
  const broadcasters = parseBroadcasters(zip);
  const admins = parseAdmins(zip);

  const entry = zip.getEntries().find(e =>
    e.entryName.toLowerCase().includes("all") &&
    e.entryName.toLowerCase().endsWith(".txt")
  );

  if (!entry) {
    console.warn("HFCC TXT file not found");

    return {
      schedules,
      meta: fallbackMeta
    };
  }

  const raw = entry.getData().toString("latin1");
  const metadata = readHfccMetadata(raw, entry.entryName);
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!/^\d{4,5}\s+\d{4}\s+\d{4}/.test(trimmed)) {
      continue;
    }

    const parts = trimmed.split(/\s+/);

    const freq = Number(parts[0]);
    const start = parts[1];
    const end = parts[2];

    const target = parts[3] || "";
    const txCode = parts[4] || "";
    const site = sites[txCode];

    let adminIndex = -1;

    for (let i = parts.length - 1; i >= 0; i--) {
      if (
        admins[parts[i]] &&
        broadcasters[parts[i + 1]]
      ) {
        adminIndex = i;
        break;
      }
    }

    if (adminIndex === -1) {
      continue;
    }

    const adminCode = parts[adminIndex];
    const broadcasterCode =
      parts[adminIndex + 1] || "";

    const fmoCode =
      parts[adminIndex + 2] || "";

    const reqNo =
      parts[adminIndex + 3] || "";

    const language =
      parts[adminIndex - 1] || "";

    schedules.push({
      freq,
      start,
      end,

      days: parts[9] || "",

      country: adminCode,
      countryName:
        admins[adminCode]?.name || "",

      adminCode,

      station:
        broadcasters[broadcasterCode] ||
        broadcasterCode ||
        "",

      stationCode: broadcasterCode,

      fmoCode,
      reqNo,

      language,
      target,
      type: "",
      power: parts[5] || "",

      txCode,
      txSite: site?.name || txCode,
      txCountry: site?.country || "",
      txLat: site?.lat || null,
      txLon: site?.lon || null,

      remarks: trimmed,
      band: detectBand(freq),
      source: "HFCC"
    });
  }

  console.log(`HFCC: ${schedules.length} rows`);
  console.log(`HFCC release: ${metadata.label}`);

  if (metadata.processedAt) {
    console.log(
      `HFCC processed: ${metadata.processedAt}` +
      (
        metadata.processedTime
          ? ` at ${metadata.processedTime} UTC`
          : ""
      )
    );
  }

  return {
    schedules,
    meta: metadata
  };
}

module.exports = {
  importHfcc
};