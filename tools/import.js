const fs = require("fs");
const path = require("path");

const { importEibi } = require("./import-eibi");
const { importAoki } = require("./import-aoki");

const outputPath = path.join(__dirname, "..", "data", "schedules.json");

async function main() {
  const schedules = [];

  schedules.push(...importEibi());
  schedules.push(...importAoki());

const merged = new Map();

for (const item of schedules) {
  const key = [
    item.freq,
    item.start,
    item.end,
    String(item.station).toLowerCase()
  ].join("|");

  if (!merged.has(key)) {
    merged.set(key, item);
    continue;
  }

  const existing = merged.get(key);

  const sources = new Set(
    String(existing.source)
      .split("+")
      .map(x => x.trim())
  );

  sources.add(item.source);

  existing.source = [...sources].join("+");

  if (!existing.target && item.target) {
    existing.target = item.target;
  }

  if (!existing.language && item.language) {
    existing.language = item.language;
  }

  if (!existing.country && item.country) {
    existing.country = item.country;
  }
}

const finalSchedules = [...merged.values()];

  finalSchedules.sort((a, b) => {
    if (a.freq !== b.freq) return a.freq - b.freq;
    return String(a.start).localeCompare(String(b.start));
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        count: finalSchedules.length
        sources: {
          EiBi: schedules.filter(x => x.source === "EiBi").length,
          AOKI: schedules.filter(x => x.source === "AOKI").length,
          HFCC: schedules.filter(x => x.source === "HFCC").length
        },
        schedules: finalSchedules
      },
      null,
      2
    )
  );

  console.log(`Imported total: ${schedules.length}`);
  console.log(`Written: ${outputPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});