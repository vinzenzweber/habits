import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { getSharedRecipeById } from "@/lib/recipe-sharing";
import { getRecipeDetailTranslations } from "@/lib/translations/recipe-detail";
import { getRecipeSharingTranslations } from "@/lib/translations/recipe-sharing";
import { convertIngredientUnit } from "@/lib/unit-utils";
import { RecipeImageGallery } from "@/components/RecipeImageGallery";
import { PageContextSetter } from "@/components/PageContextSetter";
import { SharedRecipeBadge } from "@/components/SharedRecipeBadge";
import { ForkButton } from "@/components/ForkButton";

export const dynamic = "force-dynamic";

type SharedRecipeDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

async function getRecipeIdFromSlug(slug: string): Promise<number | null> {
  const result = await query<{ id: number }>(
    `SELECT id FROM recipes WHERE slug = $1 AND is_active = true ORDER BY version DESC LIMIT 1`,
    [slug]
  );
  return result.rows[0]?.id ?? null;
}

export async function generateMetadata({
  params,
}: SharedRecipeDetailPageProps): Promise<Metadata> {
  const session = await auth();
  if (!session?.user?.id) {
    return { title: "Unauthorized — FitStreak" };
  }

  const { slug } = await params;
  const recipeId = await getRecipeIdFromSlug(slug);

  if (!recipeId) {
    return { title: "Recipe not found — FitStreak" };
  }

  const userId = parseInt(session.user.id, 10);
  const sharedRecipe = await getSharedRecipeById(userId, recipeId);

  if (!sharedRecipe) {
    return { title: "Recipe not found — FitStreak" };
  }

  return {
    title: `${sharedRecipe.recipe.title} | FitStreak`,
    description: sharedRecipe.recipe.description ?? sharedRecipe.recipe.recipeJson.description,
  };
}

export default async function SharedRecipeDetailPage({
  params,
}: SharedRecipeDetailPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { slug } = await params;
  const recipeId = await getRecipeIdFromSlug(slug);

  if (!recipeId) {
    notFound();
  }

  const userId = parseInt(session.user.id, 10);
  const sharedRecipe = await getSharedRecipeById(userId, recipeId);

  if (!sharedRecipe) {
    notFound();
  }

  // Get user's locale and unit system preferences
  const userLocale = session.user.locale ?? 'en-US';
  const userUnitSystem = session.user.unitSystem ?? 'metric';
  const t = getRecipeDetailTranslations(userLocale);
  const sharingT = getRecipeSharingTranslations(userLocale);

  const { recipe, owner, permission, forkInfo } = sharedRecipe;
  const { recipeJson } = recipe;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <PageContextSetter page="recipe" recipeSlug={recipe.slug} recipeTitle={recipe.title} />
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 pb-16 pt-12 sm:px-8">
        {/* Header Section */}
        <header className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <Link
              href="/recipes?tab=shared"
              className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 transition hover:text-white"
            >
              {t.backToRecipes}
            </Link>
          </div>

          {/* Owner Badge */}
          <div className="flex items-center gap-2">
            <SharedRecipeBadge variant="from" ownerName={owner.name} />
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                permission === "edit"
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-slate-500/20 text-slate-400"
              }`}
            >
              {permission === "edit" ? sharingT.canEdit : sharingT.canView}
            </span>
          </div>

          {/* Title Section */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                {recipe.title}
              </h1>
              {(recipe.description ?? recipeJson.description) && (
                <p className="text-sm text-slate-300 sm:text-base">
                  {recipe.description ?? recipeJson.description}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {permission === "edit" && (
                <Link
                  href={`/recipes/${slug}/edit`}
                  className="inline-flex items-center justify-center rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition"
                >
                  {t.edit}
                </Link>
              )}
              {forkInfo && (
                <ForkButton
                  recipeSlug={recipe.slug}
                  alreadyForked={forkInfo.alreadyForked}
                  forkedRecipeSlug={forkInfo.forkedRecipeSlug}
                  translations={sharingT}
                />
              )}
            </div>
          </div>
        </header>

        {/* Image Gallery */}
        {recipeJson.images.length > 0 && (
          <RecipeImageGallery images={recipeJson.images} title={recipe.title} />
        )}

        {/* Time & Servings Card */}
        <section
          className="rounded-3xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur sm:p-6"
          aria-label="Time and servings"
        >
          <div className="flex flex-wrap gap-6 sm:gap-8">
            {recipeJson.prepTimeMinutes !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-xl">🕐</span>
                <div>
                  <p className="text-xs text-slate-400">{t.prepTime}</p>
                  <p className="font-medium text-white">
                    {recipeJson.prepTimeMinutes} min
                  </p>
                </div>
              </div>
            )}
            {recipeJson.cookTimeMinutes !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-xl">🍳</span>
                <div>
                  <p className="text-xs text-slate-400">{t.cookTime}</p>
                  <p className="font-medium text-white">
                    {recipeJson.cookTimeMinutes} min
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xl">👥</span>
              <div>
                <p className="text-xs text-slate-400">{t.servings}</p>
                <p className="font-medium text-white">{recipeJson.servings}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Nutrition Card */}
        <section
          className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur"
          aria-label="Nutrition information"
        >
          <div className="border-b border-slate-800 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-white">{t.nutrition}</h2>
            <p className="mt-1 text-sm text-slate-400">{t.perServing}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="px-5 py-3 text-left font-medium sm:px-6">
                    {t.energy}
                  </th>
                  <th className="px-5 py-3 text-left font-medium sm:px-6">
                    {t.protein}
                  </th>
                  <th className="px-5 py-3 text-left font-medium sm:px-6">
                    {t.carbohydrates}
                  </th>
                  <th className="px-5 py-3 text-left font-medium sm:px-6">
                    {t.fat}
                  </th>
                  {recipeJson.nutrition.fiber !== undefined && (
                    <th className="px-5 py-3 text-left font-medium sm:px-6">
                      {t.fiber}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                <tr className="text-white">
                  <td className="px-5 py-3 font-medium sm:px-6">
                    {recipeJson.nutrition.calories} kcal
                  </td>
                  <td className="px-5 py-3 font-medium sm:px-6">
                    {recipeJson.nutrition.protein} g
                  </td>
                  <td className="px-5 py-3 font-medium sm:px-6">
                    {recipeJson.nutrition.carbohydrates} g
                  </td>
                  <td className="px-5 py-3 font-medium sm:px-6">
                    {recipeJson.nutrition.fat} g
                  </td>
                  {recipeJson.nutrition.fiber !== undefined && (
                    <td className="px-5 py-3 font-medium sm:px-6">
                      {recipeJson.nutrition.fiber} g
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Tags Section */}
        {recipe.tags.length > 0 && (
          <section aria-label="Tags">
            <div className="flex flex-wrap gap-2">
              {recipe.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Ingredients Section */}
        <section
          className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur"
          aria-label="Ingredients"
        >
          <div className="border-b border-slate-800 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-white">{t.ingredients}</h2>
          </div>
          <div className="divide-y divide-slate-800">
            {recipeJson.ingredientGroups.map((group, groupIndex) => (
              <div key={`${group.name}-${groupIndex}`}>
                <div className="px-5 pb-2 pt-5 sm:px-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">
                    {group.name}
                  </p>
                </div>
                <ul className="px-5 pb-5 sm:px-6">
                  {group.ingredients.map((ingredient, index) => {
                    const converted = convertIngredientUnit(
                      ingredient.quantity,
                      ingredient.unit,
                      userUnitSystem
                    );
                    return (
                      <li
                        key={`${ingredient.name}-${index}`}
                        className="flex items-baseline gap-2 py-2"
                      >
                        <span className="font-medium text-white">
                          {converted.quantity} {converted.unit}
                        </span>
                        <span className="text-slate-300">{ingredient.name}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Instructions Section */}
        <section
          className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur"
          aria-label="Instructions"
        >
          <div className="border-b border-slate-800 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-white">{t.instructions}</h2>
          </div>
          <ol className="divide-y divide-slate-800">
            {recipeJson.steps.map((step) => (
              <li
                key={step.number}
                className="flex gap-4 px-5 py-5 sm:px-6"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-300">
                  {step.number}
                </span>
                <p className="pt-1 text-slate-300">{step.instruction}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
