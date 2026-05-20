import axios from 'axios';

async function callOpenAI(userText, systemPrompt) {
  try {
    const { data } = await axios.post(
      'https://chateverywhere.app/api/chat/',
      {
        model: {
          id: 'gpt-3.5-turbo-0613',
          name: 'GPT-3.5',
          maxLength: 12000,
          tokenLimit: 4000,
          completionTokenLimit: 2500,
          deploymentName: 'gpt-35'
        },
        messages: [{ pluginId: null, content: userText, role: 'user' }],
        prompt: systemPrompt,
        temperature: 0.5
      },
      {
        headers: {
          Accept: '*/*',
          'User-Agent': 'Mozilla/5.0 (Android) Chrome/120.0.0.0 Mobile Safari/537.36'
        }
      }
    );

    return data;
  } catch (error) {
    console.error('❌ Gagal memanggil layanan AI:', error.message);
    throw new Error('Gagal menghubungi AI pihak ketiga');
  }
}

export default function(app) {
  app.get('/ai/chateverywhere', async (req, res) => {
    const { text, system_prompt } = req.query;
    if (!text) {
      return res.status(400).json({ status: false, error: 'Text is required' });
    }
    try {
      const result = await callOpenAI(text, system_prompt);
      res.status(200).json({
        status: true,
        result
      });
    } catch (error) {
      res.status(500).json({ status: false, error: error.message });
    }
  });
}