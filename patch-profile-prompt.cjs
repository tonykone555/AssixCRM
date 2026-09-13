const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldPromptBlock = `      const prompt = \`Analyze this social media profile screenshot (it could be Instagram, Reddit, or another platform) and extract the following information exactly according to these rules:
      1. Handle/Username: 
         - If Instagram: The username is located in the top left corner. Extract it and YOU MUST PUT AN "@" symbol in front (e.g., "@taliriii").
         - If Reddit: The username usually starts with "u/" (e.g., "u/username"). Extract it exactly as "u/username".
         - If other: Extract the main username/handle and prefix with "@".
      2. Name: The display name or brand name.
      3. Website: The URL located in the bio/about section. You MUST extract just the raw URL without any symbols, emojis, or link icons in front (e.g., "www.taliri.fr"). If there is no website, return an empty string.
      4. Bio/Notes: A brief summary of what they do based on the text in their bio or about section.
      Return a strict JSON object with EXACTLY these keys: "name", "handle", "website", "bio".\`;`;

const newPromptBlock = `      const prompt = \`Analyze this social media profile screenshot (it could be Instagram, Reddit, or another platform) and extract the following information exactly according to these rules:
      1. Handle/Username: 
         - If Instagram: The username is located in the top left corner. Extract it and YOU MUST PUT AN "@" symbol in front (e.g., "@taliriii").
         - If Reddit: The username usually starts with "u/" (e.g., "u/username"). Extract it exactly as "u/username".
         - If other: Extract the main username/handle and prefix with "@".
      2. Name: The display name or brand name.
      3. Website: The URL located in the bio/about section. You MUST extract just the raw URL without any symbols, emojis, or link icons in front (e.g., "www.taliri.fr"). If there is no website, return an empty string.
      4. Bio/Notes: A brief summary of what they do based on the text in their bio or about section.
      5. Draft Message: Write a short, personalized outreach DM draft for this lead based on their profile. 
         - CRITICAL: Do NOT just say "fire" or "bro". Mix up the vocabulary (e.g., use words like "aesthetic", "stellar", "impeccable", "unique", "clean", "vibe").
         - ALWAYS start the message with a specific compliment based on something you can actually see in their profile, bio, or the images shown on their page. 
         - Keep it authentic, professional but casual, and transition smoothly into a general outreach pitch (e.g. asking to collaborate, showcasing a relevant tool, or making a connection).
      
      Return a strict JSON object with EXACTLY these keys: "name", "handle", "website", "bio", "draftMessage".\`;`;

if (code.includes(oldPromptBlock)) {
    code = code.replace(oldPromptBlock, newPromptBlock);
    fs.writeFileSync('server.ts', code);
    console.log("Successfully patched profile prompt!");
} else {
    console.log("Could not find the exact old prompt block to replace.");
}
