import axios from "axios";

const UA =
  "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36"

async function spotify(query) {
  if (!query) throw new Error("Input kosong")

  const searchUrl =
    "https://spotdown.org/api/song-details?url=" +
    encodeURIComponent(query)

  const searchRes = await axios.get(searchUrl, {
    headers: {
      accept: "application/json",
      origin: "https://spotdown.org",
      referer: "https://spotdown.org/",
      "user-agent": UA
    }
  })

  const songs = searchRes.data?.songs
  if (!songs || !songs.length) throw new Error("Song not found")

  const track = songs.at(0)

  const audioRes = await axios({
    method: "POST",
    url: "https://spotdown.org/api/download",
    data: { url: track.url },
    headers: {
      accept: "*/*",
      "content-type": "application/json",
      origin: "https://spotdown.org",
      referer: "https://spotdown.org/",
      "user-agent": UA
    },
    responseType: "arraybuffer"
  })

  return {
    metadata: {
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      cover: track.thumbnail,
      url: track.url
    },
    audio: Buffer.from(audioRes.data)
  }
}

export default function (app) {
  app.get("/download/spotify", async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'url' wajib diisi (link lagu Spotify)"
      });
    }

    try {
      const result = await spotify(url);
      
      res.json({
        status: true,
        creator: "AlfiXD",
        result: {
          title: result.metadata.title,
          artist: result.metadata.artist,
          album: null, // spotdown.org tidak mengembalikan album
          releaseDate: null, // spotdown.org tidak mengembalikan tanggal rilis
          download_url: null, // audio dikembalikan sebagai buffer, bukan URL
          cover: result.metadata.cover,
          duration: result.metadata.duration,
          audio: result.audio.toString('base64') // mengirim audio sebagai base64
        }
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Terjadi kesalahan saat memproses permintaan.",
        error: error.message || error
      });
    }
  });
};

