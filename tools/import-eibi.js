const fs = require("fs");
const path = require("path");

const inputPath = path.join(__dirname, "..", "sources", "eibi.csv");
const outputPath = path.join(__dirname, "..", "data", "schedules.json");

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

if (!fs.existsSync(inputPath)) {
  console.error("Missing file:", inputPath);
  process.exit(1);
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

  const schedule = {
    freq: Math.round(freqKHz),
    start: start || "",
    end: end || "",
    days: cols[2] || "",
    country: cols[3] || "",
    station: cols[4] || "",
    language: cols[5] || "",
    target: cols[6] || "",
    remarks: cols[7] || "",
    power: cols[8] || "",
    source: "EiBi"
  };

  schedule.band = detectBand(schedule.freq);

  schedules.push(schedule);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

fs.writeFileSync(
  outputPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      count: schedules.length,
      schedules
    },
    null,
    2
  )
);

console.log(`Imported ${schedules.length} EiBi rows`);
console.log(`Written: ${outputPath}`);