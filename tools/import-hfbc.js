const fs = require("fs/promises");
const fsSync = require("fs");

const INPUT = "sources/hfbc.txt";
const OUTPUT = "data/hfbc.json";
const SITE_INPUT = "sources/hfbc-site.txt";
const BROADCASTER_INPUT = "sources/hfbc-broadcas.txt";
const CIRAF_INPUT = "sources/hfbc-ciraf.txt";

const monthNumbers = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12"
};

function parseHfbcDate(value) {
    const match = String(value || "").match(
            /(\d{1,2})-([A-Za-z]{3})-(\d{4})/i);

    if (!match) {
        return "";
    }

    const day = match[1].padStart(2, "0");
    const month = monthNumbers[match[2].toLowerCase()];
    const year = match[3];

    if (!month) {
        return "";
    }

    return `${year}-${month}-${day}`;
}

function readHfbcMetadata(text) {
    const fallback = {
        season: "",
        notifyingOrg: "",
        publishedAt: "",
        createdAt: "",
        label: "HFBC release information unavailable"
    };

    const header = String(text || "")
        .split(/\r?\n/)
        .slice(0, 15)
        .join("\n");

    const releaseMatch = header.match(
            /^;\s*([AB]\d{2})\s+([A-Z0-9_-]+)\s+(\d{1,2}-[A-Za-z]{3}-\d{4})/im);

    const createdMatch = header.match(
            /Created\s+by\s+ITU\s+eHFBC\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/i);

    const season = releaseMatch
         ? releaseMatch[1].toUpperCase()
         : "";

    const notifyingOrg = releaseMatch
         ? releaseMatch[2].toUpperCase()
         : "";

    const publishedAt = releaseMatch
         ? parseHfbcDate(releaseMatch[3])
         : "";

    const createdAt = createdMatch
         ? `${createdMatch[1]}T${createdMatch[2]}`
         : "";

    if (!season && !publishedAt) {
        console.warn(
            "HFBC release information could not be detected");

        return fallback;
    }

    return {
        season,
        notifyingOrg,
        publishedAt,
        createdAt,
        label: [
            "HFBC",
            season,
            publishedAt
        ].filter(Boolean).join(" • ")
    };
}

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
        if (freq >= min && freq <= max)
            return band;
    }

    return "";
}

function parseCoord(value) {
    const match = String(value || "").match(/^(\d{2,3})([NSWE])(\d{2})$/i);
    if (!match)
        return "";

    const deg = Number(match[1]);
    const hemi = match[2].toUpperCase();
    const min = Number(match[3]);

    let decimal = deg + min / 60;

    if (hemi === "S" || hemi === "W") {
        decimal *= -1;
    }

    return Number(decimal.toFixed(4));
}

function parseCirafCoord(value) {
    const match = String(value || "").match(/^(\d{1,3})([NSEW])$/i);
    if (!match)
        return "";

    let decimal = Number(match[1]);
    const hemi = match[2].toUpperCase();

    if (hemi === "S" || hemi === "W") {
        decimal *= -1;
    }

    return decimal;
}

function parseCirafLine(line) {
    if (!line.trim() || line.startsWith(";"))
        return null;

    const parts = line.trim().split(/\s+/);
    if (parts.length < 5)
        return null;
    if (!/^\d+$/.test(parts[0]))
        return null;

    return {
        point: parts[0],
        zone: parts[1],
        quadrant: parts.length === 6 ? parts[2] : "",
        subPoint: parts.length === 6 ? parts[3] : parts[2],
        lat: parseCirafCoord(parts[parts.length - 2]),
        lon: parseCirafCoord(parts[parts.length - 1])
    };
}

async function loadCirafLookup() {
    const text = await fs.readFile(CIRAF_INPUT, "utf8");
    const map = new Map();

    for (const line of text.split(/\r?\n/)) {
        const item = parseCirafLine(line);

        if (!item)
            continue;

        if (!map.has(item.zone)) {
            map.set(item.zone, []);
        }

        map.get(item.zone).push(item);
    }

    return map;
}

function resolveCirafTarget(target, cirafLookup) {
    return String(target || "")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean)
    .map(zone => ({
            zone,
            points: cirafLookup.get(zone) || []
        }));
}

function parseSiteLine(line) {
    if (!line.trim() || line.startsWith(";"))
        return null;

    const parts = line.trim().split(/\s+/);
    if (parts.length < 5)
        return null;

    const code = parts[0];

    const latIndex = parts.findIndex(part => /^\d{2}[NS]\d{2}$/i.test(part));
    const lonIndex = parts.findIndex(part => /^\d{3}[EW]\d{2}$/i.test(part));

    if (latIndex === -1 || lonIndex === -1)
        return null;

    const country = parts[latIndex - 1] || "";
    const name = parts.slice(1, latIndex - 1).join(" ");

    return {
        code,
        name,
        country,
        lat: parseCoord(parts[latIndex]),
        lon: parseCoord(parts[lonIndex])
    };
}

function parseBroadcasterLine(line) {
    if (!line.trim() || line.startsWith(";"))
        return null;

    const parts = line.trim().split(/\s+/);
    if (parts.length < 2)
        return null;

    const code = parts[0];

    if (!/^[A-Z0-9]{2,4}$/.test(code))
        return null;

    return {
        code,
        name: parts.slice(1).join(" ").trim()
    };
}

async function loadBroadcasterLookup() {
    const text = await fs.readFile(BROADCASTER_INPUT, "utf8");
    const map = new Map();

    for (const line of text.split(/\r?\n/)) {
        const item = parseBroadcasterLine(line);

        if (item) {
            map.set(item.code, item);
        }
    }

    return map;
}

async function loadSiteLookup() {
    const text = await fs.readFile(SITE_INPUT, "utf8");
    const map = new Map();

    for (const line of text.split(/\r?\n/)) {
        const site = parseSiteLine(line);

        if (site) {
            map.set(site.code, site);
        }
    }

    return map;
}

function parseHfbcLine(line, siteLookup, broadcasterLookup, cirafLookup) {
    if (!line.trim())
        return null;
    if (line.startsWith(";"))
        return null;

    const parts = line.trim().split(/\s+/);

    if (parts.length < 18)
        return null;
    if (!/^\d+$/.test(parts[0]))
        return null;

    const freq = Number(parts[0]);
    const txCode = parts[4];
    const site = siteLookup.get(txCode);

    let language = parts[14] || "";
    let admin = parts[15] || "";
    let broadcasterCode = parts[16] || "";
    let orgCode = parts[17] || "";

    if (
        /^[A-Z]{3}$/.test(language) &&
        /^[A-Z0-9]{2,4}$/.test(admin) &&
        !broadcasterLookup.has(broadcasterCode)) {
        admin = language;
        broadcasterCode = parts[15] || "";
        orgCode = parts[16] || "";
        language = "";
    }

    const broadcaster =
        broadcasterLookup.get(broadcasterCode) ||
        broadcasterLookup.get(orgCode);
    const cirafZones = resolveCirafTarget(parts[3], cirafLookup);

    return {
        freq,
        start: parts[1],
        end: parts[2],
        target: parts[3],
        cirafZones,

        txCode,
        txSite: site?.name || "",
        txCountry: site?.country || admin || "",
        txLat: site?.lat || "",
        txLon: site?.lon || "",

        power: parts[5],
        azimuth: parts[6],
        slew: parts[7],
        antenna: parts[8],
        days: parts[9],
        fromDate: parts[10],
        toDate: parts[11],
        modulation: parts[12],
        altFreq: parts[13],
        language,
        country: admin,
        broadcaster: broadcasterCode,
        org: orgCode,
        broadcasterName: broadcaster?.name || "",
        station: broadcaster?.name || broadcasterCode || orgCode || parts[15] || "HFBC",
        requestId: parts[18] || "",
        type: "Broadcast",
        band: getBand(freq),
        remarks: parts.slice(19).join(" "),
        source: "HFBC"
    };
}

async function main() {
    const siteLookup = await loadSiteLookup();
    const broadcasterLookup = await loadBroadcasterLookup();
    const cirafLookup = await loadCirafLookup();
    const text = await fs.readFile(INPUT, "utf8");
    const metadata = readHfbcMetadata(text);

    const schedules = text
        .split(/\r?\n/)
        .map(line => parseHfbcLine(line, siteLookup, broadcasterLookup, cirafLookup))
        .filter(Boolean)
        .filter(item => item.band);

    await fs.writeFile(
        OUTPUT,
        JSON.stringify({
            generatedAt: new Date().toISOString(),
            source: "HFBC",
            count: schedules.length,
            meta: metadata,
            schedules
        },
            null,
            2),
        "utf8");

    console.log(`HFBC imported: ${schedules.length} schedules`);
    console.log(`HFBC sites loaded: ${siteLookup.size}`);
    console.log(`HFBC broadcasters loaded: ${broadcasterLookup.size}`);
    console.log(`HFBC CIRAF zones loaded: ${cirafLookup.size}`);
    console.log(`Written: ${OUTPUT}`);
    console.log(`HFBC release: ${metadata.label}`);

    if (metadata.createdAt) {
        console.log(`HFBC created: ${metadata.createdAt}`);
    }
}

function importHfbc() {
    const fallbackMeta = {
        season: "",
        notifyingOrg: "",
        publishedAt: "",
        createdAt: "",
        label: "HFBC release information unavailable"
    };

    if (!fsSync.existsSync(OUTPUT)) {
        console.warn("HFBC JSON file missing:", OUTPUT);

        return {
            schedules: [],
            meta: fallbackMeta
        };
    }

    const raw = fsSync.readFileSync(OUTPUT, "utf8");
    const data = JSON.parse(raw);

    return {
        schedules: data.schedules || [],
        meta: data.meta || fallbackMeta
    };
}

module.exports = {
    importHfbc
};

if (require.main === module) {
    main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}