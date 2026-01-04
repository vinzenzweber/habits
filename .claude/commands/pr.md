# Pull Request Workflow

Create a pull request with full review, testing, deployment, and verification cycle.

## Steps

### 1. Commit Changes
- Run `git status` to see all changes
- Run `git diff` to review staged and unstaged changes
- Stage relevant files with `git add`
- Create a descriptive commit with the standard format

### 2. Push to Remote
- Create a new branch if needed: `git checkout -b <branch-name>`
- Push with upstream tracking: `git push -u origin <branch-name>`

### 3. Create Pull Request
- Use `gh pr create` with a clear title and body
- Include a summary section with bullet points
- Include a test plan section

### 4. Request Copilot Review
- After PR is created, request review from @copilot
- Use: `gh pr edit <pr-number> --add-reviewer copilot`

### 5. Wait for Review
- Poll for review completion: `gh pr checks <pr-number>`
- Fetch PR comments: `gh pr view <pr-number> --comments`

### 6. Address Review Feedback
For each issue found:
1. Read the comment and understand the concern
2. Make the necessary code changes
3. Test changes locally with Playwright MCP
4. Commit the fix with a descriptive message
5. Push updates to the branch

### 7. Test Locally with Playwright
- Use Playwright MCP to verify the changes work correctly
- Navigate through affected user flows
- Capture screenshots if needed for verification

### 8. Iterate Until Complete
- Repeat steps 5-7 until all review comments are resolved
- Ensure all CI checks pass

### 9. Merge Pull Request
Only merge when ALL conditions are met:
- Local tests pass with Playwright
- No unresolved review comments
- No merge conflicts

Merge command: `gh pr merge <pr-number> --squash --delete-branch`

### 10. Wait for Railway Deployment
- Railway auto-deploys on merge to main
- Monitor deployment status: `railway logs --latest`
- Wait for deployment to complete successfully

### 11. Check Railway Logs
- Check deploy logs for build errors: `railway logs`
- Check application logs for runtime errors
- Look for startup issues, database connection problems, etc.

### 12. Fix Deployment Issues (if any)
If deployment fails or logs show errors:
1. Identify the root cause from logs
2. Create a hotfix on a new branch
3. Test the fix locally
4. Fast-track PR and merge
5. Re-verify deployment

### 13. Verify Production with Playwright
- Navigate to production URL with Playwright MCP
- Test all affected user flows on live site
- Verify the feature works as expected in production
- Check for any console errors or visual regressions

## Notes
- Always test locally before pushing fixes
- Keep commits atomic and well-described
- Respond to review comments with explanations when needed
- Production URL: https://habits-production.up.railway.app (or configured domain)
