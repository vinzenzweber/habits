import { auth } from "@/lib/auth";

export const runtime = 'nodejs';

interface Screenshot {
  label: string;
  dataUrl: string;
}

/**
 * Upload screenshots and update an existing GitHub issue
 * POST /api/feedback/screenshots
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { issueNumber, screenshots } = await request.json();

    if (!issueNumber || typeof issueNumber !== 'number') {
      return Response.json({ error: "Issue number is required" }, { status: 400 });
    }

    if (!screenshots || !Array.isArray(screenshots) || screenshots.length === 0) {
      return Response.json({ error: "Screenshots are required" }, { status: 400 });
    }

    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO || 'vinzenzweber/habits';

    if (!token) {
      return Response.json({ error: "GitHub integration not configured" }, { status: 500 });
    }

    // First, get the existing issue body
    const issueResponse = await fetch(`https://api.github.com/repos/${repo}/issues/${issueNumber}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      }
    });

    if (!issueResponse.ok) {
      return Response.json({ error: "Issue not found" }, { status: 404 });
    }

    const issueData = await issueResponse.json();
    const existingBody = issueData.body || '';

    // Upload screenshots to GitHub
    const uploadedScreenshots: { label: string; url: string }[] = [];

    for (const screenshot of screenshots as Screenshot[]) {
      const imageUrl = await uploadImageToGitHub(token, repo, screenshot, issueNumber);
      if (imageUrl) {
        uploadedScreenshots.push({ label: screenshot.label, url: imageUrl });
      }
    }

    if (uploadedScreenshots.length === 0) {
      return Response.json({ error: "Failed to upload screenshots" }, { status: 500 });
    }

    // Build screenshot markdown
    const screenshotMarkdown = uploadedScreenshots
      .map(s => `### ${s.label}\n![${s.label}](${s.url})`)
      .join('\n\n');

    // Update issue body with screenshots section
    let newBody = existingBody;
    if (existingBody.includes('## Screenshots')) {
      // Replace existing screenshots section
      newBody = existingBody.replace(
        /## Screenshots[\s\S]*?(?=\n---|\n##|$)/,
        `## Screenshots\n\n${screenshotMarkdown}\n\n`
      );
    } else {
      // Insert screenshots section before the metadata section
      const metadataSeparator = '\n---\n';
      const separatorIndex = existingBody.indexOf(metadataSeparator);
      if (separatorIndex !== -1) {
        newBody = existingBody.slice(0, separatorIndex) +
          `\n\n## Screenshots\n\n${screenshotMarkdown}` +
          existingBody.slice(separatorIndex);
      } else {
        newBody = existingBody + `\n\n## Screenshots\n\n${screenshotMarkdown}`;
      }
    }

    // Update the issue
    const updateResponse = await fetch(`https://api.github.com/repos/${repo}/issues/${issueNumber}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: newBody })
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      console.error('Failed to update issue:', error);
      return Response.json({ error: "Failed to update issue with screenshots" }, { status: 500 });
    }

    return Response.json({
      success: true,
      screenshotsUploaded: uploadedScreenshots.length
    });

  } catch (error) {
    console.error('Screenshot upload error:', error);
    return Response.json({ error: "Failed to process screenshots" }, { status: 500 });
  }
}

/**
 * Upload an image to GitHub and get a markdown-compatible URL
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
