import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createFeedbackIssue } from '../github-tools'

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
})
