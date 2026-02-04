-- Migration: 022_populate_exercise_descriptions.sql
-- Description: Populate form_cues (descriptions) for exercises from EXERCISE_DESCRIPTIONS constant
-- This migration is idempotent - it only updates exercises where form_cues is NULL

-- Populate form_cues for exercises based on normalized names
-- Only updates if form_cues is currently NULL to preserve any custom descriptions

-- Prep exercises
UPDATE exercises SET form_cues = 'Clear space, grab the bell, stand tall, breathe.', updated_at = NOW()
WHERE normalized_name = 'get-ready' AND form_cues IS NULL;

-- Warmup exercises
UPDATE exercises SET form_cues = 'Arms straight, small to big circles both ways.', updated_at = NOW()
WHERE normalized_name = 'arm-circles-forwardback' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Hop feet out, arms overhead, land softly.', updated_at = NOW()
WHERE normalized_name = 'jumping-jacks' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Press the bell overhead, lockout, lower under control.', updated_at = NOW()
WHERE normalized_name = 'light-kettlebell-press-patterning' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Hinge down, walk hands to plank, walk back up.', updated_at = NOW()
WHERE normalized_name = 'inchworms' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Swing arms across chest, then open wide.', updated_at = NOW()
WHERE normalized_name = 'arm-swings' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Elbows bent, rotate shoulders forward and back.', updated_at = NOW()
WHERE normalized_name = 'shoulder-rotations' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'On all fours, round spine then arch with breath.', updated_at = NOW()
WHERE normalized_name = 'cat-cow' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Plank, keep elbows straight, pinch and spread shoulder blades.', updated_at = NOW()
WHERE normalized_name = 'scapula-push-ups' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Lift knees to hip height, keep core tight.', updated_at = NOW()
WHERE normalized_name = 'marching-in-place' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Hold support, swing leg front-to-back, then side-to-side.', updated_at = NOW()
WHERE normalized_name = 'leg-swings' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Feet shoulder width, sit hips back, stand tall.', updated_at = NOW()
WHERE normalized_name = 'bodyweight-squats' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Hands on hips, draw slow circles both directions.', updated_at = NOW()
WHERE normalized_name = 'hip-circles' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Step forward, drop back knee, push through front heel.', updated_at = NOW()
WHERE normalized_name = 'walking-lunges' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Tall posture, rotate torso side to side.', updated_at = NOW()
WHERE normalized_name = 'spinal-rotations' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Back flat, extend opposite arm/leg, return controlled.', updated_at = NOW()
WHERE normalized_name = 'dead-bug' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Swing arms fast and big to prime speed.', updated_at = NOW()
WHERE normalized_name = 'explosive-arm-swings' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Squat down, jump lightly, land soft and reset.', updated_at = NOW()
WHERE normalized_name = 'light-jump-squats' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Flow through reaches, lunges, and twists.', updated_at = NOW()
WHERE normalized_name = 'dynamic-stretches' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Pull band to chest or swing arms wide.', updated_at = NOW()
WHERE normalized_name = 'band-pull-aparts-arm-swings' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Push hips back, torso forward, flat back.', updated_at = NOW()
WHERE normalized_name = 'hip-hinges-no-weight' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Lunge, elbow to instep, rotate chest up.', updated_at = NOW()
WHERE normalized_name = 'worlds-greatest-stretch' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Smooth full-body circles and hinges.', updated_at = NOW()
WHERE normalized_name = 'mobility-flow' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Quick mix of squat, hinge, push, pull.', updated_at = NOW()
WHERE normalized_name = 'prime-all-movement-patterns' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Slow hinges, reaches, and rotations.', updated_at = NOW()
WHERE normalized_name = 'gentle-movement-flow' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Traveling reaches, squats, and hinges.', updated_at = NOW()
WHERE normalized_name = 'dynamic-full-body-prep' AND form_cues IS NULL;

-- Main exercises
UPDATE exercises SET form_cues = 'Lie down, elbow at 45 degrees, press bell up, lower to triceps.', updated_at = NOW()
WHERE normalized_name = 'kettlebell-floor-press' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Hands under shoulders, body straight, lower chest, press up.', updated_at = NOW()
WHERE normalized_name = 'push-ups' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Brace core, press bell overhead, biceps by ear.', updated_at = NOW()
WHERE normalized_name = 'kettlebell-overhead-press' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Hinge, flat back, row bell to ribs, pause, lower.', updated_at = NOW()
WHERE normalized_name = 'kettlebell-bent-over-row' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Wide stance hinge, row one bell, then the other.', updated_at = NOW()
WHERE normalized_name = 'kettlebell-gorilla-rows' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Hinge and snap hips, pull elbows up and back.', updated_at = NOW()
WHERE normalized_name = 'kettlebell-high-pulls' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Hold bell at chest, squat deep, drive up.', updated_at = NOW()
WHERE normalized_name = 'goblet-squats' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Hinge on one leg, reach bell down, stand tall.', updated_at = NOW()
WHERE normalized_name = 'single-leg-rdl' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Hike back, snap hips, bell floats to chest height.', updated_at = NOW()
WHERE normalized_name = 'kettlebell-swing' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Soft knees, hinge back, stand tall.', updated_at = NOW()
WHERE normalized_name = 'kettlebell-romanian-deadlift' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Plank on bells, row one side, resist rotation.', updated_at = NOW()
WHERE normalized_name = 'renegade-rows' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Circle bell around head, keep ribs down.', updated_at = NOW()
WHERE normalized_name = 'kettlebell-halo' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Hike back, pop hips, catch bell softly at rack.', updated_at = NOW()
WHERE normalized_name = 'kettlebell-clean' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Bell at rack, squat down, drive up.', updated_at = NOW()
WHERE normalized_name = 'front-squat' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Dip and drive, finish with strong lockout.', updated_at = NOW()
WHERE normalized_name = 'push-press' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Hinge, snap hips, let bell float, repeat.', updated_at = NOW()
WHERE normalized_name = 'swing' AND form_cues IS NULL;

-- Recovery exercises
UPDATE exercises SET form_cues = 'Brace ribs down, move slow and steady.', updated_at = NOW()
WHERE normalized_name = 'core-control-circuit' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Roll to elbow, post hand, bridge, sweep leg, stand.', updated_at = NOW()
WHERE normalized_name = 'turkish-get-up-slow' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'From plank, push hips up, return to plank.', updated_at = NOW()
WHERE normalized_name = 'plank-to-down-dog' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Hold bell at side, walk tall, no leaning.', updated_at = NOW()
WHERE normalized_name = 'kettlebell-suitcase-carry' AND form_cues IS NULL;

-- HIIT exercises
UPDATE exercises SET form_cues = 'Dip knees, drive bell overhead, reset.', updated_at = NOW()
WHERE normalized_name = 'minute-1-kettlebell-push-press' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Squat down, kick to plank, jump up.', updated_at = NOW()
WHERE normalized_name = 'minute-2-burpees' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Lie down, press bell up, control the descent.', updated_at = NOW()
WHERE normalized_name = 'minute-3-kettlebell-floor-press' AND form_cues IS NULL;

UPDATE exercises SET form_cues = 'Plank, drive knees fast to chest.', updated_at = NOW()
WHERE normalized_name = 'minute-4-mountain-climbers' AND form_cues IS NULL;
