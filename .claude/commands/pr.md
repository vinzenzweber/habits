# Pull Request Workflow

Create a pull request with full review and testing cycle.

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
- Merge when approved

## Notes
- Always test locally before pushing fixes
- Keep commits atomic and well-described
- Respond to review comments with explanations when needed
