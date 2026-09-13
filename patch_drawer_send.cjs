const fs = require('fs');
let code = fs.readFileSync('src/components/LeadDetailDrawer.tsx', 'utf8');

// Add Send button UI next to Copy
const searchString = `                  title="Copy to clipboard"
                >
                  {draftCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>`;

const replaceString = `                  title="Copy to clipboard"
                >
                  {draftCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              
              <div className="flex gap-2">
                <a
                  href={igUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={handleCopyDraft}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Instagram className="w-4 h-4" />
                  Copy & Open Instagram
                </a>
              </div>`;

if (!code.includes("Copy & Open Instagram")) {
  code = code.replace(searchString, replaceString);
  fs.writeFileSync('src/components/LeadDetailDrawer.tsx', code);
}
