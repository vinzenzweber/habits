import { redirect, notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import { getGroceryList } from "@/lib/grocery-db";
import { query } from "@/lib/db";
import { GroceryListDetailClient } from "@/components/GroceryListDetailClient";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function GroceryListDetailPage({ params }: PageProps) {
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

  // Get user names for checked-by display
  // Using a plain object (Record) instead of Map for JSON serialization
  // when passing props from Server to Client Components
  const checkedByNames: Record<number, string | null> = {};

  // Collect all unique user IDs that checked items
  const checkerUserIds = new Set<number>();
  for (const item of list.items) {
    if (item.checkedByUserId) {
      checkerUserIds.add(item.checkedByUserId);
    }
  }

  // Fetch user names for all checkers
  if (checkerUserIds.size > 0) {
    const userIds = Array.from(checkerUserIds);
    const placeholders = userIds.map((_, i) => `$${i + 1}`).join(", ");
    const result = await query<{ id: number; name: string }>(
      `SELECT id, name FROM users WHERE id IN (${placeholders})`,
      userIds
    );

    const userIdToName = new Map<number, string>();
    for (const row of result.rows) {
      userIdToName.set(row.id, row.name);
    }

    // Map item IDs to checker names
    for (const item of list.items) {
      if (item.checkedByUserId) {
        checkedByNames[item.id] = userIdToName.get(item.checkedByUserId) ?? null;
      }
    }
  }

  return <GroceryListDetailClient initialList={list} checkedByNames={checkedByNames} />;
}
