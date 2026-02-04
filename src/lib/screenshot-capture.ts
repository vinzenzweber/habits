/**
 * Client-side screenshot capture utility for feedback
 * Uses modern-screenshot which supports CSS Color Level 4 (lab, oklch, etc.)
 */

interface CaptureOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1 for JPEG quality
  format?: 'png' | 'jpeg';
}

interface CapturedScreenshot {
  label: string;
  dataUrl: string;
  width: number;
  height: number;
}

const DEFAULT_OPTIONS: CaptureOptions = {
  maxWidth: 1280,
  maxHeight: 960,
  quality: 0.8,
  format: 'jpeg'
};

/**
 * Dynamically import modern-screenshot only when needed
 * This keeps the main bundle smaller since screenshots are rare
 */
async function getModernScreenshot() {
  const modernScreenshot = await import('modern-screenshot');
  return modernScreenshot;
}

/**
 * Resize an image blob to fit within max dimensions while preserving aspect ratio
 * Returns a data URL of the resized image
 */
async function resizeImage(
  dataUrl: string,
  maxWidth: number,
  maxHeight: number,
  format: 'png' | 'jpeg',
  quality: number
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;

      // If already within bounds, return original
      if (width <= maxWidth && height <= maxHeight) {
        resolve({ dataUrl, width, height });
        return;
      }

      // Calculate scale to fit within bounds
      const scale = Math.min(maxWidth / width, maxHeight / height);
      const newWidth = Math.round(width * scale);
      const newHeight = Math.round(height * scale);

      // Create resized canvas
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ dataUrl, width, height });
        return;
      }

      // Draw scaled image
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Convert to data URL with compression
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const resizedDataUrl = canvas.toDataURL(mimeType, quality);

      resolve({ dataUrl: resizedDataUrl, width: newWidth, height: newHeight });
    };
    img.onerror = () => reject(new Error('Failed to load image for resizing'));
    img.src = dataUrl;
  });
}

/**
 * Capture a screenshot of the current viewport
 * Returns a compressed data URL suitable for upload
 */
export async function captureViewport(
  options: CaptureOptions = {}
): Promise<CapturedScreenshot | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const { domToDataUrl } = await getModernScreenshot();

    // Capture the document body
    const dataUrl = await domToDataUrl(document.body, {
      backgroundColor: '#0a0a0a', // Match app dark background
      // Constrain capture to the current viewport
      width: window.innerWidth,
      height: window.innerHeight,
      style: {
        // Override any problematic positioning during capture
        transform: `translate(${-window.scrollX}px, ${-window.scrollY}px)`,
      },
    });

    // Resize to fit max dimensions
    const resized = await resizeImage(
      dataUrl,
      opts.maxWidth!,
      opts.maxHeight!,
      opts.format!,
      opts.quality!
    );

    return {
      label: 'Current UI',
      dataUrl: resized.dataUrl,
      width: resized.width,
      height: resized.height
    };
  } catch (error) {
    console.error('[Screenshot] captureViewport failed:', error);
    return null;
  }
}

/**
 * Capture a screenshot of the background view (without modals/overlays)
 * This hides elements like chat modals before capturing
 */
export async function captureBackgroundView(
  modalSelector: string = '[data-chat-modal]',
  options: CaptureOptions = {}
): Promise<CapturedScreenshot | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Find elements to hide during capture
  const elementsToHide = document.querySelectorAll(modalSelector);
  const originalStyles: { element: HTMLElement; display: string }[] = [];

  try {
    const { domToDataUrl } = await getModernScreenshot();

    // Hide modal elements
    elementsToHide.forEach((el) => {
      const htmlEl = el as HTMLElement;
      originalStyles.push({ element: htmlEl, display: htmlEl.style.display });
      htmlEl.style.display = 'none';
    });

    // Small delay to let DOM update
    await new Promise(resolve => setTimeout(resolve, 50));

    // Capture the background
    const dataUrl = await domToDataUrl(document.body, {
      backgroundColor: '#0a0a0a',
    });

    // Resize to fit max dimensions
    const resized = await resizeImage(
      dataUrl,
      opts.maxWidth!,
      opts.maxHeight!,
      opts.format!,
      opts.quality!
    );

    return {
      label: 'Background View',
      dataUrl: resized.dataUrl,
      width: resized.width,
      height: resized.height
    };
  } catch (error) {
    console.error('[Screenshot] captureBackgroundView failed:', error);
    return null;
  } finally {
    // Always restore hidden elements, even if capture fails
    originalStyles.forEach(({ element, display }) => {
      element.style.display = display;
    });
  }
}

/**
 * Capture both the current UI and background view for feedback
 * Returns array of screenshots (may be empty if capture fails)
 */
export async function captureFeedbackScreenshots(
  modalSelector: string = '[data-chat-modal]',
  options: CaptureOptions = {}
): Promise<CapturedScreenshot[]> {
  const screenshots: CapturedScreenshot[] = [];

  // Try to capture background view first (before hiding anything)
  const backgroundScreenshot = await captureBackgroundView(modalSelector, options);
  if (backgroundScreenshot) {
    screenshots.push(backgroundScreenshot);
  }

  // Then capture current viewport (with modal visible)
  const viewportScreenshot = await captureViewport(options);
  if (viewportScreenshot) {
    screenshots.push(viewportScreenshot);
  }

  return screenshots;
}

/**
 * Check if screenshot capture is supported in the current browser
 */
export function isScreenshotCaptureSupported(): boolean {
  // Check for basic canvas support
  const canvas = document.createElement('canvas');
  return !!(canvas.getContext && canvas.getContext('2d'));
}
