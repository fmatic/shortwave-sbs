const fs = require("fs/promises");

const OUTPUT = "data/space-weather.json";

async function fetchJson(url) {
    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${url}`);
    }

    return res.json();
}

async function fetchText(url) {
    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${url}`);
    }

    return res.text();
}

function parseSolarRadioFlux(text) {
    const lines = text.split(/\r?\n/);

    let lastValid = null;

    for (const line of lines) {
        const trimmed = line.trim();

        // 2800 MHz = Solar Flux
        if (!trimmed.startsWith("2800")) {
            continue;
        }

        const parts = trimmed.split(/\s+/);

        // Ensimmäinen arvo on "2800"
        // Loput ovat mittausasemia
        const values = parts
            .slice(1)
            .map(v => Number(v))
            .filter(v => !Number.isNaN(v) && v > 0);

        if (values.length) {
            // käytetään viimeistä validia mittausta
            lastValid = values.at(-1);
        }
    }

    return lastValid;
}

function classifyXray(flux) {
    if (!flux)
        return "unknown";

    if (flux >= 1e-4)
        return "X-class flare";
    if (flux >= 1e-5)
        return "M-class flare";
    if (flux >= 1e-6)
        return "C-class flare";
    if (flux >= 1e-7)
        return "B-class";
    return "quiet";
}

function classifyBands(kp, sfi) {
    let lowBands = "fair";
    let midBands = "good";
    let highBands = "fair";

    if (kp >= 5) {
        lowBands = "poor";
        midBands = "poor";
        highBands = "unstable";
    } else if (sfi >= 150) {
        highBands = "excellent";
        midBands = "excellent";
    } else if (sfi >= 120) {
        highBands = "good";
        midBands = "very good";
    } else if (sfi < 90) {
        highBands = "poor";
        midBands = "fair";
        lowBands = "good";
    }

    return {
        lowBands,
        midBands,
        highBands
    };
}

async function main() {
    console.log("Fetching NOAA space weather data...");

    const kpData = await fetchJson(
            "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json");

    const latestKp = kpData
        .filter(row => row && typeof row.Kp !== "undefined")
        .at(-1);

    console.log("Latest Kp row:", latestKp);

    const kp = Number(latestKp?.Kp || 0);
    const aIndex = Number(latestKp?.a_running || 0);

    const fluxText = await fetchText(
            "https://services.swpc.noaa.gov/text/solar_radio_flux.txt");

    const sfi = parseSolarRadioFlux(fluxText);
    const xrayData = await fetchJson(
            "https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json");

    const latestXray = xrayData
        .filter(row => row.energy === "0.1-0.8nm" && typeof row.flux === "number")
        .at(-1);

    const xrayFlux = latestXray?.flux || null;
    const xray = classifyXray(xrayFlux);
    const hf = classifyBands(kp, sfi || 100);

    const output = {
        updated: new Date().toISOString(),
        kp,
        sfi,
        aIndex,
        xray,
        xrayFlux,
        aurora: kp >= 5,
        hf
    };

    await fs.writeFile(OUTPUT, JSON.stringify(output, null, 2), "utf8");

    console.log("space-weather.json updated");
    console.log(output);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});