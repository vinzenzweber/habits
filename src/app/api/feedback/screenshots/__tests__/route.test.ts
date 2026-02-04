import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '../route'

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn()
}))

import { auth } from '@/lib/auth'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('POST /api/feedback/screenshots', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetAllMocks()
    process.env = { ...originalEnv, GITHUB_TOKEN: 'test-token', GITHUB_REPO: 'test/repo' }
    // Default authenticated user
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      expires: new Date(Date.now() + 86400000).toISOString()
    })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const request = new Request('http://localhost/api/feedback/screenshots', {
      method: 'POST',
      body: JSON.stringify({ issueNumber: 123, screenshots: [] })
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('returns 400 when issue number is missing', async () => {
    const request = new Request('http://localhost/api/feedback/screenshots', {
      method: 'POST',
      body: JSON.stringify({ screenshots: [] })
    })

    const response = await POST(request)
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toBe('Issue number is required')
  })

  it('returns 400 when screenshots array is empty', async () => {
    const request = new Request('http://localhost/api/feedback/screenshots', {
      method: 'POST',
      body: JSON.stringify({ issueNumber: 123, screenshots: [] })
    })

    const response = await POST(request)
    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toBe('Screenshots are required')
  })

  it('returns 500 when GITHUB_TOKEN is not configured', async () => {
    delete process.env.GITHUB_TOKEN

    const request = new Request('http://localhost/api/feedback/screenshots', {
      method: 'POST',
      body: JSON.stringify({
        issueNumber: 123,
        screenshots: [{ label: 'Test', dataUrl: 'data:image/png;base64,abc' }]
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(500)

    const data = await response.json()
    expect(data.error).toBe('GitHub integration not configured')
  })

  it('returns 404 when issue is not found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404
    })

    const request = new Request('http://localhost/api/feedback/screenshots', {
      method: 'POST',
      body: JSON.stringify({
        issueNumber: 999,
        screenshots: [{ label: 'Test', dataUrl: 'data:image/png;base64,abc' }]
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(404)
  })

  it('successfully uploads screenshots and updates issue', async () => {
    // Mock get existing issue with proper labels and user ID
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        body: '## User Feedback\n\nOriginal description\n\n---\n*User ID: user-123*',
        labels: [{ name: 'user-feedback' }, { name: 'bug' }]
      })
    })

    // Mock screenshot upload
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        content: { download_url: 'https://example.com/screenshot.png' }
      })
    })

    // Mock issue update
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({})
    })

    const request = new Request('http://localhost/api/feedback/screenshots', {
      method: 'POST',
      body: JSON.stringify({
        issueNumber: 123,
        screenshots: [{ label: 'Current UI', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' }]
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.screenshotsUploaded).toBe(1)

    // Verify fetch calls
    expect(mockFetch).toHaveBeenCalledTimes(3)

    // Verify issue update contains screenshots section
    const updateBody = JSON.parse(mockFetch.mock.calls[2][1].body)
    expect(updateBody.body).toContain('## Screenshots')
    expect(updateBody.body).toContain('### Current UI')
    expect(updateBody.body).toContain('Original description')
  })

  it('handles multiple screenshots', async () => {
    // Mock get existing issue with proper labels and user ID
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        body: '## User Feedback\n\nDescription\n\n---\n*User ID: user-123*',
        labels: [{ name: 'user-feedback' }]
      })
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

    const request = new Request('http://localhost/api/feedback/screenshots', {
      method: 'POST',
      body: JSON.stringify({
        issueNumber: 123,
        screenshots: [
          { label: 'Current UI', dataUrl: 'data:image/png;base64,abc' },
          { label: 'Background View', dataUrl: 'data:image/jpeg;base64,def' }
        ]
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(data.screenshotsUploaded).toBe(2)
    expect(mockFetch).toHaveBeenCalledTimes(4)
  })

  it('returns 500 when all screenshot uploads fail', async () => {
    // Mock get existing issue with proper labels and user ID
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        body: 'Issue body\n\n---\n*User ID: user-123*',
        labels: [{ name: 'user-feedback' }]
      })
    })

    // Mock failed screenshot upload
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve('Upload failed')
    })

    const request = new Request('http://localhost/api/feedback/screenshots', {
      method: 'POST',
      body: JSON.stringify({
        issueNumber: 123,
        screenshots: [{ label: 'Test', dataUrl: 'data:image/png;base64,abc' }]
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(500)

    const data = await response.json()
    expect(data.error).toBe('Failed to upload screenshots')
  })
})
