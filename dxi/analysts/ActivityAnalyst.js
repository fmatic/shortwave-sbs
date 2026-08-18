/**
 * DX Intelligence Engine
 *
 * ActivityAnalyst
 *
 * Evaluates current broadcast activity on a shortwave band.
 *
 * @author Janne Heinikangas
 */

import { AnalysisResult } from "../contracts/AnalysisResult.js";

export class ActivityAnalyst {
    analyze(broadcasts = []) {
        if (!Array.isArray(broadcasts)) {
            throw new TypeError(
                "ActivityAnalyst expects an array of broadcasts.");
        }

        const bandCounts = {};

        for (const broadcast of broadcasts) {
            const band = broadcast?.band;

            if (!band) {
                continue;
            }

            bandCounts[band] =
                (bandCounts[band] || 0) + 1;
        }

        const rankedBands = Object.entries(bandCounts)
            .sort((a, b) => b[1] - a[1]);

        const busiestBand =
            rankedBands[0]?.[0] || null;

        const busiestBandCount =
            rankedBands[0]?.[1] || 0;

        return new AnalysisResult({
            analyst: "ActivityAnalyst",
            score: 0,
            confidence: broadcasts.length ? 100 : 0,

            diagnostics: busiestBand
             ? [{
                    code: "BUSIEST_BAND",
                    message:
`${busiestBand} is currently the most active band.`,
                    value: busiestBandCount
                }
            ]
             : [],

            metadata: {
                activeBroadcasts: broadcasts.length,
                bandCounts,
                busiestBand,
                busiestBandCount
            }
        });
    }
}