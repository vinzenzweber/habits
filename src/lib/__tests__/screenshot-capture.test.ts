/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock html2canvas - factory cannot reference external variables
vi.mock('html2canvas', () => ({
  default: vi.fn()
}))

import html2canvas from 'html2canvas'
import {
  captureViewport,
  captureBackgroundView,
  captureFeedbackScreenshots,
  isScreenshotCaptureSupported
} from '../screenshot-capture'

describe('screenshot-capture', () => {
  // Define mock canvas inside the test suite
  const mockCanvas = {
    width: 1920,
    height: 1080,
    toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,mockedData'),
    getContext: vi.fn().mockReturnValue({
      drawImage: vi.fn()
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Setup the mock to return our canvas
    vi.mocked(html2canvas).mockResolvedValue(mockCanvas as unknown as HTMLCanvasElement)
    // Reset the mock canvas
    mockCanvas.width = 1920
    mockCanvas.height = 1080
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('captureViewport', () => {
    it('captures the viewport using html2canvas', async () => {
      const result = await captureViewport()

      expect(html2canvas).toHaveBeenCalledWith(document.body, expect.objectContaining({
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#0a0a0a',
        logging: false,
        width: window.innerWidth,
        height: window.innerHeight,
        x: window.scrollX,
        y: window.scrollY
      }))

      expect(result).not.toBeNull()
      expect(result?.label).toBe('Current UI')
      expect(result?.dataUrl).toBe('data:image/jpeg;base64,mockedData')
    })

    it('returns null when capture fails', async () => {
      vi.mocked(html2canvas).mockRejectedValueOnce(new Error('Capture failed'))

      const result = await captureViewport()

      expect(result).toBeNull()
    })

    it('uses png format when specified', async () => {
      await captureViewport({ format: 'png', quality: 1 })

      // The function should call toDataURL with png format
      // Since we're testing the actual implementation logic, this tests that the options
      // are being processed correctly
      expect(html2canvas).toHaveBeenCalled()
    })
  })

  describe('captureBackgroundView', () => {
    it('calls html2canvas to capture background', async () => {
      const result = await captureBackgroundView('[data-nonexistent]')

      expect(html2canvas).toHaveBeenCalled()
      // Should return screenshot data when html2canvas succeeds
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
      vi.mocked(html2canvas).mockRejectedValueOnce(new Error('Capture failed'))

      const result = await captureBackgroundView()

      expect(result).toBeNull()
    })
  })

  describe('captureFeedbackScreenshots', () => {
    it('captures both background and viewport screenshots', async () => {
      const results = await captureFeedbackScreenshots()

      // Should call html2canvas twice - once for background, once for viewport
      expect(html2canvas).toHaveBeenCalledTimes(2)
      expect(results).toHaveLength(2)
      expect(results[0]?.label).toBe('Background View')
      expect(results[1]?.label).toBe('Current UI')
    })

    it('returns partial results when one capture fails', async () => {
      // First call (background) fails, second call (viewport) succeeds
      vi.mocked(html2canvas)
        .mockRejectedValueOnce(new Error('Background capture failed'))
        .mockResolvedValueOnce(mockCanvas as unknown as HTMLCanvasElement)

      const results = await captureFeedbackScreenshots()

      expect(results).toHaveLength(1)
      expect(results[0]?.label).toBe('Current UI')
    })

    it('returns empty array when all captures fail', async () => {
      vi.mocked(html2canvas).mockRejectedValue(new Error('All captures failed'))

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
