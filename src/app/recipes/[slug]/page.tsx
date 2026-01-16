import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getRecipeBySlug } from "@/lib/recipes";
import { RecipeImageGallery } from "@/components/RecipeImageGallery";
import { PageContextSetter } from "@/components/PageContextSetter";

export const dynamic = "force-dynamic";

type RecipeDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: RecipeDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);

  if (!recipe) {
    return {
      title: "Recipe not found — FitStreak",
    };
  }

  return {
    title: `${recipe.title} | FitStreak`,
    description: recipe.description ?? recipe.recipeJson.description,
  };
}

export default async function RecipeDetailPage({
  params,
}: RecipeDetailPageProps) {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);

  if (!recipe) {
    notFound();
  }

  const { recipeJson } = recipe;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <PageContextSetter page="recipe" recipeSlug={recipe.slug} recipeTitle={recipe.title} />
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 pb-16 pt-12 sm:px-8">
        {/* Header Section */}
        <header className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <Link
              href="/recipes"
              className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 transition hover:text-white"
            >
              ← Back to recipes
            </Link>
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
              <Link
                href={`/recipes/${slug}/edit`}
                className="inline-flex items-center justify-center rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition"
              >
                Edit
              </Link>
              <button
                disabled
                className="inline-flex cursor-not-allowed items-center justify-center rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-slate-500"
                title="Coming soon"
              >
                Share
              </button>
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
                  <p className="text-xs text-slate-400">Prep</p>
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
                  <p className="text-xs text-slate-400">Cook</p>
                  <p className="font-medium text-white">
                    {recipeJson.cookTimeMinutes} min
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xl">👥</span>
              <div>
                <p className="text-xs text-slate-400">Servings</p>
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
            <h2 className="text-lg font-semibold text-white">Nutrition</h2>
            <p className="mt-1 text-sm text-slate-400">Per serving</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th className="px-5 py-3 text-left font-medium sm:px-6">
                    Energie
                  </th>
                  <th className="px-5 py-3 text-left font-medium sm:px-6">
                    Protein
                  </th>
                  <th className="px-5 py-3 text-left font-medium sm:px-6">
                    Kohlenhydrate
                  </th>
                  <th className="px-5 py-3 text-left font-medium sm:px-6">
                    Fett
                  </th>
                  {recipeJson.nutrition.fiber !== undefined && (
                    <th className="px-5 py-3 text-left font-medium sm:px-6">
                      Ballaststoffe
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
            <h2 className="text-lg font-semibold text-white">Zutaten</h2>
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
                  {group.ingredients.map((ingredient, index) => (
                    <li
                      key={`${ingredient.name}-${index}`}
                      className="flex items-baseline gap-2 py-2"
                    >
                      <span className="font-medium text-white">
                        {ingredient.quantity} {ingredient.unit}
                      </span>
                      <span className="text-slate-300">{ingredient.name}</span>
                    </li>
                  ))}
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
            <h2 className="text-lg font-semibold text-white">Zubereitung</h2>
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
