function parseTickerLine(line) {
  const parts = line.trim().split("|");

  if (parts.length < 8) {
    return null;
  }

  return {
    frequency_mhz: Number(parts[0]) || null,
    station: parts[1] || "",
    site: parts[2] || "",
    region: parts[3] || "",
    country: parts[4] || "",
    receiver_location: parts[5] || "",
    date: parts[6] || "",
    time: parts[7] || "",
    mode: parts[8] || ""
  };
}

function normalizeMuf(value) {
  if (typeof value === "number") {
    return value;
  }

  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : null;
}

function esStatusFromMuf(muf) {
  if (muf === null) {
    return "quiet";
  }

  if (muf >= 108) {
    return "strong";
  }

  if (muf >= 88) {
    return "fm_open";
  }

  if (muf >= 70) {
    return "near_fm";
  }

  return "low";
}

export async function onRequestGet(context) {
  try {
    const proxy =
      "https://cors-proxy.de:13128/";

    const cb =
      Date.now();

    // --------------------------------------------------------
    // FMLIST Es ticker
    // --------------------------------------------------------

    const tickerUrl =
      proxy +
      "https://www.fmlist.org/esticker.php" +
      "?cb=" +
      cb;

    // --------------------------------------------------------
    // FMDX.org MUF
    // --------------------------------------------------------

    const mufUrl =
      proxy +
      "https://fmdx.org/includes/tools/get_muf.php" +
      "?cb=" +
      cb +
      "&domain=highpoint.fmdx.org";

    const [tickerRes, mufRes] =
      await Promise.all([
        fetch(tickerUrl, {
          headers: {
            "User-Agent":
              "shortwave.sbs DX Console/1.0",
            "Accept":
              "text/plain,*/*"
          }
        }),

        fetch(mufUrl, {
          headers: {
            "User-Agent":
              "shortwave.sbs DX Console/1.0",
            "Accept":
              "application/json,text/plain,*/*"
          }
        })
      ]);

    // --------------------------------------------------------
    // Source status
    // --------------------------------------------------------

    if (!tickerRes.ok || !mufRes.ok) {
      return Response.json(
        {
          ok: false,
          error:
            "FM DX source unavailable",

          ticker_status:
            tickerRes.status,

          muf_status:
            mufRes.status
        },
        {
          status: 503
        }
      );
    }

    // --------------------------------------------------------
    // Parse ticker
    // --------------------------------------------------------

    const tickerText =
      await tickerRes.text();

    const tickerRows =
      tickerText
        .split(/\r?\n/)
        .map(parseTickerLine)
        .filter(Boolean);

    // --------------------------------------------------------
    // Parse MUF
    // --------------------------------------------------------

    const mufText =
      await mufRes.text();

    let mufData;

    try {
      mufData =
        JSON.parse(mufText);
    }

    catch {
      return Response.json(
        {
          ok: false,
          error:
            "MUF source returned invalid JSON",

          preview:
            mufText.slice(0, 300)
        },
        {
          status: 502
        }
      );
    }

    // --------------------------------------------------------
    // Europe MUF
    // --------------------------------------------------------

    const euMuf =
      normalizeMuf(
        mufData?.europe
          ?.max_frequency
      );

    // --------------------------------------------------------
    // Payload
    // --------------------------------------------------------

    const payload = {
      ok: true,

      version: 1,

      updated:
        new Date()
          .toISOString(),

      es: {
        region: "EU",

        muf_mhz:
          euMuf,

        status:
          esStatusFromMuf(
            euMuf
          ),

        fm_open:
          euMuf !== null &&
          euMuf >= 88,

        last_log:
          mufData?.europe
            ?.last_log ??
          null
      },

      ticker: {
        count:
          tickerRows.length,

        latest:
          tickerRows.slice(
            0,
            5
          )
      },

      muf: {
        europe: {
          max_frequency:
            normalizeMuf(
              mufData?.europe
                ?.max_frequency
            ),

          last_log:
            mufData?.europe
              ?.last_log ??
            null
        },

        north_america: {
          max_frequency:
            normalizeMuf(
              mufData
                ?.north_america
                ?.max_frequency
            ),

          last_log:
            mufData
              ?.north_america
              ?.last_log ??
            null
        },

        australia: {
          max_frequency:
            normalizeMuf(
              mufData
                ?.australia
                ?.max_frequency
            ),

          last_log:
            mufData
              ?.australia
              ?.last_log ??
            null
        }
      }
    };

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    return new Response(
      JSON.stringify(payload),
      {
        headers: {
          "content-type":
            "application/json; charset=utf-8",

          "cache-control":
            "public, max-age=60, s-maxage=120",

          "access-control-allow-origin":
            "*"
        }
      }
    );
  }

  catch (err) {
    return Response.json(
      {
        ok: false,
        error:
          String(err)
      },
      {
        status: 500
      }
    );
  }
}