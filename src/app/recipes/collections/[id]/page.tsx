import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getCollection, getReceivedCollections } from "@/lib/collection-db";
import { CollectionDetailClient } from "./CollectionDetailClient";

export const dynamic = "force-dynamic";

type CollectionDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({
  params,
}: CollectionDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return { title: "Collection — FitStreak" };
  }

  const collectionId = parseInt(id, 10);
  if (isNaN(collectionId)) {
    return { title: "Collection not found — FitStreak" };
  }

  const collection = await getCollection(Number(session.user.id), collectionId);

  if (!collection) {
    return { title: "Collection not found — FitStreak" };
  }

  return {
    title: `${collection.name} | FitStreak`,
    description: collection.description ?? `${collection.recipeCount} recipes`,
  };
}

export default async function CollectionDetailPage({
  params,
}: CollectionDetailPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const collectionId = parseInt(id, 10);

  if (isNaN(collectionId)) {
    notFound();
  }

  const collection = await getCollection(Number(session.user.id), collectionId);

  if (!collection) {
    notFound();
  }

  // Check if this collection was shared with the user
  const receivedCollections = await getReceivedCollections(
    Number(session.user.id)
  );
  const receivedInfo = receivedCollections.find(
    (rc) => rc.collection.id === collectionId
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-5 pb-24 pt-12 sm:px-8">
        {/* Header */}
        <header className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Link
              href="/recipes"
              className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 transition hover:text-white"
            >
              Back to Recipes
            </Link>
          </div>
        </header>

        {/* Client component for interactivity */}
        <CollectionDetailClient
          initialCollection={collection}
          sharedBy={receivedInfo?.sharedBy}
        />
      </div>
    </main>
  );
}
