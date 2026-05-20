import axios from 'axios';

export default function(app) {
  app.get('/imagecreator/quoted', async (req, res) => {
    const {
      text = '',
      name = 'user',
      avatar = ''
    } = req.query;

    const payload = {
      messages: [
        {
          from: {
            id: 1,
            first_name: name,
            last_name: "",
            name: name,
            photo: {
              url: avatar
            }
          },
          text: text,
          entities: [],
          avatar: true,
        }
      ],
      backgroundColor: "#292232",
      width: 512,
      height: 512,
      scale: 2,
      type: "quote",
      format: "png",
      emojiStyle: "apple"
    };

    try {
      const response = await axios.post('https://brat.siputzx.my.id/quoted', payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      });

      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': response.data.length
      });
      res.end(response.data);

    } catch (error) {
      res.status(500).json({
        status: false,
        message: 'Gagal membuat gambar quote.',
        error: error.message
      });
    }
  });
}