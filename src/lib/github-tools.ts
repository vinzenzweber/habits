/**
 * GitHub integration for creating feedback issues
 */

interface CreateIssueResult {
  success: boolean;
  issueNumber?: number;
  message: string;
}

type FeedbackType = 'bug' | 'feature' | 'improvement' | 'question';

interface Screenshot {
  label: string;
  dataUrl: string; // base64 data URL (e.g., "data:image/png;base64,...")
}

/**
 * Upload an image to GitHub and get a markdown-compatible URL
 * Uses GitHub's repository upload API to store the image
 */
async function uploadImageToGitHub(
  token: string,
  repo: string,
  screenshot: Screenshot,
  issueNumber: number
): Promise<string | null> {
  try {
    // Extract base64 data from data URL
    const matches = screenshot.dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
    if (!matches) {
      console.error('Invalid image data URL format');
      return null;
    }

    const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];

    // Create a unique filename with timestamp
    const timestamp = Date.now();
    const sanitizedLabel = screenshot.label.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filename = `feedback-${issueNumber}-${sanitizedLabel}-${timestamp}.${extension}`;
    const path = `.github/feedback-screenshots/${filename}`;

    // Upload file to repository
    const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Add feedback screenshot for issue #${issueNumber}`,
        content: base64Data,
        branch: 'main'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('GitHub image upload error:', error);
      return null;
    }

    const data = await response.json();
    return data.content?.download_url || null;
  } catch (error) {
    console.error('Failed to upload image:', error);
    return null;
  }
}

/**
 * Create a GitHub issue for app feedback
 */
export async function createFeedbackIssue(
  userId: string,
  title: string,
  description: string,
  feedbackType: FeedbackType,
  screenshots?: Screenshot[]
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

  // Build initial issue body (screenshots will be added after upload)
  const buildIssueBody = (screenshotMarkdown?: string) => {
    let body = `## User Feedback

${description}`;

    if (screenshotMarkdown) {
      body += `

## Screenshots

${screenshotMarkdown}`;
    }

    body += `

---
*Submitted via in-app chat*
*User ID: ${userId}*
*Date: ${new Date().toISOString()}*`;

    return body;
  };

  try {
    // Create the issue first (without screenshots)
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

    // If we have screenshots, upload them and update the issue
    if (screenshots && screenshots.length > 0) {
      const uploadedScreenshots: { label: string; url: string }[] = [];

      for (const screenshot of screenshots) {
        const imageUrl = await uploadImageToGitHub(token, repo, screenshot, issueNumber);
        if (imageUrl) {
          uploadedScreenshots.push({ label: screenshot.label, url: imageUrl });
        }
      }

      // If any screenshots were uploaded, update the issue body
      if (uploadedScreenshots.length > 0) {
        const screenshotMarkdown = uploadedScreenshots
          .map(s => `### ${s.label}\n![${s.label}](${s.url})`)
          .join('\n\n');

        // Update the issue with screenshots
        await fetch(`https://api.github.com/repos/${repo}/issues/${issueNumber}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            body: buildIssueBody(screenshotMarkdown)
          })
        });
      }
    }

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

export type { Screenshot, FeedbackType };
