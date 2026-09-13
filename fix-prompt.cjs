const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldPromptBlock = `      const prompt = \`Analyze this social media (e.g. Instagram) profile screenshot and extract the following information. Be very precise:
      1. Name: The full display name of the brand or person. If not present, use the handle.
      2. Instagram Handle: The username is usually found at the very top left. It might have a back arrow next to it (e.g., "< taliriii"). Extract JUST the raw username (e.g., "taliriii"). Do NOT include the "<" arrow, spaces, or the "@" symbol.
      3. Website: Look for any domain name or URL in the bio section (e.g. 'mybrand.com', 'linktr.ee/...'). It often has emojis in front of it (like ⛓️ or 💥). Strip ALL emojis, prefixes, and text. Return ONLY the clean URL.
      4. Bio/Notes: A brief summary of what they do based on the text in their bio.
      Return a strict JSON object with EXACTLY these keys: "name", "handle", "website", "bio".\`;`;

const newPromptBlock = `      const prompt = \`Analyze this Instagram profile screenshot and extract the following information exactly according to these rules:
      1. Instagram Handle: The username is located in the top left corner (often next to a back arrow or checkmark). Extract this username and YOU MUST PUT AN "@" symbol in front of it (e.g., "@taliriii").
      2. Name: The brand name located next to the round profile picture circle (e.g., "TALIRI" or "Nkdtouch").
      3. Website: The URL located underneath the bio section (often with a link icon). You MUST extract just the raw URL without any symbols, emojis, or link icons in front (e.g., "www.taliri.fr" or "nkdtouch.net").
      4. Bio/Notes: A brief summary of what they do based on the text in their bio.
      Return a strict JSON object with EXACTLY these keys: "name", "handle", "website", "bio".\`;`;

code = code.replace(oldPromptBlock, newPromptBlock);

// Also fix the model name to gemini-3.1-flash
code = code.replace("model: 'gemini-3.6-flash'", "model: 'gemini-3.1-flash'");

fs.writeFileSync('server.ts', code);
