const fs = require('fs');
let code = fs.readFileSync('src/components/ChatWidget.tsx', 'utf8');

if (!code.includes("requestPushPermission")) {
  code = code.replace(
    "subscribeToMessages, sendMessage, uploadFileToStorage, SUPER_ADMIN_EMAIL } from '../lib/firebase';",
    "subscribeToMessages, sendMessage, uploadFileToStorage, SUPER_ADMIN_EMAIL, requestPushPermission } from '../lib/firebase';"
  );
  
  code = code.replace(
    "const [isOpen, setIsOpen] = useState(false);",
    "const [isOpen, setIsOpen] = useState(false);\n  const [pushAsked, setPushAsked] = useState(false);"
  );
  
  const openFn = `        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && !pushAsked && currentUser?.email && 'Notification' in window && Notification.permission === 'default') {
            setPushAsked(true);
            requestPushPermission(currentUser.email);
          }
        }}`;
        
  code = code.replace(
    /onClick=\{\(\) => setIsOpen\(!isOpen\)\}/,
    openFn
  );
  
  // also run on load just in case permission is already granted but token changed
  const effect = `  useEffect(() => {
    if (currentUser?.email && 'Notification' in window && Notification.permission === 'granted') {
      requestPushPermission(currentUser.email);
    }
  }, [currentUser?.email]);`;
  
  code = code.replace(
    "useEffect(() => {",
    `${effect}\n\n  useEffect(() => {`
  );
  
  fs.writeFileSync('src/components/ChatWidget.tsx', code);
}
