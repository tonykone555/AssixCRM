const fs = require('fs');
let code = fs.readFileSync('src/components/LeadDetailDrawer.tsx', 'utf8');

// 1. Add imports
code = code.replace(
  "Layers,\n  Users",
  "Layers,\n  Users,\n  Sparkles,\n  Copy,\n  Check"
);

// 2. Add states
const statesToAdd = `
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [draftMessage, setDraftMessage] = useState('');
  const [draftCopied, setDraftCopied] = useState(false);

  const handleGenerateDraft = async () => {
    if (screenshots.length === 0) {
      alert("Please upload a screenshot first so the AI can analyze their products!");
      return;
    }
    
    setIsGeneratingDraft(true);
    try {
      const res = await fetch('/api/generate-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: screenshots[0] })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDraftMessage(data.message);
      setDraftCopied(false);
    } catch(err: any) {
      console.error(err);
      alert(err.message || 'Failed to generate message');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(draftMessage);
    setDraftCopied(true);
    setTimeout(() => setDraftCopied(false), 2000);
  };
`;

code = code.replace(
  "const [videoUploadProgress, setVideoUploadProgress] = useState<number | null>(null);",
  "const [videoUploadProgress, setVideoUploadProgress] = useState<number | null>(null);\n" + statesToAdd
);

// 3. Add UI
const uiToAdd = `
          {/* AI Outreach Generator */}
          <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-1.5 uppercase">
                <Sparkles className="w-4 h-4" />
                AI Outreach Message
              </label>
              <button
                onClick={handleGenerateDraft}
                disabled={isGeneratingDraft || screenshots.length === 0}
                className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                {isGeneratingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {draftMessage ? 'Regenerate Draft' : 'Draft Message'}
              </button>
            </div>
            
            {screenshots.length === 0 && !draftMessage && (
              <p className="text-xs text-rose-500/70 dark:text-rose-400/70 font-medium">
                Upload a screenshot below to let the AI write a personalized message based on their brand.
              </p>
            )}

            {draftMessage && (
              <div className="relative mt-2">
                <textarea
                  value={draftMessage}
                  onChange={(e) => setDraftMessage(e.target.value)}
                  rows={4}
                  className="w-full p-3 rounded-xl bg-white dark:bg-zinc-950/80 border border-rose-200 dark:border-rose-900/50 text-zinc-900 dark:text-white text-sm font-medium focus:outline-none focus:border-rose-400 dark:focus:border-rose-600 resize-none"
                />
                <button
                  onClick={handleCopyDraft}
                  className="absolute bottom-3 right-3 p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md text-zinc-600 dark:text-zinc-300 transition-colors"
                  title="Copy to clipboard"
                >
                  {draftCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
`;

code = code.replace(
  "{/* Custom Fields Section */}",
  uiToAdd + "\n          {/* Custom Fields Section */}"
);

fs.writeFileSync('src/components/LeadDetailDrawer.tsx', code);
