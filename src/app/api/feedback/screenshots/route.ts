import { auth } from "@/lib/auth";
import { uploadImageToGitHub, type Screenshot } from "@/lib/github-screenshot-upload";

export const runtime = 'nodejs';

// Limits to prevent abuse
const MAX_SCREENSHOTS = 2;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB per image

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

    // Enforce screenshot count limit
    if (screenshots.length > MAX_SCREENSHOTS) {
      return Response.json({
        error: `Maximum ${MAX_SCREENSHOTS} screenshots allowed`
      }, { status: 400 });
    }

    // Validate screenshot sizes
    for (const screenshot of screenshots) {
      if (!screenshot.dataUrl || typeof screenshot.dataUrl !== 'string') {
        return Response.json({ error: "Invalid screenshot format" }, { status: 400 });
      }

      // Estimate size from base64 (rough calculation: base64 is ~4/3 of binary size)
      const base64Match = screenshot.dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
      if (!base64Match) {
        return Response.json({ error: "Invalid image data format" }, { status: 400 });
      }

      const estimatedSize = (base64Match[2].length * 3) / 4;
      if (estimatedSize > MAX_IMAGE_SIZE_BYTES) {
        return Response.json({
          error: `Screenshot too large (max ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB)`
        }, { status: 400 });
      }
    }

    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO || 'vinzenzweber/habits';

    if (!token) {
      return Response.json({ error: "GitHub integration not configured" }, { status: 500 });
    }

    // First, get the existing issue and validate ownership
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

    // Validate this is a user-feedback issue created by this user
    const hasUserFeedbackLabel = issueData.labels?.some(
      (label: { name: string }) => label.name === 'user-feedback'
    );
    const containsUserId = existingBody.includes(`User ID: ${session.user.id}`);

    if (!hasUserFeedbackLabel || !containsUserId) {
      return Response.json({
        error: "You can only attach screenshots to your own feedback issues"
      }, { status: 403 });
    }

    // Upload screenshots to GitHub
    const uploadedScreenshots: { label: string; url: string }[] = [];

    for (const screenshot of screenshots as Screenshot[]) {
      const imageUrl = await uploadImageToGitHub(token, repo, screenshot, issueNumber);
      if (imageUrl) {
        uploadedScreenshots.push({ label: screenshot.label, url: imageUrl });
      }
    }

    if (uploadedScreenshots.length === 0) {
      console.error('[Feedback Screenshots API] All screenshot uploads failed');
      return Response.json({ error: "Failed to upload screenshots" }, { status: 500 });
    }

    // Build screenshot markdown
    const screenshotMarkdown = uploadedScreenshots
      .map(s => `### ${s.label}\n![${s.label}](${s.url})`)
      .join('\n\n');

    // Update issue body with screenshots section
    let newBody: string;
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
    console.error('[Feedback Screenshots API] Error:', error);
    return Response.json({ error: "Failed to process screenshots" }, { status: 500 });
  }
}
