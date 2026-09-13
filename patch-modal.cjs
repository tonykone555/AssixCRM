const fs = require('fs');
let code = fs.readFileSync('src/components/PlaceScannerModal.tsx', 'utf8');

// Remove needsKey logic
code = code.replace(
  `      if (data.needsMapsKey) {
        setNeedsKey(true);
      } else if (data.place) {
        setMapsResult(data.place);
      } else {
        setErrorMsg("Extracted text but couldn't find a Google Maps match.");
      }`,
  `      if (data.place) {
        setMapsResult(data.place);
      } else {
        setErrorMsg("Extracted text but couldn't find a location match.");
      }`
);

const missingKeyNote = `          {/* Missing API Key Note */}
          {needsKey && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl text-sm border border-amber-200 dark:border-amber-900/30">
              <p className="font-bold mb-1">Missing Google Maps API Key</p>
              <p className="text-xs">
                We extracted the name "{extractedData?.storeName}", but we need a Maps API key in your server environment to automatically pull the review URL.
              </p>
            </div>
          )}`;

code = code.replace(missingKeyNote, "");
fs.writeFileSync('src/components/PlaceScannerModal.tsx', code);
