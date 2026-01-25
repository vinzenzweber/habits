import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { auth } from '@/lib/auth';
import { getUserTags } from '@/lib/recipes';
import { RecipeForm } from '@/components/RecipeForm';
import { PREDEFINED_TAGS, TAG_CATEGORIES } from '@/lib/predefined-tags';

export const dynamic = 'force-dynamic';

export default async function NewRecipePage({
  searchParams,
}: {
  searchParams: Promise<{ image?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const t = await getTranslations('recipes');

  // Get user's locale preference (with fallback to 'en-US')
  const userLocale = session.user.locale ?? 'en-US';

  // Get existing tags for autocomplete
  const existingTags = await getUserTags();

  // Get initial image URL from search params (if redirected from photo capture)
  const params = await searchParams;
  const initialImageUrl = params.image;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-5 pb-24 pt-12 sm:px-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <Link
            href="/recipes"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 transition"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('backToRecipes')}
          </Link>
        </header>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          {t('newRecipe')}
        </h1>

        {/* Form */}
        <RecipeForm
          existingTags={existingTags}
          predefinedTags={PREDEFINED_TAGS}
          tagCategories={TAG_CATEGORIES}
          defaultLocale={userLocale}
          initialImageUrl={initialImageUrl}
        />
      </div>
    </main>
  );
}
