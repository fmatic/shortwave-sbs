const fs = require("fs");
const path = require("path");

const {
    loadEibiSites,
    resolveEibiSite
} = require("./eibi-lookups");

const { formatDays } = require("./day-utils");

const inputPath = path.join(
    __dirname,
    "..",
    "sources",
    "eibi.csv"
);

const metadataPath = path.join(
    __dirname,
    "..",
    "sources",
    "eibi.txt"
);

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

function parseEnglishDate(value) {
    const match = String(value || "")
        .trim()
        .match(
            /([A-Za-z]{3,9})\s+(\d{1,2}),\s+(\d{4})/i
        );

    if (!match) {
        return "";
    }

    const month =
        monthNumbers[match[1].slice(0, 3).toLowerCase()];

    if (!month) {
        return "";
    }

    const day = match[2].padStart(2, "0");
    const year = match[3];

    return `${year}-${month}-${day}`;
}

function readEibiMetadata() {
    const fallback = {
        season: "",
        publishedAt: "",
        validFrom: "",
        validUntil: "",
        label: "EiBi release information unavailable"
    };

    if (!fs.existsSync(metadataPath)) {
        console.warn(
            "EiBi metadata file missing:",
            metadataPath
        );

        return fallback;
    }

    const raw = fs.readFileSync(
        metadataPath,
        "latin1"
    );

    const firstLine =
        raw.split(/\r?\n/)[0]?.trim() || "";

    const seasonMatch = firstLine.match(
        /\b([AB]\d{2})\b/i
    );

    const validityMatch = raw.match(
        /Valid\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})\s*-\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/i
    );

    const updateMatch = raw.match(
        /Last\s+update:\s*([A-Za-z]+\s+\d{1,2},\s+\d{4})/i
    );

    const season = seasonMatch
        ? seasonMatch[1].toUpperCase()
        : "";

    const publishedAt = updateMatch
        ? parseEnglishDate(updateMatch[1])
        : "";

    const validFrom = validityMatch
        ? parseEnglishDate(validityMatch[1])
        : "";

    const validUntil = validityMatch
        ? parseEnglishDate(validityMatch[2])
        : "";

    return {
        season,
        publishedAt,
        validFrom,
        validUntil,
        label: [
            "EiBi",
            season,
            publishedAt
        ].filter(Boolean).join(" • ")
    };
}

function detectBand(freqKHz) {
    if (freqKHz >= 2300 && freqKHz <= 2495)
        return "120m";

    if (freqKHz >= 3200 && freqKHz <= 3400)
        return "90m";

    if (freqKHz >= 3900 && freqKHz <= 4000)
        return "75m";

    if (freqKHz >= 4750 && freqKHz <= 5060)
        return "60m";

    if (freqKHz >= 5900 && freqKHz <= 6200)
        return "49m";

    if (freqKHz >= 7200 && freqKHz <= 7600)
        return "41m";

    if (freqKHz >= 9400 && freqKHz <= 9900)
        return "31m";

    if (freqKHz >= 11600 && freqKHz <= 12100)
        return "25m";

    if (freqKHz >= 13570 && freqKHz <= 13870)
        return "22m";

    if (freqKHz >= 15100 && freqKHz <= 15800)
        return "19m";

    if (freqKHz >= 17480 && freqKHz <= 17900)
        return "16m";

    if (freqKHz >= 21450 && freqKHz <= 21850)
        return "13m";

    if (freqKHz >= 25670 && freqKHz <= 26100)
        return "11m";

    return "";
}

function importEibi() {
    const metadata = readEibiMetadata();
    const schedules = [];

    /*
     * Meta liitetään taulukkoon, joten nykyinen import.js
     * voi edelleen käyttää:
     *
     * schedules.push(...importEibi());
     */

   
   if (!fs.existsSync(inputPath)) {
    console.warn("EiBi file missing:", inputPath);

    return {
        schedules,
        meta: metadata
    };
}
    const eibiSites = loadEibiSites();

    const raw = fs.readFileSync(
        inputPath,
        "latin1"
    );

    const lines = raw
        .split(/\r?\n/)
        .filter(Boolean);

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const cols = line.split(";");

        if (cols.length < 10) {
            continue;
        }

        const freqKHz = parseFloat(cols[0]);
        const time = cols[1] || "";
        const [start, end] = time.split("-");

        if (!freqKHz || !start || !end) {
            continue;
        }

        const txCode = cols[7] || "";

        const site = resolveEibiSite(
            txCode,
            cols[3],
            eibiSites
        );

        const schedule = {
            freq: Math.round(freqKHz),
            start: start || "",
            end: end || "",

            days: cols[2] || "",
            daysLabel: formatDays(cols[2] || ""),

            country: cols[3] || "",
            station: cols[4] || "",
            language: cols[5] || "",
            target: cols[6] || "",

            txCode,
            txSite: site?.name || txCode,
            txCountry: site?.country || "",
            txLat: site?.lat || null,
            txLon: site?.lon || null,

            type: cols[8] || "",
            startDate: cols[9] || "",
            endDate: cols[10] || "",
            remarks: cols[11] || "",

            band: detectBand(
                Math.round(freqKHz)
            ),

            source: "EiBi"
        };

        schedules.push(schedule);
    }

    console.log(
        `EiBi: ${schedules.length} rows`
    );

    console.log(
        `EiBi release: ${metadata.label}`
    );

    if (metadata.validFrom || metadata.validUntil) {
        console.log(
            `EiBi validity: ` +
            `${metadata.validFrom || "unknown"} – ` +
            `${metadata.validUntil || "unknown"}`
        );
    }

    return {
    schedules,
    meta: metadata
};
}

module.exports = {
    importEibi
};