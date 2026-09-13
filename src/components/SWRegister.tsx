import { useEffect } from 'react';
// @ts-ignore
import { useRegisterSW } from 'virtual:pwa-register/react';

export function SWRegister() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  return null; // Silent registration for now, no update banner
}
