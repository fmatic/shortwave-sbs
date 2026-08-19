/**
 * DX Intelligence Engine
 *
 * PropagationAnalyst
 *
 * Evaluates current HF propagation conditions
 * independently from broadcast activity.
 *
 * @author Janne Heinikangas
 */

import { AnalysisResult } from "../contracts/AnalysisResult.js";

export class PropagationAnalyst {
    analyze(snapshot = {}) {
        if (!snapshot || typeof snapshot !== "object") {
            throw new TypeError(
                "PropagationAnalyst expects a DX snapshot.");
        }

        const propagation =
            snapshot.propagation || {};

        const toFiniteNumber = value => {
            if (
                value === null ||
                value === undefined ||
                value === "") {
                return NaN;
            }

            const number =
                Number(value);

            return Number.isFinite(number)
             ? number
             : NaN;
        };

        const kp =
            toFiniteNumber(
                propagation.kp);

        const sfi =
            toFiniteNumber(
                propagation.sfi);

        const favoredBands =
            Array.isArray(propagation.favoredBands)
             ? propagation.favoredBands
             : [];

        const diagnostics = [];

        let score = 50;
        let confidence = 0;

        /*
         * Solar Flux Index
         */

        if (Number.isFinite(sfi)) {
            confidence += 40;

            if (sfi >= 150) {
                score += 25;

                diagnostics.push({
                    code: "HIGH_SOLAR_FLUX",
                    message:
`Solar flux is strong at ${sfi}.`,
                    value: sfi
                });
            } else if (sfi >= 120) {
                score += 15;

                diagnostics.push({
                    code: "GOOD_SOLAR_FLUX",
                    message:
`Solar flux is favourable at ${sfi}.`,
                    value: sfi
                });
            } else if (sfi < 90) {
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
         * Geomagnetic activity
         */

        if (Number.isFinite(kp)) {
            confidence += 40;

            if (kp <= 2) {
                score += 20;

                diagnostics.push({
                    code: "QUIET_GEOMAGNETIC",
                    message:
`Geomagnetic conditions are quiet at Kp ${kp}.`,
                    value: kp
                });
            } else if (kp >= 5) {
                score -= 30;

                diagnostics.push({
                    code: "GEOMAGNETIC_STORM",
                    message:
`Geomagnetic activity is elevated at Kp ${kp}.`,
                    value: kp
                });
            } else if (kp >= 4) {
                score -= 15;

                diagnostics.push({
                    code: "DISTURBED_GEOMAGNETIC",
                    message:
`Geomagnetic conditions are disturbed at Kp ${kp}.`,
                    value: kp
                });
            }
        }

        /*
         * Favoured bands supplied by the live-data adapter.
         *
         * PropagationAnalyst does not care whether broadcasts
         * actually exist on these bands. That belongs to
         * ActivityAnalyst / CorrelationEngine.
         */

        if (favoredBands.length) {
            confidence += 20;

            diagnostics.push({
                code: "FAVORED_BANDS",
                message:
`${favoredBands.join(", ")} currently have favourable propagation support.`,
                value: favoredBands
            });
        }

        score = Math.max(
                0,
                Math.min(100, Math.round(score)));

        confidence = Math.min(
                100,
                confidence);

        let propagationLevel = "normal";

        if (score >= 80) {
            propagationLevel = "excellent";
        } else if (score >= 65) {
            propagationLevel = "good";
        } else if (score < 35) {
            propagationLevel = "poor";
        } else if (score < 50) {
            propagationLevel = "disturbed";
        }

        return new AnalysisResult({
            analyst: "PropagationAnalyst",
            score,
            confidence,

            diagnostics,

            metadata: {
                kp: Number.isFinite(kp)
                 ? kp
                 : null,

                sfi: Number.isFinite(sfi)
                 ? sfi
                 : null,

                favoredBands,
                propagationLevel
            }
        });
    }
}