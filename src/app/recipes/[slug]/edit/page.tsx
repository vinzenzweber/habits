import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';

import { auth } from '@/lib/auth';
import { getRecipeBySlug, getUserTags } from '@/lib/recipes';
import { RecipeForm } from '@/components/RecipeForm';
import { PREDEFINED_TAGS, TAG_CATEGORIES } from '@/lib/predefined-tags';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EditRecipePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);

  if (!recipe) {
    notFound();
  }

  // Get existing tags for autocomplete
  const existingTags = await getUserTags();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-5 pb-24 pt-12 sm:px-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <Link
            href={`/recipes/${slug}`}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 transition"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Recipe
          </Link>
        </header>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Edit Recipe
        </h1>

        {/* Form */}
        <RecipeForm
          initialRecipe={recipe.recipeJson}
          slug={slug}
          existingTags={existingTags}
          predefinedTags={PREDEFINED_TAGS}
          tagCategories={TAG_CATEGORIES}
        />
      </div>
    </main>
  );
}
