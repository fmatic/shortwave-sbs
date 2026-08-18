/**
 * DX Intelligence Engine
 *
 * PropagationAnalyst
 *
 * Evaluates current HF propagation conditions from
 * normalized space-weather and band-condition inputs.
 *
 * @author Janne Heinikangas
 */

import { AnalysisResult } from "../contracts/AnalysisResult.js";

export class PropagationAnalyst {
    analyze(conditions = {}) {
        if (
            !conditions ||
            typeof conditions !== "object" ||
            Array.isArray(conditions)
        ) {
            throw new TypeError(
                "PropagationAnalyst expects a propagation conditions object."
            );
        }

        const kp = Number(conditions.kp);
        const sfi = Number(conditions.sfi);

        const favoredBands =
            Array.isArray(conditions.favoredBands)
                ? conditions.favoredBands
                : [];

        const diagnostics = [];

        let score = 50;
        let confidence = 0;

        let knownInputs = 0;

        /*
         * Geomagnetic activity
         */

        if (Number.isFinite(kp)) {
            knownInputs++;

            if (kp <= 2) {
                score += 20;

                diagnostics.push({
                    code: "QUIET_GEOMAGNETIC",
                    message:
                        `Geomagnetic conditions are quiet at Kp ${kp}.`,
                    value: kp
                });
            } else if (kp <= 4) {
                score += 5;
            } else {
                score -= 30;

                diagnostics.push({
                    code: "DISTURBED_GEOMAGNETIC",
                    message:
                        `Geomagnetic activity is elevated at Kp ${kp}.`,
                    value: kp
                });
            }
        }

        /*
         * Solar flux
         */

        if (Number.isFinite(sfi)) {
            knownInputs++;

            if (sfi >= 150) {
                score += 20;

                diagnostics.push({
                    code: "HIGH_SOLAR_FLUX",
                    message:
                        `Solar flux is strong at ${sfi}.`,
                    value: sfi
                });
            } else if (sfi >= 110) {
                score += 10;
            } else if (sfi < 80) {
                score -= 15;

                diagnostics.push({
                    code: "LOW_SOLAR_FLUX",
                    message:
                        `Solar flux is relatively low at ${sfi}.`,
                    value: sfi
                });
            }
        }

        /*
         * Already normalized band information
         */

        if (favoredBands.length > 0) {
            knownInputs++;

            score += Math.min(
                15,
                favoredBands.length * 3
            );

            diagnostics.push({
                code: "FAVORED_BANDS",
                message:
                    `${favoredBands.length} HF bands are currently rated as favorable.`,
                value: favoredBands.length
            });
        }

        score =
            Math.max(
                0,
                Math.min(100, Math.round(score))
            );

        confidence =
            Math.min(
                100,
                Math.round(
                    (knownInputs / 3) * 100
                )
            );

        let propagationLevel = "fair";

        if (score >= 80) {
            propagationLevel = "excellent";
        } else if (score >= 65) {
            propagationLevel = "good";
        } else if (score >= 40) {
            propagationLevel = "fair";
        } else if (score >= 20) {
            propagationLevel = "poor";
        } else {
            propagationLevel = "very-poor";
        }

        if (propagationLevel === "excellent") {
            diagnostics.push({
                code: "FAVORABLE_PROPAGATION",
                message:
                    "Current HF propagation conditions are highly favorable.",
                value: score
            });
        }

        return new AnalysisResult({
            analyst: "PropagationAnalyst",

            score,
            confidence,

            diagnostics,

            metadata: {
                kp:
                    Number.isFinite(kp)
                        ? kp
                        : null,

                sfi:
                    Number.isFinite(sfi)
                        ? sfi
                        : null,

                favoredBands,

                propagationLevel,
                knownInputs
            }
        });
    }
}