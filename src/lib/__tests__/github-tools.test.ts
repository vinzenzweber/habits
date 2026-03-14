import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createFeedbackIssue, addFeedbackComment } from '../github-tools'

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

describe('addFeedbackComment', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetAllMocks()
    process.env = { ...originalEnv, GITHUB_TOKEN: 'test-token', GITHUB_REPO: 'test/repo' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('adds a comment to an existing feedback issue', async () => {
    // Mock GET issue
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        labels: [{ name: 'user-feedback' }],
        body: 'Some content\n*User ID: user-123*'
      })
    })
    // Mock POST comment
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 456 })
    })

    const result = await addFeedbackComment('user-123', 42, 'Here are more details about the bug')

    expect(result.success).toBe(true)
    expect(result.issueNumber).toBe(42)
    expect(result.message).toBe('Follow-up added to feedback')

    // Verify GET request
    expect(mockFetch).toHaveBeenCalledTimes(2)
    const [getUrl] = mockFetch.mock.calls[0]
    expect(getUrl).toBe('https://api.github.com/repos/test/repo/issues/42')

    // Verify POST comment request
    const [postUrl, postOptions] = mockFetch.mock.calls[1]
    expect(postUrl).toBe('https://api.github.com/repos/test/repo/issues/42/comments')
    expect(postOptions.method).toBe('POST')
    const body = JSON.parse(postOptions.body)
    expect(body.body).toContain('Here are more details about the bug')
    expect(body.body).toContain('Follow-up from user')
  })

  it('returns error when GITHUB_TOKEN is not configured', async () => {
    delete process.env.GITHUB_TOKEN

    const result = await addFeedbackComment('user-123', 42, 'Follow-up')

    expect(result.success).toBe(false)
    expect(result.message).toBe('GitHub integration not configured')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns error when issue does not exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: () => Promise.resolve('Not found')
    })

    const result = await addFeedbackComment('user-123', 999, 'Follow-up')

    expect(result.success).toBe(false)
    expect(result.message).toBe('Feedback issue not found')
  })

  it('returns error when issue is not a feedback issue', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        labels: [{ name: 'bug' }],
        body: 'Some content\n*User ID: user-123*'
      })
    })

    const result = await addFeedbackComment('user-123', 42, 'Follow-up')

    expect(result.success).toBe(false)
    expect(result.message).toBe('Not a feedback issue')
  })

  it('returns error when user does not own the issue', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        labels: [{ name: 'user-feedback' }],
        body: 'Some content\n*User ID: other-user*'
      })
    })

    const result = await addFeedbackComment('user-123', 42, 'Follow-up')

    expect(result.success).toBe(false)
    expect(result.message).toBe('Not authorized to comment on this issue')
  })

  it('rejects a user whose ID is a prefix of the issue owner ID', async () => {
    // user-12 must NOT be able to comment on an issue owned by user-123
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        labels: [{ name: 'user-feedback' }],
        body: 'Some content\n*User ID: user-123*'
      })
    })

    const result = await addFeedbackComment('user-12', 42, 'Follow-up')

    expect(result.success).toBe(false)
    expect(result.message).toBe('Not authorized to comment on this issue')
  })

  it('returns a generic error for non-404 issue fetch failures', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden')
    })

    const result = await addFeedbackComment('user-123', 42, 'Follow-up')

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to load feedback issue')
  })

  it('returns error when GitHub API fails to create comment', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        labels: [{ name: 'user-feedback' }],
        body: 'Some content\n*User ID: user-123*'
      })
    })
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve('API Error')
    })

    const result = await addFeedbackComment('user-123', 42, 'Follow-up')

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to add comment')
  })

  it('returns error when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const result = await addFeedbackComment('user-123', 42, 'Follow-up')

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to add comment')
  })
})
