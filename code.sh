#!/bin/bash
#
# code.sh - Automated Feature Development Loop
#
# This script orchestrates multiple Claude Code sessions to automate the
# Feature Development Workflow from CLAUDE.md. It fetches GitHub issues,
# plans implementation, codes, tests, reviews, and deploys.
#
# Features:
#   - GitHub-based memory system (labels for phase, comments for session data)
#   - Crash recovery and resume from any phase
#   - Session cost tracking and audit trail
#   - Multi-machine support (all state in GitHub)
#
# Session Architecture:
#   1. Issue Selection (clean context)
#   2. Planning (clean context)
#   3. Implementation + Testing + PR (shared context - tight feedback loop)
#   4. Code Review (CLEAN CONTEXT - critical for quality!)
#   5. Fix Review Feedback (if needed)
#   6. Merge + Deploy + Verify (shared context)
#   7. Documentation (optional)
#
# Usage:
#   ./code.sh              # Run continuous loop
#   ./code.sh --once       # Run single cycle
#   ./code.sh -i 42        # Work on specific issue (implies --once)
#   ./code.sh --issue 42   # Same as above
#   ./code.sh --resume     # Resume in-progress work only
#   ./code.sh --status     # Show status of in-progress issues
#
# Note: Script operates on current working directory, so you can run it
# from any project: cd /path/to/project && /path/to/code.sh
#
set -euo pipefail

# Configuration
# Use current working directory as project root (allows running from any project)
REPO_ROOT="$(pwd)"
STATE_DIR="$REPO_ROOT/.auto-dev"
LOG_FILE="$STATE_DIR/auto-dev.log"
SINGLE_CYCLE=false
RESUME_ONLY=false
SHOW_STATUS=false
TARGET_ISSUE=""
MAX_REVIEW_ROUNDS=3

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --once)
            SINGLE_CYCLE=true
            shift
            ;;
        --issue|-i)
            if [ -z "${2:-}" ] || [[ "$2" == -* ]]; then
                echo "Error: --issue requires an issue number"
                exit 1
            fi
            TARGET_ISSUE="$2"
            SINGLE_CYCLE=true  # Implies --once
            shift 2
            ;;
        --resume)
            RESUME_ONLY=true
            shift
            ;;
        --status)
            SHOW_STATUS=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--once] [-i|--issue <number>] [--resume] [--status]"
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
MAGENTA='\033[0;35m'
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

#═══════════════════════════════════════════════════════════════════════════════
# GITHUB MEMORY SYSTEM
# Uses labels for phase tracking, comments for session memory
#═══════════════════════════════════════════════════════════════════════════════

# Label definitions: name:color:description
PHASE_LABELS=(
    "auto-dev:selecting:0E8A16:Being selected for development"
    "auto-dev:planning:1D76DB:Creating implementation plan"
    "auto-dev:implementing:5319E7:Writing code and testing"
    "auto-dev:pr-waiting:FBCA04:PR created, waiting for CI"
    "auto-dev:reviewing:D93F0B:Under code review"
    "auto-dev:fixing:F9D0C4:Addressing review feedback"
    "auto-dev:merging:0052CC:Being merged and deployed"
    "auto-dev:verifying:BFD4F2:Production verification"
    "auto-dev:complete:0E8A16:Successfully completed"
    "auto-dev:blocked:B60205:Needs manual intervention"
    "auto-dev:ci-failed:B60205:CI checks failing"
)

# Ensure all required labels exist in the repo
ensure_labels_exist() {
    log "Ensuring GitHub labels exist..."
    for label_spec in "${PHASE_LABELS[@]}"; do
        IFS=':' read -r name color desc <<< "$label_spec"
        gh label create "$name" --color "$color" --description "$desc" 2>/dev/null || true
    done
}

# Set workflow phase for an issue (removes old phase, adds new)
set_phase() {
    local issue_num=$1
    local phase=$2

    # Remove all existing auto-dev phase labels
    local existing_labels
    existing_labels=$(gh issue view "$issue_num" --json labels -q '.labels[].name' 2>/dev/null | grep "^auto-dev:" || true)

    for old_label in $existing_labels; do
        # Keep metadata labels (pr:, branch:, round:, cost:), remove phase labels
        if [[ "$old_label" =~ ^auto-dev:(selecting|planning|implementing|pr-waiting|reviewing|fixing|merging|verifying|complete|blocked|ci-failed)$ ]]; then
            gh issue edit "$issue_num" --remove-label "$old_label" >/dev/null 2>&1 || true
        fi
    done

    # Add new phase label
    gh issue edit "$issue_num" --add-label "auto-dev:$phase" >/dev/null 2>&1 || true
    log "Phase → ${MAGENTA}$phase${NC} for issue #$issue_num"
}

# Get current phase of an issue
get_phase() {
    local issue_num=$1
    local labels
    labels=$(gh issue view "$issue_num" --json labels -q '.labels[].name' 2>/dev/null || echo "")

    for phase in selecting planning implementing pr-waiting reviewing fixing merging verifying complete blocked ci-failed; do
        if echo "$labels" | grep -q "^auto-dev:$phase$"; then
            echo "$phase"
            return 0
        fi
    done
    echo ""
}

# Add/update a metadata label (pr number, branch, round, cost)
set_metadata() {
    local issue_num=$1
    local key=$2
    local value=$3

    # Remove existing label with same key prefix
    local existing
    existing=$(gh issue view "$issue_num" --json labels -q ".labels[].name" 2>/dev/null | grep "^auto-dev:$key:" || true)
    if [ -n "$existing" ]; then
        gh issue edit "$issue_num" --remove-label "$existing" >/dev/null 2>&1 || true
    fi

    # Create and add new label
    local label_name="auto-dev:$key:$value"
    gh label create "$label_name" --color "CCCCCC" 2>/dev/null || true
    gh issue edit "$issue_num" --add-label "$label_name" >/dev/null 2>&1 || true
}

# Get metadata value from labels
get_metadata() {
    local issue_num=$1
    local key=$2
    gh issue view "$issue_num" --json labels -q ".labels[].name" 2>/dev/null | \
        grep "^auto-dev:$key:" | sed "s/auto-dev:$key://" | head -1
}

# Post session memory as a structured comment
post_session_memory() {
    local issue_num=$1
    local phase_name=$2
    local session_start=$3
    local session_end=$4
    local cost=$5
    local summary=$6
    local extra_info=${7:-""}

    local duration=$((session_end - session_start))
    local duration_min=$((duration / 60))
    local duration_sec=$((duration % 60))
    local duration_fmt="${duration_min}m ${duration_sec}s"

    # Format timestamps
    local start_fmt end_fmt
    if date --version 2>/dev/null | grep -q GNU; then
        start_fmt=$(date -d "@$session_start" -u +"%Y-%m-%dT%H:%M:%SZ")
        end_fmt=$(date -d "@$session_end" -u +"%Y-%m-%dT%H:%M:%SZ")
    else
        start_fmt=$(date -r "$session_start" -u +"%Y-%m-%dT%H:%M:%SZ")
        end_fmt=$(date -r "$session_end" -u +"%Y-%m-%dT%H:%M:%SZ")
    fi

    local session_id="session-$(date +%s)-$$"

    local comment="## 🤖 Auto-Dev Session: $phase_name

| Field | Value |
|-------|-------|
| **Session ID** | \`$session_id\` |
| **Started** | $start_fmt |
| **Completed** | $end_fmt |
| **Duration** | $duration_fmt |
| **Cost** | \$$cost |

### Summary
$summary"

    if [ -n "$extra_info" ]; then
        comment+="

### Details
$extra_info"
    fi

    comment+="

---
<sub>🤖 Automated by auto-dev</sub>"

    gh issue comment "$issue_num" --body "$comment" >/dev/null 2>&1 || warn "Failed to post session memory"
}

# Get accumulated cost from all session comments
get_accumulated_cost() {
    local issue_num=$1

    # Extract all costs from session comments and sum them
    local total
    total=$(gh issue view "$issue_num" --comments --json comments \
        -q '[.comments[].body | capture("\\*\\*Cost\\*\\* \\| \\$(?<cost>[0-9.]+)") | .cost | tonumber] | add // 0' 2>/dev/null)

    printf "%.2f" "${total:-0}"
}

# Find issues that are in-progress (have auto-dev phase labels)
find_in_progress_issues() {
    local phases=("selecting" "planning" "implementing" "pr-waiting" "reviewing" "fixing" "merging" "verifying")

    for phase in "${phases[@]}"; do
        local issues
        issues=$(gh issue list --label "auto-dev:$phase" --json number,title -q '.[] | "\(.number):\(.title)"' 2>/dev/null || echo "")
        if [ -n "$issues" ]; then
            while IFS= read -r line; do
                local num title
                num=$(echo "$line" | cut -d: -f1)
                title=$(echo "$line" | cut -d: -f2-)
                echo "$num|$phase|$title"
            done <<< "$issues"
        fi
    done
}

# Find the most actionable in-progress issue
find_resumable_issue() {
    # Priority order for resuming
    local phases=("fixing" "reviewing" "pr-waiting" "implementing" "planning" "merging" "verifying" "selecting")

    for phase in "${phases[@]}"; do
        local issue
        issue=$(gh issue list --label "auto-dev:$phase" --json number -q '.[0].number' 2>/dev/null || echo "")
        if [ -n "$issue" ]; then
            echo "$issue"
            return 0
        fi
    done
    echo ""
}

# Show status of all in-progress issues
show_status() {
    header "Auto-Dev Status"

    local in_progress
    in_progress=$(find_in_progress_issues)

    if [ -z "$in_progress" ]; then
        log "No in-progress issues found"
        return 0
    fi

    echo ""
    printf "%-6s %-15s %-50s\n" "ISSUE" "PHASE" "TITLE"
    printf "%-6s %-15s %-50s\n" "-----" "-----" "-----"

    while IFS='|' read -r num phase title; do
        local pr_num branch cost
        pr_num=$(get_metadata "$num" "pr")
        cost=$(get_accumulated_cost "$num")

        printf "%-6s %-15s %-50s\n" "#$num" "$phase" "${title:0:50}"
        if [ -n "$pr_num" ]; then
            printf "       └─ PR #%s, Cost: \$%s\n" "$pr_num" "$cost"
        fi
    done <<< "$in_progress"
    echo ""
}

# Mark issue as blocked
mark_blocked() {
    local issue_num=$1
    local reason=$2

    set_phase "$issue_num" "blocked"

    gh issue comment "$issue_num" --body "## ⚠️ Auto-Dev Blocked

**Reason:** $reason
**Time:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")

### To Resume
1. Fix the underlying issue
2. Remove the \`auto-dev:blocked\` label
3. Add the appropriate phase label to continue from:
   - \`auto-dev:implementing\` - to restart implementation
   - \`auto-dev:reviewing\` - to restart code review
   - etc.

---
<sub>🤖 Automated by auto-dev</sub>" >/dev/null 2>&1 || true

    error "Issue #$issue_num blocked: $reason"
}

#═══════════════════════════════════════════════════════════════════════════════
# STREAMING OUTPUT FORMATTER
#═══════════════════════════════════════════════════════════════════════════════

# Track session metrics
SESSION_START_TIME=""
SESSION_COST=""

# Format streaming JSON to show progress to human orchestrator
# Streams: text responses, tool calls, and captures final result
# IMPORTANT: Only outputs clean text to stdout, never raw JSON
# Press ESC to pause, any key to resume
format_progress() {
    local line type subtype final_result=""
    local paused=false
    # Tool name mapping stored in temp files (for subshell access)
    rm -f /tmp/tool_names_$$ /tmp/tool_inputs_$$ 2>/dev/null

    # Set up non-blocking keyboard check (save and restore terminal settings)
    local old_tty_settings
    old_tty_settings=$(stty -g 2>/dev/null) || true

    # Cleanup function to restore terminal
    cleanup_terminal() {
        [ -n "$old_tty_settings" ] && stty "$old_tty_settings" 2>/dev/null || true
    }
    trap cleanup_terminal EXIT

    while IFS= read -r line; do
        # Check for ESC key (non-blocking read from terminal)
        if [ -t 0 ] || [ -e /dev/tty ]; then
            local key=""
            # Try to read a key without blocking
            if read -t 0.01 -n 1 -s key </dev/tty 2>/dev/null; then
                # ESC key is character 27 (octal 033)
                if [[ "$key" == $'\x1b' ]]; then
                    printf "\n${YELLOW}  ⏸ PAUSED${NC} - Press any key to resume...\n" >&2
                    # Wait for any key to resume
                    read -n 1 -s </dev/tty 2>/dev/null || true
                    printf "${GREEN}  ▶ RESUMED${NC}\n\n" >&2
                fi
            fi
        fi
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

                # Check for tool use - extract all tools from the message
                local tools_json
                tools_json=$(echo "$line" | jq -c '[.message.content[]? | select(.type == "tool_use") | {id, name, input}]' 2>/dev/null) || true
                if [ -n "$tools_json" ] && [ "$tools_json" != "[]" ]; then
                    # Process each tool
                    echo "$tools_json" | jq -c '.[]' 2>/dev/null | while read -r tool; do
                        local tool_id tool_name tool_input
                        tool_id=$(echo "$tool" | jq -r '.id // empty')
                        tool_name=$(echo "$tool" | jq -r '.name // empty')
                        tool_input=$(echo "$tool" | jq -r '.input | (.description // .command // .pattern // .query // .file_path // .prompt // "working...") | tostring | .[0:100]' 2>/dev/null) || true

                        if [ -n "$tool_name" ] && [ "$tool_name" != "null" ]; then
                            # Store for later lookup (write to temp file for subshell access)
                            echo "$tool_id:$tool_name" >> /tmp/tool_names_$$
                            echo "$tool_id:${tool_input:-working...}" >> /tmp/tool_inputs_$$
                            printf "${YELLOW}  → %s:${NC} %s\n" "$tool_name" "${tool_input:-working...}" >&2
                        fi
                    done
                fi
                ;;
            "user")
                # Tool result - show tool name and brief summary
                local results_json
                results_json=$(echo "$line" | jq -c '[.message.content[]? | select(.type == "tool_result") | {tool_use_id, is_error, content}]' 2>/dev/null) || true
                if [ -n "$results_json" ] && [ "$results_json" != "[]" ]; then
                    echo "$results_json" | jq -c '.[]' 2>/dev/null | while read -r result; do
                        local tool_use_id is_error tool_name result_preview
                        tool_use_id=$(echo "$result" | jq -r '.tool_use_id // empty')
                        is_error=$(echo "$result" | jq -r '.is_error // false')

                        # Look up tool name from stored mapping
                        tool_name=""
                        if [ -f /tmp/tool_names_$$ ]; then
                            tool_name=$(grep "^$tool_use_id:" /tmp/tool_names_$$ 2>/dev/null | cut -d: -f2- | head -1)
                        fi
                        tool_name="${tool_name:-Tool}"

                        # Get preview of result content (first 3 lines, cleaned up)
                        local result_content
                        result_content=$(echo "$result" | jq -r '
                            .content |
                            if type == "string" then .
                            elif type == "array" then (.[0].text // .[0].content // "")
                            else ""
                            end
                        ' 2>/dev/null) || true

                        if [ "$is_error" = "true" ]; then
                            printf "${RED}  ✗ %s: error${NC}\n" "$tool_name" >&2
                        else
                            printf "${GREEN}  ✓ %s${NC}\n" "$tool_name" >&2
                            # Show first 3 non-empty lines of output
                            if [ -n "$result_content" ] && [ "$result_content" != "null" ]; then
                                echo "$result_content" | grep -v '^$' | head -3 | while IFS= read -r preview_line; do
                                    # Truncate long lines and add indent
                                    printf "      ${GREEN}│${NC} %.76s\n" "$preview_line" >&2
                                done
                            fi
                        fi
                    done
                fi
                ;;
            "result")
                # Clean up temp files
                rm -f /tmp/tool_names_$$ /tmp/tool_inputs_$$ 2>/dev/null

                subtype=$(echo "$line" | jq -r '.subtype // empty' 2>/dev/null) || true
                if [ "$subtype" = "success" ]; then
                    final_result=$(echo "$line" | jq -r '.result // empty' 2>/dev/null) || true
                    SESSION_COST=$(echo "$line" | jq -r '.total_cost_usd // 0' 2>/dev/null) || true
                    printf "${GREEN}Session complete (cost: \$%.4f)${NC}\n" "${SESSION_COST:-0}" >&2
                else
                    # Error result - show error but DON'T output anything to stdout
                    local errors
                    errors=$(echo "$line" | jq -r '.errors // [] | .[:3] | join("; ") | .[0:200]' 2>/dev/null) || true
                    printf "${RED}Session error: %s${NC}\n" "${errors:-unknown error}" >&2
                    SESSION_COST="0"
                fi
                ;;
        esac
    done

    # Clean up temp files
    rm -f /tmp/tool_names_$$ /tmp/tool_inputs_$$ 2>/dev/null

    # Output the final result for capture
    if [ -n "$final_result" ] && [ "$final_result" != "null" ]; then
        printf "%s" "$final_result"
    fi
}

# Extract JSON object from mixed text/JSON output
# Claude sometimes outputs explanatory text before JSON despite instructions
# Uses printf instead of echo to avoid escape sequence interpretation
extract_json_from_output() {
    local file="$1"
    local content
    content=$(cat "$file")

    # Method 1: Try parsing the file directly with jq
    if jq -e . "$file" >/dev/null 2>&1; then
        cat "$file"
        return 0
    fi

    # Method 2: Try the entire file content as valid JSON (handles variable capture issues)
    if printf '%s' "$content" | jq -e . >/dev/null 2>&1; then
        printf '%s' "$content"
        return 0
    fi

    # Method 3: Try to find a complete line that is valid JSON
    while IFS= read -r line; do
        [ -z "$line" ] && continue
        # Try the line as-is
        if printf '%s' "$line" | jq -e . >/dev/null 2>&1; then
            printf '%s' "$line"
            return 0
        fi
        # Try extracting JSON starting from first {
        if [[ "$line" == *"{"* ]]; then
            local from_brace="${line#*\{}"
            from_brace="{$from_brace"
            if printf '%s' "$from_brace" | jq -e . >/dev/null 2>&1; then
                printf '%s' "$from_brace"
                return 0
            fi
        fi
    done < "$file"

    # Method 4: Whole content - extract JSON starting from known patterns
    local json_part=""
    for pattern in '{"number"' '{"status"' '{"needs_update"'; do
        if [[ "$content" == *"$pattern"* ]]; then
            json_part="${content#*$pattern}"
            json_part="$pattern$json_part"
            # Trim any trailing non-JSON content by finding last }
            json_part="${json_part%\}*}}"
            if printf '%s' "$json_part" | jq -e . >/dev/null 2>&1; then
                printf '%s' "$json_part"
                return 0
            fi
        fi
    done

    # Method 5: Generic - find first { to last }
    if [[ "$content" == *"{"* ]] && [[ "$content" == *"}"* ]]; then
        local from_brace="${content#*\{}"
        from_brace="{$from_brace"
        from_brace="${from_brace%\}*}}"
        if printf '%s' "$from_brace" | jq -e . >/dev/null 2>&1; then
            printf '%s' "$from_brace"
            return 0
        fi
    fi

    return 1
}

# Wrapper for claude command
# Always runs with --dangerously-skip-permissions and --model opus
# Uses streaming JSON output for progress display
# Logs all raw JSON output to LOG_FILE for debugging
run_claude() {
    local prompt_preview
    prompt_preview=$(echo "$1" | head -c 100 | tr '\n' ' ')

    # Track session start
    SESSION_START_TIME=$(date +%s)
    SESSION_COST="0"

    # Log session start
    echo "" >> "$LOG_FILE"
    echo "═══════════════════════════════════════════════════════════════════" >> "$LOG_FILE"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] CLAUDE SESSION START" >> "$LOG_FILE"
    echo "Prompt: ${prompt_preview}..." >> "$LOG_FILE"
    echo "═══════════════════════════════════════════════════════════════════" >> "$LOG_FILE"

    # Show hint about pause functionality
    printf "${BLUE}  [Press ESC to pause]${NC}\n" >&2

    # All sessions use print mode with streaming JSON for progress display
    claude --dangerously-skip-permissions --model opus --verbose -p --output-format stream-json "$@" 2>&1 | tee -a "$LOG_FILE" | format_progress

    local exit_code=${PIPESTATUS[0]}

    # Log session end
    echo "" >> "$LOG_FILE"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] CLAUDE SESSION END (exit code: $exit_code, cost: \$${SESSION_COST:-0})" >> "$LOG_FILE"
    echo "═══════════════════════════════════════════════════════════════════" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"

    return $exit_code
}

#═══════════════════════════════════════════════════════════════════════════════
# WORKFLOW SESSIONS
#═══════════════════════════════════════════════════════════════════════════════

#─────────────────────────────────────────────────────────────────────
# SESSION 1: Issue Selection
# Context: Clean - focused decision-making
#─────────────────────────────────────────────────────────────────────
select_issue() {
    header "SESSION 1: Issue Selection"
    log "Analyzing open issues to select the best one to work on..."

    # Get issues to skip (have auto-dev labels already)
    local skip_issues
    skip_issues=$(find_in_progress_issues | cut -d'|' -f1 | tr '\n' ',' | sed 's/,$//')

    # Also skip issues with open PRs
    local pr_issues
    pr_issues=$(gh pr list --state open --json number,title --jq '.[].title | capture("issue.?#?(?<num>[0-9]+)"; "i") | .num' 2>/dev/null | tr '\n' ',' || echo "")

    skip_issues="${skip_issues},${pr_issues}"
    skip_issues=$(echo "$skip_issues" | tr ',' '\n' | sort -u | grep -v '^$' | tr '\n' ',' | sed 's/,$//')

    if [ -n "$skip_issues" ]; then
        log "Skipping issues: $skip_issues (in-progress or have open PRs)"
    fi

    local session_start
    session_start=$(date +%s)

    run_claude "
You are selecting a GitHub issue to work on for the habits/fitstreak project.

1. Fetch open issues: gh issue list --state open --json number,title,body,labels,assignees
2. SKIP these issues (in-progress or have open PRs): $skip_issues
3. SKIP issues with any 'auto-dev:' labels (they are being worked on)
4. From remaining issues, analyze for:
   - Priority (bugs > features > enhancements)
   - Complexity (prefer issues you can complete in one session)
   - Dependencies (skip if blocked by other issues)
   - Labels (look for 'good first issue', 'priority', etc.)
5. Select the BEST issue to work on now

If there are no suitable open issues (after excluding skipped ones), output: {\"number\": null, \"title\": null, \"body\": null}

Output ONLY a JSON object (no markdown, no explanation, no code blocks):
{\"number\": 123, \"title\": \"Issue title\", \"body\": \"Issue description\"}
" > "$STATE_DIR/selected_issue_raw.txt"

    local session_end
    session_end=$(date +%s)

    # Extract JSON from output (Claude may include explanatory text)
    local extracted_json
    if ! extracted_json=$(extract_json_from_output "$STATE_DIR/selected_issue_raw.txt"); then
        error "Failed to extract JSON from issue selection output"
        cat "$STATE_DIR/selected_issue_raw.txt" >&2
        return 1
    fi

    # Save cleaned JSON
    echo "$extracted_json" > "$STATE_DIR/selected_issue.json"

    local issue_num
    issue_num=$(echo "$extracted_json" | jq -r '.number')

    if [ "$issue_num" = "null" ] || [ -z "$issue_num" ]; then
        warn "No suitable issues found"
        return 1
    fi

    local issue_title
    issue_title=$(jq -r '.title' "$STATE_DIR/selected_issue.json")

    # Set phase and post memory
    set_phase "$issue_num" "selecting"
    post_session_memory "$issue_num" "Issue Selection" "$session_start" "$session_end" "${SESSION_COST:-0}" \
        "Selected this issue for automated development."

    success "Selected issue #$issue_num: $issue_title"
    echo "$issue_num"
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
# Check if a PR already exists for an issue
#─────────────────────────────────────────────────────────────────────
has_pr_for_issue() {
    local issue_num=$1

    # Check metadata label first (fastest)
    local pr_from_label
    pr_from_label=$(get_metadata "$issue_num" "pr")
    if [ -n "$pr_from_label" ]; then
        # Verify the PR still exists
        if gh pr view "$pr_from_label" --json number >/dev/null 2>&1; then
            echo "$pr_from_label"
            return 0
        fi
    fi

    # Search for PRs that mention this issue
    local pr_num
    pr_num=$(gh pr list --search "issue #$issue_num" --json number -q '.[0].number' 2>/dev/null || echo "")
    if [ -n "$pr_num" ]; then
        echo "$pr_num"
        return 0
    fi

    return 1
}

#─────────────────────────────────────────────────────────────────────
# Check if a PR is already merged
#─────────────────────────────────────────────────────────────────────
is_pr_merged() {
    local pr_num=$1

    local state
    state=$(gh pr view "$pr_num" --json state -q '.state' 2>/dev/null || echo "")
    if [ "$state" = "MERGED" ]; then
        return 0
    fi
    return 1
}

#─────────────────────────────────────────────────────────────────────
# Check if code review was already approved
#─────────────────────────────────────────────────────────────────────
has_review_approved() {
    local issue_num=$1

    # Check issue comments for an approved review session
    local comments
    comments=$(gh issue view "$issue_num" --comments --json comments -q '.comments[].body' 2>/dev/null || echo "")

    if echo "$comments" | grep -qi "Code Review.*APPROVED"; then
        return 0
    fi
    return 1
}

#─────────────────────────────────────────────────────────────────────
# Check if documentation was already updated for this issue
#─────────────────────────────────────────────────────────────────────
has_docs_updated() {
    local issue_num=$1

    # Check issue comments for documentation update
    local comments
    comments=$(gh issue view "$issue_num" --comments --json comments -q '.comments[].body' 2>/dev/null || echo "")

    if echo "$comments" | grep -qi "Auto-Dev Session: Documentation"; then
        return 0
    fi
    return 1
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
    set_phase "$issue_num" "planning"

    # Check if plan already exists
    if has_implementation_plan "$issue_num"; then
        log "Implementation plan already exists for issue #$issue_num"
        get_implementation_plan "$issue_num" > "$STATE_DIR/plan-$issue_num.md"
        success "Using existing plan from issue comments"
        return 0
    fi

    log "Planning implementation for issue #$issue_num..."

    local session_start
    session_start=$(date +%s)

    # Generate plan using print mode (non-interactive)
    local plan
    plan=$(run_claude "
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

    local session_end
    session_end=$(date +%s)

    # Save plan locally
    echo "$plan" > "$STATE_DIR/plan-$issue_num.md"

    # Post plan as comment on the GitHub issue (primary storage)
    log "Posting plan to GitHub issue #$issue_num..."
    gh issue comment "$issue_num" --body "$plan" >/dev/null 2>&1 || warn "Failed to post plan to GitHub"

    # Post session memory
    post_session_memory "$issue_num" "Planning" "$session_start" "$session_end" "${SESSION_COST:-0}" \
        "Created and posted implementation plan to issue comments."

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

    # Check if PR already exists for this issue (idempotency)
    local existing_pr
    if existing_pr=$(has_pr_for_issue "$issue_num"); then
        log "PR #$existing_pr already exists for issue #$issue_num"
        set_metadata "$issue_num" "pr" "$existing_pr"
        set_phase "$issue_num" "pr-waiting"
        success "Using existing PR #$existing_pr"
        echo "$existing_pr"
        return 0
    fi

    set_phase "$issue_num" "implementing"
    log "Implementing and testing issue #$issue_num..."

    # Fetch the implementation plan from GitHub (primary source of truth)
    local implementation_plan
    implementation_plan=$(get_implementation_plan "$issue_num")
    if [ -z "$implementation_plan" ]; then
        error "No implementation plan found for issue #$issue_num"
        mark_blocked "$issue_num" "No implementation plan found in issue comments"
        return 1
    fi
    log "Fetched implementation plan from GitHub issue #$issue_num"

    local session_start
    session_start=$(date +%s)

    run_claude "
Implement GitHub issue #$issue_num following the approved plan below.

$implementation_plan

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

    local session_end
    session_end=$(date +%s)

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
            git commit --no-gpg-sign -m "feat: implement issue #$issue_num" 2>&1 >&2 || true
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

    # Store PR metadata
    set_metadata "$issue_num" "pr" "$pr_num"
    set_metadata "$issue_num" "branch" "$current_branch"
    set_phase "$issue_num" "pr-waiting"

    # Post session memory
    post_session_memory "$issue_num" "Implementation" "$session_start" "$session_end" "${SESSION_COST:-0}" \
        "Implemented feature and created PR #$pr_num on branch \`$current_branch\`." \
        "**PR:** #$pr_num
**Branch:** \`$current_branch\`"

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
    local issue_num=$2

    header "SESSION 4: Code Review (Fresh Context)"

    # Check if review was already approved (idempotency)
    if has_review_approved "$issue_num"; then
        log "Code review already approved for issue #$issue_num"
        success "Skipping review - already approved"
        return 0
    fi

    # Check if PR is already merged (no review needed)
    if is_pr_merged "$pr_num"; then
        log "PR #$pr_num is already merged"
        success "Skipping review - PR already merged"
        return 0
    fi

    set_phase "$issue_num" "reviewing"
    log "Reviewing PR #$pr_num with fresh eyes..."

    local session_start
    session_start=$(date +%s)

    # Get PR information for review
    local pr_diff pr_files pr_title pr_body
    pr_diff=$(gh pr diff "$pr_num" 2>/dev/null || echo "Unable to fetch diff")
    pr_files=$(gh pr view "$pr_num" --json files -q '.files[].path' 2>/dev/null | tr '\n' ', ' || echo "")
    pr_title=$(gh pr view "$pr_num" --json title -q '.title' 2>/dev/null || echo "")
    pr_body=$(gh pr view "$pr_num" --json body -q '.body' 2>/dev/null || echo "")

    run_claude "
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
" > "$STATE_DIR/review_result_raw.txt"

    local session_end
    session_end=$(date +%s)

    # Extract JSON from output (Claude may include explanatory text)
    local extracted_json
    if ! extracted_json=$(extract_json_from_output "$STATE_DIR/review_result_raw.txt"); then
        error "Failed to extract JSON from review output"
        cat "$STATE_DIR/review_result_raw.txt"
        return 1
    fi

    # Save cleaned JSON
    echo "$extracted_json" > "$STATE_DIR/review_result.json"

    local review_status review_summary
    review_status=$(echo "$extracted_json" | jq -r '.status')
    review_summary=$(echo "$extracted_json" | jq -r '.summary')

    log "Review Summary: $review_summary"

    # Post session memory
    post_session_memory "$issue_num" "Code Review" "$session_start" "$session_end" "${SESSION_COST:-0}" \
        "Review result: **${review_status^^}**

$review_summary"

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
    local issue_num=$2

    header "SESSION 5: Fixing Review Feedback"
    set_phase "$issue_num" "fixing"
    log "Addressing review comments for PR #$pr_num..."

    local session_start
    session_start=$(date +%s)

    local review_comments
    review_comments=$(jq -c '.comments' "$STATE_DIR/review_result.json")

    run_claude "
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

    local session_end
    session_end=$(date +%s)

    # Update phase back to pr-waiting for CI
    set_phase "$issue_num" "pr-waiting"

    # Post session memory
    post_session_memory "$issue_num" "Fix Review Feedback" "$session_start" "$session_end" "${SESSION_COST:-0}" \
        "Addressed review feedback and pushed fixes."

    success "Review feedback addressed"
}

#─────────────────────────────────────────────────────────────────────
# SESSION 6: Merge + Deploy + Verify
# Context: Shared - sequential dependent steps
# Phases: 7, 8 from CLAUDE.md
#─────────────────────────────────────────────────────────────────────
merge_and_verify() {
    local pr_num=$1
    local issue_num=$2

    header "SESSION 6: Merge + Deploy + Verify"

    # Check if PR is already merged (idempotency)
    if is_pr_merged "$pr_num"; then
        log "PR #$pr_num is already merged"
        set_phase "$issue_num" "verifying"
        success "Skipping merge - PR already merged"
        return 0
    fi

    set_phase "$issue_num" "merging"
    log "Merging and verifying PR #$pr_num..."

    local session_start
    session_start=$(date +%s)

    run_claude "
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

    local session_end
    session_end=$(date +%s)

    # Update phase
    set_phase "$issue_num" "verifying"

    # Post session memory
    post_session_memory "$issue_num" "Merge & Deploy" "$session_start" "$session_end" "${SESSION_COST:-0}" \
        "Merged PR #$pr_num and verified production deployment."

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

    # Check if documentation was already updated (idempotency)
    if has_docs_updated "$issue_num"; then
        log "Documentation already checked for issue #$issue_num"
        success "Skipping documentation check - already done"
        return 0
    fi

    log "Checking if documentation updates are needed..."

    local session_start
    session_start=$(date +%s)

    run_claude "
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
" > "$STATE_DIR/docs_check_raw.txt"

    local session_end
    session_end=$(date +%s)

    # Extract JSON from output (Claude may include explanatory text)
    local extracted_json
    if ! extracted_json=$(extract_json_from_output "$STATE_DIR/docs_check_raw.txt"); then
        warn "Could not determine if docs need update"
        return 0
    fi

    # Save cleaned JSON
    echo "$extracted_json" > "$STATE_DIR/docs_check.json"

    local needs_update
    needs_update=$(echo "$extracted_json" | jq -r '.needs_update')

    if [ "$needs_update" = "true" ]; then
        local reason
        reason=$(echo "$extracted_json" | jq -r '.reason')
        log "Documentation update needed: $reason"

        local doc_session_start
        doc_session_start=$(date +%s)

        run_claude "
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

        local doc_session_end
        doc_session_end=$(date +%s)

        post_session_memory "$issue_num" "Documentation" "$doc_session_start" "$doc_session_end" "${SESSION_COST:-0}" \
            "Updated CLAUDE.md: $reason"

        success "Documentation updated"
    else
        success "No documentation updates needed"
    fi
}

#─────────────────────────────────────────────────────────────────────
# Complete an issue
#─────────────────────────────────────────────────────────────────────
complete_issue() {
    local issue_num=$1
    local pr_num=$2

    # Set final phase
    set_phase "$issue_num" "complete"

    # Calculate total cost
    local total_cost
    total_cost=$(get_accumulated_cost "$issue_num")
    set_metadata "$issue_num" "cost" "$total_cost"

    # Close the issue with a summary
    gh issue close "$issue_num" --comment "## ✅ Completed by Auto-Dev

| Metric | Value |
|--------|-------|
| **PR** | #$pr_num |
| **Total Cost** | \$$total_cost |
| **Completed** | $(date -u +"%Y-%m-%dT%H:%M:%SZ") |

### Session Summary
See comments above for detailed session logs.

---
<sub>🤖 Automated by auto-dev</sub>" >/dev/null 2>&1 || warn "Failed to close issue"

    success "Issue #$issue_num completed! Total cost: \$$total_cost"
}

#═══════════════════════════════════════════════════════════════════════════════
# RESUME LOGIC
#═══════════════════════════════════════════════════════════════════════════════

resume_from_phase() {
    local issue_num=$1
    local phase=$2

    log "Resuming issue #$issue_num from phase: $phase"

    # Load issue details
    local issue_json
    issue_json=$(gh issue view "$issue_num" --json title,body)
    local issue_title issue_body
    issue_title=$(echo "$issue_json" | jq -r '.title')
    issue_body=$(echo "$issue_json" | jq -r '.body')

    # Get PR number if exists
    local pr_num
    pr_num=$(get_metadata "$issue_num" "pr")

    case "$phase" in
        "selecting")
            # Re-run from planning
            plan_implementation "$issue_num" "$issue_title" "$issue_body"
            resume_from_phase "$issue_num" "planning"
            ;;
        "planning")
            # Run implementation
            local new_pr
            if new_pr=$(implement_and_test "$issue_num"); then
                pr_num="$new_pr"
                resume_from_phase "$issue_num" "pr-waiting"
            else
                mark_blocked "$issue_num" "Implementation failed"
            fi
            ;;
        "implementing")
            # Continue/retry implementation
            local new_pr
            if new_pr=$(implement_and_test "$issue_num"); then
                pr_num="$new_pr"
                resume_from_phase "$issue_num" "pr-waiting"
            else
                mark_blocked "$issue_num" "Implementation failed"
            fi
            ;;
        "pr-waiting")
            if [ -z "$pr_num" ]; then
                mark_blocked "$issue_num" "No PR number found"
                return 1
            fi
            if wait_for_ci "$pr_num"; then
                resume_from_phase "$issue_num" "reviewing"
            else
                set_phase "$issue_num" "ci-failed"
                mark_blocked "$issue_num" "CI checks failed"
            fi
            ;;
        "reviewing"|"ci-failed")
            if [ -z "$pr_num" ]; then
                mark_blocked "$issue_num" "No PR number found"
                return 1
            fi
            run_review_loop "$issue_num" "$pr_num"
            ;;
        "fixing")
            if [ -z "$pr_num" ]; then
                mark_blocked "$issue_num" "No PR number found"
                return 1
            fi
            fix_review_feedback "$pr_num" "$issue_num"
            if wait_for_ci "$pr_num"; then
                resume_from_phase "$issue_num" "reviewing"
            else
                mark_blocked "$issue_num" "CI failed after fixes"
            fi
            ;;
        "merging")
            if [ -z "$pr_num" ]; then
                mark_blocked "$issue_num" "No PR number found"
                return 1
            fi
            merge_and_verify "$pr_num" "$issue_num"
            update_documentation "$issue_num"
            complete_issue "$issue_num" "$pr_num"
            ;;
        "verifying")
            update_documentation "$issue_num"
            complete_issue "$issue_num" "$pr_num"
            ;;
        "complete")
            success "Issue #$issue_num is already complete"
            ;;
        "blocked")
            warn "Issue #$issue_num is blocked - remove 'auto-dev:blocked' label and set appropriate phase to resume"
            ;;
        *)
            warn "Unknown phase: $phase"
            return 1
            ;;
    esac
}

run_review_loop() {
    local issue_num=$1
    local pr_num=$2

    # Get current review round
    local review_round
    review_round=$(get_metadata "$issue_num" "round")
    review_round=${review_round:-0}

    while [ "$review_round" -lt "$MAX_REVIEW_ROUNDS" ]; do
        review_round=$((review_round + 1))
        set_metadata "$issue_num" "round" "$review_round"
        log "Review round $review_round/$MAX_REVIEW_ROUNDS"

        if review_code "$pr_num" "$issue_num"; then
            # Approved - continue to merge
            merge_and_verify "$pr_num" "$issue_num"
            update_documentation "$issue_num"
            complete_issue "$issue_num" "$pr_num"
            return 0
        fi

        if [ "$review_round" -lt "$MAX_REVIEW_ROUNDS" ]; then
            # Fix feedback
            fix_review_feedback "$pr_num" "$issue_num"

            # Re-run CI after fixes
            if ! wait_for_ci "$pr_num"; then
                mark_blocked "$issue_num" "CI failed after fixes"
                return 1
            fi
        else
            mark_blocked "$issue_num" "Max review rounds ($MAX_REVIEW_ROUNDS) reached"
            return 1
        fi
    done
}

#═══════════════════════════════════════════════════════════════════════════════
# MAIN LOOP
#═══════════════════════════════════════════════════════════════════════════════
main() {
    echo ""
    echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║          AUTO-DEV: Automated Development Loop              ║${NC}"
    echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Handle --status flag
    if [ "$SHOW_STATUS" = true ]; then
        show_status
        exit 0
    fi

    # Ensure labels exist
    ensure_labels_exist

    if [ -n "$TARGET_ISSUE" ]; then
        log "Target issue mode - working on issue #$TARGET_ISSUE"
    elif [ "$SINGLE_CYCLE" = true ]; then
        log "Single cycle mode - will exit after one issue"
    elif [ "$RESUME_ONLY" = true ]; then
        log "Resume mode - will only resume in-progress work"
    else
        log "Continuous mode - Press Ctrl+C to stop"
    fi

    while true; do
        echo ""
        log "═══════════════════════════════════════════════════════════"
        log "Starting development cycle at $(date)"
        log "═══════════════════════════════════════════════════════════"

        local issue_num="" issue_title="" issue_body=""

        # If target issue specified, use it directly
        if [ -n "$TARGET_ISSUE" ]; then
            issue_num="$TARGET_ISSUE"

            # Check if this issue is already in-progress
            local existing_phase
            existing_phase=$(get_phase "$issue_num")
            if [ -n "$existing_phase" ] && [ "$existing_phase" != "complete" ] && [ "$existing_phase" != "blocked" ]; then
                log "Issue #$issue_num is already in-progress (phase: $existing_phase)"
                resume_from_phase "$issue_num" "$existing_phase"

                local new_phase
                new_phase=$(get_phase "$issue_num")
                if [ "$new_phase" = "complete" ] || [ "$new_phase" = "blocked" ]; then
                    log "Issue #$issue_num finished. Exiting."
                    exit 0
                fi
                sleep 5
                continue
            fi

            # Fetch issue details from GitHub
            log "Fetching issue #$issue_num from GitHub..."
            local issue_json
            if ! issue_json=$(gh issue view "$issue_num" --json title,body 2>/dev/null); then
                error "Failed to fetch issue #$issue_num"
                exit 1
            fi
            issue_title=$(echo "$issue_json" | jq -r '.title')
            issue_body=$(echo "$issue_json" | jq -r '.body')

            success "Working on: $issue_title"
        else
            # Check for in-progress work first (RESUME)
            local resume_issue_num
            resume_issue_num=$(find_resumable_issue)

            if [ -n "$resume_issue_num" ]; then
                local resume_phase
                resume_phase=$(get_phase "$resume_issue_num")
                log "Found in-progress issue #$resume_issue_num in phase: $resume_phase"

                resume_from_phase "$resume_issue_num" "$resume_phase"

                # Check if we completed or blocked
                local new_phase
                new_phase=$(get_phase "$resume_issue_num")
                if [ "$new_phase" = "complete" ] || [ "$new_phase" = "blocked" ]; then
                    if [ "$SINGLE_CYCLE" = true ]; then
                        log "Single cycle complete. Exiting."
                        exit 0
                    fi
                fi

                # Continue to next iteration
                sleep 5
                continue
            fi

            # No in-progress work
            if [ "$RESUME_ONLY" = true ]; then
                log "No in-progress issues found. Exiting resume mode."
                exit 0
            fi

            # Select new issue
            if ! issue_num=$(select_issue); then
                if [ "$SINGLE_CYCLE" = true ]; then
                    warn "No issues to work on. Exiting."
                    exit 0
                fi
                warn "No suitable issues found. Waiting 30 minutes..."
                sleep 1800
                continue
            fi

            issue_title=$(jq -r '.title' "$STATE_DIR/selected_issue.json")
            issue_body=$(jq -r '.body' "$STATE_DIR/selected_issue.json")
        fi

        # Run the full workflow
        plan_implementation "$issue_num" "$issue_title" "$issue_body"

        local pr_num=""
        if ! pr_num=$(implement_and_test "$issue_num"); then
            mark_blocked "$issue_num" "Implementation failed"
            continue
        fi

        if ! wait_for_ci "$pr_num"; then
            mark_blocked "$issue_num" "CI checks failed"
            continue
        fi

        if ! run_review_loop "$issue_num" "$pr_num"; then
            # Already marked as blocked in run_review_loop
            continue
        fi

        # Success path handled in run_review_loop -> complete_issue

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
