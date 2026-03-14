/**
 * GitHub integration for creating feedback issues
 */

interface CreateIssueResult {
  success: boolean;
  issueNumber?: number;
  message: string;
}

type FeedbackType = 'bug' | 'feature' | 'improvement' | 'question';

/**
 * Create a GitHub issue for app feedback
 * Screenshots are uploaded separately via the authenticated /api/feedback/screenshots endpoint
 */
export async function createFeedbackIssue(
  userId: string,
  title: string,
  description: string,
  feedbackType: FeedbackType
): Promise<CreateIssueResult> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || 'vinzenzweber/habits';

  if (!token) {
    console.error('GITHUB_TOKEN not configured');
    return { success: false, message: 'GitHub integration not configured' };
  }

  // Map feedback type to GitHub labels
  const labelMap: Record<FeedbackType, string[]> = {
    'bug': ['bug', 'user-feedback'],
    'feature': ['enhancement', 'user-feedback'],
    'improvement': ['enhancement', 'user-feedback'],
    'question': ['question', 'user-feedback']
  };

  // Build issue body
  const buildIssueBody = () => `## User Feedback

${description}

---
*Submitted via in-app chat*
*User ID: ${userId}*
*Date: ${new Date().toISOString()}*`;

  try {
    // Create the issue (screenshots will be added separately via API endpoint)
    const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `[User Feedback] ${title}`,
        body: buildIssueBody(),
        labels: labelMap[feedbackType]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('GitHub API error:', error);
      return { success: false, message: 'Failed to create issue' };
    }

    const data = await response.json();
    const issueNumber = data.number;

    return {
      success: true,
      issueNumber,
      message: 'Feedback recorded'
    };
  } catch (error) {
    console.error('GitHub issue creation error:', error);
    return { success: false, message: 'Failed to create issue' };
  }
}

/**
 * Add a follow-up comment to an existing feedback issue
 */
export async function addFeedbackComment(
  userId: string,
  issueNumber: number,
  comment: string
): Promise<CreateIssueResult> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO || 'vinzenzweber/habits';

  if (!token) {
    console.error('GITHUB_TOKEN not configured');
    return { success: false, message: 'GitHub integration not configured' };
  }

  try {
    // Verify the issue exists and has user-feedback label
    const issueResponse = await fetch(`https://api.github.com/repos/${repo}/issues/${issueNumber}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      }
    });

    if (!issueResponse.ok) {
      if (issueResponse.status === 404) {
        return { success: false, message: 'Feedback issue not found' };
      }
      const errorBody = await issueResponse.text();
      console.error('GitHub API error fetching issue:', issueResponse.status, errorBody);
      return { success: false, message: 'Failed to load feedback issue' };
    }

    const issueData = await issueResponse.json();

    // Verify it's a user-feedback issue
    const hasLabel = issueData.labels?.some((l: { name: string }) => l.name === 'user-feedback');
    if (!hasLabel) {
      return { success: false, message: 'Not a feedback issue' };
    }

    // Verify ownership - exact match against the known issue body format "*User ID: <id>*"
    // Using regex with escaped userId to prevent prefix bypass (e.g., "user-12" matching "user-123")
    const escapedUserId = userId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const bodyContainsUser = new RegExp(`\\*User ID: ${escapedUserId}\\*`).test(issueData.body ?? '');
    if (!bodyContainsUser) {
      return { success: false, message: 'Not authorized to comment on this issue' };
    }

    // Add comment
    const commentResponse = await fetch(`https://api.github.com/repos/${repo}/issues/${issueNumber}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        body: `## Follow-up from user\n\n${comment}\n\n---\n*Added via in-app chat*\n*Date: ${new Date().toISOString()}*`
      })
    });

    if (!commentResponse.ok) {
      const error = await commentResponse.text();
      console.error('GitHub API error:', error);
      return { success: false, message: 'Failed to add comment' };
    }

    return {
      success: true,
      issueNumber,
      message: 'Follow-up added to feedback'
    };
  } catch (error) {
    console.error('GitHub comment error:', error);
    return { success: false, message: 'Failed to add comment' };
  }
}

export type { FeedbackType };
