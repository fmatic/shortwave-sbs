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
                "ActivityAnalyst expects an array of broadcasts."
            );
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

        const rankedBands =
            Object.entries(bandCounts)
                .sort((a, b) => b[1] - a[1]);

        return this.analyzeMetrics({
            activeBroadcasts: broadcasts.length,
            bandCounts,
            busiestBand: rankedBands[0]?.[0] || null,
            busiestBandCount: rankedBands[0]?.[1] || 0,
            secondBand: rankedBands[1]?.[0] || null,
            secondBandCount: rankedBands[1]?.[1] || 0
        });
    }

    analyzeMetrics({
        activeBroadcasts = 0,
        bandCounts = null,
        busiestBand = null,
        busiestBandCount = 0,
        secondBand = null,
        secondBandCount = 0
    } = {}) {

        const lead =
            busiestBandCount - secondBandCount;

        const leadRatio =
            busiestBandCount > 0
                ? lead / busiestBandCount
                : 0;

        /*
         * Historical shadow logs do not contain full bandCounts.
         *
         * In that case activeBroadcasts is used as the total activity
         * baseline. Live analysis continues to use the actual sum of
         * bandCounts.
         */
        const totalBandActivity =
            bandCounts
                ? Object.values(bandCounts)
                    .reduce(
                        (sum, count) =>
                            sum + count,
                        0
                    )
                : activeBroadcasts;

        /*
         * Band intensity
         *
         * Empirically calibrated from the DXI shadow baseline:
         *
         * P0   = 140
         * P10  = 175
         * P25  = 188
         * P50  = 198
         * P75  = 232
         * P90  = 282
         * P100 = 311
         */

        const intensityPoints = [
            [140, 0],
            [175, 20],
            [188, 35],
            [198, 50],
            [232, 70],
            [282, 90],
            [311, 100]
        ];

        function interpolateScore(value, points) {
            if (value <= points[0][0]) {
                return points[0][1];
            }

            for (let i = 1; i < points.length; i++) {
                const [x1, y1] = points[i - 1];
                const [x2, y2] = points[i];

                if (value <= x2) {
                    const position =
                        (value - x1) /
                        (x2 - x1);

                    return Math.round(
                        y1 +
                        position *
                        (y2 - y1)
                    );
                }
            }

            return points[
                points.length - 1
            ][1];
        }

        const intensityScore =
            interpolateScore(
                busiestBandCount,
                intensityPoints
            );

        const concentrationRatio =
            totalBandActivity > 0
                ? busiestBandCount /
                    totalBandActivity
                : 0;

        const concentrationScore =
            Math.min(
                100,
                Math.round(
                    concentrationRatio * 1000
                )
            );

        const leadershipScore =
            Math.min(
                100,
                Math.round(
                    (leadRatio / 0.25) * 100
                )
            );

        const activityScore =
            Math.round(
                intensityScore * 0.60 +
                concentrationScore * 0.25 +
                leadershipScore * 0.15
            );

        let activityLevel = "quiet";

        if (activityScore >= 75) {
            activityLevel = "very-busy";
        } else if (activityScore >= 55) {
            activityLevel = "busy";
        } else if (activityScore >= 30) {
            activityLevel = "moderate";
        }

        const diagnostics = [];

        const isNearTie =
            busiestBand &&
            secondBand &&
            secondBandCount > 0 &&
            leadRatio <= 0.10;

        if (isNearTie) {
            diagnostics.push({
                code: "NEAR_TIE",
                message:
`${busiestBand} and ${secondBand} are nearly tied for current activity.`,
                value: leadRatio
            });
        } else if (busiestBand) {
            diagnostics.push({
                code: "BUSIEST_BAND",
                message:
`${busiestBand} is currently the most active band.`,
                value: busiestBandCount
            });
        }

        if (
            busiestBand &&
            secondBand &&
            lead >= 3 &&
            leadRatio >= 0.15
        ) {
            diagnostics.push({
                code: "ACTIVITY_LEAD",
                message:
`${busiestBand} leads ${secondBand} by ${lead} active broadcast${lead === 1 ? "" : "s"}.`,
                value: lead
            });
        }

        if (busiestBand) {
            if (activityScore >= 75) {
                diagnostics.push({
                    code: "HIGH_ACTIVITY",
                    message:
`${busiestBand} is genuinely very busy right now.`,
                    value: activityScore
                });
            } else if (
                concentrationScore >= 70 &&
                intensityScore < 30
            ) {
                diagnostics.push({
                    code: "QUIET_DOMINANCE",
                    message:
`${busiestBand} dominates the current activity, but its absolute activity remains low.`,
                    value: intensityScore
                });
            }
        }

        return new AnalysisResult({
            analyst: "ActivityAnalyst",
            score: activityScore,
            confidence:
                activeBroadcasts > 0
                    ? 100
                    : 0,

            diagnostics,

            metadata: {
                activeBroadcasts,
                bandCounts,
                busiestBand,
                busiestBandCount,
                secondBand,
                secondBandCount,
                lead,
                leadRatio,
                totalBandActivity,
                intensityScore,
                concentrationRatio,
                concentrationScore,
                leadershipScore,
                activityScore,
                activityLevel
            }
        });
    }
}