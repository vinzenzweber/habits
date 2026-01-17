import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing the route
vi.mock('@/lib/db', () => ({
  query: vi.fn()
}))

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
  unstable_update: vi.fn()
}))

import { GET, PUT } from '../route'
import { query } from '@/lib/db'
import { auth, unstable_update } from '@/lib/auth'

const mockQuery = vi.mocked(query)
const mockAuth = vi.mocked(auth)
const mockUnstableUpdate = vi.mocked(unstable_update)

function createPutRequest(body: object): Request {
  return new Request('http://localhost/api/user/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

describe('/api/user/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 404 when user not found', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: '1', email: 'test@example.com', name: 'Test', timezone: 'UTC', locale: 'en-US', unitSystem: 'metric' },
        expires: ''
      })
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('returns user preferences', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: '1', email: 'test@example.com', name: 'Test', timezone: 'UTC', locale: 'en-US', unitSystem: 'metric' },
        expires: ''
      })
      mockQuery.mockResolvedValueOnce({
        rows: [{ timezone: 'America/New_York', locale: 'en-US', unit_system: 'imperial' }],
        rowCount: 1
      } as never)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.timezone).toBe('America/New_York')
      expect(data.locale).toBe('en-US')
      expect(data.unitSystem).toBe('imperial')
    })

    it('returns defaults for null values', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: '1', email: 'test@example.com', name: 'Test', timezone: 'UTC', locale: 'en-US', unitSystem: 'metric' },
        expires: ''
      })
      mockQuery.mockResolvedValueOnce({
        rows: [{ timezone: null, locale: null, unit_system: null }],
        rowCount: 1
      } as never)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.timezone).toBe('UTC')
      expect(data.locale).toBe('en-US')
      expect(data.unitSystem).toBe('metric')
    })
  })

  describe('PUT', () => {
    it('returns 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null)

      const request = createPutRequest({ timezone: 'UTC' })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns error for invalid timezone', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: '1', email: 'test@example.com', name: 'Test', timezone: 'UTC', locale: 'en-US', unitSystem: 'metric' },
        expires: ''
      })

      const request = createPutRequest({ timezone: 'Invalid/Timezone' })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid timezone')
    })

    it('returns error for invalid locale', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: '1', email: 'test@example.com', name: 'Test', timezone: 'UTC', locale: 'en-US', unitSystem: 'metric' },
        expires: ''
      })

      // Use a truly invalid locale format (contains invalid characters)
      const request = createPutRequest({ locale: 'not a locale!' })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid locale')
    })

    it('returns error for invalid unit system', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: '1', email: 'test@example.com', name: 'Test', timezone: 'UTC', locale: 'en-US', unitSystem: 'metric' },
        expires: ''
      })

      const request = createPutRequest({ unitSystem: 'invalid' })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid unit system')
    })

    it('returns error when no fields provided', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: '1', email: 'test@example.com', name: 'Test', timezone: 'UTC', locale: 'en-US', unitSystem: 'metric' },
        expires: ''
      })

      const request = createPutRequest({})
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No valid fields to update')
    })

    it('updates timezone only', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: '1', email: 'test@example.com', name: 'Test', timezone: 'UTC', locale: 'en-US', unitSystem: 'metric' },
        expires: ''
      })
      // Update query
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
      // Select query after update
      mockQuery.mockResolvedValueOnce({
        rows: [{ timezone: 'Europe/Berlin', locale: 'en-US', unit_system: 'metric' }],
        rowCount: 1
      } as never)

      const request = createPutRequest({ timezone: 'Europe/Berlin' })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.timezone).toBe('Europe/Berlin')
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('timezone'),
        ['Europe/Berlin', '1']
      )
    })

    it('updates locale only', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: '1', email: 'test@example.com', name: 'Test', timezone: 'UTC', locale: 'en-US', unitSystem: 'metric' },
        expires: ''
      })
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
      mockQuery.mockResolvedValueOnce({
        rows: [{ timezone: 'UTC', locale: 'de-DE', unit_system: 'metric' }],
        rowCount: 1
      } as never)

      const request = createPutRequest({ locale: 'de-DE' })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.locale).toBe('de-DE')
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('locale'),
        ['de-DE', '1']
      )
    })

    it('updates unit system only', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: '1', email: 'test@example.com', name: 'Test', timezone: 'UTC', locale: 'en-US', unitSystem: 'metric' },
        expires: ''
      })
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
      mockQuery.mockResolvedValueOnce({
        rows: [{ timezone: 'UTC', locale: 'en-US', unit_system: 'imperial' }],
        rowCount: 1
      } as never)

      const request = createPutRequest({ unitSystem: 'imperial' })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.unitSystem).toBe('imperial')
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('unit_system'),
        ['imperial', '1']
      )
    })

    it('updates all fields at once', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: '1', email: 'test@example.com', name: 'Test', timezone: 'UTC', locale: 'en-US', unitSystem: 'metric' },
        expires: ''
      })
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
      mockQuery.mockResolvedValueOnce({
        rows: [{ timezone: 'Asia/Tokyo', locale: 'ja-JP', unit_system: 'metric' }],
        rowCount: 1
      } as never)

      const request = createPutRequest({
        timezone: 'Asia/Tokyo',
        locale: 'ja-JP',
        unitSystem: 'metric'
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.timezone).toBe('Asia/Tokyo')
      expect(data.locale).toBe('ja-JP')
      expect(data.unitSystem).toBe('metric')
    })

    it('returns multiple validation errors', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: '1', email: 'test@example.com', name: 'Test', timezone: 'UTC', locale: 'en-US', unitSystem: 'metric' },
        expires: ''
      })

      const request = createPutRequest({
        timezone: 'Invalid/Zone',
        locale: 'not a locale!',
        unitSystem: 'wrong'
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid timezone')
      expect(data.error).toContain('Invalid locale')
      expect(data.error).toContain('Invalid unit system')
    })

    describe('session update via unstable_update', () => {
      it('calls unstable_update with new preferences after successful update', async () => {
        mockAuth.mockResolvedValueOnce({
          user: { id: '1', email: 'test@example.com', name: 'Test', timezone: 'UTC', locale: 'en-US', unitSystem: 'metric' },
          expires: ''
        })
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
        mockQuery.mockResolvedValueOnce({
          rows: [{ timezone: 'Asia/Tokyo', locale: 'ja-JP', unit_system: 'imperial' }],
          rowCount: 1
        } as never)
        mockUnstableUpdate.mockResolvedValueOnce(undefined)

        const request = createPutRequest({
          timezone: 'Asia/Tokyo',
          locale: 'ja-JP',
          unitSystem: 'imperial'
        })
        const response = await PUT(request)

        expect(response.status).toBe(200)
        expect(mockUnstableUpdate).toHaveBeenCalledTimes(1)
        expect(mockUnstableUpdate).toHaveBeenCalledWith({
          user: {
            timezone: 'Asia/Tokyo',
            locale: 'ja-JP',
            unitSystem: 'imperial'
          }
        })
      })

      it('calls unstable_update with default values for null DB fields', async () => {
        mockAuth.mockResolvedValueOnce({
          user: { id: '1', email: 'test@example.com', name: 'Test', timezone: 'UTC', locale: 'en-US', unitSystem: 'metric' },
          expires: ''
        })
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
        // DB returns null values
        mockQuery.mockResolvedValueOnce({
          rows: [{ timezone: null, locale: null, unit_system: null }],
          rowCount: 1
        } as never)
        mockUnstableUpdate.mockResolvedValueOnce(undefined)

        const request = createPutRequest({ timezone: 'UTC' })
        const response = await PUT(request)

        expect(response.status).toBe(200)
        expect(mockUnstableUpdate).toHaveBeenCalledWith({
          user: {
            timezone: 'UTC',
            locale: 'en-US',
            unitSystem: 'metric'
          }
        })
      })

      it('does not call unstable_update on validation error', async () => {
        mockAuth.mockResolvedValueOnce({
          user: { id: '1', email: 'test@example.com', name: 'Test', timezone: 'UTC', locale: 'en-US', unitSystem: 'metric' },
          expires: ''
        })

        const request = createPutRequest({ timezone: 'Invalid/Zone' })
        const response = await PUT(request)

        expect(response.status).toBe(400)
        expect(mockUnstableUpdate).not.toHaveBeenCalled()
      })

      it('does not call unstable_update when not authenticated', async () => {
        mockAuth.mockResolvedValueOnce(null)

        const request = createPutRequest({ timezone: 'UTC' })
        const response = await PUT(request)

        expect(response.status).toBe(401)
        expect(mockUnstableUpdate).not.toHaveBeenCalled()
      })

      it('returns success even when unstable_update fails', async () => {
        mockAuth.mockResolvedValueOnce({
          user: { id: '1', email: 'test@example.com', name: 'Test', timezone: 'UTC', locale: 'en-US', unitSystem: 'metric' },
          expires: ''
        })
        mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
        mockQuery.mockResolvedValueOnce({
          rows: [{ timezone: 'UTC', locale: 'en-US', unit_system: 'metric' }],
          rowCount: 1
        } as never)
        // Simulate unstable_update failing
        mockUnstableUpdate.mockRejectedValueOnce(new Error('Session update failed'))

        const request = createPutRequest({ timezone: 'UTC' })
        const response = await PUT(request)
        const data = await response.json()

        // Should succeed despite session error - DB update succeeded
        expect(response.status).toBe(200)
        expect(data.timezone).toBe('UTC')
        expect(mockUnstableUpdate).toHaveBeenCalledTimes(1)
      })
    })
  })
})
