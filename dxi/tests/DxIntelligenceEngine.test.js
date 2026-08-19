import { DxIntelligenceEngine } from "../engine/DxIntelligenceEngine.js";

const engine = new DxIntelligenceEngine();

const results = [{
        analyst: "ActivityAnalyst",
        score: 78,
        confidence: 100,
        diagnostics: [{
                code: "HIGH_ACTIVITY",
                message: "49m is genuinely very busy right now.",
                value: 90
            }
        ],
        metadata: {
            busiestBand: "49m",
            activityLevel: "very-busy"
        }
    },
    {
        analyst: "GreylineAnalyst",
        score: 50,
        confidence: 100,
        diagnostics: [{
                code: "GREYLINE_PATHS",
                message: "2 of 4 paths currently show greyline potential.",
                value: 2
            }
        ],
        metadata: {
            greylineLevel: "strong"
        }
    }
];

const wrongBandResults = [
    {
        analyst: "ActivityAnalyst",
        score: 78,
        confidence: 100,
        diagnostics: [],
        metadata: {
            busiestBand: "49m",
            activityLevel: "very-busy"
        }
    },

    {
        analyst: "GreylineAnalyst",
        score: 100,
        confidence: 100,
        diagnostics: [],
        metadata: {
            greylineLevel: "strong"
        }
    },

    {
        analyst: "PropagationAnalyst",
        score: 95,
        confidence: 100,
        diagnostics: [],
        metadata: {
            propagationLevel: "excellent",
            favoredBands: [
                "19m",
                "16m"
            ]
        }
    }
];

console.log(
    "\n=== exceptional DX window ==="
);

console.log(
    "\n=== favorable active band ==="
);

const favorableActiveResults = [
    {
        analyst: "ActivityAnalyst",
        score: 72,
        confidence: 100,
        diagnostics: [],
        metadata: {
            busiestBand: "49m",
            activityLevel: "busy"
        }
    },

    {
        analyst: "GreylineAnalyst",
        score: 25,
        confidence: 100,
        diagnostics: [],
        metadata: {
            greylineLevel: "limited"
        }
    },

    {
        analyst: "PropagationAnalyst",
        score: 85,
        confidence: 100,
        diagnostics: [],
        metadata: {
            propagationLevel: "good",
            favoredBands: [
                "49m",
                "41m"
            ]
        }
    }
];

console.log(
    "\n=== active band not propagation favored ==="
);

const unfavoredActiveResults = [
    {
        analyst: "ActivityAnalyst",
        score: 72,
        confidence: 100,
        diagnostics: [],
        metadata: {
            busiestBand: "49m",
            activityLevel: "busy"
        }
    },

    {
        analyst: "PropagationAnalyst",
        score: 90,
        confidence: 100,
        diagnostics: [],
        metadata: {
            propagationLevel: "excellent",
            favoredBands: [
                "19m",
                "16m"
            ]
        }
    }
];

const unfavoredActiveResult =
    engine.combine(
        unfavoredActiveResults
    );

console.log(
    JSON.stringify(
        unfavoredActiveResult,
        null,
        2
    )
);

const favorableActiveResult =
    engine.combine(
        favorableActiveResults
    );

console.log(
    JSON.stringify(
        favorableActiveResult,
        null,
        2
    )
);

const exceptionalResults = [
    {
        analyst: "ActivityAnalyst",
        score: 78,
        confidence: 100,
        diagnostics: [],
        metadata: {
            busiestBand: "49m",
            activityLevel: "very-busy"
        }
    },

    {
        analyst: "GreylineAnalyst",
        score: 100,
        confidence: 100,
        diagnostics: [],
        metadata: {
            greylineLevel: "strong"
        }
    },

    {
        analyst: "PropagationAnalyst",
        score: 99,
        confidence: 100,
        diagnostics: [],
        metadata: {
            propagationLevel: "excellent",
            favoredBands: [
                "49m",
                "41m",
                "31m"
            ]
        }
    }
];

const exceptionalResult =
    engine.combine(exceptionalResults);

console.log(
    JSON.stringify(
        exceptionalResult,
        null,
        2
    )
);

const wrongBandResult =
    engine.combine(wrongBandResults);

console.log(
    "\n=== propagation favors another band ==="
);

console.log(
    JSON.stringify(wrongBandResult, null, 2)
);


const moderateResults = [{
        analyst: "ActivityAnalyst",
        score: 78,
        confidence: 100,
        diagnostics: [],
        metadata: {
            busiestBand: "49m",
            activityLevel: "very-busy"
        }
    }, {
        analyst: "GreylineAnalyst",
        score: 50,
        confidence: 100,
        diagnostics: [],
        metadata: {
            greylineLevel: "moderate"
        }
    }
];

const moderateResult =
    engine.combine(moderateResults);

console.log(
    "\n=== moderate greyline should not correlate ===");

console.log(
    JSON.stringify(moderateResult, null, 2));

const result = engine.combine(results);

console.log(
    JSON.stringify(result, null, 2));

try {
    engine.combine("not an array");

    console.error(
        "FAIL: invalid input should have thrown an error");
} catch (error) {
    console.log(
        "PASS: invalid input rejected:",
        error.message);
}