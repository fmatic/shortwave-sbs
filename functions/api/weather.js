const LAT = 62.24;
const LON = 25.75;

function weatherInfo(code, isDay = true) {
  if (code === 0) {
    return {
      condition: isDay ? "sunny" : "clear",
      label: isDay ? "Clear sky" : "Clear night"
    };
  }

  if (code === 1 || code === 2) {
    return {
      condition: "partly_cloudy",
      label: "Partly cloudy"
    };
  }

  if (code === 3) {
    return {
      condition: "cloudy",
      label: "Cloudy"
    };
  }

  if (code === 45 || code === 48) {
    return {
      condition: "fog",
      label: "Fog"
    };
  }

  if ([51, 53, 55, 56, 57].includes(code)) {
    return {
      condition: "rain",
      label: "Drizzle"
    };
  }

  if ([61, 63, 66, 80, 81].includes(code)) {
    return {
      condition: "rain",
      label: "Rain"
    };
  }

  if ([65, 67, 82].includes(code)) {
    return {
      condition: "heavy_rain",
      label: "Heavy rain"
    };
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return {
      condition: "snow",
      label: "Snow"
    };
  }

  if ([95, 96, 99].includes(code)) {
    return {
      condition: "thunder",
      label: "Thunderstorm"
    };
  }

  return {
    condition: "cloudy",
    label: "Unknown"
  };
}

function compass(degrees) {
  const dirs = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW",
    "W", "WNW", "NW", "NNW"
  ];

  const index = Math.round(degrees / 22.5) % 16;

  return dirs[index];
}

export async function onRequestGet(context) {
  try {
    const cache = caches.default;

    const requestUrl = new URL(context.request.url);

    const cacheKey = new Request(
      requestUrl.origin + "/api/weather?v=1",
      { method: "GET" }
    );

    const cached = await cache.match(cacheKey);

    if (cached) {
      return cached;
    }

    const params = new URLSearchParams({
      latitude: LAT.toString(),
      longitude: LON.toString(),

      current: [
        "temperature_2m",
        "weather_code",
        "is_day",
        "wind_speed_10m",
        "wind_direction_10m",
        "pressure_msl",
        "precipitation"
      ].join(","),

      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum"
      ].join(","),

      timezone: "Europe/Helsinki",
      wind_speed_unit: "ms",
      precipitation_unit: "mm",
      forecast_days: "3"
    });

    const url =
      "https://api.open-meteo.com/v1/forecast?" +
      params.toString();

    const weatherResponse = await fetch(url, {
      cf: {
        cacheTtl: 300,
        cacheEverything: true
      }
    });

    if (!weatherResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "weather source unavailable"
        }),
        {
          status: 503,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    }

    const data = await weatherResponse.json();

    const current = data.current || {};
    const daily = data.daily || {};

    const code =
      Number(current.weather_code ?? -1);

    const isDay =
      Number(current.is_day ?? 1) === 1;

    const info =
      weatherInfo(code, isDay);

    const windDegrees =
      Number(current.wind_direction_10m ?? 0);

    /*
      Päivä 0 = tänään
      Päivä 1 = huomenna

      Yöpöytäkäyttöä varten "tonight_min" =
      tämän päivän alin lämpötila.

      Huomisen min/max ovat erikseen mukana.
    */

    const payload = {
      version: 1,

      updated: new Date().toISOString(),

      location: "Jyvaskyla",

      coordinates: {
        lat: LAT,
        lon: LON
      },

      current: {
        temp:
          Number(current.temperature_2m ?? 0),

        condition:
          info.condition,

        condition_text:
          info.label,

        weather_code:
          code,

        is_day:
          isDay,

        wind_ms:
          Number(current.wind_speed_10m ?? 0),

        wind_deg:
          windDegrees,

        wind_dir:
          compass(windDegrees),

        pressure_hpa:
          Math.round(
            Number(current.pressure_msl ?? 0)
          ),

        precipitation_mm:
          Number(current.precipitation ?? 0)
      },

      forecast: {
        tonight_min:
          Number(
            daily.temperature_2m_min?.[0] ?? 0
          ),

        tomorrow_min:
          Number(
            daily.temperature_2m_min?.[1] ?? 0
          ),

        tomorrow_max:
          Number(
            daily.temperature_2m_max?.[1] ?? 0
          ),

        tomorrow_code:
          Number(
            daily.weather_code?.[1] ?? -1
          ),

        tomorrow_precipitation_mm:
          Number(
            daily.precipitation_sum?.[1] ?? 0
          )
      }
    };

    const response =
      new Response(
        JSON.stringify(payload),
        {
          headers: {
            "content-type":
              "application/json; charset=utf-8",

            "cache-control":
              "public, max-age=120, s-maxage=300",

            "access-control-allow-origin":
              "*"
          }
        }
      );

    context.waitUntil(
      cache.put(
        cacheKey,
        response.clone()
      )
    );

    return response;

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "weather function failed",
        message: String(error)
      }),
      {
        status: 500,
        headers: {
          "content-type":
            "application/json; charset=utf-8"
        }
      }
    );
  }
}
