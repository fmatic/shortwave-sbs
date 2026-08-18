import { PropagationAnalyst } from "../analysts/PropagationAnalyst.js";

const analyst =
    new PropagationAnalyst();

const conditions = {
    kp: 1.7,
    sfi: 155,

    favoredBands: [
        "49m",
        "41m",
        "31m"
    ]
};

const result =
    analyst.analyze(conditions);

console.log(
    JSON.stringify(result, null, 2)
);

try {
    analyst.analyze("not an object");

    console.error(
        "FAIL: invalid input should have thrown an error"
    );
} catch (error) {
    console.log(
        "PASS: invalid input rejected:",
        error.message
    );
}