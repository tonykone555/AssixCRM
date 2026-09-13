const fs = require('fs');
let code = fs.readFileSync('src/components/ChatWidget.tsx', 'utf8');

const oldHeader = `          {/* Header */}
          <div className="bg-zinc-950 p-4 text-white flex items-center gap-3 border-b border-zinc-900">
            {isSuperAdmin && selectedSubAccount && (
              <button onClick={() => setSelectedSubAccount(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h3 className="font-bold text-sm">
                {isSuperAdmin 
                  ? selectedSubAccount 
                    ? \`Chat with \${selectedSubAccount.split('@')[0]}\`
                    : 'Select Account to Chat'
                  : 'Chat with Support (Admin)'}
              </h3>
            </div>
          </div>`;

const newHeader = `          {/* Header */}
          <div className="bg-zinc-950 p-4 text-white flex items-center gap-3 border-b border-zinc-900">
            {isSuperAdmin && selectedSubAccount && (
              <button onClick={() => setSelectedSubAccount(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors shrink-0" title="Back to accounts">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            
            <div className="flex-1 min-w-0">
              {isSuperAdmin && selectedSubAccount ? (
                <div className="relative">
                  <select 
                    value={selectedSubAccount}
                    onChange={(e) => setSelectedSubAccount(e.target.value)}
                    className="w-full bg-transparent text-sm font-bold text-white border-none outline-none cursor-pointer appearance-none truncate pr-4"
                  >
                    {availableAccounts.filter(a => a.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()).map(acc => (
                      <option key={acc.email} value={acc.email} className="bg-zinc-900 text-white">
                        Chat with {acc.displayName || acc.email.split('@')[0]} {unreadSenders.has(acc.email.toLowerCase()) ? '(New)' : ''}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 text-[10px]">▼</div>
                </div>
              ) : (
                <h3 className="font-bold text-sm truncate">
                  {isSuperAdmin ? 'Select Account to Chat' : 'Chat with Support (Admin)'}
                </h3>
              )}
            </div>
          </div>`;

code = code.replace(oldHeader, newHeader);
fs.writeFileSync('src/components/ChatWidget.tsx', code);
