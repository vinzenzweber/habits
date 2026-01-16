# Automated Development Loop

`./code.sh` orchestrates multiple Claude Code sessions to automate the Feature Development Workflow. It fetches GitHub issues, plans, implements, tests, reviews, and deploys—all with minimal human intervention.

## Quick Start

```bash
./code.sh              # Run continuous loop
./code.sh --once       # Run single cycle
./code.sh --resume     # Resume in-progress work only
./code.sh --status     # Show status of in-progress issues
```

## Features

- **GitHub-based Memory System**: All state stored in GitHub labels and comments
- **Crash Recovery**: Resume from any phase after interruption
- **Multi-machine Support**: Start on laptop, continue on desktop
- **Cost Tracking**: Accumulated costs tracked per issue
- **Audit Trail**: Every session documented as structured comments

## Session Architecture

The script separates work into distinct Claude Code sessions with intentional context boundaries:

```
┌─────────────────────────────────────────────────────────────────┐
│  SESSION 1: Issue Selection                                      │
│  Context: Clean                                                  │
│  • Fetch open GitHub issues                                      │
│  • Analyze priority, complexity, dependencies                    │
│  • Select best issue to work on                                  │
│  → Labels: auto-dev:selecting                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  SESSION 2: Planning                                             │
│  Context: Clean (print mode, non-interactive)                    │
│  • Explore codebase                                              │
│  • Create implementation plan                                    │
│  • Post plan as GitHub issue comment                             │
│  → Labels: auto-dev:planning                                     │
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
│  → Labels: auto-dev:implementing → auto-dev:pr-waiting           │
│  → Metadata: auto-dev:pr:<num>, auto-dev:branch:<name>           │
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
│  → Labels: auto-dev:reviewing                                    │
│  → Metadata: auto-dev:round:<n>                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
          [Changes Requested]      [Approved]
                    │                   │
                    ▼                   │
┌───────────────────────────────┐       │
│  SESSION 5: Fix Feedback      │       │
│  → Labels: auto-dev:fixing    │       │
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
│  → Labels: auto-dev:merging → auto-dev:verifying                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  SESSION 7: Documentation (optional)                             │
│  Context: Clean                                                  │
│  • Check if CLAUDE.md needs updates                              │
│  • Update docs if significant changes                            │
│  → Labels: auto-dev:complete                                     │
│  → Metadata: auto-dev:cost:<total>                               │
└─────────────────────────────────────────────────────────────────┘
```

## GitHub Memory System

All workflow state is stored in GitHub, enabling crash recovery and multi-machine support.

### Phase Labels

Issues are tagged with exactly one phase label at any time:

| Label | Color | Description |
|-------|-------|-------------|
| `auto-dev:selecting` | Green | Being analyzed for selection |
| `auto-dev:planning` | Blue | Creating implementation plan |
| `auto-dev:implementing` | Purple | Writing code and testing |
| `auto-dev:pr-waiting` | Yellow | PR created, waiting for CI |
| `auto-dev:reviewing` | Orange | Under code review |
| `auto-dev:fixing` | Pink | Addressing review feedback |
| `auto-dev:merging` | Blue | Being merged and deployed |
| `auto-dev:verifying` | Light blue | Production verification |
| `auto-dev:complete` | Green | Successfully completed |
| `auto-dev:blocked` | Red | Needs manual intervention |
| `auto-dev:ci-failed` | Red | CI checks failing |

### Metadata Labels

Additional labels store workflow metadata:

| Pattern | Example | Description |
|---------|---------|-------------|
| `auto-dev:pr:<num>` | `auto-dev:pr:47` | Associated PR number |
| `auto-dev:branch:<name>` | `auto-dev:branch:feat/dark-mode` | Branch name |
| `auto-dev:round:<n>` | `auto-dev:round:2` | Current review round |
| `auto-dev:cost:<amount>` | `auto-dev:cost:1.23` | Total accumulated cost |

### Session Memory Comments

Each session posts a structured comment to the issue:

```markdown
## 🤖 Auto-Dev Session: Implementation

| Field | Value |
|-------|-------|
| **Session ID** | `session-1736692800-12345` |
| **Started** | 2026-01-12T14:00:00Z |
| **Completed** | 2026-01-12T14:08:30Z |
| **Duration** | 8m 30s |
| **Cost** | $0.25 |

### Summary
Implemented feature and created PR #47 on branch `feat/dark-mode`.

### Details
**PR:** #47
**Branch:** `feat/dark-mode`

---
<sub>🤖 Automated by auto-dev</sub>
```

## Resume & Recovery

### Automatic Resume

The script automatically detects and resumes in-progress work:

```bash
./code.sh
# Output:
# Found in-progress issue #42 in phase: reviewing
# Resuming issue #42 from phase: reviewing
```

### Manual Resume

Resume only in-progress work (don't start new issues):

```bash
./code.sh --resume
```

### Check Status

See all in-progress issues:

```bash
./code.sh --status
# Output:
# ISSUE  PHASE           TITLE
# -----  -----           -----
# #42    reviewing       Add dark mode toggle
#        └─ PR #47, Cost: $0.48
# #43    implementing    Fix login bug
```

### Recovery from Blocked State

When an issue is blocked:

1. The `auto-dev:blocked` label is added
2. A comment explains the reason
3. The script moves to the next issue

To resume a blocked issue:

1. Fix the underlying problem
2. Remove the `auto-dev:blocked` label
3. Add the appropriate phase label (e.g., `auto-dev:implementing`)
4. Run `./code.sh --resume`

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

The script maintains local state in `.auto-dev/` (gitignored):

```
.auto-dev/
├── auto-dev.log           # Full execution log with raw JSON
├── selected_issue.json    # Currently selected issue
├── plan-<num>.md          # Implementation plans
├── review_result.json     # Code review output
└── docs_check.json        # Documentation check result
```

GitHub stores the authoritative state:
- **Labels**: Current phase and metadata
- **Comments**: Session history and audit trail

## Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| `MAX_REVIEW_ROUNDS` | 3 | Max review/fix cycles before blocking |
| No issues wait | 30 min | Sleep duration when no issues available |
| Between cycles | 30 sec | Pause between development cycles |
| Resume pause | 5 sec | Brief pause between resume iterations |

## Error Handling

| Failure | Behavior |
|---------|----------|
| No issues found | Wait 30 minutes, retry |
| Implementation fails | Mark blocked, continue to next |
| CI fails | Mark blocked (auto-dev:ci-failed) |
| Review not approved after 3 rounds | Mark blocked |
| Deployment fails | Mark blocked |
| Script crashes | Resumes automatically from last phase |

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
- `--output-format stream-json` - Enables progress streaming
- `--verbose` - Detailed logging

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
Claude: I'll fetch the open issues and analyze them...
  → Bash: gh issue list --state open --json number,title,body,labels
  ✓ Tool completed
Session complete (cost: $0.0234)
[12:35:02] Phase → selecting for issue #42
[12:35:02] ✓ Selected issue #42: Add dark mode toggle

SESSION 2: Planning
[12:35:02] Phase → planning for issue #42
[12:35:02] Planning implementation for #42...
Claude: I'll explore the codebase to understand the theming system...
  → Glob: **/*.css
  ✓ Tool completed
  → Read: src/app/globals.css
  ✓ Tool completed
Session complete (cost: $0.0567)
[12:36:45] ✓ Planning complete - posted to issue #42

SESSION 3: Implementation + Testing + PR Creation
[12:36:45] Phase → implementing for issue #42
[12:36:45] Implementing and testing issue #42...
  → TodoWrite: Creating implementation tasks
  ✓ Tool completed
  → Edit: src/app/globals.css
  ✓ Tool completed
  → Bash: npm run lint && npm run build
  ✓ Tool completed
Session complete (cost: $0.2847)
[12:45:30] Phase → pr-waiting for issue #42
[12:45:30] ✓ PR #43 created

CI Check
[12:45:30] Waiting for CI checks on PR #43...
[12:48:15] ✓ CI checks passed

SESSION 4: Code Review (Fresh Context)
[12:48:15] Phase → reviewing for issue #42
[12:48:15] Reviewing PR #43 with fresh eyes...
Session complete (cost: $0.0823)
[12:49:02] Review Summary: Clean implementation following existing patterns.
[12:49:02] ✓ Code review: APPROVED

SESSION 6: Merge + Deploy + Verify
[12:49:02] Phase → merging for issue #42
[12:49:02] Merging and verifying PR #43...
Session complete (cost: $0.1234)
[12:53:45] Phase → verifying for issue #42
[12:53:45] ✓ Deployment verified

SESSION 7: Documentation Check
[12:53:45] Checking if documentation updates are needed...
Session complete (cost: $0.0156)
[12:53:52] ✓ No documentation updates needed

[12:53:52] Phase → complete for issue #42
[12:53:52] ✓ Issue #42 completed! Total cost: $0.58

[12:53:52] Pausing 30 seconds before next cycle...
```

## GitHub Issue Example

After auto-dev processes an issue, it will have:

**Labels:**
- `auto-dev:complete` (green)
- `auto-dev:pr:43`
- `auto-dev:cost:0.58`

**Comments:**
1. 📋 Implementation Plan (detailed markdown)
2. 🤖 Auto-Dev Session: Issue Selection
3. 🤖 Auto-Dev Session: Planning
4. 🤖 Auto-Dev Session: Implementation
5. 🤖 Auto-Dev Session: Code Review
6. 🤖 Auto-Dev Session: Merge & Deploy
7. ✅ Completed by Auto-Dev (final summary)

## Customization

To modify the workflow, edit `./code.sh`:

- **Change issue selection criteria**: Edit `select_issue()` prompt
- **Adjust review strictness**: Edit `review_code()` checklist
- **Skip documentation phase**: Comment out `update_documentation` call
- **Change wait times**: Modify `sleep` values
- **Add custom phases**: Create new functions and update `resume_from_phase()`
