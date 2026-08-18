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