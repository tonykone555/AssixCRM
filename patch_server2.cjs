const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

const encryptionRegex = /\/\/ 1\. Encryption with AES-256-GCM[\s\S]*?function decryptToken[^{]*\{[\s\S]*?return decrypted;\n  \} catch \(e\) \{\n    console\.error\("Decryption failed:", e\);\n    return null;\n  \}\n\}/m;

const newEncryption = `// 1. Encryption with AES-256-GCM
const ENCRYPTION_KEY_B64 = process.env.MARKETPLACE_TOKEN_ENCRYPTION_KEY;
let ENCRYPTION_KEY;
if (ENCRYPTION_KEY_B64) {
    ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_B64, 'base64');
    if (ENCRYPTION_KEY.length !== 32) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error("MARKETPLACE_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.");
        }
        console.warn("MARKETPLACE_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.");
        ENCRYPTION_KEY = crypto.randomBytes(32);
    }
} else {
    if (process.env.NODE_ENV === 'production') {
        throw new Error("MARKETPLACE_TOKEN_ENCRYPTION_KEY is required in production");
    }
    ENCRYPTION_KEY = crypto.randomBytes(32); // Fallback for dev only
}

function encryptToken(text: string) {
  if (!text) return text;
  const iv = crypto.randomBytes(12); // GCM standard IV size
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return \`\${iv.toString('hex')}:\${authTag}:\${encrypted}\`;
}

function decryptToken(text: string) {
  if (!text) return text;
  try {
    const parts = text.split(':');
    if (parts.length !== 3) throw new Error("Invalid encrypted token format");
    const [ivHex, authTagHex, encryptedHex] = parts;
    if (ivHex.length !== 24 || authTagHex.length !== 32 || encryptedHex.length === 0) throw new Error("Invalid token part lengths");
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.error("Decryption failed:", e);
    throw new Error("Decryption failed");
  }
}`;

serverCode = serverCode.replace(encryptionRegex, newEncryption);
fs.writeFileSync('server.ts', serverCode);
