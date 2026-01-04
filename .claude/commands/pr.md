# Pull Request Workflow

Create a pull request with full review, testing, deployment, and verification cycle.

## Steps

### 1. Commit Changes
- Run `git status` to see all changes
- Run `git diff` to review staged and unstaged changes
- Stage relevant files with `git add`
- Create a descriptive commit with the standard format

```bash
# Review changes
git status
git diff --stat
git log --oneline -5

# Stage and commit
git add <files>
git commit -m "$(cat <<'EOF'
feat: description of changes

Details here.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

### 2. Push to Remote
- Create a new branch if needed
- Push with upstream tracking

```bash
# Create branch and push
git checkout -b feat/feature-name
git push -u origin feat/feature-name
```

### 3. Create Pull Request
- Use `gh pr create` with a clear title and body
- Include a summary section with bullet points
- Include a test plan section

```bash
gh pr create --title "feat: description" --body "$(cat <<'EOF'
## Summary
- Change 1
- Change 2

## Test plan
- [ ] Test case 1
- [ ] Test case 2

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### 4. Request Copilot Review
- After PR is created, request review from @copilot

```bash
gh pr edit <pr-number> --add-reviewer copilot
```

### 5. Wait for Review
- Poll for review completion and fetch comments

```bash
# Check CI status
gh pr checks <pr-number>

# View PR details and comments
gh pr view <pr-number> --comments

# Check review status via API
gh api repos/<owner>/<repo>/pulls/<pr-number>/reviews
gh api repos/<owner>/<repo>/pulls/<pr-number>/comments

# Check merge readiness
gh pr view <pr-number> --json mergeable,mergeStateStatus,reviewDecision,reviews,comments
```

### 6. Address Review Feedback
For each issue found:
1. Read the comment and understand the concern
2. Make the necessary code changes
3. Test changes locally with Playwright MCP
4. Commit the fix with a descriptive message
5. Push updates to the branch

```bash
# After fixing issues
git add <files>
git commit -m "fix: address review feedback"
git push
```

### 7. Test Locally with Playwright
- Use Playwright MCP to verify the changes work correctly
- Navigate through affected user flows
- Capture screenshots if needed for verification

```bash
# Start dev server
npm run dev

# Use Playwright MCP tools:
# - mcp__playwright__browser_navigate
# - mcp__playwright__browser_click
# - mcp__playwright__browser_snapshot
# - mcp__playwright__browser_take_screenshot
```

### 8. Iterate Until Complete
- Repeat steps 5-7 until all review comments are resolved
- Ensure all CI checks pass

### 9. Merge Pull Request
Only merge when ALL conditions are met:
- Local tests pass with Playwright
- No unresolved review comments
- No merge conflicts

```bash
# Verify merge readiness
gh pr view <pr-number> --json mergeable,mergeStateStatus
# Should show: "mergeStateStatus":"CLEAN","mergeable":"MERGEABLE"

# Merge with squash
gh pr merge <pr-number> --squash --delete-branch
```

### 10. Wait for Railway Deployment
- Railway auto-deploys on merge to main
- Check deployment status

```bash
# Switch to main and pull
git checkout main && git pull

# Check Railway project status
railway status

# Get production domain
railway domain
```

### 11. Check Railway Logs
- Check deploy logs for build errors
- Check application logs for runtime errors
- Look for startup issues, database connection problems, etc.

```bash
# View recent logs
railway logs

# Look for specific patterns
railway logs 2>&1 | head -100
```

### 12. Fix Deployment Issues (if any)
If deployment fails or logs show errors:
1. Identify the root cause from logs
2. Create a hotfix on a new branch
3. Test the fix locally
4. Fast-track PR and merge
5. Re-verify deployment

```bash
# Create hotfix branch
git checkout -b fix/hotfix-name
# ... make fixes ...
git add . && git commit -m "fix: hotfix description"
git push -u origin fix/hotfix-name
gh pr create --title "fix: hotfix" --body "Hotfix for production issue"
gh pr merge <pr-number> --squash --delete-branch
```

### 13. Verify Production with Playwright
- Navigate to production URL with Playwright MCP
- Test all affected user flows on live site
- Verify the feature works as expected in production
- Check for any console errors or visual regressions

```bash
# Get production URL
railway domain
# Returns: https://<app-name>.up.railway.app

# Use Playwright MCP to test production:
# mcp__playwright__browser_navigate to production URL
# mcp__playwright__browser_click through user flows
# mcp__playwright__browser_snapshot to verify state
# mcp__playwright__browser_console_messages to check for errors
```

## Notes
- Always test locally before pushing fixes
- Keep commits atomic and well-described
- Respond to review comments with explanations when needed
- Production URL can be found with `railway domain`
