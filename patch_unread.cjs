const fs = require('fs');
let code = fs.readFileSync('src/components/ChatWidget.tsx', 'utf8');

// Add imports
code = code.replace(
  "import { MessageCircle, X, Send, Image as ImageIcon, Loader2, ArrowLeft, Paperclip } from 'lucide-react';",
  "import { MessageCircle, X, Send, Image as ImageIcon, Loader2, ArrowLeft, Paperclip, Users } from 'lucide-react';"
);

// Add states
code = code.replace(
  "const [taggedLeadId, setTaggedLeadId] = useState<string>('');",
  "const [taggedLeadId, setTaggedLeadId] = useState<string>('');\n  const [unreadSenders, setUnreadSenders] = useState<Set<string>>(new Set());\n  const lastSeenMessages = useRef<Set<string>>(new Set());"
);

// Update useEffect for notifications & unread dots
code = code.replace(
  /  \/\/ Show notification for new messages when chat is closed\n  useEffect\(\(\) => \{[\s\S]*?  \}, \[messages\]\);/,
  `  // Show notification for new messages and manage unread state
  useEffect(() => {
    let hasNew = false;
    const newUnread = new Set(unreadSenders);
    const currentMyEmail = currentUser.email?.toLowerCase();

    messages.forEach(msg => {
      if (!lastSeenMessages.current.has(msg.id)) {
        lastSeenMessages.current.add(msg.id);
        
        if (msg.senderEmail !== currentMyEmail) {
          const isCurrentlyViewing = isOpen && (
            !isSuperAdmin || 
            (isSuperAdmin && selectedSubAccount?.toLowerCase() === msg.senderEmail)
          );

          if (!isCurrentlyViewing) {
            newUnread.add(msg.senderEmail);
            hasNew = true;
          }

          if (!isCurrentlyViewing && 'Notification' in window && Notification.permission === 'granted' && Date.now() - new Date(msg.timestamp).getTime() < 10000) {
            const title = \`New message from \${msg.senderName}\`;
            const options = {
              body: msg.text || 'Sent an attachment',
              icon: '/vite.svg',
              badge: '/vite.svg',
              tag: 'chat-message'
            };

            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, options);
              }).catch(err => {
                new Notification(title, options);
              });
            } else {
              new Notification(title, options);
            }
          }
        }
      }
    });

    if (hasNew) {
      setUnreadSenders(newUnread);
    }
  }, [messages, isOpen, isSuperAdmin, selectedSubAccount, currentUser.email]);

  useEffect(() => {
    if (isOpen) {
      if (!isSuperAdmin) {
        setUnreadSenders(new Set());
      } else if (selectedSubAccount) {
        setUnreadSenders(prev => {
          const next = new Set(prev);
          next.delete(selectedSubAccount.toLowerCase());
          return next;
        });
      }
    }
  }, [isOpen, selectedSubAccount, isSuperAdmin]);`
);

// Update Header
code = code.replace(
  /          \{\/\* Header \*\/\}\n          <div className="bg-zinc-950 p-4 text-white flex items-center gap-3 border-b border-zinc-900">\n            \{isSuperAdmin && selectedSubAccount && \(\n              <button onClick=\{\(\) => setSelectedSubAccount\(null\)\} className="p-1 hover:bg-white\/10 rounded-lg transition-colors">\n                <ArrowLeft className="w-5 h-5" \/>\n              <\/button>\n            \)\}\n            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 overflow-hidden shrink-0">\n              <img src=\{\`https:\/\/api\.dicebear\.com\/7\.x\/avataaars\/svg\?seed=\$\{isSuperAdmin \? selectedSubAccount : 'Support'\}\`\} alt="Avatar" className="w-full h-full object-cover" \/>\n            <\/div>\n            <div>\n              <h3 className="font-bold text-sm">\n                \{isSuperAdmin \n                  \? \(selectedSubAccount \? availableAccounts\.find\(a => a\.email === selectedSubAccount\)\?\.displayName \|\| selectedSubAccount : 'Select Account'\)\n                  : 'Assix Support'\}\n              <\/h3>\n              <p className="text-\[10px\] text-zinc-400">\n                \{isSuperAdmin && selectedSubAccount \? selectedSubAccount : 'Typically replies in minutes'\}\n              <\/p>\n            <\/div>\n          <\/div>/,
  `          {/* Header */}
          <div className="bg-zinc-950 p-4 text-white flex items-center gap-3 border-b border-zinc-900">
            {isSuperAdmin && selectedSubAccount && (
              <button onClick={() => setSelectedSubAccount(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors" title="Back to accounts">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 overflow-hidden shrink-0">
              {isSuperAdmin && !selectedSubAccount 
                ? <Users className="w-5 h-5 text-zinc-400" /> 
                : <img src={\`https://api.dicebear.com/7.x/avataaars/svg?seed=\${isSuperAdmin ? selectedSubAccount : 'Support'}\`} alt="Avatar" className="w-full h-full object-cover" />
              }
            </div>
            <div className="flex-1 min-w-0">
              {isSuperAdmin && selectedSubAccount ? (
                <select 
                  value={selectedSubAccount}
                  onChange={(e) => setSelectedSubAccount(e.target.value)}
                  className="w-full bg-transparent text-sm font-bold text-white border-none outline-none cursor-pointer appearance-none truncate"
                >
                  {availableAccounts.filter(a => a.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()).map(acc => (
                    <option key={acc.email} value={acc.email} className="bg-zinc-900 text-white">
                      {acc.displayName || acc.email} {unreadSenders.has(acc.email.toLowerCase()) ? '(New)' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <h3 className="font-bold text-sm">
                  {isSuperAdmin ? 'Select Account' : 'Assix Support'}
                </h3>
              )}
              <p className="text-[10px] text-zinc-400 truncate">
                {isSuperAdmin && selectedSubAccount ? selectedSubAccount : 'Typically replies in minutes'}
              </p>
            </div>
          </div>`
);


// Update Chat widget main button
code = code.replace(
  /<button\n        onClick=\{\(\) => setIsOpen\(!isOpen\)\}\n        className="fixed bottom-6 right-6 z-50 p-4 bg-black text-white rounded-full shadow-2xl hover:scale-105 transition-transform cursor-pointer flex items-center justify-center border border-zinc-800"\n      >\n        \{isOpen \? <X className="w-6 h-6" \/> : <MessageCircle className="w-6 h-6" \/>\}\n      <\/button>/,
  `<button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-black text-white rounded-full shadow-2xl hover:scale-105 transition-transform cursor-pointer flex items-center justify-center border border-zinc-800"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!isOpen && unreadSenders.size > 0 && (
          <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-black"></span>
          </span>
        )}
      </button>`
);

// Update account list button
code = code.replace(
  /<button\n                    key=\{acc.email\}\n                    onClick=\{\(\) => setSelectedSubAccount\(acc\.email\)\}\n                    className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900\/50 border border-zinc-800 hover:border-zinc-600 transition-colors text-left"/g,
  `<button
                    key={acc.email}
                    onClick={() => setSelectedSubAccount(acc.email)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 transition-colors text-left relative"
                  >
                    {unreadSenders.has(acc.email.toLowerCase()) && (
                      <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border border-zinc-900 shadow-sm shadow-rose-500/50"></div>
                    )`
);
code = code.replace(/\{unreadSenders\.has\(acc\.email\.toLowerCase\(\)\) && \(\n                      <div className="absolute top-3 right-3 w-2\.5 h-2\.5 bg-rose-500 rounded-full border border-zinc-900 shadow-sm shadow-rose-500\/50"><\/div>\n                    \)\n                  >\n                    <div className="w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center font-bold text-xs">/g, 
`{unreadSenders.has(acc.email.toLowerCase()) && (
                      <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border border-zinc-900 shadow-sm shadow-rose-500/50"></div>
                    )}
                    <div className="w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center font-bold text-xs">`
); // Fix bad replace if it happened

fs.writeFileSync('src/components/ChatWidget.tsx', code);
