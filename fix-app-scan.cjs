const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add import
if (!code.includes('compressAndGetInstantDataUrl')) {
  code = code.replace(
    `import { SWRegister } from './components/SWRegister';`,
    `import { SWRegister } from './components/SWRegister';\nimport { compressAndGetInstantDataUrl } from './utils/imageCompressor';`
  );
}

// 2. Add handleBackgroundScan
const oldHandleAddLead = `  const handleAddLead = async (newLead: Lead) => {
    if (!currentUser) return;
    try {
      await saveLeadToFirestore(newLead, currentUser.uid, currentUser.email || '');
      triggerToast(\`Added lead @\${newLead.instagramHandle}\`);
    } catch (err) {
      console.error('Failed to add lead:', err);
      triggerToast('Error saving lead to cloud');
    }
  };`;

const newHandleBackgroundScan = `  const handleAddLead = async (newLead: Lead) => {
    if (!currentUser) return;
    try {
      await saveLeadToFirestore(newLead, currentUser.uid, currentUser.email || '');
      if (newLead.instagramHandle) {
        triggerToast(\`Added lead @\${newLead.instagramHandle}\`);
      }
    } catch (err) {
      console.error('Failed to add lead:', err);
      triggerToast('Error saving lead to cloud');
    }
  };

  const handleBackgroundScan = async (files: FileList) => {
    if (!currentUser) return;
    triggerToast(\`Started background scan for \${files.length} screenshot(s)\`);
    
    Array.from(files).forEach(async (file) => {
      try {
        const processed = await compressAndGetInstantDataUrl(file);
        const tempId = crypto.randomUUID();
        const now = new Date().toISOString();
        
        // 1. Create Placeholder Lead instantly
        const tempLead: Lead = {
          id: tempId,
          name: 'Scanning...',
          instagramHandle: '',
          status: 'New',
          tags: [],
          screenshots: processed.dataUrl ? [processed.dataUrl] : [],
          notes: 'AI is extracting details in the background...',
          interactions: [],
          customFields: {},
          createdAt: now,
          updatedAt: now,
          ownerId: currentUser.uid,
          ownerEmail: currentUser.email || '',
          assignedAccountEmails: [currentUser.email || '']
        };
        
        // Save placeholder to UI / DB
        await saveLeadToFirestore(tempLead, currentUser.uid, currentUser.email || '');
        
        // 2. Extract Data
        const formData = new FormData();
        formData.append('file', processed.file);
        
        const res = await fetch('/api/extract-profile', {
          method: 'POST',
          body: formData,
        });
        
        if (!res.ok) throw new Error('Extraction failed');
        const data = await res.json();
        
        // 3. Update Lead
        const updatedLead: Lead = {
          ...tempLead,
          name: data.name || tempLead.name,
          instagramHandle: data.handle || '',
          website: data.website || '',
          notes: data.bio ? \`Bio: \${data.bio}\` : '',
          updatedAt: new Date().toISOString()
        };
        
        await saveLeadToFirestore(updatedLead, currentUser.uid, currentUser.email || '');
        triggerToast(\`Scan complete: \${updatedLead.name}\`);
      } catch (err) {
        console.error('Background scan error:', err);
        triggerToast('Failed to scan a screenshot');
      }
    });
  };`;

code = code.replace(oldHandleAddLead, newHandleBackgroundScan);

// 3. Pass to Header
code = code.replace(
  `onOpenAddLead={() => setIsAddLeadOpen(true)}`,
  `onOpenAddLead={() => setIsAddLeadOpen(true)}\n          onBackgroundScan={handleBackgroundScan}`
);

fs.writeFileSync('src/App.tsx', code);
