const fs = require("fs");
const path = require("path");

const readmePath = path.join(__dirname, "..", "sources", "README.TXT");

function parseCoordPair(text) {
  const match = String(text || "").match(/(\d{2}[NS]\d{2}(?:'\d{2}")?)-(\d{2,3}[EW]\d{2}(?:'\d{2}")?)/);
  if (!match) return { lat: null, lon: null };

  return {
    lat: parseCoord(match[1]),
    lon: parseCoord(match[2])
  };
}

function parseCoord(value) {
  const m = String(value || "").match(/^(\d{2,3})([NSEW])(\d{2})(?:'(\d{2})")?$/);
  if (!m) return null;

  const deg = Number(m[1]);
  const dir = m[2];
  const min = Number(m[3]);
  const sec = m[4] ? Number(m[4]) : 0;

  let result = deg + min / 60 + sec / 3600;
  if (dir === "S" || dir === "W") result *= -1;

  return Number(result.toFixed(4));
}

function loadEibiSites() {
  if (!fs.existsSync(readmePath)) {
    console.warn("EiBi README missing:", readmePath);
    return {};
  }

  const raw = fs.readFileSync(readmePath, "latin1");
  const lines = raw.split(/\r?\n/);

  const sites = {};
  let activeCountry = null;
  let inSection = false;

  for (const line of lines) {
    if (line.includes("IV) Transmitter site codes")) {
      inSection = true;
      continue;
    }

    if (!inSection) continue;

    const countryMatch = line.match(/^\s{3}([A-Z0-9]{1,3}):\s*(.+)$/);
    if (countryMatch) {
      activeCountry = countryMatch[1];

      const rest = countryMatch[2].trim();

      const siteMatch = rest.match(/^([A-Za-z0-9-]+)-(.+)$/);
      if (siteMatch) {
        addSite(sites, activeCountry, siteMatch[1], siteMatch[2]);
      } else {
        addMajorSite(sites, activeCountry, rest);
      }

      continue;
    }

    const siteMatch = line.match(/^\s{8}([A-Za-z0-9-]+)-(.+)$/);
    if (activeCountry && siteMatch) {
      addSite(sites, activeCountry, siteMatch[1], siteMatch[2]);
    }
  }

  console.log(`EiBi sites: ${Object.keys(sites).length}`);

  return sites;
}

function addMajorSite(sites, country, text) {
  const { name, lat, lon } = parseSiteText(text);

  sites[country] = {
    code: "",
    country,
    name,
    lat,
    lon
  };
}

function addSite(sites, country, code, text) {
  const { name, lat, lon } = parseSiteText(text);
  const key = `${country}:${code}`;

  sites[key] = {
    code,
    country,
    name,
    lat,
    lon
  };
}

function parseSiteText(text) {
  const { lat, lon } = parseCoordPair(text);

  let name = String(text || "")
    .replace(/\s+\d{2}[NS]\d{2}(?:'\d{2}")?-\d{2,3}[EW]\d{2}(?:'\d{2}")?.*$/, "")
    .trim();

  return {
    name,
    lat,
    lon
  };
}

function resolveEibiSite(txCode, homeCountry, eibiSites) {
  const raw = String(txCode || "").trim();
  const country = String(homeCountry || "").trim();

  if (!raw) {
    return eibiSites[country] || null;
  }

  const foreign = raw.match(/^\/([A-Z0-9]{1,3})-?(.+)?$/);

  if (foreign) {
    const hostCountry = foreign[1];
    const code = foreign[2] || "";

    if (code) {
      return eibiSites[`${hostCountry}:${code}`] || {
        code,
        country: hostCountry,
        name: raw,
        lat: null,
        lon: null
      };
    }

    return eibiSites[hostCountry] || {
      code: "",
      country: hostCountry,
      name: raw,
      lat: null,
      lon: null
    };
  }

  return eibiSites[`${country}:${raw}`] || {
    code: raw,
    country,
    name: raw,
    lat: null,
    lon: null
  };
}

module.exports = {
  loadEibiSites,
  resolveEibiSite
};