const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

const inputPath = path.join(__dirname, "..", "sources", "aoki.zip");

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

function importAoki() {
  if (!fs.existsSync(inputPath)) {
    console.warn("AOKI file missing:", inputPath);
    return [];
  }

  const zip = new AdmZip(inputPath);
  const entry = zip.getEntries().find(e =>
    !e.isDirectory &&
    /\.(txt|csv|dat)$/i.test(e.entryName)
  );

  if (!entry) {
    console.warn("AOKI zip contains no txt/csv/dat file");
    return [];
  }

  const raw = entry.getData().toString("latin1");
  const lines = raw.split(/\r?\n/).filter(Boolean);

  const schedules = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) continue;
    if (!/^\d/.test(trimmed)) continue;

    const parts = trimmed.split(/\s+/);

    const freq = Number(parts[0]);
    const time = parts[1] || "";

    if (!freq || !time.includes("-")) continue;

    const [start, end] = time.split("-");

    const station = parts.slice(2).join(" ");

    schedules.push({
      freq,
      start,
      end,
      days: "",
      country: "",
      station,
      language: "",
      target: "",
	  type: "",
      remarks: trimmed,
      power: "",
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