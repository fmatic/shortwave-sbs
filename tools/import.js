const fs = require("fs");
const path = require("path");

const { importEibi } = require("./import-eibi");
const { importAoki } = require("./import-aoki");

const outputPath = path.join(__dirname, "..", "data", "schedules.json");

async function main() {
  const schedules = [];

  schedules.push(...importEibi());
  schedules.push(...importAoki());

  schedules.sort((a, b) => {
    if (a.freq !== b.freq) return a.freq - b.freq;
    return String(a.start).localeCompare(String(b.start));
  });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        count: schedules.length,
        sources: {
          EiBi: schedules.filter(x => x.source === "EiBi").length,
          AOKI: schedules.filter(x => x.source === "AOKI").length,
          HFCC: schedules.filter(x => x.source === "HFCC").length
        },
        schedules
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