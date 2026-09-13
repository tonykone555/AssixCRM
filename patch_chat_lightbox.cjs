const fs = require('fs');
let code = fs.readFileSync('src/components/ChatWidget.tsx', 'utf8');

// 1. Add state
code = code.replace(
  "const [taggedLeadId, setTaggedLeadId] = useState<string>('');",
  "const [taggedLeadId, setTaggedLeadId] = useState<string>('');\n  const [lightboxImage, setLightboxImage] = useState<string | null>(null);"
);

// 2. Modify image link
code = code.replace(
  /<a href=\{msg.screenshotUrl\} target="_blank" rel="noreferrer" className="block mb-2">\n\s*<img src=\{msg.screenshotUrl\} alt="Screenshot" className="rounded-lg max-w-\[200px\] max-h-\[200px\] object-cover border border-zinc-700" \/>\n\s*<\/a>/g,
  `<button type="button" onClick={() => setLightboxImage(msg.screenshotUrl!)} className="block mb-2 text-left cursor-zoom-in active:scale-95 transition-transform">
                              <img src={msg.screenshotUrl} alt="Screenshot" className="rounded-lg max-w-[200px] max-h-[200px] object-cover border border-zinc-700 hover:opacity-90 transition-opacity" />
                            </button>`
);

// 3. Add lightbox at the very bottom
code = code.replace(
  /    <\/>\n  \);\n\};/,
  `      {lightboxImage && (
        <div className="fixed inset-0 z-[99999] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setLightboxImage(null)}>
          <button 
            className="absolute top-6 right-6 p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full transition-colors"
            onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={lightboxImage} 
            alt="Full size screenshot" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};`
);

fs.writeFileSync('src/components/ChatWidget.tsx', code);
