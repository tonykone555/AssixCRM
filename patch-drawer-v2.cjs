const fs = require('fs');
let code = fs.readFileSync('src/components/LeadDetailDrawer.tsx', 'utf8');

// 1. Add ProductDemoModal import
code = code.replace(
  "import { LeadVirtualTryOn } from './LeadVirtualTryOn';",
  "import { ProductDemoModal } from './ProductDemoModal';"
);

// 2. Add state for the modal
code = code.replace(
  'const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);',
  'const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);\n  const [showDemoModal, setShowDemoModal] = useState(false);'
);

// 3. Replace the small LeadVirtualTryOn block with the button to open the full modal
const oldVTONBlockStart = code.indexOf('{/* Virtual Try-On Module */}');
const oldVTONBlockEnd = code.indexOf('<div className="space-y-3">', oldVTONBlockStart);

if (oldVTONBlockStart > -1 && oldVTONBlockEnd > -1) {
  const before = code.substring(0, oldVTONBlockStart);
  const after = code.substring(oldVTONBlockEnd);
  
  const newDemoButton = `
          {/* E-Commerce Demo Launcher */}
          <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-xl p-4 text-white shadow-xl flex items-center justify-between border border-stone-700">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                VTON E-Commerce Demo
              </h3>
              <p className="text-[10px] text-stone-400 mt-1 max-w-[200px] leading-snug">
                Launch a full-screen, screen-recordable mock product page using this lead's garment.
              </p>
            </div>
            <button
              onClick={() => setShowDemoModal(true)}
              className="px-4 py-2 bg-white text-stone-900 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-stone-100 transition-colors shadow-md active:scale-95"
            >
              Launch Demo
            </button>
          </div>

          `;
  
  code = before + newDemoButton + after;
}

// 4. Mount the modal at the very end of the drawer return
const endOfDrawer = code.lastIndexOf('</div>\n    </div>\n  );\n};');
if (endOfDrawer > -1) {
  const beforeEnd = code.substring(0, endOfDrawer);
  const afterEnd = code.substring(endOfDrawer);
  
  const modalRender = `
      {showDemoModal && (
        <ProductDemoModal 
          lead={lead} 
          onClose={() => setShowDemoModal(false)} 
        />
      )}
`;
  code = beforeEnd + modalRender + afterEnd;
}

fs.writeFileSync('src/components/LeadDetailDrawer.tsx', code);
