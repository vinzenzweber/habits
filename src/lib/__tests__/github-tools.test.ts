import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createFeedbackIssue, type Screenshot } from '../github-tools'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('createFeedbackIssue', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetAllMocks()
    process.env = { ...originalEnv, GITHUB_TOKEN: 'test-token', GITHUB_REPO: 'test/repo' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('without screenshots', () => {
    it('creates a GitHub issue with correct payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ number: 123 })
      })

      const result = await createFeedbackIssue(
        'user-123',
        'Test Title',
        'Test description',
        'bug'
      )

      expect(result.success).toBe(true)
      expect(result.issueNumber).toBe(123)
      expect(result.message).toBe('Feedback recorded')

      // Verify fetch was called with correct params
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, options] = mockFetch.mock.calls[0]
      expect(url).toBe('https://api.github.com/repos/test/repo/issues')
      expect(options.method).toBe('POST')
      expect(options.headers['Authorization']).toBe('Bearer test-token')

      const body = JSON.parse(options.body)
      expect(body.title).toBe('[User Feedback] Test Title')
      expect(body.body).toContain('Test description')
      expect(body.body).toContain('User ID: user-123')
      expect(body.labels).toEqual(['bug', 'user-feedback'])
    })

    it('maps feedback types to correct labels', async () => {
      const testCases: Array<{ type: 'bug' | 'feature' | 'improvement' | 'question', labels: string[] }> = [
        { type: 'bug', labels: ['bug', 'user-feedback'] },
        { type: 'feature', labels: ['enhancement', 'user-feedback'] },
        { type: 'improvement', labels: ['enhancement', 'user-feedback'] },
        { type: 'question', labels: ['question', 'user-feedback'] }
      ]

      for (const { type, labels } of testCases) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ number: 1 })
        })

        await createFeedbackIssue('user', 'Title', 'Description', type)

        const body = JSON.parse(mockFetch.mock.calls[mockFetch.mock.calls.length - 1][1].body)
        expect(body.labels).toEqual(labels)
      }
    })

    it('returns error when GITHUB_TOKEN is not configured', async () => {
      delete process.env.GITHUB_TOKEN

      const result = await createFeedbackIssue('user', 'Title', 'Description', 'bug')

      expect(result.success).toBe(false)
      expect(result.message).toBe('GitHub integration not configured')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('returns error when GitHub API fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('API Error')
      })

      const result = await createFeedbackIssue('user', 'Title', 'Description', 'bug')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to create issue')
    })

    it('returns error when fetch throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await createFeedbackIssue('user', 'Title', 'Description', 'bug')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Failed to create issue')
    })
  })

  describe('with screenshots', () => {
    const mockScreenshot: Screenshot = {
      label: 'Current UI',
      dataUrl: 'data:image/png;base64,iVBORw0KGgo='
    }

    it('uploads screenshots and updates issue body', async () => {
      // Mock issue creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ number: 456 })
      })

      // Mock screenshot upload
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: { download_url: 'https://raw.githubusercontent.com/test/repo/main/.github/feedback-screenshots/test.png' }
        })
      })

      // Mock issue update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      })

      const result = await createFeedbackIssue(
        'user-123',
        'Test Title',
        'Test description',
        'bug',
        [mockScreenshot]
      )

      expect(result.success).toBe(true)
      expect(result.issueNumber).toBe(456)

      // Should have made 3 calls: create issue, upload screenshot, update issue
      expect(mockFetch).toHaveBeenCalledTimes(3)

      // Verify screenshot upload call
      const uploadCall = mockFetch.mock.calls[1]
      expect(uploadCall[0]).toContain('.github/feedback-screenshots/')
      expect(uploadCall[1].method).toBe('PUT')
      const uploadBody = JSON.parse(uploadCall[1].body)
      expect(uploadBody.content).toBe('iVBORw0KGgo=')
      expect(uploadBody.message).toContain('issue #456')

      // Verify issue update call
      const updateCall = mockFetch.mock.calls[2]
      expect(updateCall[0]).toBe('https://api.github.com/repos/test/repo/issues/456')
      expect(updateCall[1].method).toBe('PATCH')
      const updateBody = JSON.parse(updateCall[1].body)
      expect(updateBody.body).toContain('## Screenshots')
      expect(updateBody.body).toContain('### Current UI')
    })

    it('still succeeds if screenshot upload fails', async () => {
      // Mock issue creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ number: 789 })
      })

      // Mock screenshot upload failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Upload failed')
      })

      const result = await createFeedbackIssue(
        'user-123',
        'Test Title',
        'Test description',
        'bug',
        [mockScreenshot]
      )

      // Issue should still be created successfully
      expect(result.success).toBe(true)
      expect(result.issueNumber).toBe(789)

      // Should have made 2 calls: create issue, failed upload (no update call)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('handles multiple screenshots', async () => {
      const screenshots: Screenshot[] = [
        { label: 'Current UI', dataUrl: 'data:image/png;base64,abc123' },
        { label: 'Background View', dataUrl: 'data:image/jpeg;base64,def456' }
      ]

      // Mock issue creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ number: 100 })
      })

      // Mock first screenshot upload
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: { download_url: 'https://example.com/screenshot1.png' }
        })
      })

      // Mock second screenshot upload
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: { download_url: 'https://example.com/screenshot2.jpg' }
        })
      })

      // Mock issue update
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      })

      const result = await createFeedbackIssue(
        'user-123',
        'Title',
        'Description',
        'bug',
        screenshots
      )

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(4)

      // Verify update body contains both screenshots
      const updateBody = JSON.parse(mockFetch.mock.calls[3][1].body)
      expect(updateBody.body).toContain('### Current UI')
      expect(updateBody.body).toContain('### Background View')
    })

    it('rejects invalid data URL format', async () => {
      const invalidScreenshot: Screenshot = {
        label: 'Invalid',
        dataUrl: 'not-a-valid-data-url'
      }

      // Mock issue creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ number: 200 })
      })

      const result = await createFeedbackIssue(
        'user-123',
        'Title',
        'Description',
        'bug',
        [invalidScreenshot]
      )

      // Issue should still be created successfully (screenshots are optional)
      expect(result.success).toBe(true)
      expect(result.issueNumber).toBe(200)

      // Should only have called create issue, no upload attempt for invalid data
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })
})
