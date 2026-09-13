const fs = require('fs');
let code = fs.readFileSync('src/components/AddLeadModal.tsx', 'utf8');

const oldCode = `  const handleAIExtraction = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/extract-profile', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) throw new Error('Extraction failed');
      const data = await res.json();
      
      if (data.name) setName(data.name);
      if (data.handle) setHandle(data.handle);
      if (data.website) setWebsite(data.website);
      if (data.bio) setNotes((prev) => prev ? \`\${prev}\\n\\nBio: \${data.bio}\` : \`Bio: \${data.bio}\`);
      
      // Auto-add it to screenshots as proof!
      const processed = await compressAndGetInstantDataUrl(file);
      if (processed.dataUrl) {
         setScreenshots((prev) => [...prev, processed.dataUrl]);
      }`;

const newCode = `  const handleAIExtraction = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
      // 1. Instantly compress the image client-side to make the AI scan lightning fast
      const processed = await compressAndGetInstantDataUrl(file);
      
      const formData = new FormData();
      formData.append('file', processed.file);
      
      const res = await fetch('/api/extract-profile', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) throw new Error('Extraction failed');
      const data = await res.json();
      
      if (data.name) setName(data.name);
      if (data.handle) setHandle(data.handle);
      if (data.website) setWebsite(data.website);
      if (data.bio) setNotes((prev) => prev ? \`\${prev}\\n\\nBio: \${data.bio}\` : \`Bio: \${data.bio}\`);
      
      // Auto-add it to screenshots as proof!
      if (processed.dataUrl) {
         setScreenshots((prev) => [...prev, processed.dataUrl]);
      }`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('src/components/AddLeadModal.tsx', code);
