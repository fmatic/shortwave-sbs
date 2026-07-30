/**
 * DX Intelligence Engine
 *
 * AnalysisResult
 *
 * Defines the common result structure returned by all DXI analysts.
 *
 * @author Janne Heinikangas
 */

export class AnalysisResult {
    /**
     * @param {Object} options
     * @param {string} options.analyst
     * @param {number} [options.score=0]
     * @param {number} [options.confidence=0]
     * @param {Array<Object>} [options.diagnostics=[]]
     * @param {Object} [options.metadata={}]
     */
    constructor({
        analyst,
        score = 0,
        confidence = 0,
        diagnostics = [],
        metadata = {}
    }) {
        if (!analyst || typeof analyst !== "string") {
            throw new TypeError(
                "AnalysisResult requires a non-empty analyst name."
            );
        }

        this.analyst = analyst;
        this.score = AnalysisResult.#normalizePercentage(score, "score");
        this.confidence = AnalysisResult.#normalizePercentage(
            confidence,
            "confidence"
        );

        if (!Array.isArray(diagnostics)) {
            throw new TypeError(
                "AnalysisResult diagnostics must be an array."
            );
        }

        if (
            metadata === null ||
            typeof metadata !== "object" ||
            Array.isArray(metadata)
        ) {
            throw new TypeError(
                "AnalysisResult metadata must be an object."
            );
        }

        this.diagnostics = diagnostics;
        this.metadata = metadata;
    }

    /**
     * Converts the result into a plain serializable object.
     *
     * @returns {{
     *   analyst: string,
     *   score: number,
     *   confidence: number,
     *   diagnostics: Array<Object>,
     *   metadata: Object
     * }}
     */
    toJSON() {
        return {
            analyst: this.analyst,
            score: this.score,
            confidence: this.confidence,
            diagnostics: this.diagnostics,
            metadata: this.metadata
        };
    }

    /**
     * Validates a percentage-like value and clamps it between 0 and 100.
     *
     * @param {number} value
     * @param {string} fieldName
     * @returns {number}
     */
    static #normalizePercentage(value, fieldName) {
        if (typeof value !== "number" || !Number.isFinite(value)) {
            throw new TypeError(
                `AnalysisResult ${fieldName} must be a finite number.`
            );
        }

        return Math.min(100, Math.max(0, value));
    }
}