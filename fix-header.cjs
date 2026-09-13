const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// Add onBackgroundScan prop
code = code.replace(
  'onOpenAddLead: () => void;',
  'onOpenAddLead: () => void;\n  onBackgroundScan?: (files: FileList) => void;'
);

code = code.replace(
  'onOpenAddLead,',
  'onOpenAddLead,\n  onBackgroundScan,'
);

const oldAddLead = `          <button
            onClick={onOpenAddLead}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-xs shadow-sm shadow-rose-500/20 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Add Lead</span>
          </button>`;

const newAddLead = `          <button
            onClick={onOpenAddLead}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-xs shadow-sm shadow-rose-500/20 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">Add Lead</span>
          </button>
          
          {onBackgroundScan && (
            <label className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-sm shadow-indigo-500/20 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer">
               <Sparkles className="w-4 h-4" />
               <span className="hidden xs:inline">Quick Scan</span>
               <input 
                 type="file" 
                 accept="image/*" 
                 multiple
                 className="hidden" 
                 onChange={(e) => {
                   if (e.target.files && e.target.files.length > 0) {
                     onBackgroundScan(e.target.files);
                   }
                   e.target.value = '';
                 }} 
               />
            </label>
          )}`;

code = code.replace(oldAddLead, newAddLead);
fs.writeFileSync('src/components/Header.tsx', code);
