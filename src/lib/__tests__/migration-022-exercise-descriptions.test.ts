/**
 * Tests for migration 022_populate_exercise_descriptions.sql
 *
 * Verifies that the normalized names used in the migration match the expected output
 * from normalizeExerciseName() for each exercise in EXERCISE_DESCRIPTIONS.
 */

import { describe, it, expect } from 'vitest';
import { normalizeExerciseName } from '../exercise-library';
import * as fs from 'fs';
import * as path from 'path';

// Copy of EXERCISE_DESCRIPTIONS from workoutPlan.ts to avoid importing auth dependencies
// Keep in sync with the source!
const EXERCISE_DESCRIPTIONS: Record<string, string> = {
  "Get ready": "Clear space, grab the bell, stand tall, breathe.",
  "Arm circles (forward/back)": "Arms straight, small to big circles both ways.",
  "Jumping jacks": "Hop feet out, arms overhead, land softly.",
  "Light Kettlebell press patterning": "Press the bell overhead, lockout, lower under control.",
  "Inchworms": "Hinge down, walk hands to plank, walk back up.",
  "Arm swings": "Swing arms across chest, then open wide.",
  "Shoulder rotations": "Elbows bent, rotate shoulders forward and back.",
  "Cat-Cow": "On all fours, round spine then arch with breath.",
  "Scapula push-ups": "Plank, keep elbows straight, pinch and spread shoulder blades.",
  "Marching in place": "Lift knees to hip height, keep core tight.",
  "Leg swings": "Hold support, swing leg front-to-back, then side-to-side.",
  "Bodyweight squats": "Feet shoulder width, sit hips back, stand tall.",
  "Hip circles": "Hands on hips, draw slow circles both directions.",
  "Walking lunges": "Step forward, drop back knee, push through front heel.",
  "Spinal rotations": "Tall posture, rotate torso side to side.",
  "Dead bug": "Back flat, extend opposite arm/leg, return controlled.",
  "Explosive arm swings": "Swing arms fast and big to prime speed.",
  "Light jump squats": "Squat down, jump lightly, land soft and reset.",
  "Dynamic stretches": "Flow through reaches, lunges, and twists.",
  "Band pull-aparts / arm swings": "Pull band to chest or swing arms wide.",
  "Hip hinges (no weight)": "Push hips back, torso forward, flat back.",
  "World's greatest stretch": "Lunge, elbow to instep, rotate chest up.",
  "Mobility flow": "Smooth full-body circles and hinges.",
  "Prime all movement patterns": "Quick mix of squat, hinge, push, pull.",
  "Gentle movement flow": "Slow hinges, reaches, and rotations.",
  "Dynamic full-body prep": "Traveling reaches, squats, and hinges.",
  "Kettlebell floor press": "Lie down, elbow at 45 degrees, press bell up, lower to triceps.",
  "Push-ups": "Hands under shoulders, body straight, lower chest, press up.",
  "Kettlebell overhead press": "Brace core, press bell overhead, biceps by ear.",
  "Kettlebell bent-over row": "Hinge, flat back, row bell to ribs, pause, lower.",
  "Kettlebell gorilla rows": "Wide stance hinge, row one bell, then the other.",
  "Kettlebell high pulls": "Hinge and snap hips, pull elbows up and back.",
  "Goblet squats": "Hold bell at chest, squat deep, drive up.",
  "Single-leg RDL": "Hinge on one leg, reach bell down, stand tall.",
  "Kettlebell swing": "Hike back, snap hips, bell floats to chest height.",
  "Kettlebell Romanian deadlift": "Soft knees, hinge back, stand tall.",
  "Renegade rows": "Plank on bells, row one side, resist rotation.",
  "Kettlebell halo": "Circle bell around head, keep ribs down.",
  "Kettlebell clean": "Hike back, pop hips, catch bell softly at rack.",
  "Front squat": "Bell at rack, squat down, drive up.",
  "Push press": "Dip and drive, finish with strong lockout.",
  "Swing": "Hinge, snap hips, let bell float, repeat.",
  "Core control circuit": "Brace ribs down, move slow and steady.",
  "Turkish Get-Up (slow)": "Roll to elbow, post hand, bridge, sweep leg, stand.",
  "Plank to Down Dog": "From plank, push hips up, return to plank.",
  "Kettlebell suitcase carry": "Hold bell at side, walk tall, no leaning.",
  "Minute 1: Kettlebell push press": "Dip knees, drive bell overhead, reset.",
  "Minute 2: Burpees": "Squat down, kick to plank, jump up.",
  "Minute 3: Kettlebell floor press": "Lie down, press bell up, control the descent.",
  "Minute 4: Mountain climbers": "Plank, drive knees fast to chest.",
};

describe('migration 022_populate_exercise_descriptions', () => {
  // Read the migration SQL file
  const migrationPath = path.join(
    process.cwd(),
    'scripts/migrations/022_populate_exercise_descriptions.sql'
  );
  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

  describe('normalized names match exercise library', () => {
    // Extract all normalized names from the migration SQL
    const normalizedNamesInMigration: string[] = [];
    const regex = /WHERE normalized_name = '([^']+)'/g;
    let match;
    while ((match = regex.exec(migrationSql)) !== null) {
      normalizedNamesInMigration.push(match[1]);
    }

    it('contains all exercises from EXERCISE_DESCRIPTIONS', () => {
      const exerciseNames = Object.keys(EXERCISE_DESCRIPTIONS);
      expect(normalizedNamesInMigration.length).toBe(exerciseNames.length);
    });

    // Test each exercise name individually
    const exerciseNames = Object.keys(EXERCISE_DESCRIPTIONS);
    for (const name of exerciseNames) {
      it(`correctly normalizes "${name}"`, () => {
        const expected = normalizeExerciseName(name);
        expect(normalizedNamesInMigration).toContain(expected);
      });
    }
  });

  describe('descriptions match EXERCISE_DESCRIPTIONS', () => {
    // Extract all UPDATE statements and parse each one
    // Pattern: UPDATE exercises SET form_cues = '<description>', updated_at = NOW()\nWHERE normalized_name = '<name>'
    const extractDescriptions = (): Map<string, string> => {
      const result = new Map<string, string>();
      // Split by UPDATE statements and process each
      const statements = migrationSql.split(/\n(?=UPDATE exercises)/);
      for (const stmt of statements) {
        // Match the form_cues value - handle multi-line statements
        const formCuesMatch = stmt.match(/SET form_cues = '([^']+)'/);
        const nameMatch = stmt.match(/WHERE normalized_name = '([^']+)'/);
        if (formCuesMatch && nameMatch) {
          result.set(nameMatch[1], formCuesMatch[1]);
        }
      }
      return result;
    };

    const descriptionsInMigration = extractDescriptions();

    const exerciseNames = Object.keys(EXERCISE_DESCRIPTIONS);
    for (const name of exerciseNames) {
      it(`has correct description for "${name}"`, () => {
        const normalizedName = normalizeExerciseName(name);
        const expectedDescription = EXERCISE_DESCRIPTIONS[name];
        const actualDescription = descriptionsInMigration.get(normalizedName);
        expect(actualDescription).toBe(expectedDescription);
      });
    }
  });

  describe('migration is idempotent', () => {
    it('only updates exercises where form_cues IS NULL', () => {
      // Every UPDATE statement should include "AND form_cues IS NULL"
      const updateStatements = migrationSql.split(/\n(?=UPDATE exercises)/).filter(s => s.includes('UPDATE exercises'));
      expect(updateStatements.length).toBeGreaterThan(0);

      for (const statement of updateStatements) {
        expect(statement).toContain('AND form_cues IS NULL');
      }
    });
  });

  describe('migration updates timestamps', () => {
    it('sets updated_at = NOW() on all updates', () => {
      const updateStatements = migrationSql.split(/\n(?=UPDATE exercises)/).filter(s => s.includes('UPDATE exercises'));
      expect(updateStatements.length).toBeGreaterThan(0);

      for (const statement of updateStatements) {
        expect(statement).toContain('updated_at = NOW()');
      }
    });
  });
});
