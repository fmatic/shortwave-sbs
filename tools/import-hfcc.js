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
    !e.isDirectory &&
    /\.(txt|csv|dat)$/i.test(e.entryName)
  );

  if (!entry) {
    console.warn("HFCC zip contains no usable file");
    return [];
  }

  const raw = entry.getData().toString("latin1");

  const lines = raw.split(/\r?\n/).filter(Boolean);

  const schedules = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) continue;

    if (!/^\d/.test(trimmed)) continue;

    const cols = trimmed.split(";");

    if (cols.length < 8) continue;

    const freq = Number(cols[0]);

    if (!freq) continue;

    const start = String(cols[1] || "").padStart(4, "0");
    const end = String(cols[2] || "").padStart(4, "0");

    schedules.push({
      freq,
      start,
      end,
      days: cols[3] || "",
      country: cols[4] || "",
      station: cols[5] || "",
      language: cols[6] || "",
      target: cols[7] || "",
      remarks: "",
      power: cols[8] || "",
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