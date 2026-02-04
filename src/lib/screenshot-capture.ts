/**
 * Client-side screenshot capture utility for feedback
 * Uses html2canvas to capture DOM elements as images
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
 * Dynamically import html2canvas only when needed
 * This keeps the main bundle smaller since screenshots are rare
 */
async function getHtml2Canvas(): Promise<typeof import('html2canvas').default> {
  const html2canvasModule = await import('html2canvas');
  return html2canvasModule.default;
}

/**
 * Resize a canvas to fit within max dimensions while preserving aspect ratio
 */
function resizeCanvas(
  sourceCanvas: HTMLCanvasElement,
  maxWidth: number,
  maxHeight: number
): HTMLCanvasElement {
  const { width, height } = sourceCanvas;

  // If already within bounds, return original
  if (width <= maxWidth && height <= maxHeight) {
    return sourceCanvas;
  }

  // Calculate scale to fit within bounds
  const scale = Math.min(maxWidth / width, maxHeight / height);
  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);

  // Create resized canvas
  const resizedCanvas = document.createElement('canvas');
  resizedCanvas.width = newWidth;
  resizedCanvas.height = newHeight;

  const ctx = resizedCanvas.getContext('2d');
  if (!ctx) {
    return sourceCanvas;
  }

  // Draw scaled image
  ctx.drawImage(sourceCanvas, 0, 0, newWidth, newHeight);
  return resizedCanvas;
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
    const html2canvas = await getHtml2Canvas();

    // Capture only the currently visible viewport region of the document
    const canvas = await html2canvas(document.body, {
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#0a0a0a', // Match app dark background
      logging: false,
      // Constrain capture to the current viewport
      width: window.innerWidth,
      height: window.innerHeight,
      x: window.scrollX,
      y: window.scrollY,
      // Ignore elements that shouldn't be captured (like modals being captured)
      ignoreElements: (_element) => {
        // Don't ignore anything for full viewport capture
        return false;
      }
    });

    // Resize to fit max dimensions
    const resizedCanvas = resizeCanvas(canvas, opts.maxWidth!, opts.maxHeight!);

    // Convert to data URL with compression
    const mimeType = opts.format === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl = resizedCanvas.toDataURL(mimeType, opts.quality);

    return {
      label: 'Current UI',
      dataUrl,
      width: resizedCanvas.width,
      height: resizedCanvas.height
    };
  } catch (error) {
    console.error('Failed to capture viewport:', error);
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
    const html2canvas = await getHtml2Canvas();

    // Hide modal elements
    elementsToHide.forEach((el) => {
      const htmlEl = el as HTMLElement;
      originalStyles.push({ element: htmlEl, display: htmlEl.style.display });
      htmlEl.style.display = 'none';
    });

    // Small delay to let DOM update
    await new Promise(resolve => setTimeout(resolve, 50));

    // Capture the background
    const canvas = await html2canvas(document.body, {
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#0a0a0a',
      logging: false
    });

    // Resize to fit max dimensions
    const resizedCanvas = resizeCanvas(canvas, opts.maxWidth!, opts.maxHeight!);

    // Convert to data URL with compression
    const mimeType = opts.format === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl = resizedCanvas.toDataURL(mimeType, opts.quality);

    return {
      label: 'Background View',
      dataUrl,
      width: resizedCanvas.width,
      height: resizedCanvas.height
    };
  } catch (error) {
    console.error('Failed to capture background view:', error);
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
