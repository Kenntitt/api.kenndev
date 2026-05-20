import axios from 'axios';

export default function(app) {
  app.get('/imagecreator/brat', async (req, res) => {
    const {
      text,
      background = '#FFFFFF',
      color = '#000000'
    } = req.query;

    if (!text) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'text' wajib diisi"
      });
    }

    try {
      const initialUrl = `https://alfixd-brat.hf.space/maker/brat?text=${encodeURIComponent(text)}&background=${encodeURIComponent(background)}&color=${encodeURIComponent(color)}`;
      const initialResponse = await axios.get(initialUrl);

      if (initialResponse.data && initialResponse.data.image_url) {
        const imageUrl = initialResponse.data.image_url;
        const imageResponse = await axios.get(imageUrl, {
          responseType: 'arraybuffer'
        });

        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': imageResponse.data.length
        });
        res.end(imageResponse.data);
      } else {
        throw new Error('Image URL not found in the response from the external API.');
      }

    } catch (error) {
      res.status(500).json({
        status: false,
        message: 'Gagal membuat gambar brat.',
        error: error.message
      });
    }
  });
}