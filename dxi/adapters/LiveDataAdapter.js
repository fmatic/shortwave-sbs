export class LiveDataAdapter {
    createSnapshot({
        stations = [],
        bandActivity = {},
        greyline = {},
        propagation = {}
    } = {}) {
        return {
            schemaVersion: 1,
            source: "shortwave.sbs",
            timestamp: new Date().toISOString(),

            stations,
            bandActivity,
            greyline,
            propagation
        };
    }
}