const fs = require('fs');
let code = fs.readFileSync('src/components/TableView.tsx', 'utf8');

code = code.replace(
  /}\) => {/,
  `}) => {
  const [uploadingLeadId, setUploadingLeadId] = React.useState<string | null>(null);

  const handleInlineProofUpload = async (lead: Lead, files: FileList) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    
    setUploadingLeadId(lead.id);
    try {
      const processedList = await Promise.all(
        imageFiles.map((file) => compressAndGetInstantDataUrl(file))
      );
      const instantUrls = processedList.map((item) => item.dataUrl).filter(Boolean);
      
      if (instantUrls.length > 0) {
        onUpdateLead({
          ...lead,
          screenshots: [...(lead.screenshots || []), ...instantUrls]
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingLeadId(null);
    }
  };`
);

fs.writeFileSync('src/components/TableView.tsx', code);
