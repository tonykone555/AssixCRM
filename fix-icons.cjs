const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// 1. Add imports
code = code.replace(
  'import {',
  'import {\n  Circle,\n  Radio,'
);

// 2. Fix the Radar button icon
const oldRadarBtn = `<button
              onClick={() => onViewModeChange('radar')}
              className={\`p-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 \${
                viewMode === 'radar'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }\`}
              title="Lead Radar"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Radar</span>
            </button>`;
const newRadarBtn = `<button
              onClick={() => onViewModeChange('radar')}
              className={\`p-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 \${
                viewMode === 'radar'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }\`}
              title="Lead Radar"
            >
              <Radio className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Radar</span>
            </button>`;
code = code.replace(oldRadarBtn, newRadarBtn);

// 3. Fix the Scan button (white background, circle icon)
const oldScanBtn = `<label className="px-2 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-sm shadow-indigo-500/20 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer">
               <Sparkles className="w-4 h-4" />
               <span className="inline">Scan</span>
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
            </label>`;
const newScanBtn = `<label className="px-2 sm:px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer">
               <Circle className="w-4 h-4" />
               <span className="inline">Scan</span>
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
            </label>`;
code = code.replace(oldScanBtn, newScanBtn);

fs.writeFileSync('src/components/Header.tsx', code);
