import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    // Simple mock that returns the key and any params for testing
    if (params) {
      let result = key;
      for (const [k, v] of Object.entries(params)) {
        result += ` ${k}:${v}`;
      }
      return result;
    }
    return key;
  },
  useLocale: () => 'en-US',
  useNow: () => new Date(),
  useTimeZone: () => 'UTC',
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: '1', email: 'test@test.com', name: 'Test User' } },
    status: 'authenticated',
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))
