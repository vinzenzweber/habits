---
description: Implement missing tests and run until all pass
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Task, TodoWrite
---

# Test Implementation and Verification

Your task is to implement or update any missing tests and run them until all tests pass.

## Step 1: Identify What Needs Testing

First, determine what code needs test coverage:

1. Check git status for recently modified files:
   ```bash
   git diff --name-only HEAD~5
   git status --short
   ```

2. Look for source files without corresponding test files:
   - Source files in `src/lib/` should have tests in `src/lib/__tests__/`
   - Source files in `src/components/` should have tests in `src/components/__tests__/`
   - E2E tests for user flows are in `e2e/` directory
   - Unit test files: `*.test.ts` or `*.test.tsx`
   - E2E test files: `*.spec.ts`

3. Run coverage report to find gaps:
   ```bash
   npm run test:coverage 2>&1 | tail -50
   ```

## Step 2: Implement Missing Tests

For each file that needs tests:

1. Read the source file to understand what it does
2. Create or update the corresponding test file
3. Follow existing test patterns in the codebase:
   - Use Vitest for unit tests
   - Use Testing Library for component tests
   - Mock external dependencies (database, OpenAI API)
   - Place tests in `__tests__` directories

### Test File Template
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies as needed
vi.mock('@/lib/db', () => ({
  query: vi.fn()
}));

describe('ModuleName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should do something specific', () => {
    // Arrange
    // Act
    // Assert
    expect(result).toBe(expected);
  });
});
```

## Step 3: Run All Tests Until All Pass

Execute this loop until ALL tests pass (both unit and E2E):

### 3a. Run Both Test Suites in Parallel

Run unit tests and E2E tests simultaneously for faster feedback:

```bash
# Run unit tests in background
npm run test:unit 2>&1 &
UNIT_PID=$!

# Run E2E tests in background
npm run test:e2e 2>&1 &
E2E_PID=$!

# Wait for both to complete
wait $UNIT_PID $E2E_PID
```

Or use the Bash tool twice in parallel (preferred):
- First call: `npm run test:unit 2>&1`
- Second call: `npm run test:e2e 2>&1`

### 3b. Fix Any Failures

If unit tests fail:
- Read the error output carefully
- Identify the failing test and the cause
- Fix the test or the source code as appropriate

If E2E tests fail:
- Read the Playwright error output
- Check for selector issues, timing problems, or app bugs
- Fix the test or the source code as appropriate

### 3c. Re-run Failed Suites

After fixing, re-run only the suites that failed (in parallel if both failed).

Keep iterating until:
- All unit tests pass ✓
- All E2E tests pass ✓

## Step 4: Final Verification

Once ALL tests pass:

1. Run unit tests with coverage:
   ```bash
   npm run test:coverage 2>&1 | tail -30
   ```

2. Confirm E2E still passes:
   ```bash
   npm run test:e2e 2>&1
   ```

3. Report summary of:
   - Tests added/updated
   - Unit test count and coverage percentage
   - E2E test count
   - All tests passing confirmation

## Important Guidelines

- Focus on testing business logic and critical paths
- Don't over-test trivial code (simple getters, pass-through functions)
- Mock external dependencies in unit tests (database, APIs, file system)
- E2E tests run against real app with database - ensure test data isolation
- Test edge cases and error conditions
- Keep tests fast and isolated
- E2E tests are in `e2e/` directory using Playwright

## Arguments

If an argument is provided (e.g., `/test auth`), focus testing efforts on files matching that pattern.
