import assert from "node:assert/strict";

import {
    ActivityAnalyst
} from "../analysts/ActivityAnalyst.js";

const analyst =
    new ActivityAnalyst();


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


function hasDiagnostic(
    result,
    code
) {
    return result.diagnostics.some(
        diagnostic =>
            diagnostic.code === code
    );
}


/*
 * QUIET
 *
 * Low busiest-band intensity,
 * weak concentration and only a
 * small lead over the second band.
 */

test(
    "quiet activity is classified as quiet",
    () => {
        const result =
            analyst.analyzeMetrics({
                activeBroadcasts: 3000,

                busiestBand: "49m",
                busiestBandCount: 150,

                secondBand: "31m",
                secondBandCount: 145
            });

        assert.equal(
            result.metadata.activityLevel,
            "quiet"
        );

        assert.ok(
            result.score < 30
        );
    }
);


/*
 * MODERATE
 */

test(
    "normal activity is classified as moderate",
    () => {
        const result =
            analyst.analyzeMetrics({
                activeBroadcasts: 3100,

                busiestBand: "49m",
                busiestBandCount: 190,

                secondBand: "31m",
                secondBandCount: 180
            });

        assert.equal(
            result.metadata.activityLevel,
            "moderate"
        );

        assert.ok(
            result.score >= 30 &&
            result.score < 55
        );
    }
);


/*
 * BUSY
 */

test(
    "elevated activity is classified as busy",
    () => {
        const result =
            analyst.analyzeMetrics({
                activeBroadcasts: 3200,

                busiestBand: "49m",
                busiestBandCount: 240,

                secondBand: "31m",
                secondBandCount: 210
            });

        assert.equal(
            result.metadata.activityLevel,
            "busy"
        );

        assert.ok(
            result.score >= 55 &&
            result.score < 75
        );
    }
);


/*
 * VERY BUSY
 */

test(
    "exceptionally high activity is classified as very-busy",
    () => {
        const result =
            analyst.analyzeMetrics({
                activeBroadcasts: 3300,

                busiestBand: "49m",
                busiestBandCount: 290,

                secondBand: "31m",
                secondBandCount: 240
            });

        assert.equal(
            result.metadata.activityLevel,
            "very-busy"
        );

        assert.ok(
            result.score >= 75
        );

        assert.ok(
            hasDiagnostic(
                result,
                "HIGH_ACTIVITY"
            )
        );
    }
);


/*
 * NEAR TIE
 */

test(
    "near-tied leading bands are detected",
    () => {
        const result =
            analyst.analyzeMetrics({
                activeBroadcasts: 3100,

                busiestBand: "49m",
                busiestBandCount: 200,

                secondBand: "31m",
                secondBandCount: 190
            });

        assert.ok(
            hasDiagnostic(
                result,
                "NEAR_TIE"
            )
        );

        assert.ok(
            result.metadata.leadRatio <= 0.10
        );
    }
);


/*
 * CLEAR ACTIVITY LEAD
 */

test(
    "a clearly dominant leading band is detected",
    () => {
        const result =
            analyst.analyzeMetrics({
                activeBroadcasts: 3200,

                busiestBand: "49m",
                busiestBandCount: 240,

                secondBand: "31m",
                secondBandCount: 180
            });

        assert.ok(
            hasDiagnostic(
                result,
                "ACTIVITY_LEAD"
            )
        );

        assert.equal(
            result.metadata.lead,
            60
        );
    }
);


/*
 * NORMAL BROADCAST ARRAY PATH
 *
 * Ensures analyze() still builds the
 * band ranking correctly before handing
 * the metrics to ActivityAnalyst v2.
 */

test(
    "broadcast arrays are converted into correct band metrics",
    () => {
        const broadcasts = [
            { band: "49m" },
            { band: "49m" },
            { band: "49m" },

            { band: "31m" },
            { band: "31m" },

            { band: "25m" }
        ];

        const result =
            analyst.analyze(
                broadcasts
            );

        assert.equal(
            result.metadata.activeBroadcasts,
            6
        );

        assert.equal(
            result.metadata.busiestBand,
            "49m"
        );

        assert.equal(
            result.metadata.busiestBandCount,
            3
        );

        assert.equal(
            result.metadata.secondBand,
            "31m"
        );

        assert.equal(
            result.metadata.secondBandCount,
            2
        );
    }
);


/*
 * EMPTY INPUT
 */

test(
    "empty broadcast list returns zero confidence",
    () => {
        const result =
            analyst.analyze([]);

        assert.equal(
            result.confidence,
            0
        );

        assert.equal(
            result.metadata.busiestBand,
            null
        );
    }
);


/*
 * INVALID INPUT
 */

test(
    "invalid input is rejected",
    () => {
        assert.throws(
            () =>
                analyst.analyze(
                    "not an array"
                ),

            TypeError
        );
    }
);


console.log(
    "\nActivityAnalyst tests passed."
);