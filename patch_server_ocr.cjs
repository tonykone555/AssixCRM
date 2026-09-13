const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes("tesseract.js")) {
  code = code.replace(
    "import { GoogleGenAI, Type } from '@google/genai';",
    "import { GoogleGenAI, Type } from '@google/genai';\nimport Tesseract from 'tesseract.js';"
  );
  
  const originalEndpoint = `
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
  });`;

  const newEndpoint = `
  // AI Profile Extraction endpoint (with Tesseract Fallback)
  app.post('/api/extract-profile', upload.single('file'), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
      }
      
      let data = {};
      let useGemini = !!process.env.GEMINI_API_KEY;
      
      if (useGemini) {
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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

          data = JSON.parse(response.text || '{}');
          return res.json(data);
        } catch (geminiError: any) {
          console.warn('Gemini extraction failed or quota exceeded, falling back to Tesseract OCR:', geminiError.message || geminiError);
          useGemini = false; // Trigger fallback
        }
      }
      
      if (!useGemini) {
        console.log("Running local Tesseract OCR fallback...");
        // Fallback to local OCR if Gemini fails or is missing key
        const { data: { text } } = await Tesseract.recognize(req.file.buffer, 'eng');
        const lines = text.split('\\n').map(l => l.trim()).filter(Boolean);
        
        let handle = lines.length > 0 ? lines[0].replace(/[^a-zA-Z0-9._]/g, '') : '';
        let name = lines.length > 1 ? lines[1] : '';
        
        // Very basic website detection
        let website = lines.find(l => l.includes('http') || l.includes('www.') || l.includes('linktr.ee') || l.endsWith('.com')) || '';
        
        data = {
          name: name,
          handle: handle,
          website: website,
          bio: "--- RAW TEXT EXTRACTED (Free Mode) ---\\n" + text.substring(0, 1000)
        };
        
        return res.json(data);
      }
      
    } catch (err: any) {
      console.error('AI Extraction Error:', err);
      return res.status(500).json({ error: err.message || 'Failed to extract profile data' });
    }
  });`;

  // Use a string replacement logic
  code = code.replace(originalEndpoint, newEndpoint);
  
  fs.writeFileSync('server.ts', code);
}
