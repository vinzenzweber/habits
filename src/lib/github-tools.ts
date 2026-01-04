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

  const issueBody = `## User Feedback

${description}

---
*Submitted via in-app chat*
*User ID: ${userId}*
*Date: ${new Date().toISOString()}*`;

  try {
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
        body: issueBody,
        labels: labelMap[feedbackType]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('GitHub API error:', error);
      return { success: false, message: 'Failed to create issue' };
    }

    const data = await response.json();
    return {
      success: true,
      issueNumber: data.number,
      message: 'Feedback recorded'
    };
  } catch (error) {
    console.error('GitHub issue creation error:', error);
    return { success: false, message: 'Failed to create issue' };
  }
}
