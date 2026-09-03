import assert from "node:assert/strict";

import {
    PropagationAnalyst
} from "../analysts/PropagationAnalyst.js";

const analyst =
    new PropagationAnalyst();


function test(name, fn) {
    try {
        fn();

        console.log(
            `PASS: ${name}`
        );
    } catch (error) {
        console.error(
            `FAIL: ${name}`
        );

        throw error;
    }
}


function analyzePropagation({
    kp,
    sfi,
    favoredBands = []
}) {
    return analyst.analyze({
        propagation: {
            kp,
            sfi,
            favoredBands
        }
    });
}


/*
 * Strong reference case
 */

test(
    "strong solar flux and quiet geomagnetic conditions score highly",
    () => {
        const result =
            analyzePropagation({
                kp: 1.7,
                sfi: 155,
                favoredBands: [
                    "49m",
                    "41m",
                    "31m"
                ]
            });

        assert.equal(
            result.score,
            95
        );

        assert.equal(
            result.metadata.propagationLevel,
            "excellent"
        );

        assert.equal(
            result.metadata.solarContribution,
            25
        );

        assert.equal(
            result.metadata.geomagneticContribution,
            20
        );
    }
);


/*
 * Kp continuity
 *
 * Old PropagationAnalyst dropped 20 points
 * immediately between Kp 2.00 and 2.33.
 *
 * V2 must keep this transition gradual.
 */

test(
    "Kp 2.00 to 2.33 changes score gradually",
    () => {
        const kp200 =
            analyzePropagation({
                kp: 2.00,
                sfi: 124
            });

        const kp233 =
            analyzePropagation({
                kp: 2.33,
                sfi: 124
            });

        const difference =
            kp200.score -
            kp233.score;

        assert.ok(
            difference > 0,
            "Kp 2.33 should score slightly lower than Kp 2.00"
        );

        assert.ok(
            difference < 10,
            `score difference should be gradual, got ${difference}`
        );

        assert.ok(
            kp233.metadata
                .geomagneticContribution > 10
        );
    }
);


/*
 * SFI continuity
 */

test(
    "SFI 123 to 126 produces a small continuous change",
    () => {
        const sfi123 =
            analyzePropagation({
                kp: 1.5,
                sfi: 123
            });

        const sfi126 =
            analyzePropagation({
                kp: 1.5,
                sfi: 126
            });

        const difference =
            sfi126.score -
            sfi123.score;

        assert.ok(
            difference >= 0
        );

        assert.ok(
            difference <= 2,
            `SFI 123-126 change should remain small, got ${difference}`
        );

        assert.ok(
            sfi126.metadata.solarContribution >
            sfi123.metadata.solarContribution
        );
    }
);


/*
 * Disturbed conditions
 */

test(
    "high Kp reduces propagation score",
    () => {
        const quiet =
            analyzePropagation({
                kp: 1.5,
                sfi: 125
            });

        const disturbed =
            analyzePropagation({
                kp: 4.5,
                sfi: 125
            });

        assert.ok(
            disturbed.score <
            quiet.score
        );

        assert.ok(
            disturbed.metadata
                .geomagneticContribution < 0
        );
    }
);


/*
 * Favored bands affect diagnostics/confidence,
 * not the propagation score itself.
 */

test(
    "favorable but non-exceptional conditions are classified as good",
    () => {
        const result =
            analyzePropagation({
                kp: 2.33,
                sfi: 124
            });

        assert.ok(
            result.score >= 70 &&
            result.score < 90
        );

        assert.equal(
            result.metadata.propagationLevel,
            "good"
        );
    }
);

test(
    "favored bands do not alter propagation score",
    () => {
        const withoutBands =
            analyzePropagation({
                kp: 1.5,
                sfi: 125,
                favoredBands: []
            });

        const withBands =
            analyzePropagation({
                kp: 1.5,
                sfi: 125,
                favoredBands: [
                    "49m",
                    "41m"
                ]
            });

        assert.equal(
            withoutBands.score,
            withBands.score
        );

        assert.ok(
            withBands.confidence >
            withoutBands.confidence
        );
    }
);


/*
 * Missing data
 */

test(
    "missing propagation data produces zero confidence",
    () => {
        const result =
            analyst.analyze({
                propagation: {}
            });

        assert.equal(
            result.confidence,
            0
        );

        assert.equal(
            result.metadata.kp,
            null
        );

        assert.equal(
            result.metadata.sfi,
            null
        );
    }
);


/*
 * Invalid input
 */

test(
    "invalid input is rejected",
    () => {
        assert.throws(
            () =>
                analyst.analyze(
                    null
                ),

            TypeError
        );
    }
);


console.log(
    "\nPropagationAnalyst tests passed."
);