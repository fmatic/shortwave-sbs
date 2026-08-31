import assert from "node:assert/strict";

import {
    DxIntelligenceEngine
} from "../engine/DxIntelligenceEngine.js";

const engine =
    new DxIntelligenceEngine();


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


function activity(
    level,
    band = "49m",
    score = 60
) {
    return {
        analyst: "ActivityAnalyst",
        score,
        confidence: 100,
        diagnostics: [],

        metadata: {
            busiestBand: band,
            activityLevel: level
        }
    };
}


function greyline(
    level,
    score = 50
) {
    return {
        analyst: "GreylineAnalyst",
        score,
        confidence: 100,
        diagnostics: [],

        metadata: {
            greylineLevel: level
        }
    };
}


function propagation(
    level,
    favoredBands,
    score = 85
) {
    return {
        analyst: "PropagationAnalyst",
        score,
        confidence: 100,
        diagnostics: [],

        metadata: {
            propagationLevel: level,
            favoredBands
        }
    };
}


function hasCorrelation(
    result,
    code
) {
    return result.correlations.some(
        correlation =>
            correlation.code === code
    );
}


/*
 * MODERATE ACTIVITY MUST NOT TRIGGER
 * HIGH_ACTIVITY_GREYLINE
 */

test(
    "moderate activity + strong greyline does not correlate",
    () => {
        const result =
            engine.combine([
                activity(
                    "moderate"
                ),

                greyline(
                    "strong",
                    100
                )
            ]);

        assert.equal(
            hasCorrelation(
                result,
                "HIGH_ACTIVITY_GREYLINE"
            ),
            false
        );

        assert.equal(
            result.primaryCorrelation,
            null
        );
    }
);


/*
 * BUSY + STRONG GREYLINE
 */

test(
    "busy activity + strong greyline creates HIGH_ACTIVITY_GREYLINE",
    () => {
        const result =
            engine.combine([
                activity(
                    "busy",
                    "49m",
                    65
                ),

                greyline(
                    "strong",
                    100
                )
            ]);

        assert.ok(
            hasCorrelation(
                result,
                "HIGH_ACTIVITY_GREYLINE"
            )
        );

        assert.equal(
            result.primaryCorrelation.code,
            "HIGH_ACTIVITY_GREYLINE"
        );

        assert.equal(
            result.primaryCorrelation.priority,
            "high"
        );
    }
);


/*
 * VERY BUSY + STRONG GREYLINE
 */

test(
    "very-busy activity + strong greyline creates HIGH_ACTIVITY_GREYLINE",
    () => {
        const result =
            engine.combine([
                activity(
                    "very-busy",
                    "49m",
                    80
                ),

                greyline(
                    "strong",
                    100
                )
            ]);

        assert.ok(
            hasCorrelation(
                result,
                "HIGH_ACTIVITY_GREYLINE"
            )
        );
    }
);


/*
 * FAVORABLE ACTIVE BAND
 */

test(
    "busy band favored by propagation creates FAVORABLE_ACTIVE_BAND",
    () => {
        const result =
            engine.combine([
                activity(
                    "busy",
                    "49m",
                    65
                ),

                propagation(
                    "good",
                    [
                        "49m",
                        "41m"
                    ]
                )
            ]);

        assert.ok(
            hasCorrelation(
                result,
                "FAVORABLE_ACTIVE_BAND"
            )
        );

        assert.equal(
            result.primaryCorrelation.code,
            "FAVORABLE_ACTIVE_BAND"
        );

        assert.equal(
            result.primaryCorrelation.priority,
            "medium"
        );
    }
);


/*
 * PROPAGATION FAVORS ANOTHER BAND
 */

test(
    "propagation favoring another band does not create FAVORABLE_ACTIVE_BAND",
    () => {
        const result =
            engine.combine([
                activity(
                    "busy",
                    "49m",
                    65
                ),

                propagation(
                    "excellent",
                    [
                        "19m",
                        "16m"
                    ],
                    95
                )
            ]);

        assert.equal(
            hasCorrelation(
                result,
                "FAVORABLE_ACTIVE_BAND"
            ),
            false
        );
    }
);


/*
 * EXCEPTIONAL DX WINDOW
 */

test(
    "very-busy + strong greyline + favored excellent propagation creates exceptional window",
    () => {
        const result =
            engine.combine([
                activity(
                    "very-busy",
                    "49m",
                    80
                ),

                greyline(
                    "strong",
                    100
                ),

                propagation(
                    "excellent",
                    [
                        "49m",
                        "41m",
                        "31m"
                    ],
                    99
                )
            ]);

        assert.ok(
            hasCorrelation(
                result,
                "HIGH_ACTIVITY_GREYLINE"
            )
        );

        assert.ok(
            hasCorrelation(
                result,
                "FAVORABLE_ACTIVE_BAND"
            )
        );

        assert.ok(
            hasCorrelation(
                result,
                "EXCEPTIONAL_DX_WINDOW"
            )
        );

        assert.equal(
            result.primaryCorrelation.code,
            "EXCEPTIONAL_DX_WINDOW"
        );

        assert.equal(
            result.primaryCorrelation.priority,
            "critical"
        );

        assert.equal(
            result.summary,
            "Exceptional DX opportunity detected."
        );
    }
);


/*
 * BUSY IS NOT ENOUGH FOR EXCEPTIONAL
 */

test(
    "busy activity cannot create EXCEPTIONAL_DX_WINDOW",
    () => {
        const result =
            engine.combine([
                activity(
                    "busy",
                    "49m",
                    70
                ),

                greyline(
                    "strong",
                    100
                ),

                propagation(
                    "excellent",
                    [
                        "49m"
                    ],
                    99
                )
            ]);

        assert.equal(
            hasCorrelation(
                result,
                "EXCEPTIONAL_DX_WINDOW"
            ),
            false
        );

        assert.ok(
            hasCorrelation(
                result,
                "HIGH_ACTIVITY_GREYLINE"
            )
        );

        assert.ok(
            hasCorrelation(
                result,
                "FAVORABLE_ACTIVE_BAND"
            )
        );

        assert.equal(
            result.primaryCorrelation.code,
            "HIGH_ACTIVITY_GREYLINE"
        );
    }
);


/*
 * STRONG GREYLINE BUT WRONG PROPAGATION BAND
 *
 * Must retain HIGH_ACTIVITY_GREYLINE,
 * but must not become exceptional.
 */

test(
    "wrong favored band prevents exceptional correlation",
    () => {
        const result =
            engine.combine([
                activity(
                    "very-busy",
                    "49m",
                    80
                ),

                greyline(
                    "strong",
                    100
                ),

                propagation(
                    "excellent",
                    [
                        "19m",
                        "16m"
                    ],
                    95
                )
            ]);

        assert.ok(
            hasCorrelation(
                result,
                "HIGH_ACTIVITY_GREYLINE"
            )
        );

        assert.equal(
            hasCorrelation(
                result,
                "FAVORABLE_ACTIVE_BAND"
            ),
            false
        );

        assert.equal(
            hasCorrelation(
                result,
                "EXCEPTIONAL_DX_WINDOW"
            ),
            false
        );

        assert.equal(
            result.primaryCorrelation.code,
            "HIGH_ACTIVITY_GREYLINE"
        );
    }
);


/*
 * MODERATE GREYLINE
 */

test(
    "moderate greyline does not create greyline correlation",
    () => {
        const result =
            engine.combine([
                activity(
                    "very-busy",
                    "49m",
                    80
                ),

                greyline(
                    "moderate",
                    50
                )
            ]);

        assert.equal(
            hasCorrelation(
                result,
                "HIGH_ACTIVITY_GREYLINE"
            ),
            false
        );
    }
);


/*
 * NO RESULTS
 */

test(
    "empty results return no intelligence",
    () => {
        const result =
            engine.combine([]);

        assert.equal(
            result.score,
            0
        );

        assert.equal(
            result.confidence,
            0
        );

        assert.deepEqual(
            result.correlations,
            []
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
                engine.combine(
                    "not an array"
                ),

            TypeError
        );
    }
);


console.log(
    "\nDxIntelligenceEngine tests passed."
);