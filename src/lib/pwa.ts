"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Detects if the app is running as an installed PWA
 */
export function useIsPWA(): boolean {
  return useMemo(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ||
      document.referrer.includes("android-app://")
    );
  }, []);
}

/**
 * Detects if the browser supports PWA installation
 */
export function useCanInstallPWA(): {
  canInstall: boolean;
  promptInstall: () => Promise<void>;
} {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();
      // Store the event so it can be triggered later
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`User response to install prompt: ${outcome}`);

    // Clear the deferredPrompt for the next time
    setDeferredPrompt(null);
  };

  return {
    canInstall: deferredPrompt !== null,
    promptInstall,
  };
}

/**
 * Detects platform-specific autoplay capabilities
 */
export function useAutoplayCapability(): {
  canAutoplayUnmuted: boolean;
  platform: "ios" | "android" | "desktop" | "unknown";
} {
  const isPWA = useIsPWA();

  return useMemo(() => {
    if (typeof window === "undefined") {
      return { canAutoplayUnmuted: false, platform: "unknown" as const };
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    const isDesktop = !isIOS && !isAndroid;

    if (isIOS) {
      return { canAutoplayUnmuted: false, platform: "ios" as const };
    }

    if (isAndroid) {
      return {
        canAutoplayUnmuted: isPWA,
        platform: "android" as const,
      };
    }

    if (isDesktop) {
      return {
        canAutoplayUnmuted: isPWA,
        platform: "desktop" as const,
      };
    }

    return { canAutoplayUnmuted: false, platform: "unknown" as const };
  }, [isPWA]);
}

// TypeScript interface for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
