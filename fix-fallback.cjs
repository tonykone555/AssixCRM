const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Strip out the Tesseract fallback completely to guarantee Gemini is used
const extractStart = code.indexOf("app.post('/api/extract-profile'");
const extractEnd = code.indexOf("app.get('/api/reddit-leads'");

const oldExtract = code.substring(extractStart, extractEnd);

const newExtract = `app.post('/api/extract-profile', upload.single('file'), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
      }
      
      const apiKey = process.env.FREE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ error: 'AI API key is missing from server configuration.' });
      }
      
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const mimeType = req.file.mimetype || 'image/jpeg';
      const base64Data = req.file.buffer.toString('base64');
      
      const prompt = \`Analyze this social media (e.g. Instagram) profile screenshot and extract the following information. Be very precise:
      1. Name: The full display name of the brand or person. If not present, use the handle.
      2. Instagram Handle: The username is usually found at the very top left. It might have a back arrow next to it (e.g., "< taliriii"). Extract JUST the raw username (e.g., "taliriii"). Do NOT include the "<" arrow, spaces, or the "@" symbol.
      3. Website: Look for any domain name or URL in the bio section (e.g. 'mybrand.com', 'linktr.ee/...'). It often has emojis in front of it (like ⛓️ or 💥). Strip ALL emojis, prefixes, and text. Return ONLY the clean URL.
      4. Bio/Notes: A brief summary of what they do based on the text in their bio.
      Return a strict JSON object with EXACTLY these keys: "name", "handle", "website", "bio".\`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              handle: { type: Type.STRING },
              website: { type: Type.STRING },
              bio: { type: Type.STRING }
            },
            required: ['name', 'handle']
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      return res.json(data);
      
    } catch (err: any) {
      console.error('AI Extraction Error:', err);
      return res.status(500).json({ error: 'AI failed to process image: ' + (err.message || err) });
    }
  });

  // Reddit Lead Radar Endpoint
  `;

code = code.replace(oldExtract, newExtract);
fs.writeFileSync('server.ts', code);
