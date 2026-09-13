const fs = require('fs');
let code = fs.readFileSync('src/components/TableView.tsx', 'utf8');

// 1. Add import
if (!code.includes("compressAndGetInstantDataUrl")) {
  code = code.replace(
    "import { Lead, LeadStatus } from '../types';",
    "import { Lead, LeadStatus } from '../types';\nimport { compressAndGetInstantDataUrl } from '../utils/imageCompressor';"
  );
}

// 2. Add to Interface
code = code.replace(
  "  onDeleteLead: (leadId: string) => void;",
  "  onDeleteLead: (leadId: string) => void;\n  onUpdateLead: (lead: Lead) => void;"
);

// 3. Add to Props
code = code.replace(
  "  onDeleteLead,",
  "  onDeleteLead,\n  onUpdateLead,"
);

// 4. Add handleInlineProofUpload
code = code.replace(
  "  const isToday = (dateString: string) => {",
  `  const [uploadingLeadId, setUploadingLeadId] = React.useState<string | null>(null);

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
  };

  const isToday = (dateString: string) => {`
);

// 5. Replace + Proof Button
code = code.replace(
  /<button\n\s*onClick=\{\(\) => onSelectLead\(lead\)\}\n\s*className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-950\/30 text-zinc-400 hover:text-rose-500 text-\[10px\] font-medium transition-colors border border-dashed border-zinc-200 dark:border-zinc-800"\n\s*title="Upload Proof Screenshot"\n\s*>\n\s*\+ Proof\n\s*<\/button>/,
  `<label
                      className="\${uploadingLeadId === lead.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-500'} px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-400 text-[10px] font-medium transition-colors border border-dashed border-zinc-200 dark:border-zinc-800"
                      title="Upload Proof Screenshot"
                    >
                      {uploadingLeadId === lead.id ? '...' : '+ Proof'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        className="hidden" 
                        disabled={uploadingLeadId === lead.id}
                        onChange={(e) => {
                           if (e.target.files) handleInlineProofUpload(lead, e.target.files);
                           e.target.value = '';
                        }} 
                      />
                    </label>`
);

fs.writeFileSync('src/components/TableView.tsx', code);
