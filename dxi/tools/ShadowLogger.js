/**
 * DX Intelligence Engine
 *
 * Shadow Logger
 *
 * Runs DXI against live shortwave.sbs data and stores
 * periodic intelligence snapshots as JSONL.
 *
 * This logger is intentionally passive:
 * it does not affect the public UI or DX Assistant.
 *
 * @author Janne Heinikangas
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { LiveDataAdapter }
    from "../adapters/LiveDataAdapter.js";

import { ActivityAnalyst }
    from "../analysts/ActivityAnalyst.js";

import { GreylineAnalyst }
    from "../analysts/GreylineAnalyst.js";

import { PropagationAnalyst }
    from "../analysts/PropagationAnalyst.js";

import { DxIntelligenceEngine }
    from "../engine/DxIntelligenceEngine.js";


const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);

const PROJECT_ROOT =
    path.resolve(__dirname, "../..");

const SCHEDULE_FILE =
    path.join(
        PROJECT_ROOT,
        "data",
        "schedules.json"
    );

const SPACE_WEATHER_FILE =
    path.join(
        PROJECT_ROOT,
        "data",
        "space-weather.json"
    );

const LOG_DIR =
    path.join(
        PROJECT_ROOT,
        "logs"
    );

const LOG_FILE =
    path.join(
        LOG_DIR,
        "dxi-shadow.jsonl"
    );


/*
 * Fixed observation location.
 *
 * This intentionally matches the current
 * Northern Europe fallback profile used by
 * shortwave.sbs.
 *
 * Keeping the location fixed makes the
 * long-term observations comparable.
 */
const RX_LOCATION = {
    lat: 62.0,
    lon: 25.0,
    label: "Northern Europe profile"
};


const bandOrder = [
    "120m",
    "90m",
    "75m",
    "60m",
    "49m",
    "41m",
    "31m",
    "25m",
    "22m",
    "19m",
    "16m",
    "13m",
    "11m"
];


/*
 * -------------------------------------------------------
 * Time helpers
 * -------------------------------------------------------
 */

function utcMinutesNow() {
    const now = new Date();

    return (
        now.getUTCHours() * 60 +
        now.getUTCMinutes()
    );
}


function timeToMinutes(value) {
    if (!value) {
        return null;
    }

    let v =
        String(value).trim();

    if (v === "2400") {
        return 1440;
    }

    if (v.length < 4) {
        v = v.padStart(4, "0");
    }

    const h =
        Number(v.slice(0, 2));

    const m =
        Number(v.slice(2, 4));

    if (
        Number.isNaN(h) ||
        Number.isNaN(m)
    ) {
        return null;
    }

    return h * 60 + m;
}


function isOnAir(item) {
    const now =
        utcMinutesNow();

    const start =
        timeToMinutes(
            item.start
        );

    const end =
        timeToMinutes(
            item.end
        );

    if (
        start === null ||
        end === null
    ) {
        return false;
    }

    /*
     * Same start/end means continuous schedule.
     */
    if (start === end) {
        return true;
    }

    /*
     * Normal same-day schedule.
     */
    if (start < end) {
        return (
            now >= start &&
            now < end
        );
    }

    /*
     * Schedule crosses midnight.
     */
    return (
        now >= start ||
        now < end
    );
}


/*
 * -------------------------------------------------------
 * Solar / propagation helpers
 *
 * These intentionally mirror the current app.js logic
 * so browser shadow mode and server logger remain
 * directly comparable during the observation period.
 * -------------------------------------------------------
 */

function degToRad(deg) {
    return deg * Math.PI / 180;
}


function radToDeg(rad) {
    return rad * 180 / Math.PI;
}


function dayOfYear(date) {
    const start =
        new Date(
            Date.UTC(
                date.getUTCFullYear(),
                0,
                0
            )
        );

    const diff =
        date - start;

    return Math.floor(
        diff / 86400000
    );
}


function getSolarElevationApprox(
    lat,
    lon
) {
    const now =
        new Date();

    const day =
        dayOfYear(now);

    const hourUtc =
        now.getUTCHours() +
        now.getUTCMinutes() / 60;

    const decl =
        23.44 *
        Math.sin(
            degToRad(
                (360 / 365) *
                (day - 81)
            )
        );

    const solarTime =
        hourUtc +
        lon / 15;

    const hourAngle =
        15 *
        (solarTime - 12);

    return radToDeg(
        Math.asin(
            Math.sin(
                degToRad(lat)
            ) *
            Math.sin(
                degToRad(decl)
            ) +

            Math.cos(
                degToRad(lat)
            ) *
            Math.cos(
                degToRad(decl)
            ) *
            Math.cos(
                degToRad(hourAngle)
            )
        )
    );
}


function getPathMode(elevation) {
    if (elevation > 8) {
        return "Day";
    }

    if (elevation > -6) {
        return "Twilight";
    }

    return "Night";
}


function getSolarModeForLocation(
    lat,
    lon
) {
    return getPathMode(
        getSolarElevationApprox(
            lat,
            lon
        )
    );
}


/*
 * Same band model currently used by app.js.
 */
function getConditionScore(
    band,
    mode
) {
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

    return (
        scores[mode]?.[band] ??
        0
    );
}


/*
 * -------------------------------------------------------
 * Data loading
 * -------------------------------------------------------
 */

function readJson(file) {
    return JSON.parse(
        fs.readFileSync(
            file,
            "utf8"
        )
    );
}


/*
 * -------------------------------------------------------
 * DXI observation
 * -------------------------------------------------------
 */

function runObservation() {
    const scheduleData =
        readJson(
            SCHEDULE_FILE
        );

    const spaceWeather =
        readJson(
            SPACE_WEATHER_FILE
        );

    const schedules =
        Array.isArray(
            scheduleData.schedules
        )
            ? scheduleData.schedules
            : [];

    const active =
        schedules.filter(
            isOnAir
        );


    /*
     * ---------------------------------------------------
     * Stations
     * ---------------------------------------------------
     */

    const stations =
        active.map(
            item => ({
                frequency:
                    Number(
                        item.freq
                    ),

                station:
                    item.station || "",

                band:
                    item.band || "",

                source:
                    item.source || ""
            })
        );


    /*
     * ---------------------------------------------------
     * Band activity
     * ---------------------------------------------------
     */

    const bandActivity = {};

    for (
        const station
        of stations
    ) {
        if (!station.band) {
            continue;
        }

        bandActivity[
            station.band
        ] =
            (
                bandActivity[
                    station.band
                ] || 0
            ) + 1;
    }


    /*
     * ---------------------------------------------------
     * Greyline paths
     * ---------------------------------------------------
     */

    const rxMode =
        getSolarModeForLocation(
            RX_LOCATION.lat,
            RX_LOCATION.lon
        );

    const paths =
        active
        .filter(
            item =>
                item.txLat &&
                item.txLon
        )
        .map(
            item => {
                const txLat =
                    Number(
                        item.txLat
                    );

                const txLon =
                    Number(
                        item.txLon
                    );

                return {
                    frequency:
                        Number(
                            item.freq
                        ),

                    station:
                        item.station || "",

                    band:
                        item.band || "",

                    rxMode,

                    txMode:
                        getSolarModeForLocation(
                            txLat,
                            txLon
                        )
                };
            }
        );


    /*
     * ---------------------------------------------------
     * Propagation
     * ---------------------------------------------------
     */

    const mode =
        getPathMode(
            getSolarElevationApprox(
                RX_LOCATION.lat,
                RX_LOCATION.lon
            )
        );

    const propagation = {
        kp:
            Number(
                spaceWeather?.kp
            ),

        sfi:
            Number(
                spaceWeather?.sfi
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
     * ---------------------------------------------------
     * Snapshot
     * ---------------------------------------------------
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
     * ---------------------------------------------------
     * Analysts
     * ---------------------------------------------------
     */

    const activityResult =
        new ActivityAnalyst()
        .analyze(
            snapshot.stations
        );

    const greylineResult =
        new GreylineAnalyst()
        .analyze(
            snapshot.greyline.paths
        );

    /*
     * Important:
     *
     * PropagationAnalyst expects the full
     * DX snapshot, not snapshot.propagation.
     */
    const propagationResult =
        new PropagationAnalyst()
        .analyze(
            snapshot
        );


    /*
     * ---------------------------------------------------
     * Intelligence Engine
     * ---------------------------------------------------
     */

    const intelligence =
        new DxIntelligenceEngine()
        .combine([
            activityResult,
            greylineResult,
            propagationResult
        ]);


    /*
     * ---------------------------------------------------
     * Compact long-term record
     * ---------------------------------------------------
     */

    const record = {
        timestamp:
            new Date()
            .toISOString(),

        schemaVersion: 1,

        observer: {
            profile:
                RX_LOCATION.label,

            lat:
                RX_LOCATION.lat,

            lon:
                RX_LOCATION.lon,

            mode
        },

        activity: {
            score:
                activityResult.score,

            confidence:
                activityResult.confidence,

            activeBroadcasts:
                activityResult
                .metadata
                ?.activeBroadcasts ??
                active.length,

            busiestBand:
                activityResult
                .metadata
                ?.busiestBand ??
                null,

            busiestBandCount:
                activityResult
                .metadata
                ?.busiestBandCount ??
                0,

            secondBand:
                activityResult
                .metadata
                ?.secondBand ??
                null,

            secondBandCount:
                activityResult
                .metadata
                ?.secondBandCount ??
                0,

            activityLevel:
                activityResult
                .metadata
                ?.activityLevel ??
                null,

            diagnostics:
                activityResult
                .diagnostics ??
                []
        },

        greyline: {
            score:
                greylineResult.score,

            confidence:
                greylineResult.confidence,

            totalPaths:
                greylineResult
                .metadata
                ?.totalPaths ??
                0,

            greylineCount:
                greylineResult
                .metadata
                ?.greylineCount ??
                0,

            greylineRatio:
                greylineResult
                .metadata
                ?.greylineRatio ??
                0,

            greylineLevel:
                greylineResult
                .metadata
                ?.greylineLevel ??
                null,

            diagnostics:
                greylineResult
                .diagnostics ??
                []
        },

        propagation: {
            score:
                propagationResult.score,

            confidence:
                propagationResult.confidence,

            kp:
                propagationResult
                .metadata
                ?.kp ??
                null,

            sfi:
                propagationResult
                .metadata
                ?.sfi ??
                null,

            favoredBands:
                propagationResult
                .metadata
                ?.favoredBands ??
                [],

            propagationLevel:
                propagationResult
                .metadata
                ?.propagationLevel ??
                null,

            diagnostics:
                propagationResult
                .diagnostics ??
                []
        },

        intelligence: {
            score:
                intelligence.score,

            confidence:
                intelligence.confidence,

            summary:
                intelligence.summary,

            primaryCorrelation:
                intelligence
                .primaryCorrelation ??
                null,

            correlations:
                intelligence
                .correlations ??
                []
        }
    };

    return record;
}


/*
 * -------------------------------------------------------
 * Main
 * -------------------------------------------------------
 */

try {
    fs.mkdirSync(
        LOG_DIR,
        {
            recursive: true
        }
    );

    const record =
        runObservation();

    fs.appendFileSync(
        LOG_FILE,
        JSON.stringify(record) +
        "\n",
        "utf8"
    );

    console.log(
        [
            record.timestamp,
            `DXI=${record.intelligence.score}`,
            `activity=${record.activity.score}`,
            `greyline=${record.greyline.score}`,
            `propagation=${record.propagation.score}`,
            `primary=${record.intelligence.primaryCorrelation?.code || "none"}`
        ].join(" | ")
    );
} catch (error) {
    console.error(
        "DXI shadow logger failed:",
        error
    );

    process.exitCode = 1;
}