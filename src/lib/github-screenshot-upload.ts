/**
 * Shared GitHub screenshot upload functionality
 * Used by both the /api/feedback/screenshots endpoint and github-tools
 */

export interface Screenshot {
  label: string;
  dataUrl: string; // base64 data URL (e.g., "data:image/png;base64,...")
}

/**
 * Upload an image to GitHub and get a markdown-compatible URL
 * Uses GitHub's repository upload API to store the image
 */
export async function uploadImageToGitHub(
  token: string,
  repo: string,
  screenshot: Screenshot,
  issueNumber: number
): Promise<string | null> {
  try {
    console.log('[GitHub Upload] Starting upload for:', screenshot.label);

    // Extract base64 data from data URL
    const matches = screenshot.dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
    if (!matches) {
      console.error('[GitHub Upload] Invalid image data URL format. URL starts with:', screenshot.dataUrl?.substring(0, 50));
      return null;
    }

    const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];

    // Create a unique filename with timestamp
    const timestamp = Date.now();
    const sanitizedLabel = screenshot.label.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const filename = `feedback-${issueNumber}-${sanitizedLabel}-${timestamp}.${extension}`;
    const path = `.github/feedback-screenshots/${filename}`;

    // Upload file to repository (branch omitted to use default)
    console.log('[GitHub Upload] Uploading to:', path);
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
        content: base64Data
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[GitHub Upload] Failed:', response.status, error);
      return null;
    }

    const data = await response.json();
    const downloadUrl = data.content?.download_url || null;
    console.log('[GitHub Upload] Success, download_url:', downloadUrl);
    return downloadUrl;
  } catch (error) {
    console.error('[GitHub Upload] Exception:', error);
    return null;
  }
}
