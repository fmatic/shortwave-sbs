const fs = require("fs/promises");

const INPUT = "sources/hfbc.txt";
const OUTPUT = "data/hfbc.json";

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

function getBand(freq) {
  for (const [band, [min, max]] of Object.entries(bandRanges)) {
    if (freq >= min && freq <= max) return band;
  }

  return "";
}

function parseHfbcLine(line) {
  if (!line.trim()) return null;
  if (line.startsWith(";")) return null;

  const parts = line.trim().split(/\s+/);

  if (parts.length < 18) return null;
  if (!/^\d+$/.test(parts[0])) return null;

  const freq = Number(parts[0]);

  return {
    freq,
    start: parts[1],
    end: parts[2],
    target: parts[3],
    txCode: parts[4],
    txSite: "",
    txCountry: parts[15] || "",
    txLat: "",
    txLon: "",
    power: parts[5],
    azimuth: parts[6],
    slew: parts[7],
    antenna: parts[8],
    days: parts[9],
    fromDate: parts[10],
    toDate: parts[11],
    modulation: parts[12],
    altFreq: parts[13],
    language: parts[14],
    country: parts[15],
    broadcaster: parts[16],
    org: parts[17],
    requestId: parts[18] || "",
    station: parts[16] || parts[17] || parts[15] || "HFBC",
    type: "Broadcast",
    band: getBand(freq),
    remarks: parts.slice(22).join(" "),
    source: "HFBC"
  };
}

async function main() {
  const text = await fs.readFile(INPUT, "utf8");

  const schedules = text
    .split(/\r?\n/)
    .map(parseHfbcLine)
    .filter(Boolean)
    .filter(item => item.band);

  await fs.writeFile(
    OUTPUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: "HFBC",
        count: schedules.length,
        schedules
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`HFBC imported: ${schedules.length} schedules`);
  console.log(`Written: ${OUTPUT}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});