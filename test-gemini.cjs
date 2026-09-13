const { GoogleGenAI, Type } = require('@google/genai');

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.FREE_GEMINI_API_KEY });
  console.log("Key starts with:", process.env.FREE_GEMINI_API_KEY.substring(0, 5));
  
  try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [ { text: "Hello" } ] }
        ]
      });
      console.log("Success:", response.text);
  } catch (err) {
      console.error("Error:", err.message);
  }
}
run();
