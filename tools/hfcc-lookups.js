const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

const hfccPath = path.join(__dirname, "..", "sources", "hfcc.zip");

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

function loadHfccZip() {
  if (!fs.existsSync(hfccPath)) return null;
  return new AdmZip(hfccPath);
}

function parseSitesFromZip(zip) {
  const entry = zip.getEntry("site.txt");
  if (!entry) return {};

  const raw = entry.getData().toString("latin1");
  const lines = raw.split(/\r?\n/);
  const sites = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(";")) continue;

    const match = trimmed.match(
      /^([A-Z0-9-]{2,6})\s+(.+?)\s+([A-Z]{1,3})\s+(\d{2}[NS]\d{2})\s+(\d{3}[EW]\d{2})$/
    );

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

  return sites;
}

function loadHfccSites() {
  const zip = loadHfccZip();
  if (!zip) return {};

  const sites = parseSitesFromZip(zip);
  console.log(`HFCC shared sites: ${Object.keys(sites).length}`);

  return sites;
}

module.exports = {
  loadHfccSites
};