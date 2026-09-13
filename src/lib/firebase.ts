import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  getDocsFromCache,
  deleteDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  getCountFromServer
} from 'firebase/firestore';
import { Lead, CustomFieldDefinition, ChatMessage } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with long-polling fallback, multi-tab persistent offline cache, and databaseId from config
export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  },
  firebaseConfig.firestoreDatabaseId || '(default)'
);

export const storage = getStorage(app);

export const SUPER_ADMIN_EMAIL = 'tonykone21@gmail.com';

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}

// Authentication Helpers
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  if (result.user) {
    await setDoc(
      doc(db, 'users', result.user.uid),
      {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName || 'Google User',
        role: isSuperAdminEmail(result.user.email) ? 'admin' : 'user',
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  }
  return result.user;
}

export async function signInGuest() {
  const result = await firebaseSignInAnonymously(auth);
  return result.user;
}

export async function signUpWithEmail(email: string, pass: string, name: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  if (cred.user) {
    await updateProfile(cred.user, { displayName: name });
    // Save user doc
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: name,
      role: isSuperAdminEmail(cred.user.email) ? 'admin' : 'user',
      createdAt: new Date().toISOString()
    });
  }
  return cred.user;
}

export async function signInWithEmail(email: string, pass: string) {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  return cred.user;
}

export async function signOutUser() {
  await firebaseSignOut(auth);
}

export async function removeUserAccess(uid: string) {
  try {
    await setDoc(
      doc(db, 'users', uid),
      { accessRevoked: true, role: 'revoked' },
      { merge: true }
    );
  } catch (err) {
    console.error('Failed to revoke user access:', err);
    throw err;
  }
}

export function subscribeToAuth(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (user && user.email) {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists() && userDoc.data().accessRevoked) {
          // If the user's access has been revoked, log them out immediately
          await firebaseSignOut(auth);
          callback(null);
          return;
        }

        await setDoc(
          userDocRef,
          {
            uid: user.uid,
            email: user.email.toLowerCase(),
            displayName: user.displayName || user.email.split('@')[0],
            role: isSuperAdminEmail(user.email) ? 'admin' : 'user',
            lastLoginAt: new Date().toISOString()
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Failed to auto-upsert user document:', e);
      }
    }
    callback(user);
  });
}

export function getCachedLeads(): Lead[] {
  try {
    const cached = localStorage.getItem('crm_cached_leads');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading cached leads:', e);
  }
  return [];
}

// Firestore Lead Management
export function subscribeToLeads(
  userUid: string,
  userEmail: string,
  onUpdate: (leads: Lead[]) => void,
  onError?: (err: any) => void
) {
  const leadsRef = collection(db, 'leads');
  const isSuperAdmin = isSuperAdminEmail(userEmail);
  
  let q;
  if (isSuperAdmin) {
    // Super admin queries all leads to ensure pipeline column counts and tags are perfectly accurate.
    q = query(leadsRef);
  } else {
    // Sub-accounts ONLY query their own assigned leads! This prevents them from downloading the whole database, saving massive quota.
    q = query(
      leadsRef,
      where('assignedAccountEmails', 'array-contains', userEmail.toLowerCase())
    );
  }

  const loadCachedLeads = () => {
    try {
      const cached = localStorage.getItem('crm_cached_leads');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onUpdate(parsed);
          return true;
        }
      }
    } catch (e) {
      console.warn('Error reading cached leads:', e);
    }
    return false;
  };

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Lead[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as any;
        // Fix for legacy imported leads from old scraper
        if (!data.instagramHandle && data.handle) {
          data.instagramHandle = data.handle;
          data.website = data.profileUrl || data.website || null;
        }
        items.push(data as Lead);
      });
      items.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      
      try {
        localStorage.setItem('crm_cached_leads', JSON.stringify(items));
      } catch (e) {
        console.warn('Could not cache leads to localStorage:', e);
      }
      onUpdate(items);
    },
    async (err) => {
      console.warn('Firestore leads subscription error (attempting IndexedDB cache recovery):', err?.message || err);
      try {
        const cacheSnapshot = await getDocsFromCache(q);
        if (!cacheSnapshot.empty) {
          const items: Lead[] = [];
          cacheSnapshot.forEach((doc) => {
            const data = doc.data() as any;
            if (!data.instagramHandle && data.handle) {
              data.instagramHandle = data.handle;
              data.website = data.profileUrl || data.website || null;
            }
            items.push(data as Lead);
          });
          items.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
          try {
            localStorage.setItem('crm_cached_leads', JSON.stringify(items));
          } catch (e) {}
          onUpdate(items);
          if (onError) onError(err);
          return;
        }
      } catch (cacheErr) {
        console.warn('Could not read from Firestore IndexedDB cache:', cacheErr);
      }
      loadCachedLeads();
      if (onError) onError(err);
    }
  );
}

export async function saveLeadToFirestore(lead: Lead, userUid: string, userEmail: string) {
  // Always update local cache first for instant offline sync
  try {
    const cachedStr = localStorage.getItem('crm_cached_leads');
    let cachedList: Lead[] = cachedStr ? JSON.parse(cachedStr) : [];
    const index = cachedList.findIndex(l => l.id === lead.id);
    const updatedLeadItem = { ...lead, updatedAt: new Date().toISOString() };
    if (index >= 0) {
      cachedList[index] = { ...cachedList[index], ...updatedLeadItem };
    } else {
      cachedList.unshift(updatedLeadItem);
    }
    localStorage.setItem('crm_cached_leads', JSON.stringify(cachedList));
  } catch (e) {
    console.warn('Failed to update local cache for lead:', e);
  }

  const leadDocRef = doc(db, 'leads', lead.id);
  
  // Sanitize screenshots to ensure total payload stays under Firestore 1MB limit
  let sanitizedScreenshots: string[] = Array.isArray(lead.screenshots) ? [...lead.screenshots] : [];
  sanitizedScreenshots = sanitizedScreenshots.map(img => {
    if (typeof img === 'string' && img.length > 400000) {
      return img.substring(0, 400000);
    }
    return img;
  });

  const dataToSave: any = {
    ...lead,
    screenshots: sanitizedScreenshots,
    ownerId: lead.ownerId || userUid,
    ownerEmail: lead.ownerEmail || userEmail,
    assignedAccountEmails: lead.assignedAccountEmails || [lead.ownerEmail || userEmail],
    updatedAt: new Date().toISOString()
  };
  
  // Remove undefined values to prevent Firestore errors
  Object.keys(dataToSave).forEach(key => dataToSave[key] === undefined && delete dataToSave[key]);

  try {
    await setDoc(leadDocRef, dataToSave, { merge: true });
  } catch (err: any) {
    console.warn(`Initial setDoc failed for lead ${lead.id}, attempting fallback without heavy screenshots:`, err?.message || err);
    try {
      const fallbackData = { ...dataToSave, screenshots: [] };
      await setDoc(leadDocRef, fallbackData, { merge: true });
    } catch (fallbackErr) {
      console.warn(`Firestore setDoc unavailable (saved locally in cache):`, fallbackErr);
    }
  }
}

export async function deleteLeadFromFirestore(leadId: string) {
  try {
    const cachedStr = localStorage.getItem('crm_cached_leads');
    if (cachedStr) {
      let cachedList: Lead[] = JSON.parse(cachedStr);
      cachedList = cachedList.filter(l => l.id !== leadId);
      localStorage.setItem('crm_cached_leads', JSON.stringify(cachedList));
    }
  } catch (e) {}

  try {
    const leadDocRef = doc(db, 'leads', leadId);
    await deleteDoc(leadDocRef);
  } catch (err) {
    console.warn('Firestore deleteDoc error (removed from local cache):', err);
  }
}

export function getCachedCustomFields(): CustomFieldDefinition[] {
  try {
    const cached = localStorage.getItem('crm_cached_custom_fields');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

// Firestore Custom Fields Management
export function subscribeToCustomFields(
  userUid: string,
  userEmail: string,
  onUpdate: (fields: CustomFieldDefinition[]) => void
) {
  const fieldsRef = collection(db, 'customFields');
  const q = query(fieldsRef);

  const loadCachedFields = () => {
    try {
      const cached = localStorage.getItem('crm_cached_custom_fields');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onUpdate(parsed);
          return true;
        }
      }
    } catch (e) {}
    return false;
  };

  return onSnapshot(
    q,
    (snapshot) => {
      const items: CustomFieldDefinition[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as CustomFieldDefinition);
      });
      try {
        localStorage.setItem('crm_cached_custom_fields', JSON.stringify(items));
      } catch (e) {}
      onUpdate(items);
    },
    (err) => {
      console.warn('Firestore customFields subscription error (falling back to cache):', err?.message || err);
      loadCachedFields();
    }
  );
}

export async function saveCustomFieldToFirestore(
  field: CustomFieldDefinition,
  userUid: string,
  userEmail: string
) {
  try {
    const cachedStr = localStorage.getItem('crm_cached_custom_fields');
    let cachedList: CustomFieldDefinition[] = cachedStr ? JSON.parse(cachedStr) : [];
    const idx = cachedList.findIndex(f => f.id === field.id);
    if (idx >= 0) cachedList[idx] = field;
    else cachedList.push(field);
    localStorage.setItem('crm_cached_custom_fields', JSON.stringify(cachedList));
  } catch (e) {}

  try {
    const fieldDocRef = doc(db, 'customFields', field.id);
    await setDoc(
      fieldDocRef,
      {
        ...field,
        ownerId: field.ownerId || userUid,
        ownerEmail: field.ownerEmail || userEmail
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firestore saveCustomField error (saved in local cache):', err);
  }
}

export async function deleteCustomFieldFromFirestore(fieldId: string) {
  try {
    const cachedStr = localStorage.getItem('crm_cached_custom_fields');
    if (cachedStr) {
      let cachedList: CustomFieldDefinition[] = JSON.parse(cachedStr);
      cachedList = cachedList.filter(f => f.id !== fieldId);
      localStorage.setItem('crm_cached_custom_fields', JSON.stringify(cachedList));
    }
  } catch (e) {}

  try {
    const fieldDocRef = doc(db, 'customFields', fieldId);
    await deleteDoc(fieldDocRef);
  } catch (err) {
    console.warn('Firestore deleteCustomField error:', err);
  }
}

export function getCachedUsers(): any[] {
  try {
    const cached = localStorage.getItem('crm_cached_users');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

// Firestore Users Directory Subscription
export function subscribeToAllUsers(onUpdate: (users: any[]) => void) {
  const usersRef = collection(db, 'users');

  const loadCachedUsers = () => {
    try {
      const cached = localStorage.getItem('crm_cached_users');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onUpdate(parsed);
          return true;
        }
      }
    } catch (e) {}
    return false;
  };

  return onSnapshot(
    usersRef,
    (snapshot) => {
      const usersList: any[] = [];
      snapshot.forEach((doc) => {
        usersList.push(doc.data());
      });
      try {
        localStorage.setItem('crm_cached_users', JSON.stringify(usersList));
      } catch (e) {}
      onUpdate(usersList);
    },
    (err) => {
      console.warn('Firestore users subscription error (falling back to cache):', err?.message || err);
      loadCachedUsers();
    }
  );
}

export function getCachedMessages(): ChatMessage[] {
  try {
    const cached = localStorage.getItem('crm_cached_messages');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

// Chat Messages Subscription
export function subscribeToMessages(
  userEmail: string,
  onUpdate: (messages: ChatMessage[]) => void
) {
  const normalizedEmail = userEmail.toLowerCase();
  const isSuperAdmin = isSuperAdminEmail(normalizedEmail);
  const messagesRef = collection(db, 'messages');

  const loadCachedMessages = () => {
    try {
      const cached = localStorage.getItem('crm_cached_messages');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          onUpdate(parsed);
          return true;
        }
      }
    } catch (e) {}
    return false;
  };

  const q = isSuperAdmin 
    ? query(messagesRef) 
    : query(messagesRef, where('senderEmail', '==', normalizedEmail));
    
  const q2 = isSuperAdmin
    ? null
    : query(messagesRef, where('receiverEmail', '==', normalizedEmail));

  // If super admin, we just get all messages.
  if (isSuperAdmin) {
    return onSnapshot(
      q,
      (snapshot) => {
        const items: ChatMessage[] = [];
        snapshot.forEach(doc => items.push(doc.data() as ChatMessage));
        items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        try {
          localStorage.setItem('crm_cached_messages', JSON.stringify(items));
        } catch (e) {}
        onUpdate(items);
      },
      (err) => {
        console.warn('Firestore messages subscription error (falling back to cache):', err?.message || err);
        loadCachedMessages();
      }
    );
  }

  // If sub-account, we need messages where they are sender OR receiver.
  const msgMap = new Map<string, ChatMessage>();
  
  const emit = () => {
    const items = Array.from(msgMap.values());
    items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    try {
      localStorage.setItem('crm_cached_messages', JSON.stringify(items));
    } catch (e) {}
    onUpdate(items);
  };

  const unsub1 = onSnapshot(
    q,
    (snapshot) => {
      snapshot.forEach(doc => msgMap.set(doc.id, doc.data() as ChatMessage));
      emit();
    },
    (err) => {
      console.warn('Firestore messages q1 error (falling back to cache):', err?.message || err);
      loadCachedMessages();
    }
  );

  const unsub2 = q2 ? onSnapshot(
    q2,
    (snapshot) => {
      snapshot.forEach(doc => msgMap.set(doc.id, doc.data() as ChatMessage));
      emit();
    },
    (err) => {
      console.warn('Firestore messages q2 error:', err?.message || err);
    }
  ) : () => {};

  return () => {
    unsub1();
    unsub2();
  };
}

export async function sendMessage(message: ChatMessage) {
  try {
    const cachedStr = localStorage.getItem('crm_cached_messages');
    let cachedList: ChatMessage[] = cachedStr ? JSON.parse(cachedStr) : [];
    cachedList.push(message);
    localStorage.setItem('crm_cached_messages', JSON.stringify(cachedList));
  } catch (e) {}

  try {
    const msgRef = doc(db, 'messages', message.id);
    await setDoc(msgRef, message);
  } catch (err) {
    console.warn('Firestore sendMessage unavailable (saved locally):', err);
  }

  // Try to send push notification via backend
  try {
    const receiver = message.receiverEmail || SUPER_ADMIN_EMAIL;
    const body = message.text || (message.screenshotUrl ? 'Sent an attachment' : 'Sent a message');
    
    await fetch('/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        receiverEmail: receiver,
        title: `New message from ${message.senderName}`,
        body: body
      })
    });
  } catch (err) {
    console.warn("Could not dispatch push notification", err);
  }
}

// Storage Helpers
export async function uploadFileInChunks(
  file: File,
  targetPath: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB per chunk for high reliability & fast progress updates
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(file.size, (i + 1) * CHUNK_SIZE);
    const chunkBlob = file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunkBlob, file.name);
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', i.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('fileName', file.name.replace(/[^a-zA-Z0-9._-]/g, '_'));
    formData.append('mimeType', file.type || 'video/mp4');
    formData.append('targetPath', targetPath);

    let attempts = 0;
    let success = false;
    let data: any = null;

    while (attempts < 3 && !success) {
      attempts++;
      try {
        const response = await fetch('/api/upload-chunk', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Server status ${response.status}: ${errText}`);
        }

        data = await response.json();
        success = true;
      } catch (err) {
        if (attempts >= 3) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, 1000 * attempts));
      }
    }

    if (onProgress) {
      const percent = Math.round(((i + 1) / totalChunks) * 100);
      onProgress(percent);
    }

    if (data && data.complete && data.url) {
      return data.url;
    }
  }

  throw new Error('Chunk upload completed without returning download URL');
}

function uploadViaServerProxy(
  file: File,
  path: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.url) {
            resolve(data.url);
            return;
          }
        } catch (e) {
          // ignore parsing error
        }
      }
      reject(new Error(`Server upload failed with status ${xhr.status}`));
    };

    xhr.onerror = () => reject(new Error('Network error during server upload'));
    xhr.send(formData);
  });
}

export async function uploadFileToStorage(
  file: File,
  path: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  // If file is larger than 2MB or is a video, use chunked server endpoint (4MB chunks) to avoid Cloud Run request limits & CORS
  if (file.size > 2 * 1024 * 1024 || file.type.startsWith('video/')) {
    try {
      return await uploadFileInChunks(file, path, onProgress);
    } catch (chunkErr) {
      console.warn('Chunked upload failed, falling back to server proxy:', chunkErr);
      return uploadViaServerProxy(file, path, onProgress);
    }
  }

  // For small files, try client SDK first
  try {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return await new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0 && onProgress) {
            onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
          }
        },
        (error) => {
          console.warn('Direct client SDK upload error, falling back to server route:', error);
          reject(error);
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  } catch (clientErr) {
    return uploadViaServerProxy(file, path, onProgress);
  }
}


// --- Push Notifications ---
export const requestPushPermission = async (userEmail: string) => {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.log('Push messaging is not supported in this browser.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const messaging = getMessaging(app);
      // We expect VITE_FIREBASE_VAPID_KEY in env
      const vapidKey = (import.meta as any).env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
         console.log('No VAPID key found in env, skipping push registration');
         return;
      }
      const token = await getToken(messaging, { vapidKey });
      if (token) {
        // Save token to users collection
        const normalizedEmail = userEmail.toLowerCase();
        await setDoc(doc(db, 'users', normalizedEmail), {
          fcmToken: token,
          email: normalizedEmail,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log('Push token saved for', normalizedEmail);
      }
    }
  } catch (err) {
    console.warn('Error requesting push permission:', err);
  }
};
