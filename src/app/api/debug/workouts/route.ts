import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Validate admin API token
 */
function validateToken(request: NextRequest): boolean {
  const expectedToken = process.env.ADMIN_API_TOKEN;
  if (!expectedToken) {
    console.warn('ADMIN_API_TOKEN not configured');
    return false;
  }

  const authHeader = request.headers.get('Authorization');
  return authHeader === `Bearer ${expectedToken}`;
}

/**
 * GET /api/debug/workouts
 * Debug endpoint to verify workout isolation between users
 * Protected by ADMIN_API_TOKEN
 *
 * Query params:
 * - userId: Get workouts for a specific user
 * - compare: Compare workouts between two users (comma-separated IDs)
 */
export async function GET(request: NextRequest) {
  if (!validateToken(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const compare = searchParams.get('compare');

  try {
    // Get summary of all users and their workouts
    if (!userId && !compare) {
      const result = await query(`
        SELECT
          u.id as user_id,
          u.email,
          u.name,
          u.onboarding_completed,
          COUNT(w.id) as workout_count,
          ARRAY_AGG(w.slug ORDER BY w.slug) as workout_slugs
        FROM users u
        LEFT JOIN workouts w ON u.id = w.user_id AND w.is_active = true
        GROUP BY u.id, u.email, u.name, u.onboarding_completed
        ORDER BY u.id
        LIMIT 100
      `);

      return Response.json({
        users: result.rows.map(row => ({
          userId: row.user_id,
          email: row.email,
          name: row.name,
          onboardingCompleted: row.onboarding_completed,
          workoutCount: parseInt(row.workout_count, 10),
          workoutSlugs: row.workout_slugs.filter(Boolean)
        }))
      });
    }

    // Get workouts for a specific user
    if (userId) {
      const userResult = await query(`
        SELECT id, email, name, onboarding_completed
        FROM users WHERE id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      const workoutsResult = await query(`
        SELECT slug, workout_json, version, is_active, created_at, updated_at
        FROM workouts
        WHERE user_id = $1 AND is_active = true
        ORDER BY slug
      `, [userId]);

      return Response.json({
        user: {
          id: userResult.rows[0].id,
          email: userResult.rows[0].email,
          name: userResult.rows[0].name,
          onboardingCompleted: userResult.rows[0].onboarding_completed
        },
        workouts: workoutsResult.rows.map(row => ({
          slug: row.slug,
          title: row.workout_json?.title,
          focus: row.workout_json?.focus,
          segmentCount: row.workout_json?.segments?.length ?? 0,
          version: row.version,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }))
      });
    }

    // Compare workouts between two users
    if (compare) {
      const [userIdA, userIdB] = compare.split(',').map(id => id.trim());

      if (!userIdA || !userIdB) {
        return Response.json({ error: 'Compare requires two user IDs separated by comma' }, { status: 400 });
      }

      const [workoutsA, workoutsB] = await Promise.all([
        query(`
          SELECT slug, workout_json
          FROM workouts
          WHERE user_id = $1 AND is_active = true
          ORDER BY slug
        `, [userIdA]),
        query(`
          SELECT slug, workout_json
          FROM workouts
          WHERE user_id = $1 AND is_active = true
          ORDER BY slug
        `, [userIdB])
      ]);

      const comparison: Record<string, { userA: unknown; userB: unknown; identical: boolean }> = {};
      const slugsA = new Set(workoutsA.rows.map(r => r.slug));
      const slugsB = new Set(workoutsB.rows.map(r => r.slug));
      const allSlugs = new Set([...slugsA, ...slugsB]);

      for (const slug of allSlugs) {
        const wA = workoutsA.rows.find(r => r.slug === slug)?.workout_json;
        const wB = workoutsB.rows.find(r => r.slug === slug)?.workout_json;

        comparison[slug] = {
          userA: wA ? { title: wA.title, focus: wA.focus, segmentCount: wA.segments?.length ?? 0 } : null,
          userB: wB ? { title: wB.title, focus: wB.focus, segmentCount: wB.segments?.length ?? 0 } : null,
          identical: JSON.stringify(wA) === JSON.stringify(wB)
        };
      }

      return Response.json({
        userIdA,
        userIdB,
        comparison,
        allIdentical: Object.values(comparison).every(c => c.identical)
      });
    }

    return Response.json({ error: 'Invalid request' }, { status: 400 });

  } catch (error) {
    console.error('Debug workouts error:', error);
    return Response.json({
      error: 'Debug query failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
