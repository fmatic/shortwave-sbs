import { GreylineAnalyst } from "../analysts/GreylineAnalyst.js";

const analyst =
    new GreylineAnalyst();

const paths = [
    {
        rxMode: "Twilight",
        txMode: "Night"
    },
    {
        rxMode: "Night",
        txMode: "Twilight"
    },
    {
        rxMode: "Night",
        txMode: "Night"
    },
    {
        rxMode: "Day",
        txMode: "Day"
    }
];

const scenarios = [
    {
        name: "no greyline",
        paths: [
            { rxMode: "Night", txMode: "Night" },
            { rxMode: "Day", txMode: "Day" },
            { rxMode: "Night", txMode: "Day" },
            { rxMode: "Day", txMode: "Night" }
        ]
    },

    {
        name: "limited greyline",
        paths: [
            { rxMode: "Twilight", txMode: "Night" },
            { rxMode: "Night", txMode: "Night" },
            { rxMode: "Day", txMode: "Day" },
            { rxMode: "Night", txMode: "Day" }
        ]
    },

    {
        name: "moderate greyline",
        paths: [
            { rxMode: "Twilight", txMode: "Night" },
            { rxMode: "Night", txMode: "Twilight" },
            { rxMode: "Night", txMode: "Night" },
            { rxMode: "Day", txMode: "Day" }
        ]
    },

    {
        name: "strong greyline",
        paths: [
            { rxMode: "Twilight", txMode: "Night" },
            { rxMode: "Night", txMode: "Twilight" },
            { rxMode: "Twilight", txMode: "Twilight" },
            { rxMode: "Twilight", txMode: "Day" }
        ]
    }
];

for (const scenario of scenarios) {
    console.log(`\n=== ${scenario.name} ===`);

    const result =
        analyst.analyze(scenario.paths);

    console.log(
        JSON.stringify(result, null, 2)
    );
}

const result =
    analyst.analyze(paths);

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