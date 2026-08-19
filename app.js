let allSchedules = [];
let userLocation = null;
let spaceWeather = null;

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

const locationProfiles = {
    "Northern Europe": {
        lat: 62.0,
        lon: 25.0,
        label: "Northern Europe profile"
    },
    "Central Europe": {
        lat: 50.0,
        lon: 10.0,
        label: "Central Europe profile"
    },
    "Southern Europe": {
        lat: 41.0,
        lon: 12.0,
        label: "Southern Europe profile"
    },
    "North America": {
        lat: 40.0,
        lon: -95.0,
        label: "North America profile"
    },
    "South America": {
        lat: -15.0,
        lon: -60.0,
        label: "South America profile"
    },
    "East Asia": {
        lat: 35.0,
        lon: 135.0,
        label: "East Asia profile"
    },
    "Oceania": {
        lat: -25.0,
        lon: 135.0,
        label: "Oceania profile"
    }
};

const sectionConfig = {
    assistant: "DX Assistant",
    bandLive: "Band Live",
    activity: "HF Activity Now",
    insights: "Best DX Targets / Snapshot",
    spaceWeather: "HF Propagation Info",
    bestDx: "Best DX Now",
    conditions: "HF Conditions",
    controls: "Search and filters",
    table: "Schedule table"
};

const sectionLayouts = {

    minimal: [
        "assistant",
        "controls",
        "table"
    ],

    monitoring: [
        "assistant",
        "bandLive",
        "spaceWeather",
        "conditions",
        "controls",
        "table"
    ],

    dx: [
        "assistant",
        "bandLive",
        "spaceWeather",
        "conditions",
        "bestDx",
        "insights",
        "controls",
        "table"
    ],

    statistics: [
        "assistant",
        "bandLive",
        "activity",
        "insights",
        "spaceWeather"
    ],

    everything: Object.keys(sectionConfig)

};

const bandOrder = Object.keys(bandRanges);

// Els-object

const els = {
    dxAssistantTitle: document.getElementById("dxAssistantTitle"),
    dxAssistantStatus: document.getElementById("dxAssistantStatus"),
    dxAssistantMain: document.getElementById("dxAssistantMain"),
    dxAssistantTips: document.getElementById("dxAssistantTips"),
    utcClock: document.getElementById("utcClock"),
    dataInfo: document.getElementById("dataInfo"),
    searchInput: document.getElementById("searchInput"),
    bandSelect: document.getElementById("bandSelect"),
    onAirOnly: document.getElementById("onAirOnly"),
    scheduleBody: document.getElementById("scheduleBody"),
    bandTitle: document.getElementById("bandTitle"),
    bandRange: document.getElementById("bandRange"),
    bandFill: document.getElementById("bandFill"),
    bandActive: document.getElementById("bandActive"),
    activityBands: document.getElementById("activityBands"),
    detailModal: document.getElementById("detailModal"),
    modalClose: document.getElementById("modalClose"),
    modalStation: document.getElementById("modalStation"),
    modalMeta: document.getElementById("modalMeta"),
    targetList: document.getElementById("targetList"),
    activeCountries: document.getElementById("activeCountries"),
    activeStations: document.getElementById("activeStations"),
    sourceToggles: document.querySelectorAll(".sourceToggle"),
    sourceInfoBtn: document.getElementById("sourceInfoBtn"),
    sourceInfoPanel: document.getElementById("sourceInfoPanel"),
    autoBandBtn: document.getElementById("autoBandBtn"),
    bandReason: document.getElementById("bandReason"),
    aboutBtn: document.getElementById("aboutBtn"),
    aboutModal: document.getElementById("aboutModal"),
    aboutClose: document.getElementById("aboutClose"),
    locationBtn: document.getElementById("locationBtn"),
    regionSelect: document.getElementById("regionSelect"),
    conditionLocation: document.getElementById("conditionLocation"),
    pathMode: document.getElementById("pathMode"),
    conditionBands: document.getElementById("conditionBands"),
    bestDxList: document.getElementById("bestDxList"),
    spaceWeatherUpdated: document.getElementById("spaceWeatherUpdated"),
    swKp: document.getElementById("swKp"),
    swSfi: document.getElementById("swSfi"),
    swXray: document.getElementById("swXray"),
    swAurora: document.getElementById("swAurora"),
    swBandSummary: document.getElementById("swBandSummary"),
    mapLink: document.getElementById("mapLink"),
    sectionsBtn: document.getElementById("sectionsBtn"),
    sectionsModal: document.getElementById("sectionsModal"),
    sectionsClose: document.getElementById("sectionsClose"),
    sectionsList: document.getElementById("sectionsList"),
    sectionsReset: document.getElementById("sectionsReset"),
    currentLayoutName: document.getElementById("currentLayoutName"),
    dxAssistantTargets: document.getElementById("dxAssistantTargets"),
    dataLoadWarning:
    document.getElementById("dataLoadWarning"),

    dataLoadWarningText:
    document.getElementById("dataLoadWarningText"),

    dataLoadRetry:
    document.getElementById("dataLoadRetry"),

    dataLoadWarningClose:
    document.getElementById("dataLoadWarningClose"),
};

const failedDataResources = new Set();

function getDataResourceLabel(resource) {
    const labels = {
        schedules: "broadcast schedules",
        spaceWeather: "space weather data",
        map: "map data",
        transmitterSites: "transmitter-site data"
    };

    return labels[resource] || resource;
}

function renderDataLoadWarning() {
    if (
        !els.dataLoadWarning ||
        !els.dataLoadWarningText) {
        return;
    }

    if (!failedDataResources.size) {
        els.dataLoadWarning.classList.add("hidden");
        return;
    }

    const resources = [...failedDataResources]
    .map(getDataResourceLabel);

    let resourceText = "";

    if (resources.length === 1) {
        resourceText = resources[0];
    } else if (resources.length === 2) {
        resourceText =
`${resources[0]} and ${resources[1]}`;
    } else {
        resourceText =
            `${resources.slice(0, -1).join(", ")} ` + 
`and ${resources.at(-1)}`;
    }

    els.dataLoadWarningText.textContent =
        `Unable to load ${resourceText}. ` + 
        `A browser extension, privacy tool or temporary network ` + 
        `problem may be blocking required resources. ` + 
        `shortwave.sbs contains no advertisements or ` + 
`advertising trackers.`;

    els.dataLoadWarning.classList.remove("hidden");
}

function markDataLoadFailed(resource, error) {
    failedDataResources.add(resource);
    renderDataLoadWarning();

    console.warn(
`Could not load ${resource}:`,
        error);
}

function markDataLoadSuccessful(resource) {
    failedDataResources.delete(resource);
    renderDataLoadWarning();
}

function getAssistantOpening(band, mode, score) {

    const openings = [];

    if (score >= 120) {
        openings.push(
            `I'd definitely start on ${band}.`, 
            `${band} is calling right now.`, 
`If I were tuning the bands, I'd begin with ${band}.`);
    } else if (score >= 90) {
        openings.push(
            `${band} looks like today's sweet spot.`, 
            `I'd spend some time on ${band}.`, 
`${band} is worth checking first.`);
    } else {
        openings.push(
            `${band} is probably your best bet right now.`, 
            `Nothing spectacular yet, but ${band} has the edge.`, 
`Let's begin with ${band}.`);
    }

    return openings[
        Math.floor(Math.random() * openings.length)
    ];
}

function getAssistantWhyTitle() {

    const titles = [

        "Why this recommendation?",

        "Why I'm suggesting this?",

        "Here's what caught my eye!",

        "Why this band stands out?",

        "What's behind this suggestion?",

        "Here's my thinking...",

        "Let's look at the evidence!",

        "Why I'd start here?",

        "Why this one looks promising?",

        "What makes this interesting?"

    ];

    // Harvinainen yllätys (~3 %)

    if (Math.random() < 0.03) {

        const easterEggs = [

            "🕵️ DX detective notes",

            "☕ Coffee break analysis",

            "📻 The band whispered something",

            "🛰️ Signals don't lie",

            "🤫 Between you and me...",

            "🎯 My DX instinct",

            "🧭 Compass says this way",

            "📖 A page from the DX logbook",

            "🌍 Somewhere, a transmitter is waiting",

            "🎧 Put the headphones on...",
            "🖖 Heading, sir?"

        ];

        return easterEggs[
            Math.floor(Math.random() * easterEggs.length)
        ];
    }

    return titles[
        Math.floor(Math.random() * titles.length)
    ];
}

function getAssistantMood(
    mode,
    score,
    activeCount,
    targets) {
    const kp = Number(spaceWeather?.kp);
    const xray = String(
            spaceWeather?.xray || "").toLowerCase();

    const greylineCount = targets.filter(
            target =>
            target.awareness?.label ===
            "Greyline potential").length;

    /*
     * Vakava avaruussää ohittaa muut tunnelmat.
     */
    if (
        (Number.isFinite(kp) && kp >= 5) ||
        xray.includes("x-class")) {
        return "storm";
    }

    /*
     * Twilight ja vähintään kaksi laskennallista
     * greyline-kohdetta.
     */
    if (
        mode === "Twilight" &&
        greylineCount >= 2) {
        return "greyline";
    }

    /*
     * Selvästi vahva suositus ja olosuhteet eivät
     * ole geomagneettisesti levottomat.
     */
    if (
        score >= 115 &&
        (!Number.isFinite(kp) || kp <= 3)) {
        return "excellent";
    }

    /*
     * Tavallista hiljaisempi tilanne.
     */
    if (
        activeCount < 12 ||
        score < 55) {
        return "quiet";
    }

    if (mode === "Night") {
        return "night";
    }

    return "good";
}

function getAssistantTitle(mode, mood) {
    const titlesByMood = {
        storm: [
            "⚠️ Space Weather Watch",
            "📡 Disturbed Band Watch",
            "◉ DX Assistant"
        ],

        greyline: [
            "🌅 Greyline Watch",
            "🧭 Twilight Listening Desk",
            "📻 Greyline Desk",
            "◉ DX Assistant"
        ],

        excellent: [
            "🎯 DX Opportunity Desk",
            "📡 Band Watch",
            "🎧 Listening Guide",
            "◉ DX Assistant"
        ],

        quiet: [
            "☕ Quiet Band Watch",
            "🎧 Patient Listener",
            "📻 Band Observer",
            "◉ DX Assistant"
        ],

        night: [
            "🌙 Night Watch",
            "📻 Lower Band Desk",
            "🎧 After-Dark Listening",
            "◉ DX Assistant"
        ],

        good: [
            "📡 HF Observer",
            "🎧 Listening Guide",
            "🧭 Band Watch",
            "◉ DX Assistant"
        ]
    };

    const titles =
        titlesByMood[mood] ||
        ["◉ DX Assistant"];

    return titles[
        Math.floor(Math.random() * titles.length)
    ];
}

function getAssistantGreeting(mood, band) {
    const greetingsByMood = {
        storm: [
            "🌞 Space weather is keeping things interesting today.",
            "⚠️ The ionosphere is having one of those days.",
            "📡 Conditions are disturbed, so let's keep expectations realistic."
        ],

        greyline: [
            "🌅 Welcome back. Greyline is starting to look interesting.",
            "👀 This is one of my favourite times to check the bands.",
            "🎧 Twilight is changing the picture nicely."
        ],

        excellent: [
            "😎 Welcome back. This could be one of those sessions.",
            "📻 The bands are giving us something to work with today.",
            "🎯 Good timing — the current picture looks promising."
        ],

        quiet: [
            "☕ Welcome back. Let's see what the quieter bands are hiding.",
            "🎧 Nothing is shouting for attention, but let's have a look.",
            "📻 A quiet band can still reward a patient listener."
        ],

        night: [
            "🌙 Welcome back. The lower bands are taking over.",
            "🎧 A good time to slow down and listen carefully.",
            "📻 Night-time HF has its own kind of magic."
        ],

        good: [
            "👋 Good to see you.",
            "📻 Ready for another DX session?",
            "🎧 Let's see what's happening on the bands.",
            "📡 I've been watching the bands for you."
        ]
    };

    const greetings =
        greetingsByMood[mood] ||
        greetingsByMood.good;

    return greetings[
        Math.floor(Math.random() * greetings.length)
    ];
}

function getAssistantClosing() {

    const endings = [

        "Good luck and happy DXing!",

        "Let's see what you can catch.",

        "One good ID can make the whole day.",

        "Enjoy the bands!",

        "Keep your ears open.",

        "I hope something surprising appears.",

        "Don't forget to check neighbouring frequencies."

    ];

    return endings[
        Math.floor(Math.random() * endings.length)
    ];
}

function getAssistantHumour() {

    if (Math.random() > 0.15) {
        return "";
    }

    const jokes = [

        "☕ Coffee might last longer than today's opening.",

        "🍕 Even yesterday's cold pizza might be better than today's opening.",

        "📻 Don't blame your antenna this time.",

        "🌍 Solar storms rarely read the rulebook.",

        "😄 Sometimes the band chooses you.",

        "🎧 Headphones recommended.",

        "📡 Somewhere a transmitter engineer is making your evening better.",

        "🤫 Don't tell the other bands... but this one looks confident today.",

        "🛰️ I promise I didn't move the ionosphere."

    ];

    return jokes[
        Math.floor(Math.random() * jokes.length)
    ];
}

function getAssistantEncouragement() {

    const texts = [

        "Every great logbook starts with one frequency.",

        "Patience often beats perfect conditions.",

        "Even quiet bands can surprise you.",

        "The next station might be the memorable one.",

        "Some of the best catches happen when you least expect them.",

        "DX rewards curiosity.",

        "Keep tuning."

    ];

    return texts[
        Math.floor(Math.random() * texts.length)
    ];
}

function getAssistantSessionValue(key, generator) {
    const storageKey = `dxAssistant:${key}`;

    try {
        const saved = sessionStorage.getItem(storageKey);

        if (saved !== null) {
            return saved;
        }

        const value = generator();

        sessionStorage.setItem(
            storageKey,
            String(value ?? ""));

        return value;
    } catch (error) {
        console.warn(
            "Assistant session storage unavailable:",
            error);

        return generator();
    }
}

const ASSISTANT_SNAPSHOT_KEY =
    "dxAssistant:lastSnapshot";

const ASSISTANT_BASELINE_KEY =
    "dxAssistant:sessionBaseline";

function loadAssistantSnapshot() {
    try {
        const raw =
            localStorage.getItem(
                ASSISTANT_SNAPSHOT_KEY);

        if (!raw) {
            return null;
        }

        const snapshot =
            JSON.parse(raw);

        if (
            !snapshot ||
            typeof snapshot !== "object") {
            return null;
        }

        return snapshot;
    } catch (error) {
        console.warn(
            "Could not load Assistant snapshot:",
            error);

        return null;
    }
}

function saveAssistantSnapshot(snapshot) {
    try {
        localStorage.setItem(
            ASSISTANT_SNAPSHOT_KEY,
            JSON.stringify({
                ...snapshot,
                timestamp: Date.now()
            }));
    } catch (error) {
        console.warn(
            "Could not save Assistant snapshot:",
            error);
    }
}

function getAssistantSessionBaseline() {
    try {
        const savedBaseline =
            sessionStorage.getItem(
                ASSISTANT_BASELINE_KEY);

        if (savedBaseline !== null) {
            return savedBaseline
             ? JSON.parse(savedBaseline)
             : null;
        }

        /*
         * Luetaan edellisen selainistunnon viimeinen
         * tilanne ja lukitaan se tämän istunnon
         * vertailukohdaksi.
         */
        const previousSnapshot =
            loadAssistantSnapshot();

        sessionStorage.setItem(
            ASSISTANT_BASELINE_KEY,
            previousSnapshot
             ? JSON.stringify(previousSnapshot)
             : "");

        return previousSnapshot;
    } catch (error) {
        console.warn(
            "Could not create Assistant baseline:",
            error);

        return loadAssistantSnapshot();
    }
}

function getAssistantMemoryMessage(
    previous,
    current) {
    if (!previous) {
        return "";
    }

    const previousTime =
        Number(previous.timestamp);

    const currentTime =
        Number(current.timestamp);

    /*
     * Ei verrata hyvin vanhaan tilanteeseen.
     * Tässä raja on 48 tuntia.
     */
    if (
        Number.isFinite(previousTime) &&
        Number.isFinite(currentTime) &&
        currentTime - previousTime >
        48 * 60 * 60 * 1000) {
        return "";
    }

    if (
        previous.band &&
        current.band &&
        previous.band !== current.band) {
        return (
            `🔄 Things have changed since your last visit — ` + 
            `${current.band} has taken the lead from ` + 
`${previous.band}.`);
    }

    const previousActive =
        Number(previous.activeCount);

    const currentActive =
        Number(current.activeCount);

    if (
        Number.isFinite(previousActive) &&
        Number.isFinite(currentActive)) {
        const difference =
            currentActive - previousActive;

        if (difference >= 10) {
            return (
                `📈 ${current.band} has gained ` + 
                `${difference} active broadcasts ` + 
`since your last visit.`);
        }

        if (difference <= -10) {
            return (
                `📉 ${current.band} has become noticeably ` + 
                `quieter since your last visit, with ` + 
`${Math.abs(difference)} fewer active broadcasts.`);
        }
    }

    const previousScore =
        Number(previous.score);

    const currentScore =
        Number(current.score);

    if (
        Number.isFinite(previousScore) &&
        Number.isFinite(currentScore)) {
        const scoreChange =
            currentScore - previousScore;

        if (scoreChange >= 15) {
            return (
                `👀 ${current.band} looks considerably stronger ` + 
`than it did during your previous visit.`);
        }

        if (scoreChange <= -15) {
            return (
                `📡 ${current.band} is still leading, but the ` + 
                `calculated conditions have weakened since ` + 
`your previous visit.`);
        }
    }

    return "";
}

function getAssistantAnalysis(band, mode, activeCount) {

    const parts = [];

    if (mode === "Night") {
        parts.push(
            "Night-time propagation currently favours the lower shortwave bands.");
    }

    if (mode === "Twilight") {
        parts.push(
            "Greyline conditions are developing and can produce surprisingly long paths.");
    }

    if (mode === "Day") {
        parts.push(
            "Daylight propagation is supporting the higher HF bands.");
    }

    parts.push(
`${activeCount} broadcasts are currently active on ${band}.`);

    if (spaceWeather) {

        const kp = Number(spaceWeather.kp || 0);
        const sfi = Number(spaceWeather.sfi || 100);

        if (kp <= 2)
            parts.push(
                "Geomagnetic conditions are nice and quiet.");

        if (kp >= 5)
            parts.push(
                "Geomagnetic activity may make long paths less predictable.");

        if (sfi >= 140)
            parts.push(
                "Solar flux is helping the higher frequencies.");
    }

    return parts.join(" ");
}

function getAssistantOperatorNote(band) {
    const uniqueFrequencies = [
        ...new Set(
            getActiveBySources()
            .filter(item => item.band === band)
            .map(item => Number(item.freq))
            .filter(Number.isFinite))
    ]
    .sort((a, b) => a - b)
    .slice(0, 3);

    if (!uniqueFrequencies.length) {
        return "Nothing really stands out just yet.";
    }

    const formatted = uniqueFrequencies
        .map(freq => `${freq} kHz`);

    if (formatted.length === 1) {
        return `I'd check ${formatted[0]} first.`;
    }

    if (formatted.length === 2) {
        return `I'd check ${formatted[0]} and ${formatted[1]} first.`;
    }

    return `I'd check ${formatted[0]}, ${formatted[1]} and ${formatted[2]} first.`;
}

function getAssistantWhyReasons(
    band,
    mode,
    activeCount,
    score,
    targets) {
    const reasons = [];

    const greylineTargets = targets.filter(
            target =>
            target.awareness?.label ===
            "Greyline potential");

    const dominantRegion =
        getDominantAssistantRegion(targets);

    if (mode === "Twilight") {
        reasons.push({
            icon: "🌅",
            text:
            "Your receiving location is currently in twilight, " +
            "which can improve some long-distance paths."
        });
    }

    if (
        mode === "Night" &&
        ["120m", "90m", "75m", "60m", "49m", "41m"]
        .includes(band)) {
        reasons.push({
            icon: "🌙",
            text:
`${band} is well suited to the current ` +
            "night-time conditions."
        });
    }

    if (
        mode === "Day" &&
        ["31m", "25m", "22m", "19m", "16m"]
        .includes(band)) {
        reasons.push({
            icon: "☀️",
            text:
`${band} is currently favoured by daylight ` +
            "propagation."
        });
    }

    if (greylineTargets.length >= 2) {
        reasons.push({
            icon: "🌍",
            text:
`${greylineTargets.length} of the leading targets ` +
            "currently show greyline potential."
        });
    } else if (dominantRegion) {
        reasons.push({
            icon: "🧭",
            text:
            `Several of the strongest calculated paths point ` + 
`towards ${dominantRegion}.`
        });
    }

    if (activeCount >= 50) {
        reasons.push({
            icon: "📻",
            text:
            `${activeCount} broadcasts are currently active ` + 
`on ${band}.`
        });
    } else if (activeCount > 0) {
        reasons.push({
            icon: "📻",
            text:
            `${activeCount} broadcasts are currently available ` + 
`on ${band}.`
        });
    }

    if (spaceWeather) {
        const kp = Number(spaceWeather.kp);
        const sfi = Number(spaceWeather.sfi);

        if (Number.isFinite(kp)) {
            if (kp <= 2) {
                reasons.push({
                    icon: "🟢",
                    text:
`Geomagnetic activity is quiet at Kp ${kp}, ` +
                    "which supports more stable paths."
                });
            } else if (kp >= 5) {
                reasons.push({
                    icon: "⚠️",
                    text:
`Geomagnetic activity is elevated at Kp ${kp}, ` +
                    "so reception may be less predictable."
                });
            }
        }

        if (
            Number.isFinite(sfi) &&
            sfi >= 130 &&
            ["25m", "22m", "19m", "16m", "13m", "11m"]
            .includes(band)) {
            reasons.push({
                icon: "☀️",
                text:
`Solar flux is ${sfi}, which is supporting ` +
                "the higher HF bands."
            });
        }
    }

    if (score >= 110) {
        reasons.push({
            icon: "✓",
            text:
`${band} has the highest combined activity and ` +
            "propagation score right now."
        });
    }

    return reasons.slice(0, 4);
}

function getAssistantObservation(
    band,
    mode,
    activeCount,
    targets) {
    const observations = [];

    const dominantRegion =
        getDominantAssistantRegion(targets);

    const greylineCount = targets.filter(
            target =>
            target.awareness?.label ===
            "Greyline potential").length;

    const longDistanceCount = targets.filter(
            target =>
            Number(target.path?.distance || 0) >= 7000).length;

    if (
        mode === "Twilight" &&
        greylineCount >= 3) {
        observations.push(
`👀 ${greylineCount} of the leading targets currently show greyline potential.`);
    }

    if (
        dominantRegion &&
        targets.length >= 3) {
        observations.push(
`🧭 Most of the strongest calculated paths currently point towards ${dominantRegion}.`);
    }

    if (longDistanceCount >= 3) {
        observations.push(
`🌍 ${longDistanceCount} of the leading targets are more than 7,000 km away.`);
    }

    if (activeCount >= 70) {
        observations.push(
`📻 ${band} is especially busy right now, with ${activeCount} active broadcasts.`);
    }

    if (
        spaceWeather &&
        Number(spaceWeather.kp) >= 5) {
        observations.push(
`⚠️ Geomagnetic activity is elevated, so even the strongest paths may behave unpredictably.`);
    }

    if (!observations.length) {
        return "";
    }

    return observations[
        Math.floor(Math.random() * observations.length)
    ];
}

function getAssistantUnusual(
    best,
    rankedBands,
    targets) {
    const unusual = [];

    const kp = Number(spaceWeather?.kp);
    const topScores = targets
        .map(target => Number(target.score || 0))
        .filter(Number.isFinite);

    const longDistanceTargets = targets.filter(
            target =>
            Number(target.path?.distance || 0) >= 8000);

    const greylineTargets = targets.filter(
            target =>
            target.awareness?.label ===
            "Greyline potential");

    /*
     * Korkea Kp, mutta mukana on silti vahvoja pitkän matkan
     * laskennallisia kohteita. Emme väitä niiden kuuluvan,
     * vaan huomautamme ristiriidasta.
     */
    if (
        Number.isFinite(kp) &&
        kp >= 5 &&
        longDistanceTargets.length >= 2 &&
        topScores.some(score => score >= 110)) {
        unusual.push(
            "⚠️ This is interesting: geomagnetic activity is elevated, yet several long-distance targets still rank strongly on paper.");
    }

    /*
     * Suositeltu bandi voittaa toiseksi parhaan selvällä erolla.
     */
    const secondBest = rankedBands[1];

    if (
        secondBest &&
        best.score - secondBest.score >= 18) {
        unusual.push(
`📈 ${best.band} currently has an unusually clear lead over the other active bands.`);
    }

    /*
     * Kaikki neljä kärkikohdetta ovat greyline-kohteita.
     */
    if (
        targets.length >= 4 &&
        greylineTargets.length === targets.length) {
        unusual.push(
            "🌅 Every leading target currently shows greyline potential — a notably consistent pattern.");
    }

    /*
     * Tarkistetaan, onko samalla taajuudella useita aktiivisia
     * lähetyksiä suositellulla bandilla.
     */
    const frequencyCounts = new Map();

    getActiveBySources()
    .filter(item => item.band === best.band)
    .forEach(item => {
        const frequency = String(item.freq || "");

        if (!frequency) {
            return;
        }

        frequencyCounts.set(
            frequency,
            (frequencyCounts.get(frequency) || 0) + 1);
    });

    const crowdedFrequency = [...frequencyCounts.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])[0];

    if (crowdedFrequency) {
        const [frequency, count] = crowdedFrequency;

        unusual.push(
`🎧 ${frequency} kHz is unusually crowded right now, with ${count} active schedule entries sharing the frequency.`);
    }

    if (!unusual.length) {
        return "";
    }

    return unusual[
        Math.floor(Math.random() * unusual.length)
    ];
}

function applyLayout(name) {

    const layout = sectionLayouts[name];
    if (!layout)
        return;

    const state = {};

    Object.keys(sectionConfig).forEach(key => {
        state[key] = layout.includes(key);
    });

    saveSectionState(state);
    applySectionVisibility();
    renderSectionSettings();

    localStorage.setItem("swLayout", name);
    updateCurrentLayout();
}

function updateCurrentLayout() {
    if (!els.currentLayoutName)
        return;

    const current = localStorage.getItem("swLayout") || "custom";

    els.currentLayoutName.textContent =
        current.charAt(0).toUpperCase() + current.slice(1);

    document.querySelectorAll(".layout-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.layout === current);
    });
}

function updateClock() {
    const now = new Date();
    els.utcClock.textContent = now.toISOString().slice(11, 16) + " UTC";
}

function utcMinutesNow() {
    const now = new Date();
    return now.getUTCHours() * 60 + now.getUTCMinutes();
}

function updateMapLink() {
    const band = els.bandSelect.value;

    els.mapLink.href = band
         ? `map.html?band=${encodeURIComponent(band)}`
         : "map.html";
}

function timeToMinutes(value) {
    if (!value)
        return null;

    let v = String(value).trim();

    if (v === "2400")
        return 1440;
    if (v.length < 4)
        v = v.padStart(4, "0");

    const h = Number(v.slice(0, 2));
    const m = Number(v.slice(2, 4));

    if (Number.isNaN(h) || Number.isNaN(m))
        return null;

    return h * 60 + m;
}

function getAssistantTargets(band, limit = 4) {
    const selectedSources = getSelectedSources();

    const candidates = allSchedules
        .filter(item => {
            if (item.band !== band) {
                return false;
            }

            if (!isOnAir(item)) {
                return false;
            }

            if (!itemHasSelectedSource(item, selectedSources)) {
                return false;
            }

            return Boolean(
                item.station &&
                item.freq &&
                item.txLat &&
                item.txLon);
        })
        .map(item => {
            const path = getTxPathInfo(item);
            const awareness = getPathAwareness(item);
            const score = getDxScore(
                    item,
                    path,
                    awareness);

            return {
                item,
                path,
                awareness,
                score
            };
        })
        .filter(candidate => candidate.path.distance)
        .sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }

            return (
                (b.path.distance || 0) -
                (a.path.distance || 0));
        });

    const selected = [];
    const seenStations = new Set();
    const seenFrequencies = new Set();

    for (const candidate of candidates) {
        const stationKey = String(
                candidate.item.station || "")
            .trim()
            .toLowerCase();

        const frequencyKey = String(
                candidate.item.freq || "");

        if (
            seenStations.has(stationKey) ||
            seenFrequencies.has(frequencyKey)) {
            continue;
        }

        seenStations.add(stationKey);
        seenFrequencies.add(frequencyKey);
        selected.push(candidate);

        if (selected.length >= limit) {
            break;
        }
    }

    return selected;
}

function renderAssistantTargets(
    band,
    mode,
    activeCount) {
    if (!els.dxAssistantTargets) {
        return [];
    }

    const targets = getAssistantTargets(band);

    if (!targets.length) {
        els.dxAssistantTargets.innerHTML = `
            <div class="assistant-listening">
                <div class="assistant-listening-head">
                    <strong>Suggested listening</strong>
                </div>

                <div class="assistant-listening-empty">
                    No suitable transmitter targets with known
                    coordinates were found on ${escapeHtml(band)}.
                </div>
            </div>
        `;

        return [];
    }

    const title = getAssistantListeningTitle(mode);

    els.dxAssistantTargets.innerHTML = `
        <div class="assistant-listening">
            <div class="assistant-listening-head">
                <strong>${escapeHtml(title)}</strong>
                <span>
                    Ranked by path, distance and current conditions
                </span>
            </div>

            <div class="assistant-listening-rows">
                ${targets.map(({
                item,
                path,
                awareness,
                score
            }, index) => `
                    <button
                        class="assistant-listening-row"
                        type="button"
                        data-index="${index}"
                        aria-label="Open details for
                            ${escapeHtml(item.station)}
                            on ${escapeHtml(item.freq)} kilohertz">

                        <span class="assistant-listening-rank">
                            ${index + 1}
                        </span>

                        <span class="assistant-listening-station">
                            <span class="assistant-listening-name">
                                ${getFlagHtml(item.country)}
                                <strong>
                                    ${escapeHtml(
                item.station ||
                "Unknown station")}
                                </strong>
                            </span>

                            <span class="assistant-listening-meta">
                                ${path.distance.toLocaleString("en-US")} km
                                · ${escapeHtml(awareness.label)}
                            </span>
                        </span>

                        <span class="assistant-listening-frequency">
                            ${escapeHtml(item.freq)} kHz
                        </span>

                        <span
                            class="assistant-listening-score"
                            title="DX score">
                            ${score}
                        </span>
                    </button>
                `).join("")}
            </div>
        </div>
    `;

    els.dxAssistantTargets
    .querySelectorAll(".assistant-listening-row")
    .forEach((button, index) => {
        button.addEventListener("click", () => {
            showFrequencyDetails(
                targets[index].item);
        });
    });

    return targets;
}

function showAbout() {
    els.aboutModal.classList.remove("hidden");
}

function hideAbout() {
    els.aboutModal.classList.add("hidden");
}

function degToRad(deg) {
    return deg * Math.PI / 180;
}

function radToDeg(rad) {
    return rad * 180 / Math.PI;
}

function dayOfYear(date) {
    const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
    const diff = date - start;
    return Math.floor(diff / 86400000);
}

function getSolarElevationApprox(lat, lon) {
    const now = new Date();
    const day = dayOfYear(now);
    const hourUtc = now.getUTCHours() + now.getUTCMinutes() / 60;

    const decl = 23.44 * Math.sin(degToRad((360 / 365) * (day - 81)));
    const solarTime = hourUtc + lon / 15;
    const hourAngle = 15 * (solarTime - 12);

    const elevation = radToDeg(Math.asin(
                Math.sin(degToRad(lat)) * Math.sin(degToRad(decl)) +
                Math.cos(degToRad(lat)) * Math.cos(degToRad(decl)) * Math.cos(degToRad(hourAngle))));

    return elevation;
}

function getPathMode(elevation) {
    if (elevation > 8)
        return "Day";
    if (elevation > -6)
        return "Twilight";
    return "Night";
}

function getSolarModeForLocation(lat, lon) {
    const elevation = getSolarElevationApprox(lat, lon);
    return getPathMode(elevation);
}

function getSeason() {
    const month = new Date().getUTCMonth() + 1;

    if ([12, 1, 2].includes(month))
        return "winter";
    if ([6, 7, 8].includes(month))
        return "summer";

    return "transition";
}

function getSeasonalRegion(item) {
    const country = String(item.country || "").toUpperCase();
    const target = String(item.target || "").toUpperCase();
    const txCountry = String(item.txCountry || "").toUpperCase();

    const text = `${country} ${target} ${txCountry}`;

    if (/(B|ARG|BOL|CHL|CLM|EQA|PRU|URG|VEN|SAm|BRA)/i.test(text)) {
        return "south-america";
    }

    if (/(INS|MLA|MYS|PHL|THA|VTN|MYA|J|KOR|CHN|TWN|FE|SEA|EAs)/i.test(text)) {
        return "asia";
    }

    if (/(AFS|AGL|BEN|BFA|CME|COD|COG|EGY|ETH|KEN|MLI|MRC|NGR|SDN|SEN|TUN|WAf|EAf|CAf|SAf)/i.test(text)) {
        return "africa";
    }

    if (/(USA|CAN|MEX|CAm|NAm)/i.test(text)) {
        return "north-america";
    }

    if (/(F|G|D|E|I|HOL|BEL|SUI|AUT|POL|CZE|SVK|HNG|ROU|BUL|GRC|Eu|EEu|WEu|SEu|NEu)/i.test(text)) {
        return "europe";
    }

    return "unknown";
}

function applySeasonalPropagationScore(score, item, path, awareness) {
    const season = getSeason();
    const region = getSeasonalRegion(item);
    const band = item.band || "";
    const distance = path.distance || 0;

    const lowerBands = ["120m", "90m", "75m", "60m"];
    const lowerMidBands = ["49m", "41m"];
    const midDayBands = ["31m", "25m"];
    const highBands = ["22m", "19m", "16m", "13m", "11m"];

    if (season === "summer") {
        if (region === "south-america" && distance > 8000) {
            score -= 18;
        }

        if (region === "south-america" && ["60m", "49m", "41m"].includes(band)) {
            score -= 12;
        }

        if (region === "asia" && ["49m", "41m", "31m"].includes(band)) {
            score += 8;
        }

        if (region === "europe" && ["49m", "41m", "31m"].includes(band)) {
            score += 6;
        }

        if (lowerBands.includes(band)) {
            score -= 14;
        }

        if (highBands.includes(band)) {
            score += 8;
        }
    }

    if (season === "winter") {
        if (region === "south-america" && distance > 8000) {
            score += 18;
        }

        if (region === "south-america" && ["49m", "41m", "31m"].includes(band)) {
            score += 10;
        }

        if (region === "africa" && ["49m", "41m", "31m"].includes(band)) {
            score += 8;
        }

        if (lowerBands.includes(band) || lowerMidBands.includes(band)) {
            score += 12;
        }

        if (highBands.includes(band) && awareness.label.includes("night")) {
            score -= 10;
        }
    }

    if (season === "transition") {
        if (awareness.label === "Greyline potential") {
            score += 14;
        }

        if (region === "south-america" && ["49m", "41m", "31m"].includes(band)) {
            score += 8;
        }

        if (midDayBands.includes(band)) {
            score += 5;
        }
    }

    return score;
}

function itemHasSelectedSource(item, selectedSources) {
    return String(item.source || "")
    .split("+")
    .map(x => x.trim())
    .some(src => selectedSources.includes(src));
}

function formatSourceDate(value) {
    if (!value) {
        return "Unknown";
    }

    const date = new Date(`${value}T00:00:00Z`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC"
    });
}

function formatUtcTime(value) {
    const raw = String(value || "")
        .replace(/\D/g, "")
        .padStart(4, "0");

    if (raw.length !== 4) {
        return value || "";
    }

    return `${raw.slice(0, 2)}:${raw.slice(2)}`;
}

function renderSourceInfo(sources) {
    if (!els.sourceInfoPanel || !sources) {
        return;
    }

    const sourceOrder = ["EiBi", "AOKI", "HFCC", "HFBC"];

    const newestDate = sourceOrder
        .map(name => sources[name]?.publishedAt)
        .filter(Boolean)
        .sort()
        .at(-1) || "";

    els.sourceInfoPanel.innerHTML = `
        <div class="source-panel-head">
            <div>
                <strong>Schedule sources</strong>
                <span>Current database releases</span>
            </div>
        </div>

        <div class="source-dashboard">
            ${sourceOrder.map(name => {
            const source = sources[name] || {};

            const season = source.season || "—";
            const publishedAt = source.publishedAt || "";
            const publishedDate = formatSourceDate(publishedAt);

            const rows = Number(source.rows || 0)
                .toLocaleString("en-US");

            const isLatest =
                publishedAt &&
                newestDate &&
                publishedAt === newestDate;

            const statusLabel = isLatest
                 ? "Latest"
                 : publishedAt
                 ? "Current"
                 : "Unknown";

            let detail = "";

            if (name === "AOKI" && source.publishedTime) {
                detail =
`${formatUtcTime(source.publishedTime)} UTC`;
            }

            if (name === "HFCC" && source.processedTime) {
                detail =
`Processed ${formatUtcTime(source.processedTime)} UTC`;
            }

            if (
                name === "HFBC" &&
                source.createdAt) {
                detail = "ITU eHFBC";
            }

            return `
                    <article class="source-card">
                        <div class="source-card-top">
                            <strong class="source-name">
                                ${escapeHtml(name)}
                            </strong>

                            <span class="source-status ${isLatest ? "latest" : ""}">
                                <span class="source-status-dot"></span>
                                ${escapeHtml(statusLabel)}
                            </span>
                        </div>

                        <div class="source-card-main">
                            <span class="source-season">
                                ${escapeHtml(season)}
                            </span>

                            <span class="source-date">
                                ${escapeHtml(publishedDate)}
                            </span>
                        </div>

                        <div class="source-card-bottom">
                            <span class="source-detail">
                                ${escapeHtml(detail || "Release date")}
                            </span>

                            <span class="source-count">
                                ${escapeHtml(rows)} rows
                            </span>
                        </div>
                    </article>
                `;
        }).join("")}
        </div>
    `;
}

function toggleSourceInfo() {
    if (!els.sourceInfoBtn || !els.sourceInfoPanel) {
        return;
    }

    const opening =
        els.sourceInfoPanel.classList.contains("hidden");

    els.sourceInfoPanel.classList.toggle("hidden", !opening);
    els.sourceInfoBtn.setAttribute(
        "aria-expanded",
        String(opening));
}

function getDxScore(item, path, awareness) {
    let score = 0;

    const season = getSeason();

    if (path.distance) {
        score += Math.min(50, path.distance / 200);
    }

    score += awareness.score || 0;

    if (item.country && item.country !== "CLA") {
        score += 5;
    }

    if (item.country === "CLA") {
        score += 20;
    }

    if (item.band === "49m" || item.band === "41m" || item.band === "31m") {
        score += 8;
    }

    if (spaceWeather) {
        const kp = Number(spaceWeather.kp || 0);
        const sfi = Number(spaceWeather.sfi || 100);
        const xray = String(spaceWeather.xray || "").toLowerCase();

        const lowBands = ["120m", "90m", "75m", "60m", "49m"];
        const midBands = ["41m", "31m"];
        const highBands = ["25m", "22m", "19m", "16m", "13m", "11m"];

        if (kp >= 5) {
            score -= 18;
        } else if (kp >= 4) {
            score -= 8;
        }

        if (kp >= 5 && lowBands.includes(item.band)) {
            score -= 18;
        }

        if (sfi >= 150 && highBands.includes(item.band)) {
            score += 22;
        } else if (sfi >= 120 && highBands.includes(item.band)) {
            score += 12;
        }

        if (sfi < 90 && highBands.includes(item.band)) {
            score -= 22;
        }

        if ((xray.includes("m-class") || xray.includes("x-class")) && highBands.includes(item.band)) {
            score -= 25;
        }

        if (sfi >= 120 && midBands.includes(item.band)) {
            score += 6;
        }
    }

    if (season === "summer") {
        if (["120m", "90m", "75m", "60m"].includes(item.band)) {
            score -= 18;
        }

        if (item.band === "49m" && path.distance > 7000) {
            score -= 12;
        }

        if (["19m", "16m", "13m"].includes(item.band)) {
            score += 10;
        }
    }

    if (season === "winter") {
        if (["49m", "60m", "75m"].includes(item.band)) {
            score += 15;
        }

        if (path.distance > 5000) {
            score += 10;
        }
    }

    if (season === "transition") {
        if (awareness.label === "Greyline potential") {
            score += 10;
        }
    }

    if (spaceWeather) {
        const kp = Number(spaceWeather.kp || 0);
        const sfi = Number(spaceWeather.sfi || 100);

        const lowBands = ["120m", "90m", "75m", "60m", "49m"];
        const highBands = ["25m", "22m", "19m", "16m", "13m", "11m"];

        // Geomagnetic storm hurts polar + high band paths
        if (kp >= 5) {
            score -= 20;

            if (highBands.includes(item.band)) {
                score -= 15;
            }
        }

        // Strong solar flux boosts higher HF
        if (sfi >= 140 && highBands.includes(item.band)) {
            score += 25;
        }

        if (sfi >= 110 && item.band === "31m") {
            score += 10;
        }

        // Low solar flux favors lower bands
        if (sfi < 90 && lowBands.includes(item.band)) {
            score += 10;
        }
    }
    score = applySeasonalPropagationScore(score, item, path, awareness);
    return Math.max(0, Math.round(score));
}

function renderBestDxNow() {
    const active = getActiveBySources()
        .map(item => {
            const path = getTxPathInfo(item);
            const awareness = getPathAwareness(item);
            const score = getDxScore(item, path, awareness);

            return {
                item,
                path,
                awareness,
                score
            };
        })
        .filter(x => x.path.distance)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);

    if (!active.length) {
        els.bestDxList.innerHTML = `<div class="empty">No DX candidates found</div>`;
        return;
    }

    els.bestDxList.innerHTML = active.map(({
                item,
                path,
                awareness,
                score
            }, index) => `
    <button class="best-dx-row" type="button" data-freq="${escapeHtml(item.freq)}">
      <div class="best-dx-rank">#${index + 1}</div>
      <div class="best-dx-main">
        <strong>
          <span class="flag ${item.country === "CLA" ? "flag-cla" : ""}">
            ${getFlagHtml(item.country)}
          </span>
          ${escapeHtml(item.station || "Unknown station")}
        </strong>
        <span>
          ${escapeHtml(item.freq)}kHz · ${escapeHtml(formatTxSite(item))}
        </span>
      </div>
      <div class="best-dx-meta">
        <strong>${path.distance.toLocaleString("fi-FI")} km</strong>
        <span>${path.bearing}° ${path.compass}</span>
      </div>
      <div class="best-dx-badges">
        <span class="dx-badge">${score} · ${escapeHtml(getScoreLabel(score))}</span>
        <span class="path-badge">${escapeHtml(awareness.label)}</span>
      </div>
    </button>
  `).join("");

    [...els.bestDxList.querySelectorAll(".best-dx-row")].forEach((btn, index) => {
        btn.addEventListener("click", () => {
            showFrequencyDetails(active[index].item);
        });
    });

}

function getPathAwareness(item) {
    const rx = getCurrentLocationForCalculations();

    if (!item.txLat || !item.txLon) {
        return {
            label: "Unknown path",
            detail: "No transmitter coordinates",
            score: 0
        };
    }

    const band = item.band || "";
    const rxMode = getSolarModeForLocation(rx.lat, rx.lon);
    const txMode = getSolarModeForLocation(Number(item.txLat), Number(item.txLon));

    const isGreyline = rxMode === "Twilight" || txMode === "Twilight";
    const isNightNight = rxMode === "Night" && txMode === "Night";
    const isDayDay = rxMode === "Day" && txMode === "Day";
    const isMixed = !isGreyline && !isNightNight && !isDayDay;

    const lowerBands = ["120m", "90m", "75m", "60m", "49m"];
    const midBands = ["41m", "31m"];
    const higherBands = ["25m", "22m", "19m", "16m", "13m", "11m"];

    if (isGreyline) {
        return {
            label: "Greyline potential",
            detail: `${txMode} → ${rxMode} on ${band || "HF"}`,
            score: lowerBands.includes(band) ? 95 : 85
        };
    }

    if (lowerBands.includes(band)) {
        if (isNightNight) {
            return {
                label: "Strong low-band path",
                detail: `${txMode} → ${rxMode}`,
                score: 90
            };
        }

        if (isDayDay) {
            return {
                label: "Daylight absorption likely",
                detail: `${txMode} → ${rxMode}`,
                score: 25
            };
        }

        return {
            label: "Transition low-band path",
            detail: `${txMode} → ${rxMode}`,
            score: 65
        };
    }

    if (midBands.includes(band)) {
        if (isNightNight) {
            return {
                label: "Good night path",
                detail: `${txMode} → ${rxMode}`,
                score: 78
            };
        }

        if (isDayDay) {
            return {
                label: "Usable daytime path",
                detail: `${txMode} → ${rxMode}`,
                score: 62
            };
        }

        return {
            label: "Mixed mid-band path",
            detail: `${txMode} → ${rxMode}`,
            score: 70
        };
    }

    if (higherBands.includes(band)) {
        if (isDayDay) {
            return {
                label: "Good high-band daylight path",
                detail: `${txMode} → ${rxMode}`,
                score: 82
            };
        }

        if (isNightNight) {
            return {
                label: "High-band night risk",
                detail: `${txMode} → ${rxMode}`,
                score: 35
            };
        }

        return {
            label: "Transition high-band path",
            detail: `${txMode} → ${rxMode}`,
            score: 58
        };
    }

    if (isNightNight) {
        return {
            label: "Night path",
            detail: `${txMode} → ${rxMode}`,
            score: 80
        };
    }

    if (isDayDay) {
        return {
            label: "Daylight path",
            detail: `${txMode} → ${rxMode}`,
            score: 50
        };
    }

    return {
        label: "Mixed path",
        detail: `${txMode} → ${rxMode}`,
        score: 60
    };
}

function getConditionScore(band, mode) {
    const scores = {
        Day: {
            "120m": 15,
            "90m": 20,
            "75m": 25,
            "60m": 35,
            "49m": 50,
            "41m": 65,
            "31m": 80,
            "25m": 75,
            "22m": 65,
            "19m": 55,
            "16m": 40,
            "13m": 25,
            "11m": 15
        },
        Twilight: {
            "120m": 35,
            "90m": 45,
            "75m": 55,
            "60m": 65,
            "49m": 85,
            "41m": 80,
            "31m": 75,
            "25m": 55,
            "22m": 40,
            "19m": 30,
            "16m": 20,
            "13m": 15,
            "11m": 10
        },
        Night: {
            "120m": 60,
            "90m": 70,
            "75m": 80,
            "60m": 85,
            "49m": 95,
            "41m": 88,
            "31m": 60,
            "25m": 35,
            "22m": 25,
            "19m": 15,
            "16m": 10,
            "13m": 5,
            "11m": 5
        }
    };

    return scores[mode]?.[band] ?? 0;
}

function getAssistantBandScore(band, mode, activeCount) {
    let score = getConditionScore(band, mode);

    // Aktiivisuus vaikuttaa, mutta ei saa yksin määrätä suositusta.
    score += Math.min(25, activeCount * 0.25);

    if (spaceWeather) {
        const kp = Number(spaceWeather.kp || 0);
        const sfi = Number(spaceWeather.sfi || 100);

        const lowBands = [
            "120m", "90m", "75m", "60m", "49m"
        ];

        const highBands = [
            "25m", "22m", "19m", "16m", "13m", "11m"
        ];

        if (kp >= 5) {
            score -= 20;
        } else if (kp >= 4) {
            score -= 10;
        }

        if (sfi >= 130 && highBands.includes(band)) {
            score += 18;
        }

        if (sfi < 90 && lowBands.includes(band)) {
            score += 8;
        }
    }

    return Math.round(score);
}

function getAssistantBandReason(band, mode, activeCount) {
    if (
        mode === "Night" &&
        ["120m", "90m", "75m", "60m", "49m", "41m"].includes(band)) {
        return `Night conditions and ${activeCount} active broadcasts favour lower-band reception.`;
    }

    if (
        mode === "Day" &&
        ["31m", "25m", "22m", "19m", "16m"].includes(band)) {
        return `Daylight conditions and ${activeCount} active broadcasts favour this band.`;
    }

    if (mode === "Twilight") {
        return `Twilight conditions may support longer-distance reception, with ${activeCount} active broadcasts available.`;
    }

    return `${activeCount} active broadcasts and current propagation conditions make this the strongest choice.`;
}

function getAssistantRegionLabel(item) {
    const region = getSeasonalRegion(item);

    const labels = {
        "south-america": "South America",
        "north-america": "North America",
        "asia": "Asia",
        "africa": "Africa",
        "europe": "Europe"
    };

    return labels[region] || "";
}

function getDominantAssistantRegion(targets) {
    const counts = new Map();

    targets.forEach(({
            item
        }) => {
        const region = getAssistantRegionLabel(item);

        if (!region) {
            return;
        }

        counts.set(region, (counts.get(region) || 0) + 1);
    });

    return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

function getAssistantListeningTitle(mode) {
    if (mode === "Twilight") {
        return "Greyline targets worth trying";
    }

    if (mode === "Night") {
        return "Suggested listening tonight";
    }

    if (mode === "Day") {
        return "Suggested daytime listening";
    }

    return "Suggested listening";
}

function getAssistantContextMessage(
    band,
    mode,
    activeCount,
    targets) {
    const dominantRegion =
        getDominantAssistantRegion(targets);

    const regionText = dominantRegion
         ? ` towards ${dominantRegion}`
         : "";

    const greylineTargets = targets.filter(
            target =>
            target.awareness.label ===
            "Greyline potential").length;

    if (mode === "Twilight" && greylineTargets >= 2) {
        return (
            `Greyline enhancement is developing${regionText}. ` + 
`These active stations are worth checking first.`);
    }

    if (
        mode === "Night" &&
        ["120m", "90m", "75m", "60m", "49m", "41m"]
        .includes(band)) {
        return (
            `The lower bands are coming alive${regionText}. ` + 
`${activeCount} active broadcasts are available on ${band}.`);
    }

    if (
        mode === "Day" &&
        ["31m", "25m", "22m", "19m", "16m"]
        .includes(band)) {
        return (
            `Daytime propagation currently favours ${band}` + 
            `${regionText}. These broadcasts offer the strongest ` + 
`calculated paths right now.`);
    }

    if (dominantRegion) {
        return (
            `Current propagation favours paths towards ` + 
`${dominantRegion}. These stations rank highest on ${band}.`);
    }

    return (
        `${activeCount} active broadcasts are available on ${band}. ` + 
`These stations currently have the strongest calculated paths.`);
}

function renderDxAssistant() {
    if (
        !els.dxAssistantStatus ||
        !els.dxAssistantMain ||
        !els.dxAssistantTips) {
        return;
    }

    const loc =
        getCurrentLocationForCalculations();

    const elevation =
        getSolarElevationApprox(
            loc.lat,
            loc.lon);

    const mode =
        getPathMode(elevation);

    const selectedSources =
        getSelectedSources();

    const rankedBands = bandOrder
        .map(band => {
            const active =
                allSchedules.filter(item => {
                    if (item.band !== band) {
                        return false;
                    }

                    if (!isOnAir(item)) {
                        return false;
                    }

                    return itemHasSelectedSource(
                        item,
                        selectedSources);
                });

            return {
                band,
                activeCount: active.length,
                score: getAssistantBandScore(
                    band,
                    mode,
                    active.length)
            };
        })
        .filter(item => item.activeCount > 0)
        .sort((a, b) => b.score - a.score);

    const best = rankedBands[0];

    if (!best) {
        els.dxAssistantStatus.textContent =
            "No recommendation";

        els.dxAssistantMain.innerHTML = `
            <strong>
                No suitable active broadcasts found.
            </strong>
            <p>
                Try enabling another schedule source
                or selecting all bands.
            </p>
        `;

        els.dxAssistantTips.innerHTML = "";

        if (els.dxAssistantTargets) {
            els.dxAssistantTargets.innerHTML = "";
        }

        return;
    }

    els.dxAssistantStatus.textContent =
`${mode} path · score ${best.score}`;

    const targets =
        getAssistantTargets(best.band);

    const mood =
        getAssistantMood(
            mode,
            best.score,
            best.activeCount,
            targets);

    const currentSnapshot = {
        band: best.band,
        score: best.score,
        activeCount: best.activeCount,
        mode,
        mood,
        timestamp: Date.now(),
        topStations: targets.map(
            target =>
            target.item.station || "")
    };

    const previousSnapshot =
        getAssistantSessionBaseline();

    const memoryMessage =
        getAssistantMemoryMessage(
            previousSnapshot,
            currentSnapshot);

    const assistantTitle =
        getAssistantSessionValue(
`title:${mode}:${mood}`,
            () => getAssistantTitle(
                mode,
                mood));

    if (els.dxAssistantTitle) {
        els.dxAssistantTitle.textContent =
            assistantTitle;
    }

    const greeting =
        getAssistantSessionValue(
`greeting:${mood}`,
            () => getAssistantGreeting(
                mood,
                best.band));

    const opening =
        getAssistantOpening(
            best.band,
            mode,
            best.score);

    const analysis =
        getAssistantAnalysis(
            best.band,
            mode,
            best.activeCount);

    const note =
        getAssistantOperatorNote(
            best.band);

    const whyReasons =
        getAssistantWhyReasons(
            best.band,
            mode,
            best.activeCount,
            best.score,
            targets);

    const observation =
        getAssistantObservation(
            best.band,
            mode,
            best.activeCount,
            targets);

    const unusual =
        getAssistantUnusual(
            best,
            rankedBands,
            targets);

    const whyTitle =
        getAssistantSessionValue(
            "whyTitle",
            getAssistantWhyTitle);

    const humour =
        getAssistantSessionValue(
            "humour",
            getAssistantHumour);

    const encouragement =
        getAssistantSessionValue(
            "encouragement",
            getAssistantEncouragement);

    const closing =
        getAssistantSessionValue(
            "closing",
            getAssistantClosing);

    els.dxAssistantMain.innerHTML = `
	   <div class="assistant-greeting">

        ${escapeHtml(greeting)}

    </div>
	
	    ${memoryMessage ? `

        <div class="assistant-memory">

            ${escapeHtml(memoryMessage)}

        </div>

    ` : ""}
	
    <button
        id="dxAssistantBandBtn"
        class="dx-assistant-band-btn"
        type="button">

        ${escapeHtml(opening)}
    </button>

    <p class="assistant-analysis">
        ${escapeHtml(analysis)}
    </p>

    <div class="assistant-note">
        💬 ${escapeHtml(note)}
    </div>

    ${whyReasons.length ? `
    <div class="assistant-why">
        <button
            id="dxAssistantWhyBtn"
            class="assistant-why-btn"
            type="button"
            aria-expanded="false"
            aria-controls="dxAssistantWhyPanel">

            <span>${escapeHtml(whyTitle)}</span>

            <span
                class="assistant-why-chevron"
                aria-hidden="true">
                +
            </span>
        </button>

        <div
            id="dxAssistantWhyPanel"
            class="assistant-why-panel hidden">

            ${whyReasons.map(reason => `
                <div class="assistant-why-reason">
                    <span
                        class="assistant-why-icon"
                        aria-hidden="true">
                        ${reason.icon}
                    </span>

                    <span>
                        ${escapeHtml(reason.text)}
                    </span>
                </div>
            `).join("")}

        </div>
    </div>
        ` : ""}

${observation ? `
    <div class="assistant-observation">
        ${escapeHtml(observation)}
    </div>
        ` : ""}

${unusual ? `
    <div class="assistant-unusual">
        <strong>Something unusual</strong>
        <span>${escapeHtml(unusual)}</span>
    </div>
        ` : ""}

${humour ? `
    <div class="assistant-humour">
        ${escapeHtml(humour)}
    </div>
        ` : ""}
`;

    const dxAssistantBandBtn =

        document.getElementById(

            "dxAssistantBandBtn");

    if (dxAssistantBandBtn) {

        dxAssistantBandBtn.addEventListener(

            "click",

            () => {

            els.bandSelect.value = best.band;

            els.onAirOnly.checked = true;

            if (els.autoBandBtn) {

                els.autoBandBtn.textContent =

`Assistant: ${best.band}`;

            }

            render();

            document

            .querySelector(

                '[data-section="controls"]')

            ?.scrollIntoView({

                behavior: "smooth",

                block: "start"

            });

        });

    }

    const dxAssistantWhyBtn =

        document.getElementById(

            "dxAssistantWhyBtn");

    const dxAssistantWhyPanel =

        document.getElementById(

            "dxAssistantWhyPanel");

    if (

        dxAssistantWhyBtn &&

        dxAssistantWhyPanel) {

        dxAssistantWhyBtn.addEventListener(

            "click",

            () => {

            const opening =

                dxAssistantWhyPanel.classList.contains("hidden");

            dxAssistantWhyPanel.classList.toggle(

                "hidden",

                !opening);

            dxAssistantWhyBtn.setAttribute(

                "aria-expanded",

                String(opening));

            const chevron =

                dxAssistantWhyBtn.querySelector(

                    ".assistant-why-chevron");

            if (chevron) {

                chevron.textContent =

                    opening ? "−" : "+";

            }

        });

    }

    els.dxAssistantTips.innerHTML = `
        <div>
            ${best.activeCount} active broadcasts
            on ${escapeHtml(best.band)}
        </div>
    `;

    renderAssistantTargets(
        best.band,
        mode,
        best.activeCount);

    saveAssistantSnapshot(currentSnapshot);

}

function conditionLabel(score) {
    if (score >= 85)
        return "Excellent";
    if (score >= 70)
        return "Very good";
    if (score >= 55)
        return "Good";
    if (score >= 35)
        return "Fair";
    if (score >= 20)
        return "Weak";
    return "Poor";
}

function renderConditions() {
    const selectedRegion = els.regionSelect.value || "Northern Europe";
    const fallback = locationProfiles[selectedRegion] || locationProfiles["Northern Europe"];

    const loc = userLocation || fallback;
    const elevation = getSolarElevationApprox(loc.lat, loc.lon);
    const mode = getPathMode(elevation);

    els.conditionLocation.textContent = loc.label;
    els.pathMode.textContent = mode;

    els.conditionBands.innerHTML = bandOrder.map(band => {
        const score = getConditionScore(band, mode);
        const label = conditionLabel(score);

        return `
      <div class="condition-row">
        <div class="condition-name">${escapeHtml(band)}</div>
        <div class="condition-meter">
          <div class="condition-fill" style="width:${score}%"></div>
        </div>
        <div class="condition-label">${escapeHtml(label)}</div>
      </div>
    `;
    }).join("");
}

function getScoreLabel(score) {
    if (score >= 140)
        return "Excellent DX";
    if (score >= 115)
        return "Strong DX";
    if (score >= 90)
        return "Good DX";
    if (score >= 65)
        return "Possible";
    return "Low chance";
}

function requestLocation() {
    if (!navigator.geolocation) {
        els.conditionLocation.textContent = "Geolocation not supported • using fallback";
        userLocation = null;
        renderConditions();
        return;
    }

    els.locationBtn.textContent = "Locating…";

    navigator.geolocation.getCurrentPosition(
        position => {
        userLocation = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            label: `${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)}`
        };

        els.locationBtn.textContent = "Location active";
        render();
    },
        error => {
        els.locationBtn.textContent = "Use my location";
        userLocation = null;

        if (error.code === error.PERMISSION_DENIED) {
            els.conditionLocation.textContent = "Location denied • using fallback";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
            els.conditionLocation.textContent = "Location unavailable • using fallback";
        } else if (error.code === error.TIMEOUT) {
            els.conditionLocation.textContent = "Location timed out • using fallback";
        } else {
            els.conditionLocation.textContent = "Location error • using fallback";
        }

        console.warn("Geolocation error:", {
            code: error.code,
            message: error.message
        });

        render();
    }, {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 3600000
    });
}

function isOnAir(item) {
    const now = utcMinutesNow();
    const start = timeToMinutes(item.start);
    const end = timeToMinutes(item.end);

    if (start === null || end === null)
        return false;

    if (start === end)
        return true;
    if (start < end)
        return now >= start && now < end;

    return now >= start || now < end;
}

function fmtTime(start, end) {
    return `${start || "----"}–${end || "----"}`;
}

const ituToIso = {
    A: "at",
    AFS: "za",
    AGL: "ao",
    ALB: "al",
    ALG: "dz",
    AND: "ad",
    ARG: "ar",
    ARM: "am",
    ARS: "sa",
    AUS: "au",
    AZE: "az",
    B: "br",
    BEL: "be",
    BEN: "bj",
    BFA: "bf",
    BGD: "bd",
    BHR: "bh",
    BIH: "ba",
    BLR: "by",
    BOL: "bo",
    BUL: "bg",
    CAN: "ca",
    CHL: "cl",
    CHN: "cn",
    CLM: "co",
    CME: "cm",
    COD: "cd",
    COG: "cg",
    CTR: "cr",
    CUB: "cu",
    CYP: "cy",
    CZE: "cz",
    D: "de",
    DNK: "dk",
    E: "es",
    EQA: "ec",
    EGY: "eg",
    ERI: "er",
    EST: "ee",
    ETH: "et",
    F: "fr",
    FIN: "fi",
    G: "gb",
    GEO: "ge",
    GRC: "gr",
    HNG: "hu",
    HOL: "nl",
    HRV: "hr",
    I: "it",
    IND: "in",
    INS: "id",
    IRL: "ie",
    IRN: "ir",
    IRQ: "iq",
    ISL: "is",
    ISR: "il",
    J: "jp",
    KAZ: "kz",
    KEN: "ke",
    KGZ: "kg",
    KOR: "kr",
    KRE: "kp",
    KWT: "kw",
    LBY: "ly",
    LKA: "lk",
    LTU: "lt",
    LUX: "lu",
    LVA: "lv",
    MCO: "mc",
    MDG: "mg",
    MDA: "md",
    MEX: "mx",
    MKD: "mk",
    MLA: "my",
    MLI: "ml",
    MNG: "mn",
    MRC: "ma",
    MYA: "mm",
    MYS: "my",
    NGR: "ng",
    NOR: "no",
    NZL: "nz",
    OMA: "om",
    PAK: "pk",
    PHL: "ph",
    POL: "pl",
    POR: "pt",
    PRU: "pe",
    ROU: "ro",
    RUS: "ru",
    S: "se",
    SDN: "sd",
    SEN: "sn",
    SNG: "sg",
    SLM: "sb",
    SRB: "rs",
    SUI: "ch",
    SVK: "sk",
    SVN: "si",
    SWZ: "sz",
    SYR: "sy",
    THA: "th",
    TJK: "tj",
    TUN: "tn",
    TUR: "tr",
    TWN: "tw",
    UAE: "ae",
    UKR: "ua",
    URG: "uy",
    USA: "us",
    UZB: "uz",
    VTN: "vn",
    YEM: "ye",

    ASC: "ac",
    CNR: "ic",
    DGA: "io",
    GUM: "gu",
    HWA: "us",
    ALS: "us",
    PTR: "pr",
    GUF: "gf",
    NCL: "nc",
    REU: "re",
    MDR: "pt",
    AZR: "pt",
    FRO: "fo",
    GRL: "gl",
    HKG: "hk",
    MAC: "mo"
};

function getFlagHtml(code) {
    const key = String(code || "").trim().toUpperCase();

    if (key === "CLA") {
        return `<span class="flag flag-cla">📻</span>`;
    }

    if (key === "OCE") {
        return `<span class="flag flag-fallback">🌊</span>`;
    }

    const iso = ituToIso[key];

    if (!iso) {
        return `<span class="flag flag-fallback">🌍</span>`;
    }

    return `
        <img
            class="flag-img"
            src="/icons/flags/${iso}.svg"
            alt="${escapeHtml(key)}"
            loading="lazy"
        >
    `;
}

function escapeHtml(value) {
    return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getFiltered() {
    const query = els.searchInput.value.trim().toLowerCase();
    const band = els.bandSelect.value;
    const onAirOnly = els.onAirOnly.checked;
    const selectedSources = getSelectedSources();

    return allSchedules.filter(item => {
        if (!itemHasSelectedSource(item, selectedSources))
            return false;
        if (band && item.band !== band)
            return false;
        if (onAirOnly && !isOnAir(item))
            return false;

        if (query) {
            const haystack = [
                item.freq,
                item.station,
                item.language,
                item.country,
                item.target,
                item.band,
                item.type,
                item.txSite,
                item.txCode,
                item.txCountry,
                item.source,
                item.remarks
            ].join(" ").toLowerCase();

            if (!haystack.includes(query))
                return false;
        }

        return true;
    });
}

function hasTxSite(item) {
    return item.txSite || item.txCode || item.txLat || item.txLon;
}

function showTxSiteDetails(item) {
    if (!item || !hasTxSite(item))
        return;
    const mapLink = getMapLink(item);
    els.modalStation.textContent = item.txSite || item.txCode || "Transmitter site";
    const path = getTxPathInfo(item);
    const awareness = getPathAwareness(item);

    const rows = [
        ["Transmitter site", item.txSite],
        ["Site code", item.txCode],
        ["Site country", item.txCountry],
        ["Coordinates", item.txLat && item.txLon ? `${item.txLat}, ${item.txLon}` : ""],
        ["Distance", path.distance ? `${path.distance.toLocaleString("fi-FI")} km` : ""],
        ["Bearing", path.bearing ? `${path.bearing}° ${path.compass}` : ""],
        ["Path", `${awareness.label} (${awareness.detail})`],
        ["Station", item.station],
        ["Frequency", `${item.freq} kHz`],
        ["UTC", fmtTime(item.start, item.end)],
        ["Source", item.source],
        ["Remarks", item.remarks]
    ];

    els.modalMeta.innerHTML =
        rows.map(([label, value]) => `
    <div>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || "—")}</strong>
    </div>
  `).join("")

         +

        (mapLink ? `
    <div>
      <span>Map</span>
      <strong>
        <a class="map-link"
           href="${escapeHtml(mapLink)}"
           target="_blank"
           rel="noopener">
           Open in map
        </a>
      </strong>
    </div>
  ` : "");

    els.detailModal.classList.remove("hidden");
}
function getDxPotentialLabel(path) {
    if (!path.distance)
        return "Unknown";

    if (path.distance >= 8000)
        return "Excellent DX";
    if (path.distance >= 5000)
        return "Strong DX";
    if (path.distance >= 2500)
        return "Good DX";
    if (path.distance >= 1000)
        return "Regional DX";

    return "Local / near-region";
}

function showFrequencyDetails(item) {
    if (!item)
        return;

    const freq = item.freq;

    const matches = allSchedules
        .filter(x => x.freq === freq && isOnAir(x))
        .map(x => ({
                item: x,
                path: getTxPathInfo(x)
            }))
        .sort((a, b) => {
            const da = a.path.distance || 999999;
            const db = b.path.distance || 999999;
            return da - db;
        });

    const collision = matches.length > 1;

    els.modalStation.textContent = `${freq} kHz active now`;

    if (!matches.length) {
        els.modalMeta.innerHTML = `
      <div>
        <span>Status</span>
        <strong>No active broadcasts found</strong>
      </div>
    `;
        els.detailModal.classList.remove("hidden");
        return;
    }

    els.modalMeta.innerHTML = `
    <div>
      <span>Co-channel</span>
      <strong>${collision ? `${matches.length} active broadcasts on this frequency` : "No active collision detected"}</strong>
    </div>

    ${matches.map(({
                item: x,
                path
            }) => {
            const tx = formatTxSite(x);
            const dxLabel = getDxPotentialLabel(path);
            const awareness = getPathAwareness(x);

            return `
        <div>
          <span>${escapeHtml(fmtTime(x.start, x.end))}</span>
          <strong>
            <span class="flag ${x.country === "CLA" ? "flag-cla" : ""}">
			${getFlagHtml(x.country)}
			</span>
            ${escapeHtml(x.station || "Unknown station")}
            <br>
            <small>
              ${escapeHtml(x.language || "—")}
              · ${escapeHtml(x.target || "—")}
              · ${escapeHtml(tx)}
              ${path.distance ? ` · ${path.distance.toLocaleString("fi-FI")} km · ${path.bearing}° ${path.compass}` : ""}
              <span class="dx-badge">${escapeHtml(dxLabel)}</span>
			  <span class="path-badge">${escapeHtml(awareness.label)}</span>
              · ${escapeHtml(x.source)}
            </small>
          </strong>
        </div>
      `;
        }).join("")}
  `;

    els.detailModal.classList.remove("hidden");
}

function formatTxSite(item) {
    if (item.txSite) {
        return item.txSite;
    }

    if (item.txCode) {
        return item.txCode;
    }

    return item.type || "—";
}

function renderActivityOverview() {
    const counts = {};

    for (const band of bandOrder)
        counts[band] = 0;

    for (const item of allSchedules) {
        if (item.band && isOnAir(item)) {
            counts[item.band] = (counts[item.band] || 0) + 1;
        }
    }

    const max = Math.max(...Object.values(counts), 1);

    els.activityBands.innerHTML = bandOrder.map(band => {
        const count = counts[band] || 0;
        const pct = Math.round((count / max) * 100);

        return `
      <div class="activity-row" data-band="${escapeHtml(band)}">
        <div class="activity-name">${escapeHtml(band)}</div>
        <div class="activity-meter">
          <div class="activity-fill" style="width:${pct}%"></div>
        </div>
        <div class="activity-count">${count}</div>
      </div>
    `;
    }).join("");

    document.querySelectorAll(".activity-row").forEach(row => {
        row.addEventListener("click", () => {
            els.bandSelect.value = row.dataset.band;
            els.onAirOnly.checked = true;
            render();
        });
    });
}

function getSelectedSources() {
    return [...els.sourceToggles]
    .filter(input => input.checked)
    .map(input => input.value);
}

function getMapLink(item) {
    if (!item.txLat || !item.txLon)
        return "";

    return `https://www.openstreetmap.org/?mlat=${item.txLat}&mlon=${item.txLon}#map=8/${item.txLat}/${item.txLon}`;
}

function getBandReason(band, count) {
    const hour = new Date().getUTCHours();

    if (band === "49m") {
        return hour >= 15 || hour <= 6
         ? `Best lower-band activity now • ${count} active broadcasts`
         : `Strong regional activity • ${count} active broadcasts`;
    }

    if (band === "41m") {
        return `Good evening and night coverage • ${count} active broadcasts`;
    }

    if (band === "31m") {
        return hour >= 6 && hour <= 18
         ? `Strong daytime/global activity • ${count} active broadcasts`
         : `Still active for long-distance paths • ${count} active broadcasts`;
    }

    if (["25m", "22m", "19m", "16m"].includes(band)) {
        return `Higher-band daytime DX potential • ${count} active broadcasts`;
    }

    if (["120m", "90m", "75m", "60m"].includes(band)) {
        return `Lower-band night path potential • ${count} active broadcasts`;
    }

    return `${count} active broadcasts`;
}

function getActiveBySources() {
    const selectedSources = getSelectedSources();

    return allSchedules.filter(item => {
        if (!itemHasSelectedSource(item, selectedSources))
            return false;
        return isOnAir(item);
    });
}

async function runDxiShadowMode() {
    try {
        const [
            { LiveDataAdapter },
            { ActivityAnalyst },
            { GreylineAnalyst },
            { PropagationAnalyst },
            { DxIntelligenceEngine }
        ] = await Promise.all([
            import("./dxi/adapters/LiveDataAdapter.js"),
            import("./dxi/analysts/ActivityAnalyst.js"),
            import("./dxi/analysts/GreylineAnalyst.js"),
            import("./dxi/analysts/PropagationAnalyst.js"),
            import("./dxi/engine/DxIntelligenceEngine.js")
        ]);

        const active =
            getActiveBySources();

        /*
         * Active stations
         */
        const stations =
            active.map(item => ({
                frequency:
                    Number(item.freq),

                station:
                    item.station || "",

                band:
                    item.band || "",

                source:
                    item.source || ""
            }));

        /*
         * Band activity
         */
        const bandActivity = {};

        for (const station of stations) {
            if (!station.band) {
                continue;
            }

            bandActivity[station.band] =
                (bandActivity[station.band] || 0) + 1;
        }

        /*
         * Receiver location
         */
        const rxLocation =
            getCurrentLocationForCalculations();

        /*
         * Live greyline paths
         */
        const paths =
            active
            .filter(item =>
                item.txLat &&
                item.txLon
            )
            .map(item => {
                const txLat =
                    Number(item.txLat);

                const txLon =
                    Number(item.txLon);

                return {
                    frequency:
                        Number(item.freq),

                    station:
                        item.station || "",

                    band:
                        item.band || "",

                    rxMode:
                        getSolarModeForLocation(
                            rxLocation.lat,
                            rxLocation.lon
                        ),

                    txMode:
                        getSolarModeForLocation(
                            txLat,
                            txLon
                        )
                };
            });

        /*
         * Propagation picture
         */
        const rxElevation =
            getSolarElevationApprox(
                rxLocation.lat,
                rxLocation.lon
            );

        const mode =
            getPathMode(
                rxElevation
            );

        const propagation = {
            kp:
                Number(
                    spaceWeather?.kp ?? 0
                ),

            sfi:
                Number(
                    spaceWeather?.sfi ?? 100
                ),

            mode,

            favoredBands:
                bandOrder.filter(
                    band =>
                        getConditionScore(
                            band,
                            mode
                        ) >= 70
                )
        };

        /*
         * Normalize live data
         */
        const adapter =
            new LiveDataAdapter();

        const snapshot =
            adapter.createSnapshot({
                stations,
                bandActivity,

                greyline: {
                    paths
                },

                propagation
            });

        /*
         * Analysts
         */
        const activityAnalyst =
            new ActivityAnalyst();

        const activityResult =
            activityAnalyst.analyze(
                snapshot.stations
            );

        const greylineAnalyst =
            new GreylineAnalyst();

        const greylineResult =
            greylineAnalyst.analyze(
                snapshot.greyline.paths
            );

        const propagationAnalyst =
            new PropagationAnalyst();

        const propagationResult =
            propagationAnalyst.analyze(
                snapshot.propagation
            );

        /*
         * Intelligence engine
         */
        const engine =
            new DxIntelligenceEngine();

        const intelligence =
            engine.combine([
                activityResult,
                greylineResult,
                propagationResult
            ]);

        /*
         * Shadow-mode diagnostics
         */
        console.group(
            "📡 DX Intelligence shadow mode"
        );

        console.log(
            "Snapshot:",
            snapshot
        );

        console.log(
            "Activity analysis:",
            activityResult
        );

        console.log(
            "Greyline analysis:",
            greylineResult
        );

        console.log(
            "Propagation analysis:",
            propagationResult
        );

        console.log(
            "DX intelligence:",
            intelligence
        );

        console.groupEnd();

        return intelligence;
    } catch (error) {
        console.warn(
            "DX Intelligence shadow mode failed:",
            error
        );

        return null;
    }
}

function renderTargets() {
    const band = els.bandSelect.value;
    const active = getActiveBySources().filter(item => {
        if (band && item.band !== band)
            return false;
        return true;
    });

    const counts = new Map();

    for (const item of active) {
        const raw = item.target || item.country || "Unknown";
        const parts = String(raw)
            .split(/[,\s/]+/)
            .map(x => x.trim())
            .filter(Boolean);

        for (const part of parts.slice(0, 3)) {
            counts.set(part, (counts.get(part) || 0) + 1);
        }
    }

    const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

    const max = Math.max(...top.map(x => x[1]), 1);

    if (!top.length) {
        els.targetList.innerHTML = `<div class="empty">No active targets found</div>`;
        return;
    }

    els.targetList.innerHTML = top.map(([name, count]) => {
        const pct = Math.round((count / max) * 100);

        return `
      <div class="target-row">
        <div class="target-name">${escapeHtml(name)}</div>
        <div class="target-meter">
          <div class="target-fill" style="width:${pct}%"></div>
        </div>
        <div class="target-count">${count}</div>
      </div>
    `;
    }).join("");
}

function getBestBandNow() {
    const counts = {};

    for (const band of bandOrder) {
        counts[band] = 0;
    }

    for (const item of allSchedules) {
        if (!item.band)
            continue;
        if (!isOnAir(item))
            continue;

        counts[item.band]++;
    }

    const ranked = Object.entries(counts)
        .sort((a, b) => b[1] - a[1]);

    return ranked[0]?.[0] || "49m";
}

function applyAutoBand() {
    const bestBand = getBestBandNow();

    const option = [...els.bandSelect.options].find(opt => opt.value === bestBand);

    if (!option) {

        return;
    }

    els.bandSelect.value = bestBand;
    els.onAirOnly.checked = true;
    els.autoBandBtn.textContent = `Auto: ${bestBand}`;

    els.bandSelect.dispatchEvent(new Event("change"));
    render();
}

function renderSnapshot() {
    const active = getActiveBySources();

    const countries = new Set(
            active
            .map(item => item.country)
            .filter(Boolean));

    const stations = new Set(
            active
            .map(item => item.station)
            .filter(Boolean));

    els.activeCountries.textContent = countries.size;
    els.activeStations.textContent = stations.size;
}

function renderTable() {
    const rows = getFiltered()
        .sort((a, b) => a.freq - b.freq)
        .slice(0, 600);
    if (!rows.length) {
        els.scheduleBody.innerHTML = `
    <tr>
      <td colspan="9" class="empty-row">
        No broadcasts found with current filters
      </td>
    </tr>
  `;
        return;
    }

    els.scheduleBody.innerHTML = rows.map((item, index) => {
        const live = isOnAir(item);

        return `
<tr class="${live ? "live-row" : ""}" data-index="${index}">
  <td>
    <button class="freq-btn" type="button" data-index="${index}">
      ${escapeHtml(item.freq)} kHz
    </button>
  </td>
  <td>${escapeHtml(fmtTime(item.start, item.end))}</td>
  <td>${escapeHtml(item.daysLabel || "")}</td>
  <td>${escapeHtml(item.station)}</td>
  <td>${escapeHtml(item.language)}</td>
  <td>${escapeHtml(item.target)}</td>
  <td>
    <span class="flag ${item.country === 'CLA' ? 'flag-cla' : ''}">
      ${getFlagHtml(item.country)}
    </span>
    ${escapeHtml(item.country)}
  </td>
  <td>
    <button class="tx-site-btn" type="button" data-index="${index}">
      ${escapeHtml(formatTxSite(item))}
    </button>
  </td>
  <td>${escapeHtml(item.source)}</td>
</tr>
`;
    }).join("");

    [...els.scheduleBody.querySelectorAll("tr")].forEach((tr, index) => {
        tr.addEventListener("click", () => showDetails(rows[index]));
    });

    [...els.scheduleBody.querySelectorAll(".tx-site-btn")].forEach(btn => {
        btn.addEventListener("click", event => {
            event.stopPropagation();

            const index = Number(btn.dataset.index);
            showTxSiteDetails(rows[index]);
        });
    });

    [...els.scheduleBody.querySelectorAll(".freq-btn")].forEach(btn => {
        btn.addEventListener("click", event => {
            event.stopPropagation();

            const index = Number(btn.dataset.index);
            showFrequencyDetails(rows[index]);
        });
    });
}

function formatDays(value) {
    const days = String(value || "").trim();

    if (!days)
        return "Daily";
    if (days === "1234567")
        return "Daily";
    if (days === "MTWTFSS")
        return "Daily";

    return days;
}

function getCurrentLocationForCalculations() {
    if (userLocation)
        return userLocation;

    const selectedRegion = els.regionSelect?.value || "Northern Europe";
    return locationProfiles[selectedRegion] || locationProfiles["Northern Europe"];
}

function toRad(value) {
    return value * Math.PI / 180;
}

function toDeg(value) {
    return value * 180 / Math.PI;
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const earthRadiusKm = 6371;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(earthRadiusKm * c);
}

function calculateBearing(lat1, lon1, lat2, lon2) {
    const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
    const x =
        Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
        Math.sin(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.cos(toRad(lon2 - lon1));

    return Math.round((toDeg(Math.atan2(y, x)) + 360) % 360);
}

function bearingToCompass(deg) {
    const dirs = [
        "N", "NNE", "NE", "ENE",
        "E", "ESE", "SE", "SSE",
        "S", "SSW", "SW", "WSW",
        "W", "WNW", "NW", "NNW"
    ];

    return dirs[Math.round(deg / 22.5) % 16];
}

function getTxPathInfo(item) {
    if (!item.txLat || !item.txLon) {
        return {
            distance: "",
            bearing: "",
            compass: ""
        };
    }

    const loc = getCurrentLocationForCalculations();

    const distance = calculateDistanceKm(
            loc.lat,
            loc.lon,
            Number(item.txLat),
            Number(item.txLon));

    const bearing = calculateBearing(
            loc.lat,
            loc.lon,
            Number(item.txLat),
            Number(item.txLon));

    return {
        distance,
        bearing,
        compass: bearingToCompass(bearing)
    };
}

function renderBandLive() {
    const band = els.bandSelect.value;
    const range = bandRanges[band];

    els.bandTitle.textContent = band ? `${band} Band Live` : "All Bands Live";
    els.bandRange.textContent = range ? `${range[0]}–${range[1]} kHz` : "All shortwave bands";

    const active = allSchedules.filter(item => {
        if (band && item.band !== band)
            return false;
        return isOnAir(item);
    });

    els.bandActive.textContent = active.length;
    els.bandReason.textContent = band
         ? getBandReason(band, active.length)
         : `${active.length} active broadcasts across all shortwave bands`;

    const maxReasonable = 100;
    const pct = Math.min(100, Math.round((active.length / maxReasonable) * 100));
    els.bandFill.style.width = pct + "%";
}

function showDetails(item) {
    if (!item)
        return;

    els.modalStation.textContent = item.station || "Unknown station";

    const rows = [
        ["Frequency", `${item.freq} kHz`],
        ["UTC", fmtTime(item.start, item.end)],
        ["Language", item.language],
        ["Target", item.target],
        ["Country", item.country],
        ["Band", item.band],
        ["Type", item.type],
        ["Tx Site", item.txSite],
        ["Tx Code", item.txCode],
        ["Tx Country", item.txCountry],
        ["Tx Coordinates", item.txLat && item.txLon ? `${item.txLat}, ${item.txLon}` : ""],
        ["Days", formatDays(item.days)],
        ["Power", item.power],
        ["Remarks", item.remarks],
        ["Source", item.source],
        ["Status", isOnAir(item) ? "ON AIR NOW" : "Off air"]
    ];

    els.modalMeta.innerHTML = rows.map(([label, value]) => `
    <div>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || "—")}</strong>
    </div>
  `).join("");

    els.detailModal.classList.remove("hidden");
}

function hideDetails() {
    els.detailModal.classList.add("hidden");
}

function render() {
    updateMapLink();
    renderBandLive();
    renderDxAssistant();
    renderActivityOverview();
    renderTargets();
    renderSnapshot();
    renderConditions();
    renderSpaceWeather();
    renderBestDxNow();
    renderTable();
}

async function loadSpaceWeather() {
    try {
        const res = await fetch(
                "data/space-weather.json", {
                cache: "no-store"
            });

        if (!res.ok) {
            throw new Error(
`HTTP ${res.status} ${res.statusText}`);
        }

        const data = await res.json();

        if (
            !data ||
            typeof data !== "object") {
            throw new Error(
                "Space weather data is invalid");
        }

        spaceWeather = data;

        console.info(
            "Space weather data loaded successfully");
    } catch (error) {
        spaceWeather = null;

        console.warn(
            "Could not load space weather data:",
            error);
    }
}

function renderSpaceWeather() {
    if (!spaceWeather) {
        els.spaceWeatherUpdated.textContent = "NOAA data unavailable";
        return;
    }

    const updated = spaceWeather.updated
         ? new Date(spaceWeather.updated).toLocaleString("fi-FI", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        })
         : "unknown";

    els.spaceWeatherUpdated.textContent = `NOAA updated ${updated}`;

    els.swKp.textContent = spaceWeather.kp ?? "—";
    els.swSfi.textContent = spaceWeather.sfi ?? "—";
    els.swXray.textContent = spaceWeather.xray || "—";
    els.swAurora.textContent = spaceWeather.aurora ? "Active" : "Quiet";

    const hf = spaceWeather.hf || {};

    els.swBandSummary.innerHTML = `
    <div>
      <span>Low bands</span>
      <strong>${escapeHtml(hf.lowBands || "unknown")}</strong>
    </div>
    <div>
      <span>Mid bands</span>
      <strong>${escapeHtml(hf.midBands || "unknown")}</strong>
    </div>
    <div>
      <span>High bands</span>
      <strong>${escapeHtml(hf.highBands || "unknown")}</strong>
    </div>
  `;
}

async function loadSchedules() {
    await loadSpaceWeather();

    try {
        const res = await fetch(
                "data/schedules.json", {
                cache: "no-store"
            });

        if (!res.ok) {
            throw new Error(
`HTTP ${res.status} ${res.statusText}`);
        }

        const data = await res.json();

        if (!Array.isArray(data.schedules)) {
            throw new Error(
                "Schedule data is missing or invalid");
        }

        markDataLoadSuccessful(
            "schedules");

        const savedRegion =
            localStorage.getItem("swRegion");

        if (
            savedRegion &&
            locationProfiles[savedRegion]) {
            els.regionSelect.value =
                savedRegion;
        }

        allSchedules =
            data.schedules || [];

        // DXing.world Shortwave Bridge deep-link support.
        // Example: https://shortwave.sbs/?q=BBC
        const bridgeParams = new URLSearchParams(window.location.search);
        const bridgeQuery = (bridgeParams.get("q") || "").trim();

        if (bridgeQuery && els.searchInput) {
            els.searchInput.value = bridgeQuery;

            // Search the entire schedule rather than the default 49m/on-air view.
            if (els.bandSelect) {
                els.bandSelect.value = "";
            }

            if (els.onAirOnly) {
                els.onAirOnly.checked = false;
            }
        }

        renderSourceInfo(
            data.sources);

        const generatedAt =
            new Date(data.generatedAt);

        const updated =
            Number.isNaN(generatedAt.getTime())
             ? "unknown"
             : generatedAt.toLocaleString(
                "fi-FI", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            });

        els.dataInfo.textContent =
            `${data.count ?? allSchedules.length} schedules ` + 
`• lists updated ${updated}`;

        render();
        runDxiShadowMode();

        if (bridgeQuery) {
            requestAnimationFrame(() => {
                document
                .querySelector('[data-section="controls"]')
                ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

                els.searchInput?.focus({
                    preventScroll: true
                });
            });
        }
    } catch (error) {
        allSchedules = [];

        markDataLoadFailed(
            "schedules",
            error);

        els.dataInfo.textContent =
            "Schedule data unavailable";

        render();
    }
}

els.searchInput.addEventListener("input", render);
els.bandSelect.addEventListener("change", render);
els.onAirOnly.addEventListener("change", render);
els.locationBtn.addEventListener("click", requestLocation);
els.aboutBtn.addEventListener("click", showAbout);
els.aboutClose.addEventListener("click", hideAbout);

els.sectionsBtn.addEventListener("click", showSections);
els.sectionsClose.addEventListener("click", hideSections);
els.sectionsReset.addEventListener("click", resetSections);

document.querySelectorAll(".layout-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        applyLayout(btn.dataset.layout);
    });
});

els.sectionsModal.addEventListener("click", event => {
    if (event.target === els.sectionsModal) {
        hideSections();
    }
});

els.regionSelect.addEventListener("change", () => {
    userLocation = null;
    localStorage.setItem("swRegion", els.regionSelect.value);
    els.locationBtn.textContent = "Use my location";
    render();
});

if (els.sourceInfoBtn && els.sourceInfoPanel) {
    els.sourceInfoBtn.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        toggleSourceInfo();
    });
}

els.aboutModal.addEventListener("click", event => {
    if (event.target === els.aboutModal)
        hideAbout();
});
if (els.autoBandBtn) {
    els.autoBandBtn.addEventListener("click", applyAutoBand);
}
els.sourceToggles.forEach(input => {
    input.addEventListener("change", render);
});

els.modalClose.addEventListener("click", hideDetails);
els.detailModal.addEventListener("click", event => {
    if (event.target === els.detailModal)
        hideDetails();
});

if (els.dataLoadRetry) {
    els.dataLoadRetry.addEventListener(
        "click",
        async() => {
        els.dataLoadRetry.disabled = true;
        els.dataLoadRetry.textContent = "Retrying…";

        try {
            await loadSchedules();
        } finally {
            els.dataLoadRetry.disabled = false;
            els.dataLoadRetry.textContent = "Retry";
        }
    });
}

if (
    els.dataLoadWarningClose &&
    els.dataLoadWarning) {
    els.dataLoadWarningClose.addEventListener(
        "click",
        () => {
        els.dataLoadWarning.classList.add(
            "hidden");
    });
}

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        hideDetails();
        hideAbout();
    }
});

function getSectionState() {
    try {
        return JSON.parse(localStorage.getItem("swSections")) || {};
    } catch {
        return {};
    }
}

function saveSectionState(state) {
    localStorage.setItem("swSections", JSON.stringify(state));
}

function applySectionVisibility() {
    const state = getSectionState();

    document.querySelectorAll("[data-section]").forEach(section => {
        const key = section.dataset.section;
        const visible = state[key] !== false;

        section.classList.toggle("section-hidden", !visible);
    });
}

function renderSectionSettings() {
    const state = getSectionState();

    els.sectionsList.innerHTML = Object.entries(sectionConfig).map(([key, label]) => {
        const checked = state[key] !== false ? "checked" : "";

        return `
      <label class="toggle section-toggle">
        <input class="sectionVisibilityToggle" type="checkbox" value="${escapeHtml(key)}" ${checked} />
        <span>${escapeHtml(label)}</span>
      </label>
    `;
    }).join("");

    els.sectionsList.querySelectorAll(".sectionVisibilityToggle").forEach(input => {
        input.addEventListener("change", () => {
            const next = getSectionState();
            next[input.value] = input.checked;

            saveSectionState(next);

            // Käyttäjä poistui presetistä -> nyt käytössä on oma näkymä
            localStorage.removeItem("swLayout");
            updateCurrentLayout();

            applySectionVisibility();
        });
    });
}

function showSections() {
    renderSectionSettings();
    els.sectionsModal.classList.remove("hidden");
}

function hideSections() {
    els.sectionsModal.classList.add("hidden");
}

function resetSections() {
    localStorage.removeItem("swSections");
    localStorage.removeItem("swLayout");
    renderSectionSettings();
    applySectionVisibility();
    updateCurrentLayout();
}

updateClock();
setInterval(updateClock, 1000);
setInterval(render, 60_000);

applySectionVisibility();
updateCurrentLayout();

loadSchedules().catch(err => {
    console.error(err);
    els.dataInfo.textContent = "Could not load schedules.json";
});