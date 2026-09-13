const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const outreachEndpoint = `
  // AI Outreach Generator
  app.post('/api/generate-outreach', async (req: any, res: any) => {
    try {
      if (!process.env.FREE_GEMINI_API_KEY) {
        return res.status(400).json({ error: 'FREE_GEMINI_API_KEY is not configured on the server.' });
      }
      
      const { imageBase64 } = req.body;
      const ai = new GoogleGenAI({ apiKey: process.env.FREE_GEMINI_API_KEY });
      
      let contents = [];
      const pitch = "Actually I'm a designer and I built a tool that lets customers upload a photo and see themselves wearing your pieces right on the product page. Recorded a quick 30s clip showing how it looks with your brand. Mind if I drop the video here?";
      
      if (imageBase64) {
        const base64Data = imageBase64.replace(/^data:image\\/\\w+;base64,/, "");
        contents = [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: 'image/jpeg'
                }
              },
              {
                text: \`You are an expert sales outreach assistant. Look at this screenshot of a clothing brand's Instagram or website. Identify the coolest or most prominent clothing item visible (e.g., a tracksuit, hoodie, graphic tee, bag). Generate a short, casual outreach DM. 
                
It MUST follow this EXACT structure:
1. A genuine compliment about the specific item seen in a highly casual tone (e.g., "The [item] firee bro....." or "Those [item] are insane man...").
2. Followed EXACTLY by this pitch (do not change a word of the pitch): "\${pitch}"

Do NOT add any greetings like "Hey [Name]", and do NOT add any sign-offs. Just the compliment followed by the pitch.\`
              }
            ]
          }
        ];
      } else {
         return res.status(400).json({ error: 'Please upload a screenshot to generate a personalized message.' });
      }
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents
      });
      
      const generatedMessage = response.text || '';
      res.json({ message: generatedMessage.trim() });
    } catch(err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to generate outreach message' });
    }
  });
`;

if (!code.includes("/api/generate-outreach")) {
  code = code.replace(
    "app.post('/api/notify', async (req: any, res: any) => {",
    outreachEndpoint + "\n  app.post('/api/notify', async (req: any, res: any) => {"
  );
  fs.writeFileSync('server.ts', code);
}
