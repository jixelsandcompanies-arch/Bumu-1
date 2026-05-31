import { useEffect, useState } from 'react';

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setPromptEvent(event);
    }

    function handleInstalled() {
      setInstalled(true);
      setPromptEvent(null);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) {
      window.alert('Install app is ready when the browser shows the install prompt. If it does not open, refresh the app and tap Install app again.');
      return;
    }
    promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  }

  return {
    canInstall: Boolean(promptEvent) && !installed,
    install
  };
}
