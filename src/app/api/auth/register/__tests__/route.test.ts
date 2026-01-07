import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing the route
vi.mock('@/lib/db', () => ({
  query: vi.fn()
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password')
  }
}))

import { POST } from '../route'
import { query } from '@/lib/db'

const mockQuery = vi.mocked(query)

function createRequest(body: object): Request {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('name validation', () => {
    it('returns error when name is missing', async () => {
      const request = createRequest({
        email: 'test@example.com',
        password: 'ValidPassword123!'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name is required')
    })

    it('returns error when name is empty string', async () => {
      const request = createRequest({
        email: 'test@example.com',
        password: 'ValidPassword123!',
        name: ''
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name is required')
    })

    it('returns error when name is only whitespace', async () => {
      const request = createRequest({
        email: 'test@example.com',
        password: 'ValidPassword123!',
        name: '   '
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name is required')
    })

    it('returns error when name is not a string', async () => {
      const request = createRequest({
        email: 'test@example.com',
        password: 'ValidPassword123!',
        name: 123
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name is required')
    })
  })

  describe('email validation', () => {
    it('returns error when email is missing', async () => {
      const request = createRequest({
        password: 'ValidPassword123!',
        name: 'Test User'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid email format')
    })

    it('returns error when email is invalid', async () => {
      const request = createRequest({
        email: 'invalid-email',
        password: 'ValidPassword123!',
        name: 'Test User'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid email format')
    })
  })

  describe('password validation', () => {
    it('returns error when password is too short', async () => {
      const request = createRequest({
        email: 'test@example.com',
        password: 'short',
        name: 'Test User'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Password must be 8-128 characters')
    })

    it('returns error when password is too long', async () => {
      const request = createRequest({
        email: 'test@example.com',
        password: 'a'.repeat(129),
        name: 'Test User'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Password must be 8-128 characters')
    })
  })

  describe('duplicate email', () => {
    it('returns error when email already exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 } as never)

      const request = createRequest({
        email: 'existing@example.com',
        password: 'ValidPassword123!',
        name: 'Test User'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email already registered')
    })
  })

  describe('successful registration', () => {
    it('creates user with trimmed name', async () => {
      // First query: check if user exists (empty result)
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      // Second query: insert user
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 } as never)
      // Third query: set onboarding_started_at
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)

      const request = createRequest({
        email: 'test@example.com',
        password: 'ValidPassword123!',
        name: '  Test User  '
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.userId).toBe(1)

      // Verify the INSERT query was called with trimmed name
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['test@example.com', 'Test User', 'hashed_password']
      )
    })

    it('returns success with userId', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 42 }], rowCount: 1 } as never)
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)

      const request = createRequest({
        email: 'newuser@example.com',
        password: 'ValidPassword123!',
        name: 'New User'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.userId).toBe(42)
    })
  })
})
