import { LiveDataAdapter } from "../adapters/LiveDataAdapter.js";

const adapter = new LiveDataAdapter();

const snapshot =
    adapter.createSnapshot({
        stations: [{
                frequency: 5900,
                station: "Test Station",
                band: "49m"
            }
        ],

        bandActivity: {
            "49m": 12,
            "31m": 7
        },

        greyline: {
            level: "strong",
            paths: 4
        },

        propagation: {
            kp: 1.7,
            sfi: 155,
            favoredBands: [
                "49m",
                "41m",
                "31m"
            ]
        }
    });

console.log(
    "\n=== empty snapshot ===");

console.log(
    JSON.stringify(
        adapter.createSnapshot(),
        null,
        2));

console.log(
    JSON.stringify(
        snapshot,
        null,
        2));