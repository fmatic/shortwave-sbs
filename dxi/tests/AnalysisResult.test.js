import { AnalysisResult } from "../contracts/AnalysisResult.js";

const result = new AnalysisResult({
    analyst: "ActivityAnalyst",
    score: 74,
    confidence: 92,
    diagnostics: [
        {
            code: "ACTIVE_BROADCAST_COUNT",
            value: 286
        }
    ],
    metadata: {
        busiestBand: "49m"
    }
});

console.log(JSON.stringify(result, null, 2));