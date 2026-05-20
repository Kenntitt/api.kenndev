import fetch from 'node-fetch';
import axios from 'axios';

async function pint(query) {
  const response = await fetch("https://www.pinterest.com/resource/BaseSearchResource/get/?data=" +
    encodeURIComponent(`{"options":{"query":"${encodeURIComponent(query)}"}}`), {
    headers: {
      "screen-dpr": "4",
      "x-pinterest-pws-handler": "www/search/[scope].js",
    },
    method: "HEAD"
  });

  if (!response.ok) throw Error(`Pinterest fetch failed (${response.status} ${response.statusText})`);

  const linkHeader = response.headers.get("Link");
  if (!linkHeader) throw Error(`No results found for query: ${query}`);

  const links = [...linkHeader.matchAll(/<(.*?)>/gm)].map(v => v[1]);
  return links;
}

async function pinterestDL(url) {
  try {
    if (!url) throw "missing url!";

    const { data } = await axios.get(`https://pinterestdownloader.io/frontendService/DownloaderService?url=` + url, {
      headers: {
        "Accept": "*/*",
        "Content-Type": "application/json",
        "Origin": "https://pinterestdownloader.io",
        "Referer": "https://pinterestdownloader.io/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
      }
    });

    if (!data?.medias) throw "failed fetching media!";

    const originalsSet = new Set();
    const mediaList = [];

    for (const media of data.medias) {
      mediaList.push(media);

      if (media.extension === "jpg" && media.url.includes("i.pinimg.com/")) {
        const originalUrl = media.url.replace(/\/\d+x\//, "/originals/");
        if (!originalsSet.has(originalUrl)) {
          originalsSet.add(originalUrl);
          mediaList.push({ ...media, url: originalUrl, quality: "original" });
        }
      }
    }

    return {
      success: true,
      media: mediaList.sort((a, b) => (b.size || 0) - (a.size || 0))
    };
  } catch (e) {
    return {
      success: false,
      error: typeof e === 'string' ? e : e.message
    };
  }
}

export default function (app) {
  app.get("/search/pinterest", async (req, res) => {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'q' wajib diisi"
      });
    }

    try {
      const results = await pint(q);
      res.json({
        status: true,
        result: results
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Gagal mengambil data dari Pinterest",
        error: error.message
      });
    }
  });

  app.get("/download/pinterest", async (req, res) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'url' wajib diisi"
      });
    }

    try {
      const result = await pinterestDL(url);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
};