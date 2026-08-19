import {
    PropagationAnalyst
} from "../analysts/PropagationAnalyst.js";

const analyst =
    new PropagationAnalyst();

const result =
    analyst.analyze({
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
    JSON.stringify(
        result,
        null,
        2
    )
);