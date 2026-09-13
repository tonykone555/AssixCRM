const { GoogleGenAI } = require('@google/genai');

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.FREE_GEMINI_API_KEY });
  try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
          { role: 'user', parts: [ { text: "Hello" } ] }
        ]
      });
      console.log("Success with 3.6-flash:", response.text);
  } catch (err) {
      console.error("Error 3.6:", err.message);
  }
}
run();
