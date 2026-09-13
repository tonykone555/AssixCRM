const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

if (!code.includes('onOpenPlaceScanner')) {
  code = code.replace(
    'onOpenCustomFields: () => void;',
    'onOpenCustomFields: () => void;\n  onOpenPlaceScanner?: () => void;'
  );

  const importTarget = 'FileSpreadsheet,';
  code = code.replace(importTarget, importTarget + '\n  MapPin,');

  const btnTarget = '{/* Desktop Add Manual Lead */}';
  const newBtn = `
          {isSuperAdmin && onOpenPlaceScanner && (
            <button
              onClick={onOpenPlaceScanner}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            >
              <MapPin className="w-4 h-4" />
              Place Scanner
            </button>
          )}

          {/* Desktop Add Manual Lead */}`;
          
  code = code.replace(btnTarget, newBtn);
  fs.writeFileSync('src/components/Header.tsx', code);
}
