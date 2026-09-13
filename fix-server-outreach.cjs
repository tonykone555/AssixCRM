const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldEndpoint = `      if (imageBase64) {
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
                text: \\\`You are an expert sales outreach assistant. Look at this screenshot of a clothing brand's Instagram or website. Identify the coolest or most prominent clothing item visible (e.g., a tracksuit, hoodie, graphic tee, bag). Generate a short, casual outreach DM. 
                
It MUST follow this EXACT structure:
1. A genuine compliment about the specific item seen in a highly casual tone (e.g., "The [item] firee bro....." or "Those [item] are insane man...").
2. Followed EXACTLY by this pitch (do not change a word of the pitch): "\\\${pitch}"

Do NOT add any greetings like "Hey [Name]", and do NOT add any sign-offs. Just the compliment followed by the pitch.\\\`
              }
            ]
          }
        ];
      }`;

const newEndpoint = `      if (imageBase64) {
        let base64Data = imageBase64;
        let mimeType = 'image/jpeg';
        
        // If it's a URL (e.g. Firebase Storage), fetch it and convert to base64
        if (imageBase64.startsWith('http')) {
          const imgRes = await fetch(imageBase64);
          if (!imgRes.ok) throw new Error("Failed to fetch image from URL");
          const buffer = await imgRes.arrayBuffer();
          base64Data = Buffer.from(buffer).toString('base64');
          mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
        } else {
          base64Data = imageBase64.replace(/^data:image\\/\\w+;base64,/, "");
        }
        
        contents = [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType
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
      }`;

code = code.replace(oldEndpoint, newEndpoint);
fs.writeFileSync('server.ts', code);
