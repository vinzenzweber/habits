import { redirect, notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import { getGroceryList } from "@/lib/grocery-db";
import { ShoppingModeClient } from "@/components/ShoppingModeClient";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function ShoppingModePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const listId = parseInt(id, 10);

  if (isNaN(listId)) {
    notFound();
  }

  const userId = Number(session.user.id);
  const list = await getGroceryList(userId, listId);

  if (!list) {
    notFound();
  }

  return <ShoppingModeClient initialList={list} />;
}
