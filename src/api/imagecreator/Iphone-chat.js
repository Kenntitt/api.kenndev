import axios from "axios";

export default function (app) {
  app.get("/imagecreator/iqc", async (req, res) => {
    const {
      text,
      time = '10:00',
      battery = '60',
      carrier = 'INDOSAT',
      emoji = 'apple'
    } = req.query;

    if (!text) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'text' wajib diisi"
      });
    }

    try {
      const url = `https://brat.siputzx.my.id/iphone-quoted?time=${encodeURIComponent(time)}&batteryPercentage=${encodeURIComponent(battery)}&carrierName=${encodeURIComponent(carrier)}&messageText=${encodeURIComponent(text)}&emojiStyle=${encodeURIComponent(emoji)}`;
      const response = await axios.get(url, {
        responseType: "arraybuffer"
      });

      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": response.data.length
      });
      res.end(response.data);
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Gagal mengambil gambar",
        error: error.message
      });
    }
  });
};