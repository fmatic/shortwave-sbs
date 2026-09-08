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
        Cookie: cookie,
        "User-Agent": "shortwave.sbs DX Console/1.0",
        Accept: "text/html,application/xhtml+xml"
      },
      redirect: "follow"
    });

    const html = await res.text();

    const looksLoggedIn =
      html.includes("Worldwide Visual Logbook") ||
      html.includes("Visual Logbook");

    const looksLikeLogin =
      /login/i.test(html) &&
      /password/i.test(html);

    return Response.json({
      ok: res.ok,
      authenticated: looksLoggedIn && !looksLikeLogin,
      status: res.status,
      bytes: html.length,
      final_url: res.url
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

