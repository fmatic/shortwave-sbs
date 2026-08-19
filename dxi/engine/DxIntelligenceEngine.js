/**
 * DX Intelligence Engine
 *
 * Combines analyst results into a shared
 * intelligence picture.
 *
 * @author Janne Heinikangas
 */

export class DxIntelligenceEngine {
    combine(results = []) {
        if (!Array.isArray(results)) {
            throw new TypeError(
                "DxIntelligenceEngine expects an array of analysis results.");
        }

        const validResults =
            results.filter(result =>
                result &&
                typeof result.score === "number");

        if (!validResults.length) {
            return {
                score: 0,
                confidence: 0,
                summary: "No intelligence available.",
                correlations: [],
                results: []
            };
        }

        const score =
            Math.round(
                validResults.reduce(
                    (sum, result) =>
                    sum + result.score,
                    0) / validResults.length);

        const confidence =
            Math.round(
                validResults.reduce(
                    (sum, result) =>
                    sum + (result.confidence || 0),
                    0) / validResults.length);

        const correlations = [];

        /*
         * Locate analyst results.
         */

        const activityResult =
            validResults.find(
                result =>
                result.analyst === "ActivityAnalyst");

        const greylineResult =
            validResults.find(
                result =>
                result.analyst === "GreylineAnalyst");

        const propagationResult =
            validResults.find(
                result =>
                result.analyst === "PropagationAnalyst");

        /*
         * Extract normalized analyst metadata.
         */

        const activityLevel =
            activityResult?.metadata?.activityLevel;

        const greylineLevel =
            greylineResult?.metadata?.greylineLevel;

        const busiestBand =
            activityResult?.metadata?.busiestBand;

        const propagationLevel =
            propagationResult?.metadata?.propagationLevel;

        const favoredBands =
            Array.isArray(
                propagationResult?.metadata?.favoredBands)
             ? propagationResult.metadata.favoredBands
             : [];

        /*
         * Correlation:
         *
         * High activity + strong greyline
         */

        if (
            activityLevel === "very-busy" &&
            greylineLevel === "strong") {
            correlations.push({
                code: "HIGH_ACTIVITY_GREYLINE",

                message:
                `High broadcast activity on ` + 
                `${busiestBand || "the leading band"} ` + 
`overlaps with a strong greyline window.`,

                priority: "high",

                analysts: [
                    "ActivityAnalyst",
                    "GreylineAnalyst"
                ]
            });
        }

        /*
         * Correlation:
         *
         * Active band + favorable propagation
         * on the same band
         */

        if (
            ["busy", "very-busy"].includes(activityLevel) &&
            ["good", "excellent"].includes(propagationLevel) &&
            busiestBand &&
            favoredBands.includes(busiestBand)) {
            correlations.push({
                code: "FAVORABLE_ACTIVE_BAND",

                message:
                `${busiestBand} combines strong broadcast activity with ` + 
`${propagationLevel} propagation conditions.`,

                priority: "medium",

                analysts: [
                    "ActivityAnalyst",
                    "PropagationAnalyst"
                ],

                metadata: {
                    band: busiestBand,
                    activityLevel,
                    propagationLevel
                }
            });
        }

        /*
         * Correlation:
         *
         * Very high activity
         * + strong greyline
         * + favorable propagation
         * + propagation favors the same band
         */

        if (
            activityLevel === "very-busy" &&
            greylineLevel === "strong" &&
            ["good", "excellent"].includes(
                propagationLevel) &&
            busiestBand &&
            favoredBands.includes(busiestBand)) {
            correlations.push({
                code: "EXCEPTIONAL_DX_WINDOW",

                message:
                `${busiestBand} combines very high broadcast activity, ` + 
                `strong greyline conditions and ` + 
`${propagationLevel} propagation.`,

                priority: "critical",

                analysts: [
                    "ActivityAnalyst",
                    "GreylineAnalyst",
                    "PropagationAnalyst"
                ],

                metadata: {
                    band: busiestBand,
                    activityLevel,
                    greylineLevel,
                    propagationLevel
                }
            });
        }

        const priorityRank = {
            medium: 1,
            high: 2,
            critical: 3
        };

        correlations.sort(
            (a, b) =>
            (priorityRank[b.priority] || 0) -
            (priorityRank[a.priority] || 0));

        const highestPriority =
            correlations[0]?.priority || null;

        let summary =
            "Combined DX intelligence available.";

        if (highestPriority === "medium") {
            summary =
                "Favorable DX conditions detected.";
        } else if (highestPriority === "high") {
            summary =
                "Strong DX opportunity detected.";
        } else if (highestPriority === "critical") {
            summary =
                "Exceptional DX opportunity detected.";
        }

        return {
            score,
            confidence,
            summary,

            primaryCorrelation:
            correlations[0] || null,

            correlations,

            results: validResults
        };
    }
}