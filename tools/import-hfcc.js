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

function importHfcc() {
  if (!fs.existsSync(inputPath)) {
    console.warn("HFCC file missing:", inputPath);
    return [];
  }

  const zip = new AdmZip(inputPath);

  const entry = zip.getEntries().find(e =>
    e.entryName.toLowerCase().includes("all") &&
    e.entryName.toLowerCase().endsWith(".txt")
  );

  if (!entry) {
    console.warn("HFCC TXT file not found");
    return [];
  }

  const raw = entry.getData().toString("latin1");

  const lines = raw.split(/\r?\n/);

  const schedules = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) continue;

    if (!/^\d{4,5}\s+\d{4}\s+\d{4}/.test(trimmed)) {
      continue;
    }

    const parts = trimmed.split(/\s+/);

    const freq = Number(parts[0]);
    const start = parts[1];
    const end = parts[2];

    if (!freq || !start || !end) continue;

    const country = parts[15] || "";
    const station = parts[16] || "";
    const language = parts[13] || "";
    const target = parts[3] || "";

    schedules.push({
      freq,
      start,
      end,
      days: parts[9] || "",
      country,
      station,
      language,
      target,
      remarks: "",
      power: parts[5] || "",
      band: detectBand(freq),
      source: "HFCC"
    });
  }

  console.log(`HFCC: ${schedules.length} rows`);

  return schedules;
}

module.exports = {
  importHfcc
};