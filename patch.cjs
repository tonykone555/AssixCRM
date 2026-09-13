const fs = require('fs');
let code = fs.readFileSync('src/components/ChatWidget.tsx', 'utf8');

code = code.replace(
  "const [screenshotFile, setScreenshotFile] = useState<File | null>(null);",
  "const [screenshotData, setScreenshotData] = useState<{name: string, dataUrl: string} | null>(null);\n  const [isCompressing, setIsCompressing] = useState(false);"
);

code = code.replace(
  "if ((!text.trim() && !screenshotFile && !taggedLeadId) || isSending) return;",
  "if ((!text.trim() && !screenshotData && !taggedLeadId) || isSending || isCompressing) return;"
);

code = code.replace(
  /if \(screenshotFile\) \{[\s\S]*?screenshotUrl = await uploadFileToStorage\(compressedFile, path\);\n\s*\}/,
  `if (screenshotData) {
        screenshotUrl = screenshotData.dataUrl;
      }`
);

code = code.replace(
  "setScreenshotFile(null);",
  "setScreenshotData(null);"
);

code = code.replace(
  /\{\(screenshotFile \|\| taggedLeadId\) && \(/,
  "{(screenshotData || taggedLeadId) && ("
);

code = code.replace(
  /\{screenshotFile && \(/,
  "{screenshotData && ("
);

code = code.replace(
  /<span className="max-w-\[100px\] truncate">\{screenshotFile\.name\}<\/span>/,
  '<span className="max-w-[100px] truncate">{screenshotData.name}</span>'
);

code = code.replace(
  /<button type="button" onClick=\{\(\) => setScreenshotFile\(null\)\}><X className="w-3 h-3 hover:text-white" \/><\/button>/,
  '<button type="button" onClick={() => setScreenshotData(null)}><X className="w-3 h-3 hover:text-white" /></button>'
);

code = code.replace(
  /if \(e\.target\.files\?\.\[0\]\) setScreenshotFile\(e\.target\.files\[0\]\);/,
  `if (e.target.files?.[0]) {
                          setIsCompressing(true);
                          const file = e.target.files[0];
                          compressAndGetInstantDataUrl(file).then(({ dataUrl }) => {
                            setScreenshotData({ name: file.name, dataUrl });
                            setIsCompressing(false);
                          }).catch((err) => {
                            console.error(err);
                            setIsCompressing(false);
                          });
                        }`
);

code = code.replace(
  /disabled=\{isSending \|\| \(!text\.trim\(\) && !screenshotFile && !taggedLeadId\)\}/,
  "disabled={isSending || isCompressing || (!text.trim() && !screenshotData && !taggedLeadId)}"
);

code = code.replace(
  /disabled=\{isSending \|\| isCompressing \|\| \(\!text\.trim\(\) \&\& \!screenshotFile \&\& \!taggedLeadId\)\}/,
  "disabled={isSending || isCompressing || (!text.trim() && !screenshotData && !taggedLeadId)}"
);

fs.writeFileSync('src/components/ChatWidget.tsx', code);
