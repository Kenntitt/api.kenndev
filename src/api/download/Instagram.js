import axios from 'axios';

async function fetchFromSnapins(url) {
    try {
        const params = new URLSearchParams();
        params.append('url', url);

        const { data } = await axios.post('https://snapins.ai/action.php', params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Origin': 'https://snapins.ai',
                'Referer': 'https://snapins.ai/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
            }
        });

        if (!data || !data.data) throw new Error('Tidak ada data dari Snapins.');
        return data.data;
    } catch (error) {
        console.error('❌ Error Snapins API:', error.response?.data || error.message);
        throw new Error('Gagal mengambil data dari Snapins.ai');
    }
}

export default function (app) {
  app.get('/download/instagram', async (req, res) => {
    const { url } = req.query
    if (!url) {
      return res.status(400).json({
        status: false,
        message: "masukan parameter 'url'"
      });
    }
    try {
      const results = await fetchFromSnapins(url);
      res.status(200).json({
        status: true,
        result: results
      });
    } catch (error) {
      res.status(500).send(`Error: ${error.message}`);
    }
  });
}