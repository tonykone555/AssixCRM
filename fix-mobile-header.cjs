const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

// Change the display classes for the buttons so they show up fully on mobile
// First the Add Lead button
code = code.replace(
  '<span className="hidden xs:inline">Add Lead</span>',
  '<span className="inline">Add</span>'
);

// Then the Quick Scan button
code = code.replace(
  '<span className="hidden xs:inline">Quick Scan</span>',
  '<span className="inline">Scan</span>'
);

// Reduce padding on mobile for these buttons to make sure they both fit
code = code.replace(
  'className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600',
  'className="px-2 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600'
);

code = code.replace(
  'className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600',
  'className="px-2 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600'
);

// Hide the dark mode and full screen toggles on very small screens to make room
code = code.replace(
  'className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"',
  'className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer hidden sm:block"'
);

fs.writeFileSync('src/components/Header.tsx', code);
