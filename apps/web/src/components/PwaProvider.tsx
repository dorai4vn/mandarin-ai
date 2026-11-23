'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaState {
  /** Service worker registered (production build, supported browser, secure context). */
  swStatus: 'checking' | 'unsupported' | 'disabled-in-dev' | 'registering' | 'active' | 'error';
  /** Chromium-style install prompt available (Safari/Firefox use their own menus). */
  canPrompt: boolean;
  install: () => Promise<void>;
}

const Ctx = createContext<PwaState>({
  swStatus: 'checking',
  canPrompt: false,
  install: async () => undefined,
});

/** Progressive enhancement only (D-028): nothing here may block the app. */
export function PwaProvider({ children }: { children: ReactNode }) {
  const [swStatus, setSwStatus] = useState<PwaState['swStatus']>('checking');
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && window.isSecureContext;
    const enabled =
      process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_SW_IN_DEV === 'true';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSwStatus(!supported ? 'unsupported' : !enabled ? 'disabled-in-dev' : 'registering');
    if (supported && enabled) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(() => navigator.serviceWorker.ready)
        .then(() => setSwStatus('active'))
        .catch(() => setSwStatus('error'));
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return (
    <Ctx.Provider value={{ swStatus, canPrompt: deferred !== null, install }}>
      {children}
    </Ctx.Provider>
  );
}

export const usePwa = () => useContext(Ctx);
