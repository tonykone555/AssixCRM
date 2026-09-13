const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('@google/genai')) {
  code = code.replace(
    "import express from 'express';",
    "import express from 'express';\nimport { GoogleGenAI, Type } from '@google/genai';"
  );
  
  const extractEndpoint = `
  // AI Profile Extraction endpoint
  app.post('/api/extract-profile', upload.single('file'), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
      }
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'Gemini API key is not configured' });
      }

      const ai = new GoogleGenAI({ apiKey });
      const mimeType = req.file.mimetype || 'image/jpeg';
      const base64Data = req.file.buffer.toString('base64');
      
      const prompt = \`Extract the following information from this Instagram (or other social media) profile screenshot:
      1. Name (the full name displayed, not the handle. If not present, use the handle).
      2. Instagram handle (the username at the very top, WITHOUT the @ symbol).
      3. Website (the link in bio, if any. Look for domain names).
      4. Bio/Notes (a brief summary of their bio text).
      Return a JSON object.\`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
      return res.status(500).json({ error: err.message || 'Failed to extract profile data' });
    }
  });
`;

  code = code.replace(
    "app.post('/api/notify', async (req: any, res: any) => {",
    extractEndpoint + "\n  app.post('/api/notify', async (req: any, res: any) => {"
  );
  
  fs.writeFileSync('server.ts', code);
}
