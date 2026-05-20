import axios from 'axios';

export default function(app) {
  app.get('/imagecreator/bratvid', async (req, res) => {
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
      const initialUrl = `https://alfixd-brat.hf.space/maker/bratvid?text=${encodeURIComponent(text)}&background=${encodeURIComponent(background)}&color=${encodeURIComponent(color)}`;
      const initialResponse = await axios.get(initialUrl);

      if (initialResponse.data && initialResponse.data.video_url) {
        const videoUrl = initialResponse.data.video_url;
        const videoResponse = await axios.get(videoUrl, {
          responseType: 'arraybuffer'
        });

        res.writeHead(200, {
          'Content-Type': 'video/mp4',
          'Content-Length': videoResponse.data.length
        });
        res.end(videoResponse.data, 'binary');
      } else {
        throw new Error('Video URL not found in the response from the external API.');
      }

    } catch (error) {
      res.status(500).json({
        status: false,
        message: 'Gagal membuat video brat.',
        error: error.message
      });
    }
  });
}