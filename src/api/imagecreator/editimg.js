import axios from 'axios';
import crypto from 'crypto';
import multer from 'multer';

// Configure multer for in-memory storage
const upload = multer({ storage: multer.memoryStorage() });

// --- Helper Functions and Classes from original script ---

class AuthGenerator {
    static #PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDa2oPxMZe71V4dw2r8rHWt59gH
W5INRmlhepe6GUanrHykqKdlIB4kcJiu8dHC/FJeppOXVoKz82pvwZCmSUrF/1yr
rnmUDjqUefDu8myjhcbio6CnG5TtQfwN2pz3g6yHkLgp8cFfyPSWwyOCMMMsTU9s
snOjvdDb4wiZI8x3UwIDAQAB
-----END PUBLIC KEY-----`;
    static #S = 'NHGNy5YFz7HeFb'
    
    constructor(appId) {
        this.appId = appId;
    }
    
    aesEncrypt(data, key, iv) {
        const keyBuffer = Buffer.from(key, 'utf8');
        const ivBuffer = Buffer.from(iv, 'utf8');
        const cipher = crypto.createCipheriv('aes-128-cbc', keyBuffer, ivBuffer);
        
        let encrypted = cipher.update(data, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        return encrypted;
    }
    
    generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        const randomBytes = crypto.randomBytes(length);
        for (let i = 0; i < length; i++) {
            result += chars.charAt(randomBytes[i] % chars.length);
        }
        return result;
    }
    
    generate() {
        const t = Math.floor(Date.now() / 1000).toString()
        const nonce = crypto.randomUUID();
        const tempAesKey = this.generateRandomString(16);

        const encryptedData = crypto.publicEncrypt({
            key: AuthGenerator.#PUBLIC_KEY,
            padding: crypto.constants.RSA_PKCS1_PADDING,
        }, Buffer.from(tempAesKey));
        const secret_key = encryptedData.toString('base64');

        const dataToSign = `${this.appId}:${AuthGenerator.#S}:${t}:${nonce}:${secret_key}`;
        const sign = this.aesEncrypt(dataToSign, tempAesKey, tempAesKey);
        
        return {
            app_id: this.appId,
            t: t,
            nonce: nonce,
            sign: sign,
            secret_key: secret_key,
        };
    }
}

async function convert(buffer, prompt) {
    try {
        const auth = new AuthGenerator('ai_df');
        const authData = auth.generate();
        const userId = auth.generateRandomString(64).toLowerCase();
        
        const headers = {
            'Access-Control-Allow-Credentials': 'true',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Android 15; Mobile; SM-F958; rv:130.0) Gecko/130.0 Firefox/130.0',
            'Referer': 'https://deepfakemaker.io/nano-banana-ai/'
        };
        
        const instance = axios.create({
            baseURL: 'https://apiv1.deepfakemaker.io/api',
            params: authData,
            headers
        });
        
        const file = await instance.post('/user/v2/upload-sign', {
            'filename': auth.generateRandomString(32) + '_' + Date.now() + '.jpg',
            'hash': crypto.createHash('sha256').update(buffer).digest('hex'),
            'user_id': userId
        }).then(i => i.data);
        
        await axios.put(file.data.url, buffer, {
            headers: {
                'content-type': 'image/jpeg',
                'content-length': buffer.length
            }
        });
        
        const taskData = await instance.post('/replicate/v1/free/nano/banana/task', {
            'prompt': prompt,
            'platform': 'nano_banana',
            'images': [ 'https://cdn.deepfakemaker.io/' + file.data.object_name ],
            'output_format': 'png',
            'user_id': userId
        }).then(i => i.data);
        
        const progress = await new Promise((resolve, reject) => {
            let retries = 20, c = 1;
            const interval = setInterval(async () => {
                const xz = await instance.get('/replicate/v1/free/nano/banana/task', {
                    params: {
                        user_id: userId,
                        ...taskData.data
                    }
                }).then(i => i.data);
                
                if (xz.msg === 'success') {
                    clearInterval(interval);
                    resolve(xz.data.generate_url);
                }
                if (--retries <= 0) {
                    clearInterval(interval);
                    reject(new Error('Failed to get task.'));
                }
                c++
            }, 2500);
        });
        
        return progress;
    } catch (error) {
        // Re-throw the error to be caught by the route handler
        throw error;
    }
}

// --- API Endpoint Definition ---

export default function(app) {
  // Use multer middleware for this route to handle single file uploads with the field name 'image'.
  app.post('/imagecreator/editimg', upload.single('image'), async (req, res) => {
    try {
      const { prompt } = req.body;
      const imageBuffer = req.file ? req.file.buffer : null;

      if (!imageBuffer || !prompt) {
        return res.status(400).json({
          status: false,
          message: "A 'prompt' (text field) and an 'image' (file) are required in the multipart/form-data request."
        });
      }

      const resultUrl = await convert(imageBuffer, prompt);

      // Fetch the generated image from the URL and stream it back to the client
      const imageResponse = await axios.get(resultUrl, {
          responseType: 'arraybuffer'
      });

      res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': imageResponse.data.length
      });
      res.end(imageResponse.data);

    } catch (error) {
      console.error('[editimg-error]', error);
      res.status(500).json({
        status: false,
        message: 'Failed to edit image.',
        error: error.message
      });
    }
  });
}