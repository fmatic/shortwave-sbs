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
                results: []
            };
        }

        const score =
            Math.round(
                validResults.reduce(
                    (sum, result) => sum + result.score,
                    0) / validResults.length);

        const confidence =
            Math.round(
                validResults.reduce(
                    (sum, result) =>
                    sum + (result.confidence || 0),
                    0) / validResults.length);

        const correlations = [];

        const activityResult =
            validResults.find(
                result =>
                result.analyst === "ActivityAnalyst");

        const greylineResult =
            validResults.find(
                result =>
                result.analyst === "GreylineAnalyst");

        const activityLevel =
            activityResult?.metadata?.activityLevel;

        const greylineLevel =
            greylineResult?.metadata?.greylineLevel;

        const busiestBand =
            activityResult?.metadata?.busiestBand;

        if (
            activityLevel === "very-busy" &&
            greylineLevel === "strong") {
            correlations.push({
                code: "HIGH_ACTIVITY_GREYLINE",
                message:
`High broadcast activity on ${busiestBand || "the leading band"} overlaps with a strong greyline window.`,
                priority: "high",
                analysts: [
                    "ActivityAnalyst",
                    "GreylineAnalyst"
                ]
            });
        }

        return {
            score,
            confidence,

            summary:
            correlations.length > 0
             ? "Significant DX intelligence detected."
             : "Combined DX intelligence available.",

            correlations,

            results: validResults
        };
    }
}