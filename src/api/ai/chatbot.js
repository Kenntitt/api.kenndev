import axios from "axios";
import crypto from "crypto";

const anjingDarat = "az-chatai-key";

const modelan = [
  "deepseek-v3.1",
  "deepseek-r1", 
  "grok-4",
  "qwen3-32b",
  "gemini-2.5-pro",
  "llama-4",
  "agent-x",
  "gpt-5",
  "gpt-5-mini",
  "o3",
  "claude-sonnet-4",
  "o4-mini",
  "gpt-4o-mini",
  "gpt-4.1-mini",
  "gemini-2.5-flash",
];

function kecoaPink() {
  return `RCAnonymousID:${crypto.randomBytes(16).toString("hex")}`;
}

async function chatAi(model, prompt) {
  return new Promise(async (resolve, reject) => {
    try {
      const resp = await axios.post(
        "https://api.appzone.tech/v1/chat/completions",
        {
          model,
          stream: true,
          messages: [
            {
              role: "user",
              content: [{ type: "text", text: prompt }],
            },
          ],
          isSubscribed: true,
          web_search: false,
          reason: false,
          study_mode: false,
        },
        {
          headers: {
            accept: "text/event-stream",
            "cache-control": "no-cache",
            "x-requested-with": "XMLHttpRequest",
            authorization: `Bearer ${anjingDarat}`,
            "x-app-version": "1.0.13",
            "x-user-id": kecoaPink(),
            "content-type": "application/json",
            "accept-encoding": "gzip",
            "user-agent": "Gienetic/1.2.0 (Android 13; Pixel 7 Pro) Premium",
          },
          responseType: "stream",
        }
      );

      let buffer = "";
      let sudahSelesai = false;

      function finish() {
        if (sudahSelesai) return;
        sudahSelesai = true;
        const clean = buffer.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        resolve(clean);
      }

      resp.data.on("data", (chunk) => {
        const lines = chunk.toString().split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            finish();
            return;
          }
          try {
            const json = JSON.parse(data);
            const delta = json?.choices?.[0]?.delta?.content;
            if (delta) {
              buffer += delta;
            }
          } catch {}
        }
      });

      resp.data.on("end", finish);
    } catch (err) {
      reject(err?.response?.data || err.message);
    }
  });
}

export default function(app) {
  app.get("/ai/chatbot", async (req, res) => {
    const { prompt, model } = req.query;
    if (!prompt || !model) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'prompt' dan 'model' wajib diisi"
      });
    }
    
    if (!modelan.includes(model)) {
      return res.status(400).json({
        status: false,
        message: `Model tidak tersedia. Model yang tersedia: ${modelan.join(", ")}`
      });
    }

    try {
      const result = await chatAi(model, prompt);
      res.json({
        status: true,
        model: model,
        response: result
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Gagal mengambil respons",
        error: error
      });
    }
  });
};