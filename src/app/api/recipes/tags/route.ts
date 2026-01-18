/**
 * API endpoint for recipe tags
 * Returns predefined tags and user's custom tags
 */

import { auth } from "@/lib/auth";
import { getUserTags } from "@/lib/recipes";
import {
  PREDEFINED_TAGS,
  TAG_CATEGORIES,
  type PredefinedTag,
  type TagCategoryInfo,
  type TagCategory,
} from "@/lib/predefined-tags";

export const runtime = "nodejs";

export interface TagsResponse {
  /** All predefined tags with metadata */
  predefined: PredefinedTag[];
  /** User's custom tags (not in predefined list) */
  custom: string[];
  /** Category metadata for UI grouping */
  categories: Record<TagCategory, TagCategoryInfo>;
}

/**
 * GET /api/recipes/tags
 * Get all available tags (predefined + user's custom)
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get user's existing tags from database
    const userTags = await getUserTags();

    // Filter out predefined tags to get custom ones
    const predefinedIds = new Set(PREDEFINED_TAGS.map((t) => t.id));
    const customTags = userTags.filter((tag) => !predefinedIds.has(tag));

    return Response.json({
      predefined: PREDEFINED_TAGS,
      custom: customTags,
      categories: TAG_CATEGORIES,
    } satisfies TagsResponse);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return Response.json({ error: "Failed to fetch tags" }, { status: 500 });
  }
}
