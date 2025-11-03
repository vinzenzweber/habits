"use client";

import { useEffect, useState } from "react";

/**
 * Detects if the app is running as an installed PWA
 */
export function useIsPWA(): boolean {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (installed PWA)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ||
      document.referrer.includes("android-app://");

    setIsPWA(isStandalone);
  }, []);

  return isPWA;
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
  const [capability, setCapability] = useState<{
    canAutoplayUnmuted: boolean;
    platform: "ios" | "android" | "desktop" | "unknown";
  }>({
    canAutoplayUnmuted: false,
    platform: "unknown",
  });

  const isPWA = useIsPWA();

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    const isDesktop = !isIOS && !isAndroid;

    let platform: "ios" | "android" | "desktop" | "unknown" = "unknown";
    let canAutoplayUnmuted = false;

    if (isIOS) {
      platform = "ios";
      // iOS never allows unmuted autoplay, even as PWA
      canAutoplayUnmuted = false;
    } else if (isAndroid) {
      platform = "android";
      // Android Chrome allows unmuted autoplay when installed as PWA
      canAutoplayUnmuted = isPWA;
    } else if (isDesktop) {
      platform = "desktop";
      // Desktop Chrome allows unmuted autoplay based on Media Engagement Index
      // We can't reliably detect MEI, so assume it works if installed as PWA
      canAutoplayUnmuted = isPWA;
    }

    setCapability({ canAutoplayUnmuted, platform });
  }, [isPWA]);

  return capability;
}

// TypeScript interface for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
