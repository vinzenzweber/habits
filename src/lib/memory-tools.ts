import { query } from "@/lib/db";

// Memory categories for personal trainer context
export const MEMORY_CATEGORIES = [
  'equipment',    // Available equipment (kettlebells, dumbbells, bands, etc.)
  'goals',        // Fitness goals (strength, endurance, weight loss, etc.)
  'medical',      // Medical conditions, injuries, limitations
  'preferences',  // Exercise preferences, favorite/disliked exercises
  'experience',   // Training experience level, sports background
  'schedule',     // Available training days/times, constraints
  'measurements', // Body measurements, weight, PRs
  'feedback',     // App feedback and feature requests
] as const;

export type MemoryCategory = typeof MEMORY_CATEGORIES[number];

export interface UserMemory {
  id: number;
  category: MemoryCategory;
  key: string;
  value: string;
  updated_at: Date;
}

/**
 * Save or update a user memory
 */
export async function saveMemory(
  userId: string,
  category: MemoryCategory,
  key: string,
  value: string
): Promise<{ success: boolean; message: string }> {
  try {
    await query(`
      INSERT INTO user_memories (user_id, category, key, value, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id, category, key)
      DO UPDATE SET value = $4, updated_at = NOW()
    `, [userId, category, key, value]);

    return {
      success: true,
      message: `Remembered ${key} in ${category}: ${value}`
    };
  } catch (error: any) {
    console.error('saveMemory error:', error);
    return {
      success: false,
      message: error.message || 'Failed to save memory'
    };
  }
}

/**
 * Get all memories for a user, optionally filtered by category
 */
export async function getMemories(
  userId: string,
  category?: MemoryCategory
): Promise<UserMemory[]> {
  try {
    let sql = `
      SELECT id, category, key, value, updated_at
      FROM user_memories
      WHERE user_id = $1
    `;
    const params: (string | MemoryCategory)[] = [userId];

    if (category) {
      sql += ` AND category = $2`;
      params.push(category);
    }

    sql += ` ORDER BY category, key`;

    const result = await query(sql, params);
    return result.rows as UserMemory[];
  } catch (error: any) {
    console.error('getMemories error:', error);
    return [];
  }
}

/**
 * Delete a specific memory
 */
export async function deleteMemory(
  userId: string,
  category: MemoryCategory,
  key: string
): Promise<{ success: boolean; message: string }> {
  try {
    const result = await query(`
      DELETE FROM user_memories
      WHERE user_id = $1 AND category = $2 AND key = $3
    `, [userId, category, key]);

    if (result.rowCount === 0) {
      return { success: false, message: 'Memory not found' };
    }

    return {
      success: true,
      message: `Forgot ${key} from ${category}`
    };
  } catch (error: any) {
    console.error('deleteMemory error:', error);
    return {
      success: false,
      message: error.message || 'Failed to delete memory'
    };
  }
}

/**
 * Format memories as context string for the AI
 */
export function formatMemoriesAsContext(memories: UserMemory[]): string {
  if (memories.length === 0) {
    return "No user information stored yet.";
  }

  const grouped: Record<string, string[]> = {};

  for (const mem of memories) {
    if (!grouped[mem.category]) {
      grouped[mem.category] = [];
    }
    grouped[mem.category].push(`- ${mem.key}: ${mem.value}`);
  }

  const sections: string[] = [];
  for (const [category, items] of Object.entries(grouped)) {
    sections.push(`**${category.charAt(0).toUpperCase() + category.slice(1)}:**\n${items.join('\n')}`);
  }

  return sections.join('\n\n');
}
