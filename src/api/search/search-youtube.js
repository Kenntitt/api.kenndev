import axios from 'axios';
import * as cheerio from 'cheerio';

async function search(query) {
  const searchUrl = 'https://s60.notube.net/suggestion.php?lang=id'
  const payload = new URLSearchParams({
    keyword: query,
    format: 'mp3',
    subscribed: 'false'
  })

  const { data } = await axios.post(searchUrl, payload.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Origin': 'https://notube.net',
      'Referer': 'https://notube.net/',
      'User-Agent': 'Mozilla/5.0'
    }
  })

  const $ = cheerio.load(data)
  const results = []
  $('.row > a').each((i, el) => {
    const onclick = $(el).attr('onclick')
    const tokenMatch = onclick?.match(/DOWNL\('([^']+)'/)
    const videoUrl = tokenMatch?.[1]

    if (videoUrl) {
      results.push({
        title: $(el).find('p').text().trim(),
        author: $(el).find('small font').first().text().trim(),
        description: $(el).find('small font').last().text().trim(),
        duration: $(el).find('div[style*="background-color"]').text().trim(),
        thumbnail: $(el).find('img').attr('src'),
        url: videoUrl
      })
    }
  })

  return results
}

// 🕒 Poll for download link
async function pollForDownloadLink(token, retries = 15, delay = 2000) {
  const downloadPageUrl = `https://notube.net/id/download?token=${token}`
  for (let i = 0; i < retries; i++) {
    const { data } = await axios.get(downloadPageUrl)
    const $ = cheerio.load(data)
    const link = $('#downloadButton').attr('href')
    if (link && link.includes('key=') && !link.endsWith('key=')) {
      return {
        title: $('#blocLinkDownload h2').text().trim(),
        download_url: link
      }
    }
    await new Promise(r => setTimeout(r, delay))
  }
  throw new Error('Download link timeout')
}

// 🎬 Download handler
async function download(url, format = 'mp3') {
  const server = 'https://s60.notube.net'
  const payload = new URLSearchParams({ url, format, lang: 'id', subscribed: 'false' })

  const { data: weightData } = await axios.post(`${server}/recover_weight.php`, payload.toString())
  const { token, name_mp4 } = weightData
  if (!token) throw new Error('Token tidak ditemukan')

  const filePayload = new URLSearchParams({
    url, format, name_mp4, lang: 'id', token, subscribed: 'false', playlist: 'false', adblock: 'false'
  })
  await axios.post(`${server}/recover_file.php?lang=id`, filePayload.toString())

  await axios.post(`${server}/conversion.php`, new URLSearchParams({ token }).toString())

  return await pollForDownloadLink(token)
}

export default function(app) {
  app.get('/search/youtube', async (req, res) => {
    const { q } = req.query;
    if (!q) {
        return res.status(400).json({ status: false, error: 'Query is required' });
    }
    try {
        const results = await search(q);
        res.status(200).json({
            status: true,
            result: results
        });
    } catch (error) {
        res.status(500).json({ status: false, error: error.message });
    }
  });

  app.get('/download/youtube', async (req, res) => {
    const { url, format } = req.query;
    if (!url) {
        return res.status(400).json({ status: false, error: 'URL is required' });
    }
    try {
        const result = await download(url, format);
        res.status(200).json({
            status: true,
            result: result
        });
    } catch (error) {
        res.status(500).json({ status: false, error: error.message });
    }
  });
}