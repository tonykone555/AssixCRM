const fs = require('fs');
let code = fs.readFileSync('src/components/LeadDetailDrawer.tsx', 'utf8');

const broken = `{draftMessage && (
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
              </div>
            )}`;

const fixed = `{draftMessage && (
              <div className="mt-2 space-y-2">
                <div className="relative">
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
                </div>
              </div>
            )}`;

code = code.replace(broken, fixed);
fs.writeFileSync('src/components/LeadDetailDrawer.tsx', code);
