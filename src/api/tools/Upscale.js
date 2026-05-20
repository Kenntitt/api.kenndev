import axios from "axios";

async function upscaleImageFromUrl(imageUrl, scale = 2, faceEnhance = true) {
  if (scale < 2 || scale > 10) {
    throw new Error("Scale harus antara 2 sampai 10");
  }

  // Download image dari URL
  const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
  const base64Image = `data:image/jpeg;base64,${Buffer.from(
    response.data
  ).toString("base64")}`;

  // Kirim request ke Fooocus
  const start = await axios.post(
    "https://fooocus.one/api/predictions",
    {
      version:
        "f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
      input: {
        face_enhance: faceEnhance,
        image: base64Image,
        scale,
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/107.0.0.0 Safari/537.36",
        Origin: "https://fooocus.one",
        Referer: "https://fooocus.one/id/apps/batch-upscale-image",
      },
    }
  );

  const predictionId =
    start.data?.id || start.data?.data?.id || start.data?.prediction?.id;

  if (!predictionId) {
    throw new Error("Tidak bisa mendapatkan predictionId dari response");
  }

  let result;
  const startTime = Date.now();

  // Polling status
  while (true) {
    const res = await axios.get(
      `https://fooocus.one/api/predictions/${predictionId}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/107.0.0.0 Safari/537.36",
          Referer: "https://fooocus.one/id/apps/batch-upscale-image",
        },
      }
    );

    if (res.data.status === "succeeded") {
      result = Array.isArray(res.data.output)
        ? res.data.output[0]
        : res.data.output;
      break;
    } else if (res.data.status === "failed") {
      throw new Error("Upscale gagal");
    }

    if (Date.now() - startTime > 60000) {
      throw new Error("Timeout: proses terlalu lama (>60 detik)");
    }

    await new Promise((r) => setTimeout(r, 3000));
  }

  return result;
}

export default function (app) {
  app.get("/tools/upscale", async (req, res) => {
    const { url, scale, face_enhance } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'url' wajib diisi (link gambar)"
      });
    }

    try {
      const finalScale = scale ? parseInt(scale, 10) : 2;
      const finalFaceEnhance = face_enhance ? face_enhance.toLowerCase() === 'true' : true;

      const resultUrl = await upscaleImageFromUrl(url, finalScale, finalFaceEnhance);
      
      const imageResponse = await axios.get(resultUrl, { responseType: 'arraybuffer' });
      const outputImageBuffer = Buffer.from(imageResponse.data, 'binary');
      
      res.writeHead(200, {
        'Content-Type': imageResponse.headers['content-type'],
        'Content-Length': outputImageBuffer.length
      });
      res.end(outputImageBuffer);

    } catch (e) {
      const detail = e.response?.data || e.message;
      return res.status(500).json({
        status: false,
        message: "Terjadi kesalahan saat proses upscale.",
        error: detail
      });
    }
  });
};