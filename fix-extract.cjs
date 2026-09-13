const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldPrompt = `          const prompt = \`Extract the following information from this Instagram (or other social media) profile screenshot:
          1. Name (the full name displayed, not the handle. If not present, use the handle).
          2. Instagram handle (the username at the very top, WITHOUT the @ symbol).
          3. Website (the link in bio, if any. Look for domain names).
          4. Bio/Notes (a brief summary of their bio text).
          Return a JSON object.\`;`;

const newPrompt = `          const prompt = \`Analyze this social media (e.g. Instagram) profile screenshot and extract the following information. Be very precise:
          1. Name: The full display name of the brand or person. If not present, use the handle.
          2. Instagram Handle: The username usually found at the very top or next to the profile picture. Return ONLY the text, WITHOUT the '@' symbol.
          3. Website: Look for any domain name or URL in the bio section (e.g. 'mybrand.com', 'linktr.ee/...'). Return the full URL if present.
          4. Bio/Notes: A brief summary of what they do based on the text in their bio.
          Return a strict JSON object with EXACTLY these keys: "name", "handle", "website", "bio".\`;`;

code = code.replace(oldPrompt, newPrompt);
fs.writeFileSync('server.ts', code);
