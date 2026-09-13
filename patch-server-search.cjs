const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const startIdx = code.indexOf('      // 2. Fallback to free Overpass API (OpenStreetMap) search');
const endIdx = code.indexOf('      return res.json({\n        success: true,', startIdx);

if (startIdx > -1 && endIdx > -1) {
    const replacement = `      // 2. Use Gemini with Google Search Grounding to find the real Google Maps link
      let googleMapsUrl = '';
      try {
        const searchPrompt = \`Find the official Google Maps URL for the business named "\${extractedData.storeName}" located in or near "\${extractedData.city}, \${extractedData.street}". Return a strict JSON object with EXACTLY one key: "googleMapsUrl". The value should be the full https:// link to their Google Maps place or review page. If you absolutely cannot find it, return an empty string.\`;
        
        const searchResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash',
          contents: [{ role: 'user', parts: [{ text: searchPrompt }] }],
          tools: [{ googleSearch: {} }],
          config: {
            responseMimeType: 'application/json',
          }
        });
        
        const searchData = JSON.parse(searchResponse.text || '{}');
        googleMapsUrl = searchData.googleMapsUrl || '';
      } catch (searchErr) {
        console.error('Gemini search failed:', searchErr);
      }

      // If Gemini couldn't find a direct link, fallback to a standard Maps search query URL
      if (!googleMapsUrl) {
         const query = encodeURIComponent(\`\${extractedData.storeName} \${extractedData.street} \${extractedData.city}\`.trim());
         googleMapsUrl = \`https://www.google.com/maps/search/?api=1&query=\${query}\`;
      }

      const place = {
        displayName: { text: extractedData.storeName },
        formattedAddress: \`\${extractedData.street} \${extractedData.city}\`.trim(),
        websiteUri: '',
        googleMapsUri: googleMapsUrl
      };

`;

    code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
    fs.writeFileSync('server.ts', code);
}
