import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import crypto from 'crypto';
import express from 'express';
import * as cheerio from 'cheerio';
import { GoogleGenAI, Type } from '@google/genai';
import Tesseract from 'tesseract.js';
import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const DEFAULT_FIREBASE_CONFIG = {
  projectId: "assix-agent-tars",
  appId: "1:951229113159:web:57944fc48f8d6e11992262",
  apiKey: "AIzaSyBbFOPxVoBNFbW5-NUWCh9rZj6t75s7IGc",
  authDomain: "assix-agent-tars.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-66ee38ae-e141-4c35-b855-0c19342c0c5b",
  storageBucket: "assix-agent-tars.firebasestorage.app",
  messagingSenderId: "951229113159"
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  const PORT = 3000;

  let adminInitialized = false;
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      let serviceAccount;
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY.startsWith('{')) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      } else {
        serviceAccount = JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'utf8'));
      }
      admin.initializeApp({
        // @ts-ignore
        credential: admin.credential.cert(serviceAccount)
      });
      adminInitialized = true;
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT_KEY not set in environment. Push notifications will be disabled.");
    }
  } catch (err) {
    console.error("Failed to initialize Firebase Admin:", err);
  }


  // Initialize Firebase App & Storage on server
  let firebaseConfig: any = DEFAULT_FIREBASE_CONFIG;
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      firebaseConfig = { ...DEFAULT_FIREBASE_CONFIG, ...parsed };
    }
  } catch (err) {
    console.error('Failed to load firebase-applet-config.json on server, using fallback:', err);
  }

  const firebaseApp = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  const storage = getStorage(firebaseApp);

  // Configure multer for file uploads
  const upload = multer({
    limits: { fileSize: 150 * 1024 * 1024 },
    storage: multer.memoryStorage(),
  });

  const chunkUpload = multer({
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB chunk size limit
    storage: multer.memoryStorage(),
  });

  const tempDir = path.join(process.cwd(), 'tmp_uploads');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const mediaDir = path.join(process.cwd(), 'media_store');
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }
  app.use('/media', express.static(mediaDir));

  // In-memory session manager for chunked video uploads
  interface ChunkSession {
    uploadId: string;
    totalChunks: number;
    receivedChunks: Map<number, Buffer>;
    sanitizedName: string;
    targetPath: string;
    mimeType: string;
    createdAt: number;
  }

  const activeChunkSessions = new Map<string, ChunkSession>();

  // Periodically clean up stale sessions older than 30 mins
  setInterval(() => {
    const now = Date.now();
    for (const [id, session] of activeChunkSessions.entries()) {
      if (now - session.createdAt > 30 * 60 * 1000) {
        activeChunkSessions.delete(id);
      }
    }
  }, 10 * 60 * 1000);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  
  
  // AI Profile Extraction endpoint (with Tesseract Fallback)
  
  // AI Place Extraction & Google Maps Search helper
async function findRealGooglePlace(ai: any, queryText: string) {
  let googleMapsUrl = '';
  let reviewUrl = '';
  let placeId = '';
  let rating = '';
  let userRatingCount = '';
  let officialName = '';
  let fullAddress = '';

  const searchPrompt = `You are a real-time Google Maps and Place ID resolver engine. Search Google Maps for the actual physical business matching this query: "${queryText}".
Perform a deep search to locate the exact physical place on Google Maps and extract:
1. "officialName": Full official business title as listed on Google Maps
2. "formattedAddress": Complete real physical street address (door/house number, street name, zip code, city, country)
3. "placeId": Exact official Google Place ID string (starts with ChIJ... e.g. ChIJN1t_tDeuEmsRUsoyG83frY4)
4. "googleMapsUrl": Direct Google Maps page link (e.g. https://www.google.com/maps/place/?q=place_id:ChIJ...)
5. "writeReviewUrl": Direct 5-star write review link (e.g. https://search.google.com/local/writereview?placeid=ChIJ...)
6. "rating": Average Google rating score (e.g. 4.6)
7. "userRatingCount": Total review count on Google (e.g. 194)

Return ONLY raw JSON with these 7 keys. Ensure placeId is accurate if found.`;

  // Stage 1: Fast & accurate structured JSON direct lookup with Gemini 3.6 Flash
  try {
    const searchResponse = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: searchPrompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const rawSearchText = (searchResponse.text || '').trim();
    const searchData = JSON.parse(rawSearchText || '{}');
    googleMapsUrl = searchData.googleMapsUrl || '';
    reviewUrl = searchData.writeReviewUrl || '';
    placeId = searchData.placeId || '';
    rating = searchData.rating ? String(searchData.rating) : '';
    userRatingCount = searchData.userRatingCount ? String(searchData.userRatingCount) : '';
    officialName = searchData.officialName || '';
    fullAddress = searchData.formattedAddress || '';
  } catch (err) {
    console.warn('Direct Gemini place search failed, trying grounding fallback...', err);
  }

  // Stage 2: Grounding search fallback if placeId or formattedAddress was missing
  if (!placeId || !fullAddress || !placeId.startsWith('ChI')) {
    try {
      const searchResponse = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [{ role: 'user', parts: [{ text: searchPrompt }] }],
        tools: [{ googleSearch: {} }]
      } as any);

      const rawSearchText = (searchResponse.text || '').replace(/```json/g, '').replace(/```/g, '').trim();
      const searchData = JSON.parse(rawSearchText || '{}');
      if (searchData.placeId && searchData.placeId.startsWith('ChI')) placeId = searchData.placeId;
      if (searchData.officialName) officialName = searchData.officialName;
      if (searchData.formattedAddress) fullAddress = searchData.formattedAddress;
      if (searchData.rating) rating = String(searchData.rating);
      if (searchData.userRatingCount) userRatingCount = String(searchData.userRatingCount);
      if (searchData.googleMapsUrl) googleMapsUrl = searchData.googleMapsUrl;
      if (searchData.writeReviewUrl) reviewUrl = searchData.writeReviewUrl;
    } catch (groundingErr) {
      console.warn('Grounding search failed as well:', groundingErr);
    }
  }

  const finalStoreName = officialName || queryText;
  const finalAddress = fullAddress || queryText;
  const isValidPlaceId = typeof placeId === 'string' && placeId.trim().startsWith('ChI');
  const cleanPlaceId = isValidPlaceId ? placeId.trim() : '';

  // Ensure non-404 guaranteed review link & maps link
  if (cleanPlaceId) {
    reviewUrl = `https://search.google.com/local/writereview?placeid=${cleanPlaceId}`;
    googleMapsUrl = `https://www.google.com/maps/place/?q=place_id:${cleanPlaceId}`;
  } else {
    // Universal query fallback that NEVER 404s
    const queryParam = encodeURIComponent(`${finalStoreName} ${finalAddress}`.trim());
    reviewUrl = `https://www.google.com/maps/search/?api=1&query=${queryParam}`;
    googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${queryParam}`;
  }

  return {
    officialName: finalStoreName,
    formattedAddress: finalAddress,
    googleMapsUri: googleMapsUrl,
    reviewUrl,
    placeId: cleanPlaceId,
    rating,
    userRatingCount
  };
}

  // AI Place Extraction & Google Maps Search endpoint
  app.post('/api/extract-place', upload.single('file'), async (req: any, res: any) => {
    try {
      const apiKey = process.env.FREE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'AI API key is missing from server configuration.' });
      }
      
      let mimeType = 'image/jpeg';
      let base64Data = '';

      if (req.file) {
        mimeType = req.file.mimetype || 'image/jpeg';
        base64Data = req.file.buffer.toString('base64');
      } else if (req.body && req.body.imageBase64) {
        const raw = req.body.imageBase64;
        const match = raw.match(/^data:(image\/\w+);base64,/);
        if (match) {
          mimeType = match[1];
          base64Data = raw.replace(/^data:image\/\w+;base64,/, '');
        } else {
          base64Data = raw;
        }
      }

      if (!base64Data) {
        return res.status(400).json({ error: 'No image uploaded or provided.' });
      }
      
      // 1. Ask Gemini to extract store details
      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      const prompt = `You are a high-precision OCR and spatial analysis vision AI. Analyze this image (which could be a storefront photo, shop sign, Google Business Profile screenshot, Google Maps listing screenshot, or social profile screenshot).
Extract the following details:
1. Store Name: The official business, brand, shop name, restaurant name, or venue establishment name shown or listed.
2. Street: The complete street address, street name, building number, or door number visible (e.g., "810 Avenue de la Porte des Lilas"). Be precise with street names and numbers if present.
3. City: The city, municipality, metro area, or town (e.g., "Paris", "London").

Return a strict JSON object with EXACTLY these keys: "storeName", "street", "city". If you cannot find an exact street number, extract the business title and town. Output raw JSON only.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
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
          responseMimeType: 'application/json'
        }
      });

      let extractedData = { storeName: '', street: '', city: '' };
      try {
        const text = response.text;
        extractedData = JSON.parse(text || '{}');
      } catch (e) {
        console.error("Failed to parse Gemini output:", e);
      }

      if (!extractedData.storeName && !extractedData.street) {
        return res.json({ success: false, error: 'Could not extract a store or street name from the image.', data: extractedData });
      }

      const query = `${extractedData.storeName} ${extractedData.street} ${extractedData.city}`.trim();
      const placeData = await findRealGooglePlace(ai, query);

      if (placeData.officialName) extractedData.storeName = placeData.officialName;
      if (placeData.formattedAddress) extractedData.street = placeData.formattedAddress;

      return res.json({
        success: true,
        extracted: extractedData,
        place: {
          displayName: { text: placeData.officialName },
          formattedAddress: placeData.formattedAddress,
          websiteUri: '',
          googleMapsUri: placeData.googleMapsUri,
          reviewUrl: placeData.reviewUrl,
          placeId: placeData.placeId,
          rating: placeData.rating,
          userRatingCount: placeData.userRatingCount
        }
      });

    } catch (err: any) {
      console.error('Place extraction error:', err);
      return res.status(500).json({ error: err.message || 'Place extraction failed' });
    }
  });

  // Re-search Google Place and Write-a-Review link based on manual text edits
  app.post('/api/search-place', async (req: any, res: any) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.FREE_GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'AI API key is missing' });
      }

      const { storeName = '', street = '', city = '' } = req.body || {};
      if (!storeName && !street) {
        return res.status(400).json({ error: 'Store name or street address required.' });
      }

      const ai = new GoogleGenAI({ apiKey: apiKey });
      const queryText = `${storeName} ${street} ${city}`.trim();

      const placeData = await findRealGooglePlace(ai, queryText);

      return res.json({
        success: true,
        place: {
          displayName: { text: placeData.officialName },
          formattedAddress: placeData.formattedAddress,
          googleMapsUri: placeData.googleMapsUri,
          reviewUrl: placeData.reviewUrl,
          placeId: placeData.placeId,
          rating: placeData.rating,
          userRatingCount: placeData.userRatingCount
        }
      });
    } catch (err: any) {
      console.error('Search place error:', err);
      return res.status(500).json({ error: err.message || 'Search failed' });
    }
  });

  app.post('/api/extract-profile', upload.single('file'), async (req: any, res: any) => {
    try {
      const apiKey = process.env.FREE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'AI API key is missing from server configuration.' });
      }
      
      let mimeType = 'image/jpeg';
      let base64Data = '';

      if (req.file) {
        mimeType = req.file.mimetype || 'image/jpeg';
        base64Data = req.file.buffer.toString('base64');
      } else if (req.body && req.body.imageBase64) {
        const raw = req.body.imageBase64;
        const match = raw.match(/^data:(image\/\w+);base64,/);
        if (match) {
          mimeType = match[1];
          base64Data = raw.replace(/^data:image\/\w+;base64,/, '');
        } else {
          base64Data = raw;
        }
      }

      if (!base64Data) {
        return res.status(400).json({ error: 'No image uploaded or provided.' });
      }
      
      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      const prompt = `Analyze this social media profile screenshot (it could be Instagram, Reddit, or another platform) and extract the following information exactly according to these rules:
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
      
      Return a strict JSON object with EXACTLY these keys: "name", "handle", "website", "bio", "draftMessage".`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
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

        }
      });

      const data = JSON.parse(response.text || '{}');
      return res.json(data);
      
    } catch (err: any) {
      console.error('AI Extraction Error:', err);
      return res.status(500).json({ error: 'AI failed to process image: ' + (err.message || err) });
    }
  });

  // Reddit Lead Radar Endpoint
  app.get('/api/reddit-leads', async (req: any, res: any) => {
    try {
      const { subreddit = 'streetwearstartup' } = req.query;
      const rssUrl = `https://www.reddit.com/r/${subreddit}/new.rss`;
      const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
      
      const response = await fetch(apiUrl);
      const json = await response.json();
      
      if (!json.items) {
        return res.json({ leads: [] });
      }
      
      const leads = [];
      const seen = new Set();
      
      json.items.forEach((item) => {
        const html = item.content || '';
        
        // Match instagram
        const igMatch = html.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/i);
        const handle = igMatch ? igMatch[1].replace(/[\/'"]/g, '') : '';
        
        // Match website (excluding reddit and imgur)
        const urlRegex = /href="(https?:\/\/(?!www\.reddit\.com|reddit\.com|preview\.redd\.it|imgur\.com|i\.redd\.it)[^"]+)"/ig;
        let website = '';
        let match;
        while ((match = urlRegex.exec(html)) !== null) {
          if (!website) website = match[1];
        }
        
        // Extract thumbnail
        const imgMatch = html.match(/<img[^>]+src="([^">]+)"/i);
        const thumbnail = imgMatch ? imgMatch[1] : '';

        // If they have either IG or a website, it's a potential lead
        if (handle || website) {
          const key = handle || website;
          if (!seen.has(key)) {
             seen.add(key);
             leads.push({
               id: item.guid,
               title: item.title.replace(/&amp;/g, '&'),
               author: item.author,
               link: item.link,
               handle: handle,
               website: website,
               thumbnail: thumbnail,
               pubDate: item.pubDate
             });
          }
        }
      });
      
      res.json({ leads });
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch radar leads' });
    }
  });

  
  // AI Outreach Generator
  app.post('/api/generate-outreach', async (req: any, res: any) => {
    try {
      if (!process.env.FREE_GEMINI_API_KEY) {
        return res.status(400).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
      }
      
      const { imageBase64 } = req.body;
      const ai = new GoogleGenAI({ apiKey: process.env.FREE_GEMINI_API_KEY });
      
      let contents = [];
      const pitch = "Actually I'm a designer and I built a tool that lets customers upload a photo and see themselves wearing your pieces right on the product page. Recorded a quick 30s clip showing how it looks with your brand. Mind if I drop the video here?";
      
      if (imageBase64) {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
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
                text: `You are an expert sales outreach assistant. Look at this screenshot of a clothing brand's Instagram or website. Identify the coolest or most prominent clothing item visible (e.g., a tracksuit, hoodie, graphic tee, bag). Generate a short, casual outreach DM. 
                
It MUST follow this EXACT structure:
1. A genuine compliment about the specific item seen in a highly casual tone (e.g., "The [item] firee bro....." or "Those [item] are insane man...").
2. Followed EXACTLY by this pitch (do not change a word of the pitch): "${pitch}"

Do NOT add any greetings like "Hey [Name]", and do NOT add any sign-offs. Just the compliment followed by the pitch.`
              }
            ]
          }
        ];
      } else {
         return res.status(400).json({ error: 'Please upload a screenshot to generate a personalized message.' });
      }
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents
      });
      
      const generatedMessage = response.text || '';
      res.json({ message: generatedMessage.trim() });
    } catch(err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to generate outreach message' });
    }
  });

  app.post('/api/notify', async (req: any, res: any) => {
    try {
      if (!adminInitialized) {
        return res.status(503).json({ error: 'Push notifications are not configured on the server.' });
      }
      
      const { receiverEmail, title, body } = req.body;
      if (!receiverEmail || !title || !body) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // 1. Fetch user token from Firestore
      // @ts-ignore
      const userSnapshot = await getFirestore().collection('users').doc(receiverEmail.toLowerCase()).get();
      if (!userSnapshot.exists) {
        return res.status(404).json({ error: 'User not found in users collection' });
      }
      
      const userData = userSnapshot.data();
      const token = userData?.fcmToken;
      
      if (!token) {
        return res.status(400).json({ error: 'User does not have an FCM token registered' });
      }

      // 2. Send push notification via FCM
      const message = {
        notification: {
          title: title,
          body: body
        },
        token: token
      };

      // @ts-ignore
      const response = await require('firebase-admin/messaging').getMessaging().send(message);
      return res.json({ success: true, messageId: response });
    } catch (err: any) {
      console.error('Push notification error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  // Chunked upload endpoint (handles large video files in 2MB/4MB chunks safely)
  app.post('/api/upload-chunk', chunkUpload.single('chunk'), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No chunk file provided' });
      }

      const uploadId = req.body.uploadId;
      const chunkIndex = parseInt(req.body.chunkIndex, 10);
      const totalChunks = parseInt(req.body.totalChunks, 10);
      const rawFileName = req.body.fileName || 'video.mp4';
      const sanitizedName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const targetPath = req.body.targetPath || `uploads/${Date.now()}_${sanitizedName}`;
      const mimeType = req.body.mimeType || 'video/mp4';

      if (!uploadId || isNaN(chunkIndex) || isNaN(totalChunks)) {
        return res.status(400).json({ error: 'Missing chunk metadata' });
      }

      let session = activeChunkSessions.get(uploadId);
      if (!session) {
        session = {
          uploadId,
          totalChunks,
          receivedChunks: new Map(),
          sanitizedName,
          targetPath,
          mimeType,
          createdAt: Date.now(),
        };
        activeChunkSessions.set(uploadId, session);
      }

      session.receivedChunks.set(chunkIndex, req.file.buffer);

      // Append chunk buffer to temp file as secondary disk backup
      const tempFilePath = path.join(tempDir, `${uploadId}.tmp`);
      try {
        fs.appendFileSync(tempFilePath, req.file.buffer);
      } catch (e) {
        console.warn('Disk append warning:', e);
      }

      // If all chunks received or last chunk index processed
      if (session.receivedChunks.size === totalChunks || chunkIndex === totalChunks - 1) {
        let fullFileBuffer: Buffer;
        if (session.receivedChunks.size === totalChunks) {
          const sortedBuffers: Buffer[] = [];
          for (let i = 0; i < totalChunks; i++) {
            const buf = session.receivedChunks.get(i);
            if (buf) sortedBuffers.push(buf);
          }
          fullFileBuffer = Buffer.concat(sortedBuffers);
        } else if (fs.existsSync(tempFilePath)) {
          fullFileBuffer = fs.readFileSync(tempFilePath);
        } else {
          return res.status(400).json({ error: 'Missing chunks for full file assembly' });
        }

        const localFileName = `${Date.now()}_${sanitizedName}`;
        let downloadUrl = '';

        try {
          const storageRef = ref(storage, targetPath);
          const metadata = { contentType: mimeType };

          const snapshot = await uploadBytes(storageRef, fullFileBuffer, metadata);
          downloadUrl = await getDownloadURL(snapshot.ref);
        } catch (storageErr: any) {
          console.warn('Firebase Storage upload failed on server, using local media store fallback:', storageErr?.message || storageErr);
          try {
            const localMediaPath = path.join(mediaDir, localFileName);
            fs.writeFileSync(localMediaPath, fullFileBuffer);
            downloadUrl = `/media/${localFileName}`;
          } catch (fallbackErr: any) {
            console.error('Local media store fallback error:', fallbackErr);
            return res.status(500).json({ error: 'Failed to save uploaded video' });
          }
        } finally {
          activeChunkSessions.delete(uploadId);
          try {
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
          } catch (e) {}
        }

        return res.json({ url: downloadUrl, path: targetPath, complete: true });
      }

      return res.json({ complete: false, chunkIndex, totalChunks, received: session.receivedChunks.size });
    } catch (err: any) {
      console.error('Chunk upload handler error:', err);
      return res.status(500).json({ error: err.message || 'Chunk upload failed' });
    }
  });

  // Server-side upload endpoint (bypasses browser CORS completely)
  app.post('/api/upload', upload.single('file'), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const originalName = req.file.originalname || 'file';
      const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const targetPath = req.body.path || `uploads/${Date.now()}_${sanitizedName}`;

      const mimeType = req.file.mimetype || 'application/octet-stream';

      try {
        const storageRef = ref(storage, targetPath);
        const metadata = { contentType: mimeType };

        const snapshot = await uploadBytes(storageRef, req.file.buffer, metadata);
        const downloadUrl = await getDownloadURL(snapshot.ref);

        return res.json({ url: downloadUrl, path: targetPath });
      } catch (storageErr: any) {
        console.warn('Firebase Storage upload error on server, using fallback:', storageErr?.message || storageErr);

        // Fallback for image files: if storage upload fails, return base64 Data URL so screenshot upload NEVER breaks
        if (mimeType.startsWith('image/')) {
          const base64 = req.file.buffer.toString('base64');
          const dataUrl = `data:${mimeType};base64,${base64}`;
          return res.json({ url: dataUrl, path: targetPath });
        }

        // Fallback for video/media files
        try {
          const localFileName = `${Date.now()}_${sanitizedName}`;
          const localMediaPath = path.join(mediaDir, localFileName);
          fs.writeFileSync(localMediaPath, req.file.buffer);
          const localUrl = `/media/${localFileName}`;
          return res.json({ url: localUrl, path: targetPath });
        } catch (fallbackErr: any) {
          console.error('Local file fallback error:', fallbackErr);
          return res.status(500).json({ error: 'Failed to save uploaded file' });
        }
      }
    } catch (err: any) {
      console.error('Server upload handler error:', err);
      return res.status(500).json({ error: err.message || 'Upload failed on server' });
    }
  });

  // Server-side proxy download endpoint (forces direct attachment download on all accounts)
  app.get('/api/download', async (req: any, res: any) => {
    try {
      const fileUrl = req.query.url as string;
      if (!fileUrl) {
        return res.status(400).send('Missing url parameter');
      }

      const filename = (req.query.filename as string) || 'downloaded_file.mp4';

      // Handle local media store file download
      if (fileUrl.startsWith('/media/')) {
        const localFileName = path.basename(fileUrl);
        const localFilePath = path.join(mediaDir, localFileName);
        if (fs.existsSync(localFilePath)) {
          return res.download(localFilePath, filename);
        }
      }

      if (fileUrl.startsWith('http')) {
        const response = await fetch(fileUrl);
        if (!response.ok) {
          return res.status(response.status).send('Failed to fetch file');
        }

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', response.headers.get('content-type') || 'video/mp4');

        if (response.headers.get('content-length')) {
          res.setHeader('Content-Length', response.headers.get('content-length')!);
        }

        if (response.body) {
          // Stream chunks directly to client without buffering full video in Cloud Run memory
          // @ts-ignore
          Readable.fromWeb(response.body).pipe(res);
          return;
        } else {
          const arrayBuffer = await response.arrayBuffer();
          return res.send(Buffer.from(arrayBuffer));
        }
      }

      return res.status(404).send('File not found');
    } catch (err: any) {
      console.error('Download proxy error:', err);
      res.status(500).send(err.message || 'Download proxy error');
    }
  });

  
  
  app.post('/api/enrich-website', async (req: any, res: any) => {
    try {
      let { url } = req.body;
      if (!url) return res.status(400).json({ error: 'Missing url' });
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      
const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId)).catch(err => null);

      if (!response) {
        return res.json({ success: false, error: 'Failed to fetch website' });
      }
      
      const html = await response.text();
      
      // Basic regex extraction
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+.[a-zA-Z0-9._-]+)/gi;
      const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
      
      const emails = [...new Set((html.match(emailRegex) || []) as string[])].filter(e => !e.includes('.png') && !e.includes('.jpg') && !e.includes('wixpress'));
      
      // Find ig links
      const igRegex = /instagram\.com\/([^\/?"']+)/gi;
      let igMatches = [];
      let match;
      while ((match = igRegex.exec(html)) !== null) {
        if (match[1] && match[1] !== 'p' && match[1] !== 'reel' && match[1] !== 'explore') {
          igMatches.push(match[1]);
        }
      }
      igMatches = [...new Set(igMatches)];


      // Phone numbers (rough heuristic)
      const phonesRaw = [...new Set((html.match(phoneRegex) || []) as string[])].filter(p => p.length >= 10 && p.length <= 15);
      const phones = phonesRaw.map((p: any) => p.trim());

// Brand Name (rough heuristic from title)
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      let brandName = titleMatch ? titleMatch[1].trim() : '';
      if (brandName) {
        brandName = brandName.split(/[-|:]/)[0].trim();
      }
      
      // Fallback to domain name if title extraction fails or is too generic
      if (!brandName || brandName.toLowerCase().includes('home') || brandName.toLowerCase().includes('index')) {
        try {
          const domain = new URL(url).hostname.replace('www.', '').split('.')[0];
          if (domain) {
            brandName = domain.charAt(0).toUpperCase() + domain.slice(1);
          }
        } catch (e) {}
      }

      res.json({
        success: true,
        emails,
        instagram: igMatches,
        phones,
        brandName
      });


    } catch (err) {
      console.error(err);
      res.json({ success: false, error: 'Exception fetching website' });
    }
  });

  app.post('/api/scrape-osint', async (req: any, res: any) => {
    try {
      const { query, platform = 'Instagram', pages = 2 } = req.body;
      if (!query) return res.status(400).json({ error: 'Missing search query' });

      const leadsMap = new Map();

      for (let p = 0; p < pages; p++) {
        let currentUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
        if (p > 0) {
          currentUrl += `&b=${p * 10 + 1}`;
        }

        const response = await fetch(currentUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          }
        });
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        $('.algo').each((_, el) => {
          let url = $(el).find('a').attr('href') || '';
          const snippet = $(el).find('.compTitle').next().text() || '';
          const title = $(el).find('h3').text() || '';
          
          let actualUrl = url;
          if (url.includes('RU=')) {
             try {
               const ruParam = url.split('RU=')[1].split('/')[0];
               if (ruParam) actualUrl = decodeURIComponent(ruParam);
             } catch(e) {}
          }

          const combinedText = `${title} ${snippet} ${actualUrl}`;
          const emailMatches = combinedText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
          const emails = [...new Set(emailMatches)].map(e => e.toLowerCase());

          let handle = '';
          
          if (platform === 'Instagram') {
             const m = actualUrl.match(/instagram\.com\/([^/?]+)/);
             if (m) handle = m[1];
          } else if (platform === 'TikTok') {
             const m = actualUrl.match(/tiktok\.com\/@([^/?]+)/);
             if (m) handle = m[1];
          } else {
             try {
               const u = new URL(actualUrl.startsWith('http') ? actualUrl : `https://${actualUrl}`);
               handle = u.hostname.replace('www.', '');
             } catch(e) {
               handle = actualUrl;
             }
          }

          if (!handle) {
            const m = snippet.match(/@([a-zA-Z0-9_.]+)/);
            if (m) handle = m[1];
          }
          
          handle = handle.replace(/['"]/g, '').trim();

          if (handle && handle.length > 2 && handle !== 'instagram.com' && handle !== 'tiktok.com' && handle !== 'myshopify.com') {
             if (!leadsMap.has(handle)) {
               leadsMap.set(handle, {
                 handle,
                 name: title.replace(/\s*[-|]\s*(Instagram|TikTok|Shopify).*$/i, '').trim(),
                 emails,
                 sourceQuery: query,
                 platform,
                 profileUrl: actualUrl
               });
             } else {
               const existing = leadsMap.get(handle);
               existing.emails = [...new Set([...existing.emails, ...emails])];
             }
          }
        });
        
        if (p < pages - 1) await new Promise(r => setTimeout(r, 1500));
      }
      
      return res.json({ success: true, leads: Array.from(leadsMap.values()) });
    } catch (err: any) {
      console.error('OSINT Scraper error:', err);
      return res.status(500).json({ error: 'Scraping failed' });
    }
  });

  app.post('/api/vton/gemini', async (req: any, res: any) => {
    try {
      const { humanImage, garmImage } = req.body;
      if (!humanImage || !garmImage) {
        return res.status(400).json({ success: false, error: 'Missing images' });
      }
      
      const apiKey = process.env.GEMINI_PAID_IMAGE_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ success: false, error: 'GEMINI_PAID_IMAGE_API_KEY is missing. Please add it to your environment variables/secrets to use AI Try-On.' });
      }
      
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
      const getBase64Data = async (src: string) => {
        if (src.startsWith('data:')) {
          const mimeType = src.substring(src.indexOf(':') + 1, src.indexOf(';'));
          const data = src.split(',')[1];
          return { mimeType, data };
        } else {
          const response = await fetch(src);
          const arrayBuffer = await response.arrayBuffer();
          const mimeType = response.headers.get('content-type') || 'image/jpeg';
          const data = Buffer.from(arrayBuffer).toString('base64');
          return { mimeType, data };
        }
      };
      
      const human = await getBase64Data(humanImage);
      const garm = await getBase64Data(garmImage);
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
            { text: 'Image 1: The target model / person' },
            {
              inlineData: {
                data: human.data,
                mimeType: human.mimeType,
              }
            },
            { text: 'Image 2: The exact garment design to wear' },
            {
              inlineData: {
                data: garm.data,
                mimeType: garm.mimeType,
              }
            },
            {
              text: "Virtual Try-On Task: Generate a highly photorealistic image of the person in Image 1 wearing the EXACT garment from Image 2. CRITICAL GARMENT PRESERVATION REQUIREMENT: Replicate 100% of the exact design, artwork, graphics, logos, prints, necklines, cuts, fabric texture, and exact colors from the garment in Image 2 onto the person. Do NOT alter, simplify, replace, or omit any design detail or logo on the garment. Ensure the person's facial features, pose, identity, and body shape from Image 1 are maintained naturally with realistic fabric draping, wrinkles, and lighting. ONLY output the final combined image, nothing else."
            }
        ],
      });
      
      // Gemini 3.1 Flash Image responses come back differently than text models
      let imageUrl = null;
      if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
      }
      
      if (!imageUrl) {
        return res.status(500).json({ success: false, error: 'Gemini did not return an image inlineData part' });
      }
      
      return res.json({ success: true, imageUrl });
    } catch (err: any) {
      console.error('[VTON Error]:', err);
      res.status(500).json({ success: false, error: err.message || 'Unknown error' });
    }
  });

  // In-memory video pitch tracking telemetry store
  interface PitchStats {
    pitchId: string;
    leadId: string;
    leadName?: string;
    videoUrl?: string;
    totalViews: number;
    highestPercent: number;
    lastViewedAt: string;
    events: Array<{
      event: string;
      timestamp: string;
      watchedSeconds?: number;
      durationSeconds?: number;
      percentWatched?: number;
      device?: string;
    }>;
  }
  const PITCH_STORE_FILE = path.join(process.cwd(), 'video_pitch_store.json');
  const videoPitchStore = new Map<string, PitchStats>();

  // Load existing telemetry from disk on startup
  try {
    if (fs.existsSync(PITCH_STORE_FILE)) {
      const raw = fs.readFileSync(PITCH_STORE_FILE, 'utf-8');
      const obj = JSON.parse(raw);
      for (const [k, v] of Object.entries(obj)) {
        videoPitchStore.set(k, v as PitchStats);
      }
    }
  } catch (e) {
    console.warn('Failed to load video pitch store from disk:', e);
  }

  const savePitchStoreToDisk = () => {
    try {
      const obj = Object.fromEntries(videoPitchStore.entries());
      fs.writeFileSync(PITCH_STORE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to persist video pitch store to disk:', e);
    }
  };

  // 1. AI Call Simulator Endpoint (Real-Time Cold Call Roleplay)
  app.post('/api/call-simulate', async (req: any, res: any) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.FREE_GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'AI API key is missing' });
      }

      const {
        leadName = 'Luxe Store',
        niche = 'E-commerce',
        website = '',
        persona = 'busy_founder',
        conversationHistory = [],
        userSpeech = ''
      } = req.body || {};

      const personaPrompts: Record<string, string> = {
        busy_founder: "You are Alex, the founder of this business. You are extremely busy, direct, and slightly impatient. You don't like fluff. If the sales rep hooks your interest with real ROI or saves you time, you soften up and ask how it works. If they are generic, you interrupt or ask: 'Look, what is this regarding?'",
        skeptical_manager: "You are Jordan, the General Manager. You have heard 100 sales pitches this month and are skeptical of promises. You bring up real objections: 'We already have someone handling this', 'Our budget is locked for Q3', or 'Send me an email'. If the rep asks insightful questions, you open up.",
        budget_conscious: "You are Taylor, owner of a growing boutique. You are interested in growth but terrified of hidden fees and high retainers. You constantly ask about cost, upfront commitments, and guarantees.",
        friendly_gatekeeper: "You are Sam, the executive assistant. You are polite but strictly screen calls. You ask what company they are with, if the founder is expecting this call, and offer to take a message unless the rep gives a compelling reason."
      };

      const personaDesc = personaPrompts[persona] || personaPrompts.busy_founder;

      const historyFormatted = conversationHistory
        .map((m: any) => `${m.speaker === 'rep' ? 'Sales Rep' : 'Prospect'}: "${m.text}"`)
        .join('\n');

      const systemInstruction = `You are playing the role of a realistic business prospect on an incoming cold phone call / FaceTime Audio call.
Context:
- Your Business Name: "${leadName}"
- Industry / Niche: "${niche}"
${website ? `- Website: "${website}"` : ''}
- Your Persona: ${personaDesc}

Rules for your response:
1. Speak naturally as humans do on the phone. Keep responses SHORT: 1 to 3 spoken sentences maximum.
2. Use standard spoken contractions (e.g. "I'm", "don't", "we've", "it's"). Never use emojis, asterisks, brackets, stage directions, or markdown symbols.
3. React genuinely to what the Sales Rep just said.
4. Don't immediately cave in or say "Sure sign me up!" — provide authentic friction, realistic questions, or standard business objections.
4. Output strict JSON with:
   - "response": The exact spoken line you say to the rep.
   - "sentiment": "cold" | "neutral" | "warm" | "interested"
   - "detectedObjection": short string if any (e.g. "Too Busy", "Budget / Price", "Send Email", "Already Have Vendor", "None")
   - "coachingTip": 1 concise sentence giving the sales rep tactical advice on what to say next to overcome this response.`;

      const prompt = `Call History:
${historyFormatted || '(Call just connected: Rep begins speaking)'}

Sales Rep just said: "${userSpeech}"

Respond as the prospect now in strict JSON.`;

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { role: 'user', parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({
        success: true,
        response: parsed.response || "Yeah, what is this regarding?",
        sentiment: parsed.sentiment || "neutral",
        detectedObjection: parsed.detectedObjection || "None",
        coachingTip: parsed.coachingTip || "Acknowledge their response and ask an open qualification question."
      });
    } catch (err: any) {
      console.error('Call simulator error:', err);
      return res.status(500).json({ error: err.message || 'Call simulation failed' });
    }
  });

  // 2. AI Call Scoring & Scorecard Generation Endpoint
  app.post('/api/call-score', async (req: any, res: any) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.FREE_GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'AI API key is missing' });
      }

      const {
        leadName = 'Prospect',
        conversationHistory = [],
        durationSeconds = 60
      } = req.body || {};

      const transcript = conversationHistory
        .map((m: any) => `${m.speaker === 'rep' ? 'Sales Rep' : 'Prospect'}: ${m.text}`)
        .join('\n');

      const systemPrompt = `You are a world-class VP of Sales and Cold Outreach Coach.
Analyze the following cold call transcript with prospect "${leadName}". Duration: ${durationSeconds} seconds.

Evaluate the rep on:
1. Opening Hook (Did they earn 30 seconds or sound like a robot?)
2. Discovery & Active Listening (Did they ask questions or just pitch slap?)
3. Objection Handling (Did they isolate and reframe objections?)
4. Close / Next Steps (Did they explicitly book a meeting / demo or commit a next step?)

Return strict JSON with this exact structure:
{
  "overallScore": number (0 to 100),
  "letterGrade": "A+" | "A" | "B" | "C" | "D" | "F",
  "hookScore": number (0 to 10),
  "objectionScore": number (0 to 10),
  "closingScore": number (0 to 10),
  "callOutcome": "Meeting Booked" | "Follow-Up Scheduled" | "Soft Interest" | "Rejected / Disqualified",
  "summary": string (2-3 sentences summarizing performance),
  "strengths": string[] (2-3 items),
  "missedOpportunities": string[] (2-3 items),
  "actionableTips": string[] (3 specific tactical recommendations for next time)
}`;

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\nTranscript:\n${transcript || 'Short interaction'}` }] }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const scorecard = JSON.parse(response.text || '{}');
      return res.json({ success: true, scorecard });
    } catch (err: any) {
      console.error('Call scoring error:', err);
      return res.status(500).json({ error: err.message || 'Call scoring failed' });
    }
  });

  // 3. AI Video Pitch Copy Generator
  app.post('/api/generate-video-pitch', async (req: any, res: any) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.FREE_GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'AI API key is missing' });
      }

      const {
        leadName = 'Company',
        niche = 'Business',
        phone = '',
        instagramHandle = '',
        website = '',
        channel = 'imessage',
        watchUrl = ''
      } = req.body || {};

      const prompt = `Write a high-converting, personalized cold outreach video message for ${channel === 'imessage' ? 'Apple iMessage / SMS' : channel === 'whatsapp' ? 'WhatsApp' : 'Cold Email'}.
Prospect details:
- Name/Company: ${leadName}
- Industry: ${niche}
- Handle: ${instagramHandle ? '@' + instagramHandle : 'None'}
- Website: ${website || 'None'}
- Trackable Video Link: ${watchUrl}

Requirements:
1. Channel: ${channel}
2. Tone: Friendly, casual peer-to-peer executive tone (NOT corporate jargon, NOT pushy).
3. Mention that you recorded a custom 30-second preview / demo specifically for ${leadName}.
4. Naturally weave in the link: ${watchUrl}
5. Keep it concise (under 75 words for iMessage/WhatsApp, punchy).
6. Provide:
   - "messageText": Full text ready to send.
   - "subjectLine": (if email, otherwise short headline).
   - "hookAngle": 1 sentence describing why this angle works.

Return strict JSON.`;

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: 'application/json' }
      });

      const result = JSON.parse(response.text || '{}');
      return res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('Video pitch generator error:', err);
      return res.status(500).json({ error: err.message || 'Failed to generate video pitch' });
    }
  });

  // 4. Video Pitch View Tracking Endpoint (Telemetry & Real-time Pixel)
  app.post('/api/track-video-pitch', async (req: any, res: any) => {
    try {
      const {
        pitchId,
        leadId,
        leadName,
        videoUrl,
        event = 'open',
        watchedSeconds = 0,
        durationSeconds = 0,
        percentWatched = 0,
        device = 'Mobile'
      } = req.body || {};

      if (!pitchId) {
        return res.status(400).json({ error: 'pitchId is required' });
      }

      const existing = videoPitchStore.get(pitchId) || {
        pitchId,
        leadId: leadId || '',
        leadName: leadName || '',
        videoUrl: videoUrl || '',
        totalViews: 0,
        highestPercent: 0,
        lastViewedAt: new Date().toISOString(),
        events: []
      };

      if (event === 'open') {
        existing.totalViews += 1;
      }
      existing.lastViewedAt = new Date().toISOString();
      existing.highestPercent = Math.max(existing.highestPercent, percentWatched || 0);
      existing.events.unshift({
        event,
        timestamp: new Date().toISOString(),
        watchedSeconds,
        durationSeconds,
        percentWatched,
        device
      });

      // Keep only last 50 events
      if (existing.events.length > 50) {
        existing.events = existing.events.slice(0, 50);
      }

      videoPitchStore.set(pitchId, existing);
      savePitchStoreToDisk();

      return res.json({
        success: true,
        pitchId,
        totalViews: existing.totalViews,
        highestPercent: existing.highestPercent,
        lastViewedAt: existing.lastViewedAt
      });
    } catch (err: any) {
      console.error('Track video pitch error:', err);
      return res.status(500).json({ error: 'Failed to record tracking event' });
    }
  });

  // 5. Get Video Pitch Stats
  app.get('/api/video-pitch-stats/:pitchId', (req: any, res: any) => {
    const { pitchId } = req.params;
    const stats = videoPitchStore.get(pitchId);
    if (!stats) {
      return res.json({ success: true, stats: null });
    }
    return res.json({ success: true, stats });
  });

  // 6. Register or update video pitch details
  app.post('/api/register-video-pitch', (req: any, res: any) => {
    try {
      const { pitchId, leadId, leadName, videoUrl, phone, website } = req.body || {};
      if (!pitchId) {
        return res.status(400).json({ error: 'pitchId is required' });
      }

      const existing = videoPitchStore.get(pitchId) || {
        pitchId,
        leadId: leadId || '',
        leadName: leadName || '',
        videoUrl: videoUrl || '',
        phone: phone || '',
        website: website || '',
        totalViews: 0,
        highestPercent: 0,
        lastViewedAt: new Date().toISOString(),
        events: []
      };

      if (leadName) existing.leadName = leadName;
      if (videoUrl) existing.videoUrl = videoUrl;
      // @ts-ignore
      if (phone) existing.phone = phone;
      // @ts-ignore
      if (website) existing.website = website;

      videoPitchStore.set(pitchId, existing);
      savePitchStoreToDisk();

      return res.json({ success: true, pitchId, stats: existing });
    } catch (err: any) {
      console.error('Register pitch error:', err);
      return res.status(500).json({ error: 'Failed to register video pitch' });
    }
  });

  // Utility to convert raw PCM from Gemini TTS (24kHz, 16-bit, Mono) to WAV
  function pcmToWav(pcmData: Buffer, sampleRate: number = 24000, numChannels: number = 1): Buffer {
    const byteRate = sampleRate * numChannels * 2;
    const blockAlign = numChannels * 2;
    const dataSize = pcmData.length;
    const buffer = Buffer.alloc(44 + dataSize);
    
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size
    buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(16, 34); // BitsPerSample
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    
    pcmData.copy(buffer, 44);
    return buffer;
  }

  // 6. Generate AI Voice Note
  app.post('/api/generate-voice-note', async (req: any, res: any) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.FREE_GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'AI API key is missing' });
      }

      const { prompt, voiceName = 'Zephyr' } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Missing prompt text' });
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          // @ts-ignore
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const pcmBuffer = Buffer.from(base64Audio, 'base64');
        const wavBuffer = pcmToWav(pcmBuffer, 24000, 1);
        const finalBase64 = wavBuffer.toString('base64');
        return res.json({ success: true, audioBase64: finalBase64, mimeType: 'audio/wav' });
      } else {
        return res.status(500).json({ success: false, error: 'No audio returned by the model' });
      }
    } catch (err: any) {
      console.error('TTS Generation error:', err);
      return res.status(500).json({ error: 'Failed to generate voice note' });
    }
  });


  // Vite middleware for development vs static serve for production
  
// --- MARKETPLACE & EBAY OAUTH ---

// 1. Encryption with AES-256-GCM
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
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
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
}

// 2. Authentication Middleware
const requireMarketplaceAuth = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
     return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
     const decodedToken = await getAuth().verifyIdToken(token);
     req.user = decodedToken;
     next();
  } catch(e) {
     return res.status(401).json({ error: 'Unauthorized: Invalid Firebase token' });
  }
};

app.get('/api/ebay/auth-url', requireMarketplaceAuth, async (req: any, res: any) => {
  try {
     const ownerUid = req.user.uid;
     const clientId = process.env.EBAY_CLIENT_ID;
     const redirectUri = process.env.EBAY_REDIRECT_URI || `${process.env.APP_URL}/api/ebay/callback`;
     const env = process.env.EBAY_ENVIRONMENT || 'sandbox';
     const scope = 'https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account https://api.ebay.com/oauth/api_scope/sell.fulfillment';
     
     const authBase = env === 'production' ? 'https://auth.ebay.com/oauth2/authorize' : 'https://auth.sandbox.ebay.com/oauth2/authorize';
     
     // Short-lived, single-use, user-bound OAuth state
     const stateId = crypto.randomUUID();
     const db = getFirestore();
     await db.collection('oauthStates').doc(stateId).set({
        ownerUid,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
     });
     
     const url = `${authBase}?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scope)}&state=${stateId}`;
     
     res.json({ url });
  } catch(e) {
     res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/ebay/callback', async (req: any, res: any) => {
  const { code, state, error, error_description } = req.query;
  
  if (error) {
     return res.redirect('/?ebay_error=' + encodeURIComponent(error_description || error));
  }
  if (!code || !state) {
     return res.redirect('/?ebay_error=missing_params');
  }
  
  try {
    const db = getFirestore();
    const stateDoc = await db.collection('oauthStates').doc(state).get();
    
    if (!stateDoc.exists) {
        return res.redirect('/?ebay_error=invalid_or_expired_state');
    }
    
    const stateData = stateDoc.data();
    await stateDoc.ref.delete(); // Single use
    
    if (new Date(stateData.expiresAt) < new Date()) {
        return res.redirect('/?ebay_error=state_expired');
    }
    
    const ownerUid = stateData.ownerUid;
    const env = process.env.EBAY_ENVIRONMENT || 'sandbox';
    const tokenUrl = env === 'production' ? 'https://api.ebay.com/identity/v1/oauth2/token' : 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';
    const clientId = process.env.EBAY_CLIENT_ID || '';
    const clientSecret = process.env.EBAY_CLIENT_SECRET || '';
    const redirectUri = process.env.EBAY_REDIRECT_URI || `${process.env.APP_URL}/api/ebay/callback`;
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: redirectUri
      })
    });
    
    const data = await response.json();
    if (data.error) {
      console.error("eBay Token Error:", data);
      return res.redirect('/?ebay_error=' + encodeURIComponent(data.error_description || data.error));
    }
    
    const refreshToken = data.refresh_token;
    if (!refreshToken) {
       return res.redirect('/?ebay_error=no_refresh_token_returned');
    }
    
    const encryptedToken = encryptToken(refreshToken);
    const connectionsRef = db.collection('marketplaceConnections');
    const existing = await connectionsRef.where('ownerUid', '==', ownerUid).where('provider', '==', 'ebay').get();
    
    const connectionData = {
      ownerUid: ownerUid,
      provider: 'ebay',
      environment: env,
      externalAccountId: 'ebay_user',
      displayName: 'eBay Account',
      encryptedRefreshToken: encryptedToken,
      grantedScopes: data.scope ? data.scope.split(' ') : [],
      connectionStatus: 'connected',
      connectedAt: new Date().toISOString(),
      refreshedAt: new Date().toISOString()
    };
    
    if (existing.empty) {
       await connectionsRef.add(connectionData);
    } else {
       await existing.docs[0].ref.update(connectionData);
    }
    
    res.redirect('/?ebay_success=true');
  } catch(e) {
    console.error(e);
    res.redirect('/?ebay_error=server_error');
  }
});

// --- EBAY LISTING & SYNC ---

async function publishToEbay(ownerUid: string, inventoryItemId: string, price: number) {
     const db = getFirestore();
     const inventoryDoc = await db.collection('inventoryItems').doc(inventoryItemId).get();
     
     if (!inventoryDoc.exists || inventoryDoc.data()?.ownerUid !== ownerUid) {
        throw new Error('Forbidden or not found');
     }
     
     if (!inventoryDoc.data()?.ownershipConfirmed) {
        throw new Error('Publish blocked: ownershipConfirmed must be true.');
     }
     if (!inventoryDoc.data()?.userOwnedImages || inventoryDoc.data()?.userOwnedImages.length === 0) {
        throw new Error('Publish blocked: userOwnedImages must be present.');
     }
     if (!inventoryDoc.data()?.condition) {
        throw new Error('Publish blocked: condition must be provided.');
     }
     if (price <= 0) {
        throw new Error('Publish blocked: Price must be strictly positive.');
     }
     
     const connections = await db.collection('marketplaceConnections').where('ownerUid', '==', ownerUid).where('provider', '==', 'ebay').get();
     if (connections.empty) throw new Error('No eBay connection found');
     
     const conn = connections.docs[0].data();
     const refreshToken = decryptToken(conn.encryptedRefreshToken);
     const env = conn.environment || 'sandbox'; // use connection env, not process.env
     const tokenUrl = env === 'production' ? 'https://api.ebay.com/identity/v1/oauth2/token' : 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';
     const authHeader = Buffer.from(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`).toString('base64');
     
     if (!process.env.EBAY_CLIENT_ID || !refreshToken) {
         throw new Error('Missing eBay credentials or refresh token');
     }
     
     const tokenRes = await fetch(tokenUrl, {
       method: 'POST',
       headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${authHeader}` },
       body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, scope: 'https://api.ebay.com/oauth/api_scope/sell.inventory' })
     });
     
     const tokenData = await tokenRes.json();
     if (!tokenData.access_token) {
        throw new Error('eBay token refresh failed: ' + JSON.stringify(tokenData));
     }
     const accessToken = tokenData.access_token;
     
     const baseUrl = env === 'production' ? 'https://api.ebay.com/sell/inventory/v1' : 'https://api.sandbox.ebay.com/sell/inventory/v1';
     const sku = inventoryDoc.data()?.internalSku || `SKU-${inventoryItemId}`;
     
     // Required aspects check
     // (In a real production app, we would fetch taxonomy requirements. We simulate the HTTP validation structure here).
     
     const putRes = await fetch(`${baseUrl}/inventory_item/${sku}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Language': 'en-US', 'Content-Type': 'application/json' },
        body: JSON.stringify({
           product: { title: inventoryDoc.data()?.title, description: inventoryDoc.data()?.description, aspects: inventoryDoc.data()?.attributes || {}, imageUrls: inventoryDoc.data()?.userOwnedImages },
           condition: inventoryDoc.data()?.condition, availability: { shipToLocationAvailability: { quantity: 1 } }
        })
     });
     
     if (!putRes.ok) {
         const putErr = await putRes.text();
         throw new Error('eBay PUT inventory failed: ' + putErr);
     }
     
     const offerRes = await fetch(`${baseUrl}/offer`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Language': 'en-US', 'Content-Type': 'application/json' },
        body: JSON.stringify({
           sku: sku, marketplaceId: "EBAY_US", format: "FIXED_PRICE",
           pricingSummary: { price: { value: price.toString(), currency: "USD" } },
           availableQuantity: 1, listingPolicies: { fulfillmentPolicyId: conn.fulfillmentPolicyId, paymentPolicyId: conn.paymentPolicyId, returnPolicyId: conn.returnPolicyId },
           categoryId: inventoryDoc.data()?.category || "UNKNOWN",
           merchantLocationKey: conn.merchantLocationKey
        })
     });
     
     const offerData = await offerRes.json();
     if (!offerRes.ok || !offerData.offerId) {
        throw new Error('eBay POST offer failed: ' + JSON.stringify(offerData));
     }
     
     const publishRes = await fetch(`${baseUrl}/offer/${offerData.offerId}/publish`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Language': 'en-US', 'Content-Type': 'application/json' }
     });
     
     const publishData = await publishRes.json();
     if (!publishRes.ok || !publishData.listingId) {
        throw new Error('eBay publish offer failed: ' + JSON.stringify(publishData));
     }
     
     // Save idempotency and listing locally
     await db.collection('marketplaceListings').add({
        ownerUid,
        inventoryItemId,
        marketplace: 'ebay',
        internalSku: sku,
        externalOfferId: offerData.offerId,
        externalListingId: publishData.listingId,
        title: inventoryDoc.data()?.title || '',
        price: price,
        currency: 'USD',
        quantity: 1,
        listingStatus: 'active',
        lastSyncedAt: new Date().toISOString()
     });
     
     await db.collection('marketplaceAuditEvents').add({
        ownerUid,
        actorType: 'user',
        actorUid: ownerUid,
        source: 'assixcrm_ui',
        action: 'publish_listing',
        targetType: 'inventoryItem',
        targetId: inventoryItemId,
        requestSummary: 'Publish to eBay',
        resultSummary: 'Published via eBay API',
        status: 'success',
        createdAt: new Date().toISOString()
     });
     
     return publishData.listingId;
}

app.post('/api/ebay/publish', requireMarketplaceAuth, async (req: any, res: any) => {
  try {
     const listingId = await publishToEbay(req.user.uid, req.body.inventoryItemId, req.body.price);
     res.json({ success: true, listingId });
  } catch(e) {
     const db = getFirestore();
     await db.collection('marketplaceAuditEvents').add({
        ownerUid: req.user.uid, actorType: 'user', actorUid: req.user.uid, source: 'assixcrm_ui', action: 'publish_listing', targetType: 'inventoryItem', targetId: req.body.inventoryItemId,
        requestSummary: 'Publish to eBay', resultSummary: 'Failed: ' + (e as any).toString(), status: 'failure', createdAt: new Date().toISOString()
     });
     res.status(500).json({ error: (e as any).toString() });
  }
});
app.post('/api/ebay/sync-cron', async (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized CRON' });
    }
    
    const db = getFirestore();
    const connections = await db.collection('marketplaceConnections').where('provider', '==', 'ebay').where('connectionStatus', '==', 'connected').get();
    let synced = 0;
    
    for (const connDoc of connections.docs) {
        try {
           const conn = connDoc.data();
           const ownerUid = conn.ownerUid;
           const refreshToken = decryptToken(conn.encryptedRefreshToken);
           const env = conn.environment || 'sandbox';
           const tokenUrl = env === 'production' ? 'https://api.ebay.com/identity/v1/oauth2/token' : 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';
           const authHeaderStr = Buffer.from(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`).toString('base64');
           
           if (!process.env.EBAY_CLIENT_ID || !refreshToken) continue;
           
           const tokenRes = await fetch(tokenUrl, {
             method: 'POST',
             headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `Basic ${authHeaderStr}` },
             body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, scope: 'https://api.ebay.com/oauth/api_scope/sell.fulfillment https://api.ebay.com/oauth/api_scope/sell.inventory' })
           });
           
           const tokenData = await tokenRes.json();
           if (!tokenData.access_token) continue;
           const accessToken = tokenData.access_token;
           
           const baseUrl = env === 'production' ? 'https://api.ebay.com/sell/fulfillment/v1' : 'https://api.sandbox.ebay.com/sell/fulfillment/v1';
           
           const ordersRes = await fetch(`${baseUrl}/order?filter=creationdate:[${new Date(Date.now() - 24*60*60*1000).toISOString()}..]`, {
               headers: { 'Authorization': `Bearer ${accessToken}` }
           });
           
           if (!ordersRes.ok) continue;
           const ordersData = await ordersRes.json();
           
           for (const order of ordersData.orders || []) {
               const orderRef = db.collection('orders').doc(order.orderId);
               await orderRef.set({
                   ownerUid,
                   marketplace: 'ebay',
                   externalOrderId: order.orderId,
                   fulfillmentStatus: order.orderFulfillmentStatus,
                   orderedAt: order.creationDate,
                   lastSyncedAt: new Date().toISOString()
               }, { merge: true });
               synced++;
           }
        } catch (e) {
            console.error('Error syncing connection', connDoc.id, e);
        }
    }
    
    res.json({ success: true, synced });
});
// --- END EBAY LISTING ---

// --- MCP PROTOCOL HTTP ENDPOINT ---




const mcpSessions = new Map<string, { transport: SSEServerTransport, server: Server, ownerUid: string }>();

app.get('/mcp/sse', requireMarketplaceAuth, async (req: any, res: any) => {
    const ownerUid = req.user.uid;
    const sessionId = crypto.randomUUID();
    
    // The SSE transport will append ?sessionId=... to the endpoint URL it gives the client
    const transport = new SSEServerTransport('/mcp/messages?sessionId=' + sessionId, res);
    
    const server = new Server(
      { name: "AssixCRM", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );
    
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [
                 {
                    name: 'save_arbitrage_opportunity',
                    description: 'Saves a new arbitrage opportunity discovered by the AI.',
                    inputSchema: {
                       type: 'object',
                       properties: {
                          sourceMarketplace: { type: 'string' },
                          sourceUrl: { type: 'string' },
                          sourcePrice: { type: 'number' },
                          expectedNetProfit: { type: 'number' }
                       },
                       required: ['sourceMarketplace', 'sourceUrl', 'sourcePrice', 'expectedNetProfit']
                    }
                 },
                 {
                    name: 'list_inventory',
                    description: 'Lists the user\'s owned inventory.',
                    inputSchema: { type: 'object', properties: {} }
                 },
                 {
                    name: 'approve_and_publish_ebay_listing',
                    description: 'Approves an owned inventory item for eBay publication.',
                    inputSchema: {
                       type: 'object',
                       properties: {
                          inventoryItemId: { type: 'string' }
                       },
                       required: ['inventoryItemId']
                    }
                 }
            ]
        };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        const db = getFirestore();
        
        if (name === 'save_arbitrage_opportunity') {
           const { sourceMarketplace, sourceUrl, sourcePrice, expectedNetProfit } = args as any;
           const newDoc = await db.collection('arbitrageOpportunities').add({
              ownerUid,
              sourceMarketplace,
              sourceUrl,
              sourcePrice,
              expectedNetProfit,
              status: 'discovered',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
           });
           
           await db.collection('marketplaceAuditEvents').add({
               ownerUid,
               actorType: 'mcp',
               actorUid: ownerUid,
               source: 'chatgpt',
               action: 'save_arbitrage_opportunity',
               targetType: 'arbitrageOpportunity',
               targetId: newDoc.id,
               requestSummary: 'Save opportunity',
               resultSummary: 'Created',
               status: 'success',
               createdAt: new Date().toISOString()
           });
           return { content: [{ type: 'text', text: JSON.stringify({ success: true, id: newDoc.id }) }] };
        }
        
        if (name === 'list_inventory') {
           const snapshot = await db.collection('inventoryItems').where('ownerUid', '==', ownerUid).get();
           const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
           return { content: [{ type: 'text', text: JSON.stringify({ success: true, items }) }] };
        }
        
        if (name === 'approve_and_publish_ebay_listing') {
           const { inventoryItemId } = args as any;
           const inventoryDoc = await db.collection('inventoryItems').doc(inventoryItemId).get();
           
           if (!inventoryDoc.exists || inventoryDoc.data()?.ownerUid !== ownerUid) {
              throw new Error('Forbidden');
           }
           if (!inventoryDoc.data()?.ownershipConfirmed) {
              throw new Error('Publish blocked: ownershipConfirmed must be true.');
           }
           
           const listingId = await publishToEbay(ownerUid, inventoryItemId, args.price || 0);
           return { content: [{ type: 'text', text: JSON.stringify({ success: true, listingId }) }] };
        }
        
        throw new Error('Unknown tool');
    });

    mcpSessions.set(sessionId, { transport, server, ownerUid });
    await server.connect(transport);
});

app.post('/mcp/messages', async (req: any, res: any) => {
    // Note: in a real implementation, the client sends ?sessionId=...
    const sessionId = req.query.sessionId;
    const session = mcpSessions.get(sessionId as string);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    // We don't need requireMarketplaceAuth here if we rely on the unguessable sessionId, 
    // but we can enforce it.
    await session.transport.handlePostMessage(req, res);
});
// --- END MCP ENDPOINT ---


// --- END MARKETPLACE ---

if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
