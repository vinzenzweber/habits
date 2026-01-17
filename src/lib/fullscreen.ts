"use client";

import { RefObject, useCallback, useEffect, useMemo, useState } from "react";

/**
 * Extended Document interface with vendor-prefixed fullscreen properties
 */
interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  mozFullScreenEnabled?: boolean;
  msFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
}

/**
 * Extended HTMLElement interface with vendor-prefixed fullscreen methods
 */
interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

/**
 * Return type for the useFullscreen hook
 */
export interface UseFullscreenReturn {
  /** Whether the referenced element is currently in fullscreen mode */
  isFullscreen: boolean;
  /** Toggle fullscreen mode on/off */
  toggleFullscreen: () => Promise<void>;
  /** Enter fullscreen mode */
  enterFullscreen: () => Promise<void>;
  /** Exit fullscreen mode */
  exitFullscreen: () => Promise<void>;
  /** Whether the Fullscreen API is supported in the current browser */
  isSupported: boolean;
}

/**
 * A cross-browser fullscreen API hook with vendor prefix support.
 *
 * @param ref - React ref to the element that should be made fullscreen
 * @returns Object with fullscreen state and control methods
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const containerRef = useRef<HTMLDivElement>(null);
 *   const { isFullscreen, toggleFullscreen, isSupported } = useFullscreen(containerRef);
 *
 *   return (
 *     <div ref={containerRef}>
 *       {isSupported && (
 *         <button onClick={toggleFullscreen}>
 *           {isFullscreen ? 'Exit' : 'Enter'} Fullscreen
 *         </button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFullscreen(
  ref: RefObject<HTMLElement | null>
): UseFullscreenReturn {
  const [isFullscreen, setIsFullscreen] = useState(false);

  /**
   * Detects if the Fullscreen API is supported in the current browser
   */
  const isSupported = useMemo(() => {
    if (typeof document === "undefined") return false;
    const doc = document as FullscreenDocument;
    return !!(
      doc.fullscreenEnabled ||
      doc.webkitFullscreenEnabled ||
      doc.mozFullScreenEnabled ||
      doc.msFullscreenEnabled
    );
  }, []);

  /**
   * Gets the current fullscreen element across all vendor prefixes
   */
  const getFullscreenElement = useCallback((): Element | null => {
    if (typeof document === "undefined") return null;
    const doc = document as FullscreenDocument;
    return (
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement ||
      null
    );
  }, []);

  /**
   * Enters fullscreen mode for the referenced element
   */
  const enterFullscreen = useCallback(async (): Promise<void> => {
    const element = ref.current as FullscreenElement | null;
    if (!element || !isSupported) return;

    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        await element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      }
    } catch (error) {
      console.error("Failed to enter fullscreen:", error);
    }
  }, [ref, isSupported]);

  /**
   * Exits fullscreen mode
   */
  const exitFullscreen = useCallback(async (): Promise<void> => {
    if (typeof document === "undefined") return;
    const doc = document as FullscreenDocument;

    try {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
    } catch (error) {
      console.error("Failed to exit fullscreen:", error);
    }
  }, []);

  /**
   * Toggles fullscreen mode on/off
   */
  const toggleFullscreen = useCallback(async (): Promise<void> => {
    if (isFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  /**
   * Sets up event listeners for fullscreen changes across all vendor prefixes
   */
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleChange = () => {
      setIsFullscreen(getFullscreenElement() !== null);
    };

    // Listen to all vendor-prefixed fullscreen change events
    const events = [
      "fullscreenchange",
      "webkitfullscreenchange",
      "mozfullscreenchange",
      "MSFullscreenChange",
    ];

    events.forEach((event) => document.addEventListener(event, handleChange));

    return () => {
      events.forEach((event) =>
        document.removeEventListener(event, handleChange)
      );
    };
  }, [getFullscreenElement]);

  return {
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
    isSupported,
  };
}
