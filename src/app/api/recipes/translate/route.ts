import OpenAI from "openai";
import { auth } from "@/lib/auth";
import {
  translateRecipeTool,
  SUPPORTED_TRANSLATION_LOCALES,
  type TranslationLocale,
} from "@/lib/recipe-tools";

export const runtime = 'nodejs';

/**
 * POST /api/recipes/translate
 * Translate a recipe to a different language.
 *
 * Request body:
 * - recipeId: number - ID of the recipe to translate
 * - targetLocale: string - Target locale (e.g., 'de-DE', 'en-US')
 * - adaptMeasurements: boolean - Whether to convert measurements (default: true)
 * - saveAsNew: boolean - Whether to save as new version (default: false)
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { recipeId, targetLocale, adaptMeasurements, saveAsNew } = await request.json();

    // Validate required fields
    if (typeof recipeId !== 'number') {
      return Response.json({ error: "recipeId is required and must be a number" }, { status: 400 });
    }

    if (!targetLocale || typeof targetLocale !== 'string') {
      return Response.json({ error: "targetLocale is required" }, { status: 400 });
    }

    // Validate target locale
    if (!SUPPORTED_TRANSLATION_LOCALES.includes(targetLocale as TranslationLocale)) {
      return Response.json({
        error: `Invalid targetLocale. Supported locales: ${SUPPORTED_TRANSLATION_LOCALES.join(', ')}`
      }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const result = await translateRecipeTool(
      openai,
      session.user.id,
      recipeId,
      targetLocale as TranslationLocale,
      adaptMeasurements ?? true,
      saveAsNew ?? false
    );

    return Response.json(result);
  } catch (error) {
    console.error("Translation API error:", error);
    const message = error instanceof Error ? error.message : "Translation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
