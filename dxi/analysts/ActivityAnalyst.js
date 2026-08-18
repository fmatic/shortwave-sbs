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

        const secondBand =
            rankedBands[1]?.[0] || null;

        const secondBandCount =
            rankedBands[1]?.[1] || 0;

        const lead =
            busiestBandCount - secondBandCount;

        const leadRatio =
            busiestBandCount > 0
             ? lead / busiestBandCount
             : 0;

        const totalBandActivity =
            Object.values(bandCounts)
            .reduce((sum, count) => sum + count, 0);

        const relativeActivityScore =
            totalBandActivity > 0
             ? Math.round(
                (busiestBandCount / totalBandActivity) * 100)
             : 0;

        const absoluteActivityScore =
            Math.min(
                100,
                Math.round(
                    (busiestBandCount / 50) * 100));

        const activityScore =
            Math.round(
                relativeActivityScore * 0.4 +
                absoluteActivityScore * 0.6);

        let activityLevel = "quiet";

        if (absoluteActivityScore >= 80) {
            activityLevel = "very-busy";
        } else if (absoluteActivityScore >= 55) {
            activityLevel = "busy";
        } else if (absoluteActivityScore >= 30) {
            activityLevel = "moderate";
        }

        const diagnostics = [];

        if (busiestBand) {
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
            leadRatio >= 0.15) {
            diagnostics.push({
                code: "ACTIVITY_LEAD",
                message:
`${busiestBand} leads ${secondBand} by ${lead} active broadcast${lead === 1 ? "" : "s"}.`,
                value: lead
            });
        }

        if (busiestBand) {
            if (absoluteActivityScore >= 80) {
                diagnostics.push({
                    code: "HIGH_ACTIVITY",
                    message:
`${busiestBand} is genuinely very busy right now.`,
                    value: absoluteActivityScore
                });
            } else if (
                relativeActivityScore >= 50 &&
                absoluteActivityScore < 30) {
                diagnostics.push({
                    code: "QUIET_DOMINANCE",
                    message:
`${busiestBand} dominates the current activity, but overall activity is still low.`,
                    value: absoluteActivityScore
                });
            }
        }

        return new AnalysisResult({
            analyst: "ActivityAnalyst",
            score: activityScore,
            confidence: broadcasts.length ? 100 : 0,

            diagnostics,

            metadata: {
                activeBroadcasts: broadcasts.length,
                bandCounts,
                busiestBand,
                busiestBandCount,
                secondBand,
                secondBandCount,
                lead,
                leadRatio,
                totalBandActivity,
                relativeActivityScore,
                absoluteActivityScore,
                activityScore,
                activityLevel
            }
        });
    }
}