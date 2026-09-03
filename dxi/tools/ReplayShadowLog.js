/**
 * DX Intelligence Engine
 *
 * Replay Shadow Log
 *
 * Replays and summarizes historical DXI shadow data.
 *
 * @author Janne Heinikangas
 */

import fs from "node:fs";
import { ActivityAnalyst } from "../analysts/ActivityAnalyst.js";
import { DxIntelligenceEngine } from "../engine/DxIntelligenceEngine.js";
import {
    PropagationAnalyst
} from "../analysts/PropagationAnalyst.js";

const inputFile =
    process.argv[2];

if (!inputFile) {
    console.error(
        "Usage: node dxi/tools/ReplayShadowLog.js <jsonl-file>");

    process.exit(1);
}

const lines =
    fs.readFileSync(
        inputFile,
        "utf8")
    .split(/\r?\n/)
    .filter(Boolean);

const records =
    lines.map(
        line => JSON.parse(line));

const activityScores =
    records.map(
        record => record.activity.score);

const greylineScores =
    records.map(
        record => record.greyline.score);


const propagationScores =
    records.map(
        record => record.propagation.score);

const intelligenceScores =
    records.map(
        record => record.intelligence.score);

const activityAnalyst =
    new ActivityAnalyst();

const replayActivityResults =
    records.map(record => {
        const old =
            record.activity;

        return activityAnalyst.analyzeMetrics({
            activeBroadcasts:
            Number(
                old.activeBroadcasts || 0),

            busiestBand:
            old.busiestBand || null,

            busiestBandCount:
            Number(
                old.busiestBandCount || 0),

            secondBand:
            old.secondBand || null,

            secondBandCount:
            Number(
                old.secondBandCount || 0)
        });
    });

const intelligenceEngine =
    new DxIntelligenceEngine();

const replayEngineResults =
    records.map((record, index) => {

        /*
         * Activity is genuinely replayed through
         * the new ActivityAnalyst v2.
         */

        const activityResult =
            replayActivityResults[index];

        /*
         * Historical Greyline result.
         *
         * The shadow log contains the result values,
         * so rebuild the normalized analyst result
         * expected by DxIntelligenceEngine.
         */

        const greylineResult = {
            analyst: "GreylineAnalyst",

            score:
            Number(
                record.greyline?.score || 0),

            confidence:
            Number(
                record.greyline?.confidence || 0),

            metadata: {
                greylineLevel:
                record.greyline?.greylineLevel || null,

                totalPaths:
                record.greyline?.totalPaths || 0,

                greylineCount:
                record.greyline?.greylineCount || 0,

                greylineRatio:
                record.greyline?.greylineRatio || 0
            }
        };

        /*
         * Historical Propagation result.
         */

        const propagationResult = {
            analyst: "PropagationAnalyst",

            score:
            Number(
                record.propagation?.score || 0),

            confidence:
            Number(
                record.propagation?.confidence || 0),

            metadata: {
                propagationLevel:
                record.propagation
                ?.propagationLevel || null,

                favoredBands:
                Array.isArray(
                    record.propagation
                    ?.favoredBands)
                 ? record.propagation.favoredBands
                 : [],

                kp:
                record.propagation?.kp ?? null,

                sfi:
                record.propagation?.sfi ?? null
            }
        };

        return intelligenceEngine.combine([
                activityResult,
                greylineResult,
                propagationResult
            ]);
    });

const propagationAnalyst =
    new PropagationAnalyst();

const replayPropagationResults =
    records.map(record =>
        propagationAnalyst.analyze({
            propagation: {
                kp:
                    record.propagation?.kp ?? null,

                sfi:
                    record.propagation?.sfi ?? null,

                favoredBands:
                    Array.isArray(
                        record.propagation?.favoredBands
                    )
                        ? record.propagation.favoredBands
                        : []
            }
        })
    );

const replayEngineV2Results =
    records.map((record, index) => {

        const activityResult =
            replayActivityResults[index];

        const propagationResult =
            replayPropagationResults[index];

        /*
         * Greyline is reconstructed from the
         * historical shadow snapshot.
         */

        const greylineResult = {
            analyst: "GreylineAnalyst",

            score:
                Number(
                    record.greyline?.score || 0
                ),

            confidence:
                Number(
                    record.greyline?.confidence || 0
                ),

            diagnostics:
                record.greyline?.diagnostics || [],

            metadata: {
                greylineLevel:
                    record.greyline
                        ?.greylineLevel || null,

                totalPaths:
                    record.greyline
                        ?.totalPaths || 0,

                greylineCount:
                    record.greyline
                        ?.greylineCount || 0,

                greylineRatio:
                    record.greyline
                        ?.greylineRatio || 0
            }
        };

        return intelligenceEngine.combine([
            activityResult,
            greylineResult,
            propagationResult
        ]);
    });
	
	const replayEngineV2Scores =
    replayEngineV2Results.map(
        result => result.score
    );

const replayEngineV2PrimaryCorrelations = {};

for (const result of replayEngineV2Results) {
    const code =
        result.primaryCorrelation?.code ||
        "none";

    replayEngineV2PrimaryCorrelations[code] =
        (replayEngineV2PrimaryCorrelations[code] || 0) + 1;
}

const replayEngineV2AllCorrelations = {};

for (const result of replayEngineV2Results) {
    for (
        const correlation
        of result.correlations || []
    ) {
        const code =
            correlation.code || "unknown";

        replayEngineV2AllCorrelations[code] =
            (replayEngineV2AllCorrelations[code] || 0) + 1;
    }
}

const replayEngineV2Summaries = {};

for (const result of replayEngineV2Results) {
    const summary =
        result.summary || "unknown";

    replayEngineV2Summaries[summary] =
        (replayEngineV2Summaries[summary] || 0) + 1;
}

const replayPropagationScoreCounts = {};

for (const result of replayPropagationResults) {
    const score =
        result.score;

    replayPropagationScoreCounts[score] =
        (replayPropagationScoreCounts[score] || 0) + 1;
}
	
const replayPropagationScores =
    replayPropagationResults.map(
        result => result.score
    );

const replayPropagationLevels = {};

for (const result of replayPropagationResults) {
    const level =
        result.metadata.propagationLevel;

    replayPropagationLevels[level] =
        (replayPropagationLevels[level] || 0) + 1;
}

const replayEngineScores =
    replayEngineResults.map(
        result => result.score);

const replayPrimaryCorrelations = {};

for (const result of replayEngineResults) {
    const code =
        result.primaryCorrelation?.code ||
        "none";

    replayPrimaryCorrelations[code] =
        (replayPrimaryCorrelations[code] || 0) + 1;
}

const replayAllCorrelations = {};

for (const result of replayEngineResults) {
    for (const correlation of result.correlations || []) {
        const code =
            correlation.code || "unknown";

        replayAllCorrelations[code] =
            (replayAllCorrelations[code] || 0) + 1;
    }
}

const replayEngineSummaries = {};

for (const result of replayEngineResults) {
    const summary =
        result.summary ||
        "unknown";

    replayEngineSummaries[summary] =
        (replayEngineSummaries[summary] || 0) + 1;
}

function average(values) {
    if (!values.length) {
        return 0;
    }

    return (
        values.reduce(
            (sum, value) =>
            sum + Number(value || 0),
            0) / values.length);
}

const replayActivityScores =
    replayActivityResults.map(
        result => result.score);

const replayActivityLevels = {};

for (const result of replayActivityResults) {
    const level =
        result.metadata.activityLevel;

    replayActivityLevels[level] =
        (replayActivityLevels[level] || 0) + 1;
}

function range(values) {
    return {
        min:
        Math.min(...values),

        max:
        Math.max(...values)
    };
}

function percentile(values, p) {
    if (!values.length) {
        return 0;
    }

    const sorted =
        [...values]
    .map(Number)
    .sort((a, b) => a - b);

    const index =
        (sorted.length - 1) * p;

    const lower =
        Math.floor(index);

    const upper =
        Math.ceil(index);

    if (lower === upper) {
        return sorted[lower];
    }

    const weight =
        index - lower;

    return (
        sorted[lower] * (1 - weight) +
        sorted[upper] * weight);
}

function distribution(values) {
    return {
        min: Math.min(...values),
        p10: percentile(values, 0.10),
        p25: percentile(values, 0.25),
        median: percentile(values, 0.50),
        p75: percentile(values, 0.75),
        p90: percentile(values, 0.90),
        max: Math.max(...values)
    };
}

const activityLevels = {};

for (const record of records) {
    const level =
        record.activity.activityLevel || "unknown";

    activityLevels[level] =
        (activityLevels[level] || 0) + 1;
}

const primaryCorrelations = {};

for (const record of records) {
    const code =
        record.intelligence
        .primaryCorrelation
        ?.code || "none";

    primaryCorrelations[code] =
        (primaryCorrelations[code] || 0) + 1;
}

const busiestBands = {};

for (const record of records) {
    const band =
        record.activity.busiestBand || "unknown";

    busiestBands[band] =
        (busiestBands[band] || 0) + 1;
}

const totalBandActivityValues =
    records.map(
        record =>
        Number(
            record.activity.activeBroadcasts || 0));

const busiestBandCountValues =
    records.map(
        record =>
        record.activity.busiestBandCount);

const leadRatioValues =
    records.map(record => {
        const first =
            Number(
                record.activity.busiestBandCount || 0);

        const second =
            Number(
                record.activity.secondBandCount || 0);

        if (!first) {
            return 0;
        }

        return (
            first - second) / first;
    });

const activityGreylineMatrix = {};

for (let i = 0; i < records.length; i++) {
    const activityLevel =
        replayActivityResults[i]
        .metadata
        .activityLevel || "unknown";

    const greylineLevel =
        records[i]
        .greyline
        ?.greylineLevel || "unknown";

    const key =
`${activityLevel} + ${greylineLevel}`;

    activityGreylineMatrix[key] =
        (activityGreylineMatrix[key] || 0) + 1;
}

const kpValues =
    records.map(
        record =>
            Number(
                record.propagation?.kp ?? 0
            )
    );

const sfiValues =
    records.map(
        record =>
            Number(
                record.propagation?.sfi ?? 0
            )
    );

const favoredBandCounts =
    records.map(
        record => {
            const bands =
                record.propagation?.favoredBands;

            return Array.isArray(bands)
                ? bands.length
                : 0;
        }
    );
	
const propagationLevels = {};

for (const record of records) {
    const level =
        record.propagation
            ?.propagationLevel ||
        "unknown";

    propagationLevels[level] =
        (propagationLevels[level] || 0) + 1;
}

const propagationCombinations = {};

for (const record of records) {
    const kp =
        record.propagation?.kp ?? null;

    const sfi =
        record.propagation?.sfi ?? null;

    const score =
        record.propagation?.score ?? null;

    const level =
        record.propagation
            ?.propagationLevel ||
        "unknown";

    const key =
        `Kp=${kp} SFI=${sfi} score=${score} level=${level}`;

    propagationCombinations[key] =
        (propagationCombinations[key] || 0) + 1;
}

console.log(
    "\nDXI Replay Analysis");

console.log(
    "===================\n");

console.log(
`Snapshots: ${records.length}`);

console.log(
    "\nActivity");

console.log(
    "\nActivity v2 replay");

console.log(
    "\nActivity v2 + Greyline matrix:");

console.log(
    "\nPropagation v2 replay"
);

console.log(
    "\nPropagation v2 score distribution:"
);

console.log(
    replayPropagationScoreCounts
);

console.log(
    `  mean: ${average(replayPropagationScores).toFixed(1)}`
);

console.log(
    `  range: ${range(replayPropagationScores).min}-${range(replayPropagationScores).max}`
);

console.log(
    "  levels:",
    replayPropagationLevels
);

console.log(
    activityGreylineMatrix);

console.log(
    "\nAll replayed correlations:");

console.log(
    replayAllCorrelations);

console.log(
`  mean: ${average(replayActivityScores).toFixed(1)}`);

console.log(
`  range: ${range(replayActivityScores).min}-${range(replayActivityScores).max}`);

console.log(
    "  levels:",
    replayActivityLevels);

console.log(
`  mean: ${average(activityScores).toFixed(1)}`);

console.log(
`  range: ${range(activityScores).min}-${range(activityScores).max}`);

console.log(
    "  levels:",
    activityLevels);

console.log(
    "\nGreyline");

console.log(
`  mean: ${average(greylineScores).toFixed(1)}`);

console.log(
`  range: ${range(greylineScores).min}-${range(greylineScores).max}`);

console.log(
    "\nPropagation");

console.log(
`  mean: ${average(propagationScores).toFixed(1)}`);

console.log(
`  range: ${range(propagationScores).min}-${range(propagationScores).max}`);

console.log(
    "\nDX Intelligence");

console.log(
`  mean: ${average(intelligenceScores).toFixed(1)}`);

console.log(
`  range: ${range(intelligenceScores).min}-${range(intelligenceScores).max}`);

console.log(
    "\nBusiest bands:",
    busiestBands);

console.log(
    "\nActivity distributions");

console.log(
    "\nTotal band activity");

console.log(
    distribution(
        totalBandActivityValues));

console.log(
    "\nBusiest band count");

console.log(
    distribution(
        busiestBandCountValues));

console.log(
    "\nBusiest band lead ratio");

console.log(
    distribution(
        leadRatioValues));

console.log(
    "\nPrimary correlations:",
    primaryCorrelations);

console.log(
    "\nDX Intelligence + Activity v2 replay");

console.log(
`  mean: ${average(replayEngineScores).toFixed(1)}`);

console.log(
`  range: ${range(replayEngineScores).min}-${range(replayEngineScores).max}`);

console.log(
    "\nPropagation distributions"
);

console.log(
    "\nKp"
);

console.log(
    distribution(
        kpValues
    )
);

console.log(
    "\nSFI"
);

console.log(
    distribution(
        sfiValues
    )
);

console.log(
    "\nFavored band count"
);

console.log(
    distribution(
        favoredBandCounts
    )
);

console.log(
    "\nPropagation levels:"
);

console.log(
    propagationLevels
);

console.log(
    "\nPropagation combinations:"
);

console.log(
    propagationCombinations
);

console.log(
    "\nReplayed primary correlations:");

console.log(
    replayPrimaryCorrelations);

console.log(
    "\nReplayed intelligence summaries:");

console.log(
    replayEngineSummaries);

console.log(
    "\nDX Intelligence v2 full replay"
);

console.log(
    `  mean: ${average(replayEngineV2Scores).toFixed(1)}`
);

console.log(
    `  range: ${range(replayEngineV2Scores).min}-${range(replayEngineV2Scores).max}`
);

console.log(
    "\nDXI v2 primary correlations:"
);

console.log(
    replayEngineV2PrimaryCorrelations
);

console.log(
    "\nDXI v2 all correlations:"
);

console.log(
    replayEngineV2AllCorrelations
);

console.log(
    "\nDXI v2 summaries:"
);

console.log(
    replayEngineV2Summaries
);