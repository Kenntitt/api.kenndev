import axios from "axios";
import fetch from "node-fetch";

const removal = {
  _hit: async (url, fetchName = "no-name", returnType = "text", opts = {}) => {
    const res = await fetch(url, opts);
    if (!res.ok) throw Error(`Fetch fail @${fetchName}\n${res.status} ${res.statusText}\n${await res.text()}`);
    return returnType === 'json' ? res.json() : res.text();
  },

  _formData: (imageBuffer) => {
    const boundary = "----WebKitFormBoundary" + Math.random().toString(32).slice(2);
    const buffers = [
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image_file"; filename="file.png"\r\nContent-Type: image/png\r\n\r\n`),
      imageBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ];
    return {
      formDataHeaders: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary
      },
      body: Buffer.concat(buffers)
    };
  },

  getWebToken: async () => {
    const html = await removal._hit("https://removal.ai/", "homepage");
    const match = html.match(/var ajax_upload_object = (.*?);/)?.[1];
    if (!match) throw new Error("Gagal ambil token object");
    const { webtoken_url, security } = JSON.parse(match);
    const tokenUrl = `${webtoken_url}?action=ajax_get_webtoken&security=${security}`;
    const { data } = await removal._hit(tokenUrl, "web-token", "json");
    return data?.webtoken;
  },

  removeBackground: async (imageBuffer) => {
    const { formDataHeaders, body } = removal._formData(imageBuffer);
    const headers = {
      "web-token": await removal.getWebToken(),
      ...formDataHeaders
    };
    const opts = { method: "POST", headers, body };
    return removal._hit("https://api.removal.ai/3.0/remove", "remove-bg", "json", opts);
  }
};

export default function (app) {
  app.get("/tools/removebg", async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'url' wajib diisi (link gambar)"
      });
    }

    try {
      const response = await axios.get(url, { responseType: "arraybuffer" });
      const imageBuffer = Buffer.from(response.data, "binary");
      
      const result = await removal.removeBackground(imageBuffer);
      
      if (result && result.url) {
        const imageResponse = await axios.get(result.url, { responseType: 'arraybuffer' });
        const outputImageBuffer = Buffer.from(imageResponse.data, 'binary');
        res.writeHead(200, {
          'Content-Type': imageResponse.headers['content-type'],
          'Content-Length': outputImageBuffer.length
        });
        res.end(outputImageBuffer);
      } else {
        res.status(500).json({
          status: false,
          message: "Gagal menghapus background.",
          result
        });
      }
    } catch (e) {
      const detail = e.response?.data || e.message;
      return res.status(500).json({
        status: false,
        message: "Terjadi kesalahan saat proses background remover.",
        error: detail
      });
    }
  });
};