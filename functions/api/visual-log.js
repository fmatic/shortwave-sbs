export async function onRequestGet(context) {
  try {
    const cookie = context.env.FMLIST_COOKIE;

    if (!cookie) {
      return Response.json(
        {
          ok: false,
          authenticated: false,
          error: "FMLIST_COOKIE missing"
        },
        { status: 500 }
      );
    }

    const url =
      "https://www.fmlist.org/fm_logmap.php" +
      "?hours=1800" +
      "&band=ALL" +
      "&omid=all" +
      "&target=ALL" +
      "&rxin=FIN";

    const res = await fetch(url, {
      headers: {
        "Cookie": cookie,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language":
          "en-US,en;q=0.9"
      },
      redirect: "follow"
    });

    const html = await res.text();

    const titleMatch =
      html.match(/<title[^>]*>(.*?)<\/title>/i);

    const title =
      titleMatch ? titleMatch[1].trim() : "";

    const hasVisualLogbook =
      /Worldwide Visual Logbook/i.test(html);

    const hasLogin =
      /login/i.test(html) ||
      /password/i.test(html) ||
      /username/i.test(html);

    const hasFmLogMap =
      /fm_logmap/i.test(html);

    const hasLogsText =
      /\d+\s+logs\s+from\s+\d+\s+contributors/i.test(html);

    return Response.json({
      ok: res.ok,
      authenticated:
        hasVisualLogbook || hasLogsText,

      status: res.status,
      bytes: html.length,

      final_url: res.url,

      title,

      checks: {
        hasVisualLogbook,
        hasLogsText,
        hasLogin,
        hasFmLogMap
      }
    });

  } catch (err) {
    return Response.json(
      {
        ok: false,
        authenticated: false,
        error: String(err)
      },
      { status: 500 }
    );
  }
}
