export async function onRequestGet(context) {
  try {
    const cookie = context.env.FMLIST_COOKIE;

    if (!cookie) {
      return Response.json(
        {
          ok: false,
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
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language":
          "en-US,en;q=0.9",
        Referer:
          "https://www.fmlist.org/"
      },
      redirect: "follow"
    });

    const body = await res.text();

    return Response.json({
      ok: res.ok,
      status: res.status,
      bytes: body.length,
      final_url: res.url,
      preview: body.slice(0, 500)
    });

  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: String(err)
      },
      { status: 500 }
    );
  }
}
