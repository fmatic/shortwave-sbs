import { ActivityAnalyst } from "../analysts/ActivityAnalyst.js";

const analyst = new ActivityAnalyst();

const broadcasts = [
    { station: "Station A", freq: 5900, band: "49m" },
    { station: "Station B", freq: 5950, band: "49m" },
    { station: "Station C", freq: 6000, band: "49m" },

    { station: "Station D", freq: 9500, band: "31m" },
    { station: "Station E", freq: 9600, band: "31m" },

    { station: "Station F", freq: 11800, band: "25m" }
];

const result = analyst.analyze(broadcasts);

console.log(
    JSON.stringify(result, null, 2)
);

try {
    analyst.analyze("not an array");

    console.error(
        "FAIL: invalid input should have thrown an error"
    );
} catch (error) {
    console.log(
        "PASS: invalid input rejected:",
        error.message
    );
}