function timeToMinutes(v) {
    if (!v) return null;

    v = String(v).trim();

    if (v === "2400") return 1440;

    v = v.padStart(4, "0");

    const h = Number(v.slice(0, 2));
    const m = Number(v.slice(2, 4));

    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;

    return h * 60 + m;
}

function utcMinutesNow(date) {
    return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function timeMatches(item, now) {
    const n = utcMinutesNow(now);
    const s = timeToMinutes(item.start);
    const e = timeToMinutes(item.end);

    if (s === null || e === null) return false;
    if (s === e) return true;

    if (s < e) {
        return n >= s && n < e;
    }

    return n >= s || n < e;
}

function sourceIncludes(item, source) {
    return String(item.source || "")
        .split("+")
        .map(x => x.trim())
        .includes(source);
}

function formatSite(item) {
    return item.txSite || item.txCode || item.type || "—";
}

export async function onRequestGet(context) {
    const url = new URL(context.request.url);

    const khz = Number(url.searchParams.get("khz"));
    const tolerance = Math.min(
        25,
        Math.max(0, Number(url.searchParams.get("tolerance") ?? 5))
    );

    if (!Number.isFinite(khz) || khz <= 0) {
        return new Response(JSON.stringify({
            error: "invalid frequency",
            example: "/api/frequency?khz=11790"
        }), {
            status: 400,
            headers: {
                "content-type": "application/json; charset=utf-8",
                "access-control-allow-origin": "*"
            }
        });
    }

    const origin = url.origin;

    const schedRes = await fetch(origin + "/data/schedules.json", {
        cf: {
            cacheTtl: 300,
            cacheEverything: true
        }
    });

    if (!schedRes.ok) {
        return new Response(JSON.stringify({
            error: "schedule source unavailable"
        }), {
            status: 503,
            headers: {
                "content-type": "application/json; charset=utf-8",
                "access-control-allow-origin": "*"
            }
        });
    }

    const data = await schedRes.json();
    const schedules = Array.isArray(data?.schedules) ? data.schedules : [];
    const now = new Date();

    const matches = schedules
        .filter(item =>
            sourceIncludes(item, "EiBi") &&
            timeMatches(item, now) &&
            Number.isFinite(Number(item.freq)) &&
            Math.abs(Number(item.freq) - khz) <= tolerance
        )
        .map(item => ({
            frequency: Number(item.freq),
            offset_khz: Number(item.freq) - khz,
            station: item.station || "Unknown station",
            country: item.country || "",
            language: item.language || "",
            target: item.target || "",
            start: String(item.start || ""),
            end: String(item.end || ""),
            days: item.days || "",
            days_label: item.daysLabel || "",
            site: formatSite(item),
            tx_country: item.txCountry || "",
            tx_lat: item.txLat ?? null,
            tx_lon: item.txLon ?? null,
            band: item.band || "",
            source: item.source || ""
        }))
        .sort((a, b) =>
            Math.abs(a.offset_khz) - Math.abs(b.offset_khz) ||
            a.frequency - b.frequency
        );

    const payload = {
        version: 1,
        updated: now.toISOString(),
        frequency_khz: khz,
        tolerance_khz: tolerance,
        count: matches.length,
        matches
    };

    return new Response(JSON.stringify(payload), {
        headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=30, s-maxage=60",
            "access-control-allow-origin": "*"
        }
    });
}