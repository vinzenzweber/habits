# Automated Development Loop

`./code.sh` orchestrates multiple Claude Code sessions to automate the Feature Development Workflow. It fetches GitHub issues, plans, implements, tests, reviews, and deploys—all with minimal human intervention.

## Quick Start

```bash
./code.sh          # Run continuous loop
./code.sh --once   # Run single cycle
```

## Session Architecture

The script separates work into distinct Claude Code sessions with intentional context boundaries:

```
┌─────────────────────────────────────────────────────────────────┐
│  SESSION 1: Issue Selection                                      │
│  Context: Clean                                                  │
│  • Fetch open GitHub issues                                      │
│  • Analyze priority, complexity, dependencies                    │
│  • Select best issue to work on                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  SESSION 2: Planning                                             │
│  Context: Clean (print mode, non-interactive)                    │
│  • Explore codebase                                              │
│  • Create implementation plan                                    │
│  • Post plan as GitHub issue comment                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  SESSION 3: Implementation + Testing + PR                        │
│  Context: SHARED (tight feedback loop)                           │
│  • Implement feature                                             │
│  • Run lint, build, tests                                        │
│  • Manual testing with Playwright                                │
│  • Create PR                                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  CI WAIT (not a Claude session)                                  │
│  • gh pr checks --watch                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  SESSION 4: Code Review                                          │
│  Context: CLEAN (critical for quality!)                          │
│  • Fresh eyes review                                             │
│  • No implementation bias                                        │
│  • Security, correctness, KISS checks                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
          [Changes Requested]      [Approved]
                    │                   │
                    ▼                   │
┌───────────────────────────────┐       │
│  SESSION 5: Fix Feedback      │       │
│  • Address review comments    │       │
│  • Push fixes                 │       │
│  • Loop back to CI            │       │
└───────────────────────────────┘       │
                                        ▼
┌─────────────────────────────────────────────────────────────────┐
│  SESSION 6: Merge + Deploy + Verify                              │
│  Context: Shared                                                 │
│  • Merge PR                                                      │
│  • Wait for Railway deployment                                   │
│  • Verify in production                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  SESSION 7: Documentation (optional)                             │
│  Context: Clean                                                  │
│  • Check if CLAUDE.md needs updates                              │
│  • Update docs if significant changes                            │
└─────────────────────────────────────────────────────────────────┘
```

## Why Session Boundaries Matter

### Shared Context Sessions
Sessions 3 and 6 use **shared context** because they involve tight feedback loops:
- Implementation → Testing → Fixing requires remembering what was just written
- PR creation needs context of all changes made
- Merge → Deploy → Verify are sequential dependent steps

### Clean Context Sessions
Sessions 1, 2, 4, 5, and 7 use **clean context** for objectivity:
- **Issue Selection**: Focused decision-making without baggage
- **Planning**: Fresh codebase exploration without selection bias
- **Code Review**: No "I know what I meant" bias—reviews actual code objectively
- **Fix Feedback**: Address specific comments without defensive context
- **Documentation**: Focused on docs, not implementation details

### The Code Review Insight

Session 4 (Code Review) is **intentionally separate** with a clean context. This is the key quality mechanism:

- Claude reviews the PR as if seeing it for the first time
- No confirmation bias from implementing the code
- Catches issues the implementer was blind to
- Simulates having a real colleague review your PR

## State Management

The script maintains state in `.auto-dev/` (gitignored):

```
.auto-dev/
├── auto-dev.log        # Full execution log
├── selected_issue.json # Currently selected issue
├── review_result.json  # Code review output
└── docs_check.json     # Documentation check result
```

## Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| `MAX_REVIEW_ROUNDS` | 3 | Max review/fix cycles before giving up |
| No issues wait | 30 min | Sleep duration when no issues available |
| Between cycles | 30 sec | Pause between development cycles |

## Error Handling

The script handles failures gracefully:

| Failure | Behavior |
|---------|----------|
| No issues found | Wait 30 minutes, retry |
| Implementation fails | Skip issue, continue to next |
| CI fails | Log error, skip to next issue |
| Review not approved after 3 rounds | Skip issue, manual intervention needed |
| Deployment fails | Log error, continue |

## Prerequisites

- `claude` CLI installed and authenticated
- `gh` CLI installed and authenticated
- `jq` installed (for JSON parsing)
- `railway` CLI (for deployment logs)
- Playwright MCP configured (for browser testing)

## Claude Configuration

The script runs Claude with:
- `--dangerously-skip-permissions` - Bypasses all permission prompts for full automation
- `--model opus` - Uses Claude Opus for highest quality reasoning

Ensure you trust the codebase before running unattended.

## Example Output

```
╔════════════════════════════════════════════════════════════╗
║          AUTO-DEV: Automated Development Loop              ║
╚════════════════════════════════════════════════════════════╝

[12:34:56] Continuous mode - Press Ctrl+C to stop

[12:34:56] ═══════════════════════════════════════════════════════
[12:34:56] Starting new development cycle at Thu Jan 9 12:34:56 2025
[12:34:56] ═══════════════════════════════════════════════════════

SESSION 1: Issue Selection
[12:34:56] Analyzing open issues to select the best one to work on...
[12:35:02] ✓ Selected issue #42: Add dark mode toggle

SESSION 2: Planning
[12:35:02] Planning implementation for issue #42...
[12:36:45] ✓ Planning session complete (user approved)

SESSION 3: Implementation + Testing + PR Creation
[12:36:45] Implementing and testing issue #42...
[12:45:30] ✓ PR #43 created

CI Check
[12:45:30] Waiting for CI checks on PR #43...
[12:48:15] ✓ CI checks passed

SESSION 4: Code Review (Fresh Context)
[12:48:15] Reviewing PR #43 with fresh eyes...
[12:49:02] Review Summary: Clean implementation following existing patterns.
[12:49:02] ✓ Code review: APPROVED

SESSION 6: Merge + Deploy + Verify
[12:49:02] Merging and verifying PR #43...
[12:53:45] ✓ Deployment verified

SESSION 7: Documentation Check
[12:53:45] Checking if documentation updates are needed...
[12:53:52] ✓ No documentation updates needed

[12:53:52] ═══════════════════════════════════════════════════════
[12:53:52] ✓ Issue #42 COMPLETE!
[12:53:52] ═══════════════════════════════════════════════════════

[12:53:52] Pausing 30 seconds before next cycle...
```

## Customization

To modify the workflow, edit `./code.sh`:

- **Change issue selection criteria**: Edit `select_issue()` prompt
- **Adjust review strictness**: Edit `review_code()` checklist
- **Skip documentation phase**: Comment out `update_documentation` call
- **Change wait times**: Modify `sleep` values
