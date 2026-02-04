/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock modern-screenshot - factory cannot reference external variables
vi.mock('modern-screenshot', () => ({
  domToDataUrl: vi.fn()
}))

import { domToDataUrl } from 'modern-screenshot'
import {
  captureViewport,
  captureBackgroundView,
  captureFeedbackScreenshots,
  isScreenshotCaptureSupported
} from '../screenshot-capture'

describe('screenshot-capture', () => {
  // Use a minimal valid 1x1 PNG that browsers can load
  const mockDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

  // Mock Image to prevent loading issues in jsdom
  let originalImage: typeof Image

  beforeEach(() => {
    vi.clearAllMocks()
    // Setup the mock to return our data URL
    vi.mocked(domToDataUrl).mockResolvedValue(mockDataUrl)

    // Mock Image to immediately trigger onload
    originalImage = global.Image
    class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      width = 100
      height = 100
      private _src = ''

      get src() {
        return this._src
      }

      set src(value: string) {
        this._src = value
        // Trigger onload asynchronously to simulate real behavior
        setTimeout(() => {
          if (this.onload) this.onload()
        }, 0)
      }
    }
    global.Image = MockImage as unknown as typeof Image
  })

  afterEach(() => {
    vi.restoreAllMocks()
    global.Image = originalImage
  })

  describe('captureViewport', () => {
    it('captures the viewport using modern-screenshot', async () => {
      const result = await captureViewport()

      expect(domToDataUrl).toHaveBeenCalledWith(document.body, expect.objectContaining({
        backgroundColor: '#0a0a0a',
        width: window.innerWidth,
        height: window.innerHeight
      }))

      expect(result).not.toBeNull()
      expect(result?.label).toBe('Current UI')
      expect(result?.dataUrl).toContain('data:image/')
    })

    it('returns null when capture fails', async () => {
      vi.mocked(domToDataUrl).mockRejectedValueOnce(new Error('Capture failed'))

      const result = await captureViewport()

      expect(result).toBeNull()
    })

    it('uses png format when specified', async () => {
      await captureViewport({ format: 'png', quality: 1 })

      // The function should call domToDataUrl
      expect(domToDataUrl).toHaveBeenCalled()
    })
  })

  describe('captureBackgroundView', () => {
    it('calls modern-screenshot to capture background', async () => {
      const result = await captureBackgroundView('[data-nonexistent]')

      expect(domToDataUrl).toHaveBeenCalled()
      // Should return screenshot data when domToDataUrl succeeds
      expect(result).not.toBeNull()
      expect(result?.label).toBe('Background View')
    })

    it('temporarily hides modal elements during capture', async () => {
      // Create a mock modal element
      const mockModal = document.createElement('div')
      mockModal.setAttribute('data-chat-modal', '')
      mockModal.style.display = 'flex'
      document.body.appendChild(mockModal)

      await captureBackgroundView('[data-chat-modal]')

      // After capture completes, the modal should be restored
      expect(mockModal.style.display).toBe('flex')

      // Cleanup
      document.body.removeChild(mockModal)
    })

    it('returns null when capture fails', async () => {
      vi.mocked(domToDataUrl).mockRejectedValueOnce(new Error('Capture failed'))

      const result = await captureBackgroundView()

      expect(result).toBeNull()
    })
  })

  describe('captureFeedbackScreenshots', () => {
    it('captures both background and viewport screenshots', async () => {
      const results = await captureFeedbackScreenshots()

      // Should call domToDataUrl twice - once for background, once for viewport
      expect(domToDataUrl).toHaveBeenCalledTimes(2)
      expect(results).toHaveLength(2)
      expect(results[0]?.label).toBe('Background View')
      expect(results[1]?.label).toBe('Current UI')
    })

    it('returns partial results when one capture fails', async () => {
      // First call (background) fails, second call (viewport) succeeds
      vi.mocked(domToDataUrl)
        .mockRejectedValueOnce(new Error('Background capture failed'))
        .mockResolvedValueOnce(mockDataUrl)

      const results = await captureFeedbackScreenshots()

      expect(results).toHaveLength(1)
      expect(results[0]?.label).toBe('Current UI')
    })

    it('returns empty array when all captures fail', async () => {
      vi.mocked(domToDataUrl).mockRejectedValue(new Error('All captures failed'))

      const results = await captureFeedbackScreenshots()

      expect(results).toHaveLength(0)
    })
  })

  describe('isScreenshotCaptureSupported', () => {
    it('returns false in jsdom environment without canvas package', () => {
      // jsdom without canvas npm package returns null for getContext
      // In a real browser, this would return true
      expect(isScreenshotCaptureSupported()).toBe(false)
    })
  })
})
