const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Increase limit of express.json
code = code.replace(
  'app.use(express.json());',
  "app.use(express.json({ limit: '50mb' }));"
);

// 2. Add the VTON endpoint before the static file serving block
const vtonEndpoint = `
  app.post('/api/vton/gemini', async (req: any, res: any) => {
    try {
      const { humanImage, garmImage } = req.body;
      if (!humanImage || !garmImage) {
        return res.status(400).json({ success: false, error: 'Missing images' });
      }
      
      const apiKey = process.env.GEMINI_PAID_IMAGE_API_KEY || process.env.FREE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ success: false, error: 'GEMINI_API_KEY is missing in secrets' });
      }
      
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const getBase64Data = async (src: string) => {
        if (src.startsWith('data:')) {
          const mimeType = src.substring(src.indexOf(':') + 1, src.indexOf(';'));
          const data = src.split(',')[1];
          return { mimeType, data };
        } else {
          const response = await fetch(src);
          const arrayBuffer = await response.arrayBuffer();
          const mimeType = response.headers.get('content-type') || 'image/jpeg';
          const data = Buffer.from(arrayBuffer).toString('base64');
          return { mimeType, data };
        }
      };
      
      const human = await getBase64Data(humanImage);
      const garm = await getBase64Data(garmImage);
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image', // Usually requires the image specific alias
        contents: [
            { text: 'Image 1: The person' },
            {
              inlineData: {
                data: human.data,
                mimeType: human.mimeType,
              }
            },
            { text: 'Image 2: The garment to wear' },
            {
              inlineData: {
                data: garm.data,
                mimeType: garm.mimeType,
              }
            },
            {
              text: "Virtual Try-On Task: Generate a highly photorealistic image of the person in Image 1 wearing the exact garment from Image 2. Ensure the person's identity, face, and body shape are preserved flawlessly. The garment must be draped realistically, respecting the lighting, posture, and shadows of the original person image. ONLY output the final combined image, nothing else."
            }
        ],
      });
      
      // Gemini 3.1 Flash Image responses come back differently than text models
      let imageUrl = null;
      if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = \`data:\${part.inlineData.mimeType};base64,\${part.inlineData.data}\`;
            break;
          }
        }
      }
      
      if (!imageUrl) {
        return res.status(500).json({ success: false, error: 'Gemini did not return an image inlineData part' });
      }
      
      return res.json({ success: true, imageUrl });
    } catch (err: any) {
      console.error('[VTON Error]:', err);
      res.status(500).json({ success: false, error: err.message || 'Unknown error' });
    }
  });

  // Vite middleware for development`;

code = code.replace('// Vite middleware for development', vtonEndpoint);

fs.writeFileSync('server.ts', code);
