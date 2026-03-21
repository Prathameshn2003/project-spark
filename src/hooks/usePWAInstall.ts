import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed-at";
const INSTALLED_KEY = "pwa-installed";
const DISMISS_DELAY_MS = 24 * 60 * 60 * 1000; // 24 hours

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => {
    return (
      localStorage.getItem(INSTALLED_KEY) === "true" ||
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true
    );
  });
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (isInstalled) return;

    const handler = (e: Event) => {
      e.preventDefault();
      const prompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(prompt);
      setIsInstallable(true);

      // Check if we should auto-show the popup
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt) {
        const elapsed = Date.now() - parseInt(dismissedAt, 10);
        if (elapsed < DISMISS_DELAY_MS) return;
      }
      // Small delay so user sees content first
      setTimeout(() => setShowPopup(true), 3000);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setShowPopup(false);
      setIsInstallable(false);
      localStorage.setItem(INSTALLED_KEY, "true");
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    // Also listen for custom events from index.html
    window.addEventListener("pwa-installable", () => {
      const stored = (window as any).deferredPrompt?.();
      if (stored) {
        setDeferredPrompt(stored);
        setIsInstallable(true);
      }
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, [isInstalled]);

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setShowPopup(false);
        setIsInstallable(false);
        localStorage.setItem(INSTALLED_KEY, "true");
        return true;
      }
    } catch {
      // prompt already used
    }
    setDeferredPrompt(null);
    return false;
  }, [deferredPrompt]);

  const dismissPopup = useCallback(() => {
    setShowPopup(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  }, []);

  const openPopup = useCallback(() => {
    if (isInstallable && !isInstalled) {
      setShowPopup(true);
    }
  }, [isInstallable, isInstalled]);

  return {
    isInstallable,
    isInstalled,
    showPopup,
    triggerInstall,
    dismissPopup,
    openPopup,
  };
}
