export async function onRequestGet(context) {

  const FEEDS = [
    {
      source: "YLE",
      url: "https://feeds.yle.fi/uutiset/v1/recent.rss?publisherIds=YLE_UUTISET"
    },
    {
      source: "HS",
      url: "https://www.hs.fi/rss/tuoreimmat.xml"
    },
    {
      source: "IS",
      url: "https://www.is.fi/rss/tuoreimmat.xml"
    },
    {
      source: "BBC",
      url: "https://feeds.bbci.co.uk/news/world/rss.xml"
    }
  ];

  const items = [];

  for (const feed of FEEDS) {

    try {

      const response = await fetch(
        feed.url,
        {
          headers: {
            "User-Agent":
              "shortwave.sbs-info-screen/1.0",
            "Accept":
              "application/rss+xml, application/xml, text/xml, */*"
          }
        }
      );

      if (!response.ok) {

        console.log(
          feed.source,
          "HTTP",
          response.status
        );

        continue;
      }

      const xml =
        await response.text();

      const title =
        extractFirstTitle(xml);

      if (title) {

        items.push({
          source: feed.source,
          title
        });
      }

    }

    catch (err) {

      console.log(
        feed.source,
        err
      );
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      updated:
        new Date().toISOString(),
      count:
        items.length,
      items
    }),
    {
      headers: {
        "content-type":
          "application/json; charset=utf-8",
        "cache-control":
          "public, max-age=300"
      }
    }
  );
}


function extractFirstTitle(xml) {

  // RSS <item>
  const itemMatch =
    xml.match(
      /<item\b[\s\S]*?<title\b[^>]*>([\s\S]*?)<\/title>/i
    );

  if (itemMatch) {

    return cleanText(
      itemMatch[1]
    );
  }

  // Atom <entry>
  const entryMatch =
    xml.match(
      /<entry\b[\s\S]*?<title\b[^>]*>([\s\S]*?)<\/title>/i
    );

  if (entryMatch) {

    return cleanText(
      entryMatch[1]
    );
  }

  return "";
}


function cleanText(text) {

  return decodeEntities(
    text
      .replace(
        /<!\[CDATA\[([\s\S]*?)\]\]>/g,
        "$1"
      )
      .replace(
        /<[^>]+>/g,
        ""
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim()
  );
}


function decodeEntities(text) {

  const entities = {
    "&amp;": "&",
    "&quot;": "\"",
    "&#39;": "'",
    "&apos;": "'",
    "&lt;": "<",
    "&gt;": ">",
    "&nbsp;": " "
  };

  for (
    const [key, value]
    of Object.entries(entities)
  ) {

    text =
      text.split(key).join(value);
  }

  text =
    text.replace(
      /&#(\d+);/g,
      (_, n) =>
        String.fromCodePoint(
          Number(n)
        )
    );

  text =
    text.replace(
      /&#x([0-9a-f]+);/gi,
      (_, n) =>
        String.fromCodePoint(
          parseInt(n, 16)
        )
    );

  return text;
}
