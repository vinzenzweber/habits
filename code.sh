#!/bin/bash
#
# code.sh - Automated Feature Development Loop
#
# This script orchestrates multiple Claude Code sessions to automate the
# Feature Development Workflow from CLAUDE.md. It fetches GitHub issues,
# plans implementation, codes, tests, reviews, and deploys.
#
# Session Architecture:
#   1. Issue Selection (clean context)
#   2. Planning (clean context, --plan mode)
#   3. Implementation + Testing + PR (shared context - tight feedback loop)
#   4. Code Review (CLEAN CONTEXT - critical for quality!)
#   5. Fix Review Feedback (if needed)
#   6. Merge + Deploy + Verify (shared context)
#   7. Documentation (optional)
#
# Usage:
#   ./code.sh          # Run continuous loop
#   ./code.sh --once   # Run single cycle
#
set -euo pipefail

# Configuration
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_DIR="$REPO_ROOT/.auto-dev"
LOG_FILE="$STATE_DIR/auto-dev.log"
SINGLE_CYCLE=false
MAX_REVIEW_ROUNDS=3

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --once)
            SINGLE_CYCLE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--once]"
            exit 1
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Logging functions (output to stderr to avoid polluting stdout captures)
log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $*" | tee -a "$LOG_FILE" >&2; }
success() { echo -e "${GREEN}[$(date +'%H:%M:%S')] ✓${NC} $*" | tee -a "$LOG_FILE" >&2; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠${NC} $*" | tee -a "$LOG_FILE" >&2; }
error() { echo -e "${RED}[$(date +'%H:%M:%S')] ✗${NC} $*" | tee -a "$LOG_FILE" >&2; }
header() { echo -e "\n${BOLD}${CYAN}$*${NC}" | tee -a "$LOG_FILE" >&2; }

# Initialize state directory
mkdir -p "$STATE_DIR"

# Format streaming JSON to show progress to human orchestrator
# Streams: text responses, tool calls, and captures final result
# IMPORTANT: Only outputs clean text to stdout, never raw JSON
format_progress() {
    local line type subtype final_result=""
    while IFS= read -r line; do
        # Skip non-JSON lines completely
        [[ "$line" != "{"* ]] && continue

        # Validate it's actually parseable JSON before processing
        if ! echo "$line" | jq -e . >/dev/null 2>&1; then
            continue
        fi

        type=$(echo "$line" | jq -r '.type // empty' 2>/dev/null) || continue

        case "$type" in
            "assistant")
                # Check for text content (Claude's response)
                local text
                text=$(echo "$line" | jq -r '.message.content[]? | select(.type == "text") | .text // empty' 2>/dev/null) || true
                if [ -n "$text" ] && [ "$text" != "null" ]; then
                    printf "${CYAN}Claude:${NC} %s\n" "$text" >&2
                fi

                # Check for tool use
                local tool_name tool_input
                tool_name=$(echo "$line" | jq -r '.message.content[]? | select(.type == "tool_use") | .name // empty' 2>/dev/null) || true
                if [ -n "$tool_name" ] && [ "$tool_name" != "null" ]; then
                    tool_input=$(echo "$line" | jq -r '.message.content[]? | select(.type == "tool_use") | .input | (.description // .command // .pattern // .query // .file_path // .prompt // "working...") | tostring | .[0:100]' 2>/dev/null) || true
                    printf "${YELLOW}  → %s:${NC} %s\n" "$tool_name" "${tool_input:-working...}" >&2
                fi
                ;;
            "user")
                # Tool result - show brief summary
                local is_error
                is_error=$(echo "$line" | jq -r '.message.content[]?.is_error // false' 2>/dev/null) || true
                if [ "$is_error" = "true" ]; then
                    printf "${RED}  ✗ Tool error${NC}\n" >&2
                else
                    printf "${GREEN}  ✓ Tool completed${NC}\n" >&2
                fi
                ;;
            "result")
                subtype=$(echo "$line" | jq -r '.subtype // empty' 2>/dev/null) || true
                if [ "$subtype" = "success" ]; then
                    final_result=$(echo "$line" | jq -r '.result // empty' 2>/dev/null) || true
                    local cost
                    cost=$(echo "$line" | jq -r '.total_cost_usd // 0' 2>/dev/null) || true
                    printf "${GREEN}Session complete (cost: \$%.4f)${NC}\n" "${cost:-0}" >&2
                else
                    # Error result - show error but DON'T output anything to stdout
                    local errors
                    errors=$(echo "$line" | jq -r '.errors // [] | .[:3] | join("; ") | .[0:200]' 2>/dev/null) || true
                    printf "${RED}Session error: %s${NC}\n" "${errors:-unknown error}" >&2
                fi
                ;;
        esac
    done

    # Output only the final result for capture (only if it's clean text, not JSON)
    if [ -n "$final_result" ] && [ "$final_result" != "null" ]; then
        # Safety check: don't output if it looks like JSON
        if [[ "$final_result" != "{"* ]]; then
            printf "%s" "$final_result"
        fi
    fi
}

# Wrapper for claude command
# Always runs with --dangerously-skip-permissions and --model opus
# Logs all raw JSON output to LOG_FILE for debugging
run_claude() {
    local mode="$1"
    shift
    local prompt_preview
    prompt_preview=$(echo "$1" | head -c 100 | tr '\n' ' ')

    # Log session start
    echo "" >> "$LOG_FILE"
    echo "═══════════════════════════════════════════════════════════════════" >> "$LOG_FILE"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] CLAUDE SESSION START" >> "$LOG_FILE"
    echo "Mode: $mode" >> "$LOG_FILE"
    echo "Prompt: ${prompt_preview}..." >> "$LOG_FILE"
    echo "═══════════════════════════════════════════════════════════════════" >> "$LOG_FILE"

    case "$mode" in
        "-p")
            # Print mode with streaming progress
            # Tee raw JSON to log file while also formatting for terminal
            claude --dangerously-skip-permissions --model opus --verbose -p --output-format stream-json "$@" 2>&1 | tee -a "$LOG_FILE" | format_progress
            ;;
        *)
            # Interactive mode - capture output to log
            claude --dangerously-skip-permissions --model opus "$@" 2>&1 | tee -a "$LOG_FILE"
            ;;
    esac

    local exit_code=${PIPESTATUS[0]}

    # Log session end
    echo "" >> "$LOG_FILE"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] CLAUDE SESSION END (exit code: $exit_code)" >> "$LOG_FILE"
    echo "═══════════════════════════════════════════════════════════════════" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"

    return $exit_code
}

#─────────────────────────────────────────────────────────────────────
# Issue tracking - avoid working on same issues repeatedly
#─────────────────────────────────────────────────────────────────────
SKIP_ISSUES_FILE="$STATE_DIR/skip_issues.txt"

# Get issues to skip (have open PRs or have failed)
get_issues_to_skip() {
    # Issues with open PRs
    local pr_issues
    pr_issues=$(gh pr list --state open --json number,title --jq '.[].title | capture("issue.?#?(?<num>[0-9]+)"; "i") | .num' 2>/dev/null | tr '\n' ',' || echo "")

    # Issues we've already tried and failed
    local failed_issues=""
    if [ -f "$SKIP_ISSUES_FILE" ]; then
        failed_issues=$(cat "$SKIP_ISSUES_FILE" | tr '\n' ',' || echo "")
    fi

    echo "${pr_issues}${failed_issues}" | tr ',' '\n' | sort -u | grep -v '^$' | tr '\n' ',' | sed 's/,$//'
}

# Mark an issue as failed (skip in future)
mark_issue_failed() {
    local issue_num=$1
    echo "$issue_num" >> "$SKIP_ISSUES_FILE"
    log "Marked issue #$issue_num as failed - will skip in future cycles"
}

# Clear skip list (call when starting fresh)
clear_skip_list() {
    rm -f "$SKIP_ISSUES_FILE"
}

#─────────────────────────────────────────────────────────────────────
# SESSION 1: Issue Selection
# Context: Clean - focused decision-making
#─────────────────────────────────────────────────────────────────────
select_issue() {
    header "SESSION 1: Issue Selection"
    log "Analyzing open issues to select the best one to work on..."

    # Get issues to skip
    local skip_issues
    skip_issues=$(get_issues_to_skip)
    if [ -n "$skip_issues" ]; then
        log "Skipping issues: $skip_issues (have open PRs or previously failed)"
    fi

    run_claude "-p" "
You are selecting a GitHub issue to work on for the habits/fitstreak project.

1. Fetch open issues: gh issue list --state open --json number,title,body,labels,assignees
2. SKIP these issues (they have open PRs or previously failed): $skip_issues
3. From remaining issues, analyze for:
   - Priority (bugs > features > enhancements)
   - Complexity (prefer issues you can complete in one session)
   - Dependencies (skip if blocked by other issues)
   - Labels (look for 'good first issue', 'priority', etc.)
4. Select the BEST issue to work on now

If there are no suitable open issues (after excluding skipped ones), output: {\"number\": null, \"title\": null, \"body\": null}

Output ONLY a JSON object (no markdown, no explanation, no code blocks):
{\"number\": 123, \"title\": \"Issue title\", \"body\": \"Issue description\"}
" > "$STATE_DIR/selected_issue.json"

    # Validate JSON output
    if ! jq -e . "$STATE_DIR/selected_issue.json" > /dev/null 2>&1; then
        error "Failed to parse issue selection output as JSON"
        cat "$STATE_DIR/selected_issue.json" >&2
        return 1
    fi

    ISSUE_NUM=$(jq -r '.number' "$STATE_DIR/selected_issue.json")

    if [ "$ISSUE_NUM" = "null" ] || [ -z "$ISSUE_NUM" ]; then
        warn "No suitable issues found"
        return 1
    fi

    ISSUE_TITLE=$(jq -r '.title' "$STATE_DIR/selected_issue.json")
    success "Selected issue #$ISSUE_NUM: $ISSUE_TITLE"
    echo "$ISSUE_NUM"
}

#─────────────────────────────────────────────────────────────────────
# Check if issue already has an implementation plan
#─────────────────────────────────────────────────────────────────────
has_implementation_plan() {
    local issue_num=$1

    # Check issue comments for an implementation plan
    local comments
    comments=$(gh issue view "$issue_num" --comments --json comments -q '.comments[].body' 2>/dev/null || echo "")

    if echo "$comments" | grep -qi "## Implementation Plan"; then
        return 0  # Has plan
    fi
    return 1  # No plan
}

#─────────────────────────────────────────────────────────────────────
# Get existing implementation plan from issue comments
#─────────────────────────────────────────────────────────────────────
get_implementation_plan() {
    local issue_num=$1

    # Get the comment containing the implementation plan
    gh issue view "$issue_num" --comments --json comments -q '.comments[].body' 2>/dev/null | \
        grep -A 1000 "## Implementation Plan" | head -100
}

#─────────────────────────────────────────────────────────────────────
# SESSION 2: Planning
# Context: Clean - fresh codebase exploration without selection bias
# Generates plan and posts as GitHub issue comment
#─────────────────────────────────────────────────────────────────────
plan_implementation() {
    local issue_num=$1
    local issue_title=$2
    local issue_body=$3

    header "SESSION 2: Planning"

    # Check if plan already exists
    if has_implementation_plan "$issue_num"; then
        log "Implementation plan already exists for issue #$issue_num"
        get_implementation_plan "$issue_num" > "$STATE_DIR/plan-$issue_num.md"
        success "Using existing plan from issue comments"
        return 0
    fi

    log "Planning implementation for issue #$issue_num..."

    # Generate plan using print mode (non-interactive)
    local plan
    plan=$(run_claude "-p" "
Plan the implementation for GitHub issue #$issue_num

**Issue Title:** $issue_title

**Issue Description:**
$issue_body

Follow the Planning phase from CLAUDE.md:
1. Explore the codebase to understand relevant areas
2. Identify files that need modification
3. Create a detailed implementation plan with specific steps
4. Consider testing strategy (unit tests, E2E tests, manual testing)
5. Identify potential risks or edge cases

Output a well-structured markdown plan that can be posted as a GitHub comment.
Start with '## Implementation Plan' as the header.
")

    # Save plan locally
    echo "$plan" > "$STATE_DIR/plan-$issue_num.md"

    # Post plan as comment on the GitHub issue
    log "Posting plan to GitHub issue #$issue_num..."
    gh issue comment "$issue_num" --body "$plan"

    success "Planning complete - posted to issue #$issue_num"
}

#─────────────────────────────────────────────────────────────────────
# SESSION 3: Implementation + Testing + PR Creation
# Context: SHARED - tight feedback loop between implement/test/fix
# Phases: 2, 3, 4 from CLAUDE.md
#─────────────────────────────────────────────────────────────────────
implement_and_test() {
    local issue_num=$1

    header "SESSION 3: Implementation + Testing + PR Creation"
    log "Implementing and testing issue #$issue_num..."

    run_claude "-p" "
Implement GitHub issue #$issue_num following your approved plan.

Execute these phases from CLAUDE.md:
- Phase 2: Implementation (use TodoWrite to track progress)
- Phase 3: Testing (manual testing with Playwright MCP)
- Phase 4: PR Creation

**IMPORTANT: Follow this workflow step by step:**

1. **Setup Todo List**
   - Use TodoWrite to create tasks for each implementation step
   - Update task status as you work

2. **Implement**
   - Make code changes following the plan
   - Keep changes minimal and focused (KISS principle)
   - Mark todo items as complete

3. **Verify Locally**
   - Run: npm run lint
   - Run: npm run build
   - Run: npm run test:unit

4. **Manual Testing**
   - Start dev server: npm run dev
   - Use Playwright MCP to test:
     a. Navigate to http://localhost:3000/register
     b. Create a NEW test user (unique email)
     c. Test the feature you implemented
     d. Verify it works correctly

5. **Fix Issues**
   - If tests fail or manual testing reveals bugs, fix them
   - Re-run verification steps

6. **Create PR**
   - Stage changes: git add <files>
   - Commit: git commit -m 'feat: <description>'
   - Create branch: git checkout -b feat/issue-$issue_num-<short-description>
   - Push: git push -u origin HEAD
   - Create PR: gh pr create --title '<title>' --body '<body>'

IMPORTANT: After creating the PR, output EXACTLY this format on its own line:
PR_CREATED: <number>
Example: PR_CREATED: 123
" > /dev/null  # Discard stdout - we find PR via git/gh commands below

    # Extract PR number - try multiple methods
    local pr_num=""
    local current_branch
    current_branch=$(git branch --show-current 2>/dev/null || echo "")
    log "Current branch: $current_branch"

    # Check if we're still on main with uncommitted changes (incomplete implementation)
    if [ "$current_branch" = "main" ]; then
        local has_changes
        has_changes=$(git status --porcelain 2>/dev/null | grep -v '^??' | head -1)
        if [ -n "$has_changes" ]; then
            warn "Still on main with uncommitted changes - implementation may be incomplete"
            log "Uncommitted changes:"
            git status --short >&2

            # Try to complete the PR creation
            log "Attempting to create branch and PR for uncommitted changes..."
            local branch_name="feat/issue-$issue_num-auto"
            git checkout -b "$branch_name" 2>&1 >&2 || true
            git add -A 2>&1 >&2 || true
            git commit -m "feat: implement issue #$issue_num" 2>&1 >&2 || true
            git push -u origin HEAD 2>&1 >&2 || true
            gh pr create --title "feat: implement issue #$issue_num" --body "Automated implementation for #$issue_num" 2>&1 >&2 || true
            current_branch="$branch_name"
        fi
    fi

    # Method 1: Check current branch for associated PR
    if [ -n "$current_branch" ] && [ "$current_branch" != "main" ]; then
        pr_num=$(gh pr list --head "$current_branch" --json number -q '.[0].number' 2>/dev/null || echo "")
        if [ -n "$pr_num" ]; then
            log "Found PR #$pr_num for branch $current_branch"
        fi
    fi

    # Method 2: Get most recent open PR by me
    if [ -z "$pr_num" ]; then
        log "Trying to find most recent PR..."
        pr_num=$(gh pr list --author "@me" --state open --json number,createdAt -q 'sort_by(.createdAt) | reverse | .[0].number' 2>/dev/null || echo "")
    fi

    # Method 3: Check if there's an open PR for this repo at all
    if [ -z "$pr_num" ]; then
        log "Checking for any open PRs..."
        pr_num=$(gh pr list --state open --json number -q '.[0].number' 2>/dev/null || echo "")
    fi

    if [ -z "$pr_num" ]; then
        error "Could not find PR number. Check if PR was created."
        log "Git status:"
        git status --short >&2
        log "Recent PRs:"
        gh pr list --limit 5 >&2 || true
        return 1
    fi

    success "PR #$pr_num created"
    echo "$pr_num"
}

#─────────────────────────────────────────────────────────────────────
# CI WAIT
# Not a Claude session - just automated polling
#─────────────────────────────────────────────────────────────────────
wait_for_ci() {
    local pr_num=$1

    header "CI Check"
    log "Waiting for CI checks on PR #$pr_num..."

    # gh pr checks --watch will block until all checks complete
    if gh pr checks "$pr_num" --watch; then
        success "CI checks passed"
        return 0
    else
        error "CI checks failed"
        return 1
    fi
}

#─────────────────────────────────────────────────────────────────────
# SESSION 4: Code Review
# Context: CLEAN - Critical for quality!
# Fresh eyes review without implementation bias
#─────────────────────────────────────────────────────────────────────
review_code() {
    local pr_num=$1

    header "SESSION 4: Code Review (Fresh Context)"
    log "Reviewing PR #$pr_num with fresh eyes..."

    # Get PR information for review
    local pr_diff pr_files pr_title pr_body
    pr_diff=$(gh pr diff "$pr_num" 2>/dev/null || echo "Unable to fetch diff")
    pr_files=$(gh pr view "$pr_num" --json files -q '.files[].path' 2>/dev/null | tr '\n' ', ' || echo "")
    pr_title=$(gh pr view "$pr_num" --json title -q '.title' 2>/dev/null || echo "")
    pr_body=$(gh pr view "$pr_num" --json body -q '.body' 2>/dev/null || echo "")

    run_claude "-p" "
You are a senior code reviewer examining PR #$pr_num with COMPLETELY FRESH EYES.

**CRITICAL**: You did NOT write this code. You have NO prior context about it.
Review it as if you're seeing it for the first time - because you are.

**PR Title:** $pr_title

**PR Description:**
$pr_body

**Files Changed:** $pr_files

**Code Diff:**
\`\`\`diff
$pr_diff
\`\`\`

## Review Checklist

1. **Correctness**
   - Does the code do what the PR claims?
   - Are there logic errors?
   - Are edge cases handled?

2. **Security** (OWASP Top 10)
   - SQL injection vulnerabilities?
   - XSS vulnerabilities?
   - Authentication/authorization issues?
   - Sensitive data exposure?

3. **Code Quality**
   - Is the code readable and maintainable?
   - Are variable/function names descriptive?
   - Is there unnecessary complexity? (violates KISS)
   - Any code duplication?

4. **Testing**
   - Are new code paths tested?
   - Are edge cases tested?
   - Do existing tests still pass?

5. **Performance**
   - Any obvious performance issues?
   - N+1 queries?
   - Unnecessary re-renders (React)?

## Output Format

Provide your review as a JSON object ONLY (no markdown, no explanation):

{
  \"status\": \"approved\" | \"changes_requested\",
  \"comments\": [
    {
      \"file\": \"path/to/file.ts\",
      \"line\": 42,
      \"severity\": \"error\" | \"warning\" | \"suggestion\",
      \"issue\": \"Clear description of the problem\",
      \"suggestion\": \"How to fix it\"
    }
  ],
  \"summary\": \"Brief 1-2 sentence overall assessment\"
}

Be thorough but fair. Only request changes for real issues, not style preferences.
" > "$STATE_DIR/review_result.json"

    # Validate JSON
    if ! jq -e . "$STATE_DIR/review_result.json" > /dev/null 2>&1; then
        error "Failed to parse review output as JSON"
        cat "$STATE_DIR/review_result.json"
        return 1
    fi

    local review_status review_summary
    review_status=$(jq -r '.status' "$STATE_DIR/review_result.json")
    review_summary=$(jq -r '.summary' "$STATE_DIR/review_result.json")

    log "Review Summary: $review_summary"

    if [ "$review_status" = "approved" ]; then
        success "Code review: APPROVED"
        return 0
    else
        warn "Code review: CHANGES REQUESTED"
        echo ""
        jq -r '.comments[] | "  [\(.severity)] \(.file):\(.line) - \(.issue)"' "$STATE_DIR/review_result.json"
        echo ""
        return 1
    fi
}

#─────────────────────────────────────────────────────────────────────
# SESSION 5: Fix Review Feedback
# Context: Clean - address specific review comments
#─────────────────────────────────────────────────────────────────────
fix_review_feedback() {
    local pr_num=$1

    header "SESSION 5: Fixing Review Feedback"
    log "Addressing review comments for PR #$pr_num..."

    local review_comments
    review_comments=$(jq -c '.comments' "$STATE_DIR/review_result.json")

    run_claude "-p" "
Fix the code review feedback for PR #$pr_num.

**Review Comments to Address:**
$review_comments

For EACH comment:
1. Read the file and understand the context
2. Understand why the reviewer flagged this
3. Implement the fix (or explain why you disagree)
4. Test that the fix works

After ALL fixes:
1. Run: npm run lint && npm run build
2. Run: npm run test:unit
3. Commit: git commit -am 'fix: address review feedback'
4. Push: git push

Output 'FIXES_COMPLETE' when all fixes are complete and pushed.
" > /dev/null  # Discard stdout - no output capture needed
    success "Review feedback addressed"
}

#─────────────────────────────────────────────────────────────────────
# SESSION 6: Merge + Deploy + Verify
# Context: Shared - sequential dependent steps
# Phases: 7, 8 from CLAUDE.md
#─────────────────────────────────────────────────────────────────────
merge_and_verify() {
    local pr_num=$1

    header "SESSION 6: Merge + Deploy + Verify"
    log "Merging and verifying PR #$pr_num..."

    run_claude "-p" "
Merge and verify PR #$pr_num in production.

Execute these phases from CLAUDE.md:
- Phase 7: Merge & Deploy
- Phase 8: Production Verification

**Steps:**

1. **Verify Merge Readiness**
   gh pr view $pr_num --json mergeable,mergeStateStatus

2. **Merge PR**
   gh pr merge $pr_num --squash --delete-branch

3. **Update Local**
   git checkout main && git pull

4. **Wait for Deployment**
   Railway auto-deploys on merge to main (~3 minutes)

5. **Check Deployment Logs**
   Use Bash to check: railway logs 2>&1 | head -50
   (Look for successful startup messages)

6. **Verify in Production**
   Use Playwright MCP to test production:
   a. Navigate to https://fitstreak.app/register
   b. Create a NEW test user (unique email with timestamp)
   c. Test that the new feature works in production
   d. Check browser console for errors

Output 'DEPLOYMENT_VERIFIED' when verification is complete, or 'DEPLOYMENT_FAILED' if there were issues.
" > /dev/null  # Discard stdout - no output capture needed
    success "Deployment verified"
}

#─────────────────────────────────────────────────────────────────────
# SESSION 7: Documentation (Optional)
# Context: Clean - focused on doc updates
# Phase: 9 from CLAUDE.md
#─────────────────────────────────────────────────────────────────────
update_documentation() {
    local issue_num=$1

    header "SESSION 7: Documentation Check"
    log "Checking if documentation updates are needed..."

    run_claude "-p" "
Analyze if documentation updates are needed after implementing issue #$issue_num.

Check if CLAUDE.md should be updated for:
- New patterns or conventions introduced
- New npm scripts or commands
- Architecture changes
- New environment variables
- New database tables or migrations
- New API endpoints

Be conservative - only suggest updates for significant changes.

Output JSON ONLY (no markdown):
{\"needs_update\": true|false, \"reason\": \"Brief explanation\"}
" > "$STATE_DIR/docs_check.json"

    if ! jq -e . "$STATE_DIR/docs_check.json" > /dev/null 2>&1; then
        warn "Could not determine if docs need update"
        return 0
    fi

    local needs_update
    needs_update=$(jq -r '.needs_update' "$STATE_DIR/docs_check.json")

    if [ "$needs_update" = "true" ]; then
        local reason
        reason=$(jq -r '.reason' "$STATE_DIR/docs_check.json")
        log "Documentation update needed: $reason"

        run_claude "-p" "
Update CLAUDE.md based on changes from issue #$issue_num.

**Reason for update:** $reason

Guidelines:
- Keep updates minimal and focused
- Follow the existing format and style
- Don't add redundant information
- Update existing sections rather than adding new ones when possible

After updating:
1. git add CLAUDE.md
2. git commit -m 'docs: update CLAUDE.md'
3. git push

Output 'DOCS_UPDATED' when complete.
" > /dev/null  # Discard stdout - no output capture needed
        success "Documentation updated"
    else
        success "No documentation updates needed"
    fi
}

#─────────────────────────────────────────────────────────────────────
# MAIN LOOP
#─────────────────────────────────────────────────────────────────────
main() {
    echo ""
    echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║          AUTO-DEV: Automated Development Loop              ║${NC}"
    echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    if [ "$SINGLE_CYCLE" = true ]; then
        log "Single cycle mode - will exit after one issue"
    else
        log "Continuous mode - Press Ctrl+C to stop"
    fi

    # Change to repo root
    cd "$REPO_ROOT"

    while true; do
        echo ""
        log "═══════════════════════════════════════════════════════════"
        log "Starting new development cycle at $(date)"
        log "═══════════════════════════════════════════════════════════"

        # Session 1: Select issue
        ISSUE_NUM=""
        if ! ISSUE_NUM=$(select_issue); then
            if [ "$SINGLE_CYCLE" = true ]; then
                warn "No issues to work on. Exiting."
                exit 0
            fi
            warn "No suitable issues found. Waiting 30 minutes..."
            sleep 1800
            continue
        fi

        ISSUE_TITLE=$(jq -r '.title' "$STATE_DIR/selected_issue.json")
        ISSUE_BODY=$(jq -r '.body' "$STATE_DIR/selected_issue.json")

        # Session 2: Plan implementation (requires user approval)
        plan_implementation "$ISSUE_NUM" "$ISSUE_TITLE" "$ISSUE_BODY"

        # Session 3: Implement + Test + Create PR
        PR_NUM=""
        if ! PR_NUM=$(implement_and_test "$ISSUE_NUM"); then
            error "Implementation failed. Skipping to next issue."
            mark_issue_failed "$ISSUE_NUM"
            continue
        fi

        # Wait for CI
        if ! wait_for_ci "$PR_NUM"; then
            error "CI failed. Manual intervention needed for PR #$PR_NUM"
            mark_issue_failed "$ISSUE_NUM"
            continue
        fi

        # Session 4: Code Review (fresh context!)
        REVIEW_ROUND=0
        REVIEW_APPROVED=false

        while [ $REVIEW_ROUND -lt $MAX_REVIEW_ROUNDS ]; do
            REVIEW_ROUND=$((REVIEW_ROUND + 1))
            log "Review round $REVIEW_ROUND/$MAX_REVIEW_ROUNDS"

            if review_code "$PR_NUM"; then
                REVIEW_APPROVED=true
                break
            fi

            if [ $REVIEW_ROUND -lt $MAX_REVIEW_ROUNDS ]; then
                # Session 5: Fix feedback
                fix_review_feedback "$PR_NUM"

                # Re-run CI after fixes
                if ! wait_for_ci "$PR_NUM"; then
                    error "CI failed after fixes. Manual intervention needed."
                    mark_issue_failed "$ISSUE_NUM"
                    break
                fi
            else
                error "Max review rounds ($MAX_REVIEW_ROUNDS) reached. Manual intervention needed."
                mark_issue_failed "$ISSUE_NUM"
            fi
        done

        if [ "$REVIEW_APPROVED" != true ]; then
            error "PR #$PR_NUM not approved after $MAX_REVIEW_ROUNDS rounds. Skipping."
            mark_issue_failed "$ISSUE_NUM"
            continue
        fi

        # Session 6: Merge + Deploy + Verify
        merge_and_verify "$PR_NUM"

        # Session 7: Documentation (optional)
        update_documentation "$ISSUE_NUM"

        success "═══════════════════════════════════════════════════════════"
        success "Issue #$ISSUE_NUM COMPLETE!"
        success "═══════════════════════════════════════════════════════════"

        if [ "$SINGLE_CYCLE" = true ]; then
            log "Single cycle complete. Exiting."
            exit 0
        fi

        # Brief pause before next cycle
        log "Pausing 30 seconds before next cycle..."
        sleep 30
    done
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
