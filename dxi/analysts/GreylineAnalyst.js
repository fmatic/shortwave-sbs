/**
 * DX Intelligence Engine
 *
 * GreylineAnalyst
 *
 * Evaluates whether transmitter and receiver locations
 * currently have twilight / greyline potential.
 *
 * @author Janne Heinikangas
 */

import { AnalysisResult } from "../contracts/AnalysisResult.js";

export class GreylineAnalyst {
    analyze(paths = []) {
        if (!Array.isArray(paths)) {
            throw new TypeError(
                "GreylineAnalyst expects an array of paths."
            );
        }

        const validPaths = paths.filter(path =>
            path &&
            path.rxMode &&
            path.txMode
        );

        const greylinePaths = validPaths.filter(path =>
            path.rxMode === "Twilight" ||
            path.txMode === "Twilight"
        );

        const greylineCount =
            greylinePaths.length;

        const totalPaths =
            validPaths.length;

        const greylineRatio =
            totalPaths > 0
                ? greylineCount / totalPaths
                : 0;

        const greylineScore =
            Math.round(
                greylineRatio * 100
            );

        let greylineLevel = "none";

        if (greylineScore >= 75) {
            greylineLevel = "strong";
        } else if (greylineScore >= 40) {
            greylineLevel = "moderate";
        } else if (greylineScore > 0) {
            greylineLevel = "limited";
        }

        const diagnostics = [];

        if (greylineCount > 0) {
            diagnostics.push({
                code: "GREYLINE_PATHS",
                message:
                    `${greylineCount} of ${totalPaths} paths currently show greyline potential.`,
                value: greylineCount
            });
        }

        if (greylineLevel === "strong") {
            diagnostics.push({
                code: "STRONG_GREYLINE_WINDOW",
                message:
                    "Greyline conditions are currently affecting most evaluated paths.",
                value: greylineScore
            });
        }

        return new AnalysisResult({
            analyst: "GreylineAnalyst",
            score: greylineScore,
            confidence: totalPaths ? 100 : 0,

            diagnostics,

            metadata: {
                totalPaths,
                greylineCount,
                greylineRatio,
                greylineScore,
                greylineLevel
            }
        });
    }
}