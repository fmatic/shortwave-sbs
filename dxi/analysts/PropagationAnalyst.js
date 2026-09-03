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

            const contribution =
                solarContribution(sfi);

            score += contribution;

            if (sfi >= 150) {
                diagnostics.push({
                    code: "HIGH_SOLAR_FLUX",
                    message:
`Solar flux is strong at ${sfi}.`,
                    value: sfi
                });
            } else if (sfi >= 120) {
                diagnostics.push({
                    code: "GOOD_SOLAR_FLUX",
                    message:
`Solar flux is favourable at ${sfi}.`,
                    value: sfi
                });
            } else if (sfi < 90) {
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

            const contribution =
                geomagneticContribution(kp);

            score += contribution;

            if (kp <= 2) {
                diagnostics.push({
                    code: "QUIET_GEOMAGNETIC",
                    message:
`Geomagnetic conditions are quiet at Kp ${kp}.`,
                    value: kp
                });
            } else if (kp >= 5) {
                diagnostics.push({
                    code: "GEOMAGNETIC_STORM",
                    message:
`Geomagnetic activity is elevated at Kp ${kp}.`,
                    value: kp
                });
            } else if (kp >= 4) {
                diagnostics.push({
                    code: "DISTURBED_GEOMAGNETIC",
                    message:
`Geomagnetic conditions are disturbed at Kp ${kp}.`,
                    value: kp
                });
            }
        }

        function interpolate(
            value,
            x1,
            y1,
            x2,
            y2) {
            const position =
                (value - x1) /
            (x2 - x1);

            return (
                y1 +
                position * (y2 - y1));
        }

        function solarContribution(sfi) {
            if (sfi < 90) {
                return Math.max(
                    -15,
                    interpolate(
                        sfi,
                        70, -15,
                        90, 0));
            }

            if (sfi < 120) {
                return interpolate(
                    sfi,
                    90, 0,
                    120, 15);
            }

            if (sfi < 150) {
                return interpolate(
                    sfi,
                    120, 15,
                    150, 25);
            }

            return 25;
        }

        function geomagneticContribution(kp) {
            if (kp <= 2) {
                return 20;
            }

            if (kp < 4) {
                return interpolate(
                    kp,
                    2, 20,
                    4, -15);
            }

            if (kp < 5) {
                return interpolate(
                    kp,
                    4, -15,
                    5, -30);
            }

            return -30;
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

        if (score >= 90) {
            propagationLevel = "excellent";
        } else if (score >= 70) {
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

                propagationLevel,

                solarContribution:
                Number.isFinite(sfi)
                 ? Math.round(
                    solarContribution(sfi) * 10) / 10
                 : null,

                geomagneticContribution:
                Number.isFinite(kp)
                 ? Math.round(
                    geomagneticContribution(kp) * 10) / 10
                 : null
            }
        });
    }
}