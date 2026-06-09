const fs = require("fs");
const path = require("path");

const inputPath = path.join(__dirname, "..", "sources", "eibi.csv");

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

function importEibi() {
  if (!fs.existsSync(inputPath)) {
    console.warn("EiBi file missing:", inputPath);
    return [];
  }

  const raw = fs.readFileSync(inputPath, "latin1");
  const lines = raw.split(/\r?\n/).filter(Boolean);

  const schedules = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = line.split(";");

    if (cols.length < 10) continue;

    const freqKHz = parseFloat(cols[0]);
    const time = cols[1] || "";
    const [start, end] = time.split("-");

    if (!freqKHz || !start || !end) continue;

   const schedule = {
  freq: Math.round(freqKHz),
  start: start || "",
  end: end || "",
  days: cols[2] || "",
  country: cols[3] || "",
  station: cols[4] || "",
  language: cols[5] || "",
  target: cols[6] || "",
  txCode: cols[7] || "",
txSite: cols[7] || "",
type: cols[8] || "",
  startDate: cols[9] || "",
  endDate: cols[10] || "",
  remarks: cols[11] || "",
  band: detectBand(Math.round(freqKHz)),
  source: "EiBi"
};

    schedules.push(schedule);
  }

  console.log(`EiBi: ${schedules.length} rows`);

  return schedules;
}

module.exports = {
  importEibi
};