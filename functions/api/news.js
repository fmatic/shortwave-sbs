export async function onRequestGet() {
  const feeds = [
    {
      source: "YLE",
      url: "https://feeds.yle.fi/uutiset/v1/majorHeadlines/YLE_UUTISET.rss"
    }
  ];

  const items = [];

  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, {
        headers: {
          "User-Agent": "shortwave.sbs InfoScreen/1.0"
        }
      });

      if (!res.ok) {
        continue;
      }

      const xml = await res.text();

      const matches = [
        ...xml.matchAll(
          /<item>[\s\S]*?<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>[\s\S]*?<\/item>/gi
        )
      ];

      for (const m of matches.slice(0, 4)) {
        const title = decodeXml(
          stripTags(m[1]).trim()
        );

        if (title) {
          items.push({
            source: feed.source,
            title
          });
        }
      }
    } catch (err) {
      // jätetään toimiva feed käyttöön vaikka joku lähde kaatuisi
    }
  }

  return Response.json({
    ok: true,
    updated: new Date().toISOString(),
    count: items.length,
    items: items.slice(0, 4)
  }, {
    headers: {
      "cache-control":
        "public, max-age=120, s-maxage=300",
      "access-control-allow-origin": "*"
    }
  });
}

function stripTags(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, "");
}

function decodeXml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
