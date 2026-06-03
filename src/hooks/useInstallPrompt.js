import { useEffect, useState } from 'react';

function isStandaloneDisplay() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(() => isStandaloneDisplay());

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setPromptEvent(event);
    }

    function handleInstalled() {
      setInstalled(true);
      setPromptEvent(null);
    }

    function handleDisplayModeChange() {
      setInstalled(isStandaloneDisplay());
    }

    const mediaQuery = window.matchMedia?.('(display-mode: standalone)');
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    mediaQuery?.addEventListener?.('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      mediaQuery?.removeEventListener?.('change', handleDisplayModeChange);
    };
  }, []);

  async function install() {
    if (!promptEvent) {
      window.alert('To install this portal, open the browser menu and choose Install app or Add to Home Screen.');
      return;
    }
    promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  }

  return {
    canInstall: !installed,
    install
  };
}
