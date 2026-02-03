import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { getAllWorkoutsTool, getWorkoutTool, updateWorkoutTool, getWorkoutStatsTool } from "@/lib/workout-tools";
import {
  searchRecipesTool,
  getRecipeTool,
  createRecipeTool,
  updateRecipeTool,
  translateRecipeTool,
  SUPPORTED_TRANSLATION_LOCALES,
  type TranslationLocale
} from "@/lib/recipe-tools";
import { getRegionFromTimezone } from "@/lib/user-preferences";
import { getRegionalIngredientContext } from "@/lib/regional-ingredients";
import {
  saveMemory,
  getMemories,
  deleteMemory,
  formatMemoriesAsContext,
  MEMORY_CATEGORIES,
  type MemoryCategory
} from "@/lib/memory-tools";
import { createFeedbackIssue } from "@/lib/github-tools";
import {
  searchExercises,
  getOrCreateExercise,
  getExerciseImageStatuses,
  hasCompleteImages,
  type ExerciseCategory
} from "@/lib/exercise-library";
import { queueImageGeneration } from "@/lib/job-queue";

export const runtime = 'nodejs';

// Personal trainer system prompt
const PERSONAL_TRAINER_PROMPT = `You are an expert personal trainer and fitness coach with deep knowledge of:

**Expertise Areas:**
- Strength training (kettlebells, dumbbells, barbells, bodyweight)
- Hypertrophy and muscle building
- Mobility and flexibility work
- Exercise technique and form
- Program design and periodization
- Injury prevention and working around limitations
- Nutrition basics for fitness goals
- Recovery and rest optimization

**Your Approach:**
- Provide evidence-based advice grounded in exercise science
- Consider the user's individual context (equipment, experience, goals, limitations)
- Give clear, actionable guidance with proper form cues
- Explain the "why" behind recommendations when helpful
- Be encouraging but honest about realistic expectations
- Prioritize safety—never recommend exercises beyond someone's capability

**Memory System:**
You have access to remember important information about the user. Use the save_memory tool to store:
- Available equipment (kettlebells, dumbbells, bands, pull-up bar, etc.)
- Fitness goals (strength, hypertrophy, weight loss, endurance, etc.)
- Medical conditions or injuries that affect training
- Exercise preferences (favorites, dislikes)
- Training experience level
- Schedule constraints

Always check memories at the start of conversations to personalize advice.

**Workout Modifications:**
You can view and modify the user's weekly workout plans using get_workout and update_workout tools.

**CRITICAL - Workout Structure Rules:**
When modifying workouts, you MUST preserve the correct structure:

1. **Phase Order**: Segments must follow this order:
   - prep (1-2 segments: "Get Ready" countdown)
   - warmup (2-4 segments: actual exercise names like "Arm circles", "Jumping jacks", "Inchworms" - NEVER use "warm-up" or "warmup" as a title)
   - main (exercises LITERALLY DUPLICATED for multiple rounds with rest between)
   - hiit (optional: high-intensity intervals)
   - recovery (1-2 segments: cool-down stretches like "Child's pose")

2. **Exercise Naming Rules**:
   - The title field must be the CLEAN exercise name (e.g., "Goblet squats")
   - NEVER put round indicators in the title (wrong: "Goblet squats (Round 1)")
   - Put round indicators in the round field (e.g., round: "Round 1/3")
   - Exercise titles should match the exercise library when possible

3. **Main Exercise Rounds**: Exercises MUST be LITERALLY DUPLICATED in the segments array:
   - For 3 rounds of 2 exercises, create 6 main segments (2 exercises × 3 rounds)
   - Add "Rest" segments (30-60 seconds) ONLY between rounds, NOT after the final round

   For 2 exercises with 3 rounds, create these segments:
   Exercise A with round: "Round 1/3", Exercise B with round: "Round 1/3",
   a Rest segment (30-60 sec),
   Exercise A with round: "Round 2/3", Exercise B with round: "Round 2/3",
   a Rest segment (30-60 sec),
   Exercise A with round: "Round 3/3", Exercise B with round: "Round 3/3"
   (NO rest after final round - proceed directly to recovery)

4. **Category Assignment**:
   - prep: Only for "Get Ready" countdown
   - warmup: Dynamic movements with real exercise names
   - main: Primary strength/conditioning exercises
   - rest: Recovery periods ONLY between rounds (NEVER at the end of a workout)
   - recovery: Cool-down stretches at the end (workout MUST end with recovery, not rest)

5. **Rest Segment Placement (CRITICAL)**:
   - Rest segments should ONLY appear between rounds in the main phase
   - Rest segments should NEVER be the last segment of a workout
   - The workout MUST always end with a recovery segment (cool-down stretches like "Child's pose")
   - After the final round of main exercises, go directly to recovery - no rest segment

6. **When Adding/Removing Exercises**: Add to ALL rounds. If adding a new exercise to a 3-round workout, add it 3 times (once per round).

**Complete Workout Example (2 main exercises, 2 rounds):**
\`\`\`
segments: [
  { title: "Get Ready", durationSeconds: 10, category: "prep" },
  { title: "Arm circles", durationSeconds: 30, category: "warmup" },
  { title: "Jumping jacks", durationSeconds: 30, category: "warmup" },
  { title: "Goblet squats", durationSeconds: 45, detail: "10 reps", category: "main", round: "Round 1/2" },
  { title: "Push-ups", durationSeconds: 45, detail: "10 reps", category: "main", round: "Round 1/2" },
  { title: "Rest", durationSeconds: 30, category: "rest" },
  { title: "Goblet squats", durationSeconds: 45, detail: "10 reps", category: "main", round: "Round 2/2" },
  { title: "Push-ups", durationSeconds: 45, detail: "10 reps", category: "main", round: "Round 2/2" },
  { title: "Child's pose", durationSeconds: 30, category: "recovery" }  // ← Workout ends with recovery, NOT rest
]
\`\`\`
Note: The example above shows correct structure - rest appears ONLY between rounds (after Round 1), and the workout ends with recovery. Workouts are validated - improperly structured workouts will generate warnings.

**Workout History & Stats:**
Use get_workout_stats to access the user's complete workout history and statistics including:
- Recent completions and total count
- Current streak and longest streak
- Completions this week, last 7 days, and last 30 days
- Average workouts per week and workout duration
- Most active days of the week
- Difficulty feedback breakdown (too easy, just right, too hard)
- Days since last workout

Call this tool when discussing motivation, progress, consistency, or when the user asks about their history. Use the data to provide personalized encouragement and insights.

**Recipe Management:**
You can help users manage their recipe collection using these tools:
- search_recipes: Search recipes by text or tags
- get_recipe: Get full recipe details by slug
- create_recipe: Add a new recipe
- update_recipe: Modify an existing recipe (creates new version)

### Recipe Guidelines

**Creating Recipes:**
- Always include accurate nutrition information per serving
- Group ingredients logically (e.g., "Dairy", "Proteins", "Vegetables")
- Write clear, numbered steps
- Use appropriate tags for categorization (e.g., "breakfast", "high-protein", "vegetarian")
- Set locale based on recipe language (e.g., "de-DE", "en-US")

**Modifying Recipes:**
- ALWAYS call get_recipe first to see current state
- Modifications create new versions - old versions are preserved
- When user asks to change ingredients or steps, update the entire recipe
- Recalculate nutrition when ingredients change
- Ask for confirmation before making significant changes

**Recipe Translation:**
- Can translate recipes between languages
- Adapt measurements to locale (cups → ml, oz → g)
- Consider local ingredient substitutions

**Nutrition Calculations:**
- Provide per-serving values
- Calculate from ingredients when possible
- Be transparent about estimates

**Exercise Library & Selection Guidelines:**

When creating or modifying workout exercises (warmup, main, HIIT, recovery):

1. **DESIGN FIRST**: Independently design the ideal exercises for this specific workout
   - Warmup exercises should specifically prepare the muscles used in the main workout
   - Example: Push Day warmup → shoulder circles, chest openers, tricep stretches, wrist mobility
   - Example: Leg Day warmup → hip circles, ankle mobility, glute activation, quad stretches
   - Example: Pull Day warmup → lat stretches, thoracic rotations, bicep activation

2. **CHECK FOR DUPLICATES**: Use search_exercises to check if your designed exercise already exists
   - If found: Use the existing exercise (benefits from existing images)
   - If not found: Create it via create_exercise (images auto-queue, ~30 seconds)

3. **PERSONALIZATION**: Consider user context from memory
   - Equipment available (adapt exercises accordingly)
   - Physical limitations (avoid contraindicated movements)
   - Experience level (adjust complexity and intensity)
   - Preferences (incorporate favorites, avoid disliked exercises)

IMPORTANT: Do NOT let the existing exercise library limit your creativity. Design the best possible workout first, then check for duplicates. The goal is contextually appropriate exercises, not reusing existing ones.

Use get_exercise_images to check if images are ready for exercises in a workout.

**Workout-Specific Warmup Examples:**

- **Push Day** (chest/shoulders/triceps): Shoulder circles with arm raises, chest opener stretches, wrist mobility, tricep stretches, band pull-aparts or wall slides
- **Pull Day** (back/biceps): Thoracic spine rotations, Cat-Cow, lat stretches, band face pulls, scapular squeezes
- **Leg Day** (quads/glutes/hamstrings): Hip circles, ankle mobility rocks, leg swings, glute bridges, deep squat holds
- **Full Body**: World's greatest stretch, inchworms, dynamic full-body movements

These are examples, not requirements. Design warmups that make sense for the specific main exercises.

**Web Search:**
You have access to web search for looking up current fitness research, exercise variations, or answering questions that benefit from up-to-date information.

**Response Style:**
- Be concise and direct—avoid unnecessary pleasantries or acknowledgments
- Get straight to actionable advice
- Use markdown formatting for clarity (headers, lists, bold for emphasis)
- Keep responses focused and practical
- For exercise instructions, include key form cues

**Post-Workout Feedback:**
When users report completing a workout and share their difficulty rating:
- **"Too Easy"**: Suggest ways to increase intensity (heavier weights, more reps, shorter rest, tempo variations). DESCRIBE the changes but do NOT automatically apply them.
- **"Just Right"**: Note this is the right level for progress.
- **"Too Hard"**: Suggest easier modifications (lighter weights, fewer reps, longer rest, regression exercises). DESCRIBE the changes but do NOT automatically apply them.

IMPORTANT: After receiving workout feedback, you may suggest modifications but NEVER automatically update the workout. Always describe potential changes and ask if the user wants you to apply them.

**App Feedback Detection:**
When users mention issues, suggestions, or feedback about THE APP ITSELF (not fitness-related):
1. Recognize this as product feedback (bugs, feature requests, UI issues, etc.)
2. Ask 1-2 clarifying questions to understand what happened and what they expected
3. Once you have enough context, save a summary to memory using save_memory with category "feedback"
4. Use create_feedback_issue tool to record the feedback (don't mention GitHub to the user)
5. Simply confirm: "Feedback recorded."

**APP feedback examples (trigger this flow):**
- "The timer keeps resetting when I switch apps"
- "Can you add Apple Watch support?"
- "The workout player is hard to read in sunlight"
- "I wish I could reorder the exercises"

**FITNESS feedback examples (do NOT trigger - handle normally):**
- "This workout was too hard"
- "I didn't like the goblet squats"
- "The rest periods feel too short"
- "Can we do more upper body work?"`;


// Tool definitions
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_workout",
      description: "Get current workout plan for a specific day",
      parameters: {
        type: "object",
        properties: {
          slug: {
            type: "string",
            enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
            description: "The day of the week"
          }
        },
        required: ["slug"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_all_workouts",
      description: "Get the complete weekly workout plan (all 7 days). Use this when the user asks about their overall program, weekly schedule, or wants to see all workouts.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_workout",
      description: "Update and SAVE workout plan with modifications. You MUST call this to persist changes.",
      parameters: {
        type: "object",
        properties: {
          slug: {
            type: "string",
            description: "The day of the week (monday-sunday)"
          },
          workout: {
            type: "object",
            description: "Complete workout object with all required fields",
            properties: {
              slug: { type: "string" },
              title: { type: "string" },
              focus: { type: "string" },
              description: { type: "string" },
              totalSeconds: { type: "number" },
              segments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    durationSeconds: { type: "number" },
                    detail: { type: "string" },
                    category: {
                      type: "string",
                      enum: ["prep", "warmup", "main", "hiit", "recovery", "rest"]
                    },
                    round: { type: "string" }
                  },
                  required: ["id", "title", "durationSeconds", "category"]
                }
              }
            },
            required: ["slug", "title", "segments", "totalSeconds"]
          }
        },
        required: ["slug", "workout"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "save_memory",
      description: "Save important information about the user for future reference. Use this when the user mentions equipment, goals, medical conditions, preferences, experience level, or schedule constraints.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: MEMORY_CATEGORIES as unknown as string[],
            description: "Category of information: equipment, goals, medical, preferences, experience, schedule, or measurements"
          },
          key: {
            type: "string",
            description: "Short identifier for this memory (e.g., 'kettlebell_weight', 'primary_goal', 'knee_injury')"
          },
          value: {
            type: "string",
            description: "The information to remember"
          }
        },
        required: ["category", "key", "value"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_memories",
      description: "Retrieve stored information about the user. Call this at the start of conversations or when you need to check what you know about the user.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: MEMORY_CATEGORIES as unknown as string[],
            description: "Optional: filter by category"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_memory",
      description: "Remove stored information that is no longer accurate or relevant.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: MEMORY_CATEGORIES as unknown as string[],
            description: "Category of the memory to delete"
          },
          key: {
            type: "string",
            description: "The key of the memory to delete"
          }
        },
        required: ["category", "key"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for current fitness research, exercise variations, nutrition information, or any topic that benefits from up-to-date information.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_feedback_issue",
      description: "Create a GitHub issue for app/product feedback. Use this ONLY for feedback about the app itself (bugs, feature requests, UI issues), NOT for fitness-related feedback.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Brief title summarizing the feedback"
          },
          description: {
            type: "string",
            description: "Detailed description of the feedback, including context gathered from the user"
          },
          feedbackType: {
            type: "string",
            enum: ["bug", "feature", "improvement", "question"],
            description: "Type of feedback: bug (something broken), feature (new capability), improvement (enhance existing), question (need clarification)"
          }
        },
        required: ["title", "description", "feedbackType"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_exercises",
      description: "Check if a designed exercise already exists in the library. Use AFTER determining the ideal exercise for the workout. Helps avoid duplicates and leverage existing images. Search by exercise name, muscle group, or equipment.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search term (e.g., 'squat', 'push', 'kettlebell', 'chest')"
          },
          category: {
            type: "string",
            enum: ["warmup", "main", "hiit", "recovery"],
            description: "Optional filter by exercise category"
          },
          limit: {
            type: "number",
            description: "Max results to return (default 10)"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_exercise",
      description: "Add a new exercise to the library. Use for contextually appropriate exercises that don't exist yet. New exercises automatically queue for AI image generation (~30 seconds). Don't hesitate to create exercises when they better serve the workout's purpose.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Exercise name (e.g., 'Goblet Squat', 'Push-ups')"
          },
          formCues: {
            type: "string",
            description: "Brief form instructions and key cues"
          },
          muscleGroups: {
            type: "array",
            items: { type: "string" },
            description: "Target muscle groups (e.g., ['chest', 'shoulders', 'triceps'])"
          },
          equipment: {
            type: "array",
            items: { type: "string" },
            description: "Required equipment (e.g., ['kettlebell'], ['bodyweight'])"
          },
          category: {
            type: "string",
            enum: ["warmup", "main", "hiit", "recovery"],
            description: "Exercise category"
          }
        },
        required: ["name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_exercise_images",
      description: "Get image URLs and generation status for exercises. Use to check if images are ready for exercises in a workout.",
      parameters: {
        type: "object",
        properties: {
          exerciseNames: {
            type: "array",
            items: { type: "string" },
            description: "List of exercise names to check"
          }
        },
        required: ["exerciseNames"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_workout_stats",
      description: "Get comprehensive workout completion statistics and history. Use this to understand the user's workout patterns, consistency, streaks, and progress. Call this when discussing motivation, progress, or when the user asks about their workout history.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_recipes",
      description: "Search user's recipes by text query or tags. Returns recipe summaries for list display.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search term (title, description)"
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Filter by tags (e.g., 'breakfast', 'high-protein')"
          },
          limit: {
            type: "number",
            description: "Max results (default 10)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_recipe",
      description: "Get full recipe details by slug. Use this before modifying a recipe to see its current state.",
      parameters: {
        type: "object",
        properties: {
          slug: {
            type: "string",
            description: "The recipe slug (URL-friendly identifier)"
          }
        },
        required: ["slug"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_recipe",
      description: "Create a new recipe. Requires complete recipe data including title, ingredients, steps, and nutrition.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Recipe title"
          },
          description: {
            type: "string",
            description: "Brief description of the recipe"
          },
          locale: {
            type: "string",
            description: "Locale for the recipe (e.g., 'de-DE', 'en-US')"
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Recipe tags (e.g., 'breakfast', 'high-protein', 'vegetarian')"
          },
          recipeJson: {
            type: "object",
            description: "Complete recipe data",
            properties: {
              slug: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              servings: { type: "number" },
              prepTimeMinutes: { type: "number" },
              cookTimeMinutes: { type: "number" },
              nutrition: {
                type: "object",
                properties: {
                  calories: { type: "number" },
                  protein: { type: "number" },
                  carbohydrates: { type: "number" },
                  fat: { type: "number" },
                  fiber: { type: "number" }
                },
                required: ["calories", "protein", "carbohydrates", "fat"]
              },
              ingredientGroups: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    ingredients: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          quantity: { type: "number" },
                          unit: { type: "string" }
                        },
                        required: ["name", "quantity", "unit"]
                      }
                    }
                  },
                  required: ["name", "ingredients"]
                }
              },
              steps: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    number: { type: "number" },
                    instruction: { type: "string" }
                  },
                  required: ["number", "instruction"]
                }
              },
              images: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    url: { type: "string" },
                    caption: { type: "string" },
                    isPrimary: { type: "boolean" }
                  },
                  required: ["url"]
                }
              },
              locale: { type: "string" }
            },
            required: ["slug", "title", "description", "tags", "servings", "nutrition", "ingredientGroups", "steps", "images", "locale"]
          }
        },
        required: ["title", "recipeJson"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_recipe",
      description: "Update an existing recipe. Creates a new version - old versions are preserved. ALWAYS call get_recipe first to see current state.",
      parameters: {
        type: "object",
        properties: {
          slug: {
            type: "string",
            description: "The recipe slug to update"
          },
          title: {
            type: "string",
            description: "New title (optional)"
          },
          description: {
            type: "string",
            description: "New description (optional)"
          },
          locale: {
            type: "string",
            description: "New locale (optional)"
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "New tags (optional)"
          },
          recipeJson: {
            type: "object",
            description: "Updated recipe data (optional - provide full recipeJson to update)"
          }
        },
        required: ["slug"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "translate_recipe",
      description: "Translate a recipe to a different language and optionally adapt measurements to the target locale. Translates recipe content only (title, description, ingredients, steps), not the app interface. Use get_recipe first to find the recipe ID.",
      parameters: {
        type: "object",
        properties: {
          recipeId: {
            type: "number",
            description: "Recipe ID to translate (get this from get_recipe)"
          },
          targetLocale: {
            type: "string",
            enum: SUPPORTED_TRANSLATION_LOCALES as unknown as string[],
            description: "Target locale for translation (e.g., 'de-DE', 'en-US', 'en-GB', 'es-ES', 'fr-FR', 'it-IT')"
          },
          targetRegion: {
            type: "string",
            description: "Target user region for ingredient name adaptation (e.g., 'Austria', 'Germany', 'Switzerland', 'United Kingdom'). If not provided, uses the user's region preference."
          },
          adaptMeasurements: {
            type: "boolean",
            description: "Whether to convert measurements to target locale system (e.g., cups to ml for metric locales). Default: true"
          },
          saveAsNew: {
            type: "boolean",
            description: "Whether to save as a new recipe version. Default: false (just preview translation)"
          }
        },
        required: ["recipeId", "targetLocale"]
      }
    }
  }
];

// Execute a tool call
async function executeTool(
  openai: OpenAI,
  userId: string,
  toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall,
  recipeLocale: string = 'en-US',
  userRegion: string | null = null
): Promise<string> {
  // Only handle function tool calls
  if (toolCall.type !== 'function') {
    return JSON.stringify({ error: `Unsupported tool type: ${toolCall.type}` });
  }

  const args = JSON.parse(toolCall.function.arguments);
  let result: unknown;

  switch (toolCall.function.name) {
    case "get_workout":
      const workout = await getWorkoutTool(userId, args.slug);
      result = workout || { error: "Workout not found" };
      break;

    case "get_all_workouts":
      const allWorkouts = await getAllWorkoutsTool(userId);
      result = allWorkouts.length > 0 ? { workouts: allWorkouts } : { error: "No workouts found" };
      break;

    case "update_workout":
      try {
        const workoutData = args.workout || args;
        result = await updateWorkoutTool(userId, args.slug, workoutData);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to update workout";
        result = { error: message };
      }
      break;

    case "save_memory":
      result = await saveMemory(userId, args.category as MemoryCategory, args.key, args.value);
      break;

    case "get_memories":
      const userMemories = await getMemories(userId, args.category);
      result = userMemories.length > 0 ? { memories: userMemories } : { message: "No memories stored yet" };
      break;

    case "delete_memory":
      result = await deleteMemory(userId, args.category as MemoryCategory, args.key);
      break;

    case "web_search":
      try {
        const searchResponse = await openai.chat.completions.create({
          model: "gpt-4o-search-preview",
          messages: [{ role: "user", content: `Search the web and summarize findings for: ${args.query}` }],
          web_search_options: { search_context_size: "medium" }
        });
        result = { results: searchResponse.choices[0].message.content, query: args.query };
      } catch {
        result = { error: "Web search failed", query: args.query };
      }
      break;

    case "create_feedback_issue":
      result = await createFeedbackIssue(
        userId,
        args.title,
        args.description,
        args.feedbackType
      );
      break;

    case "search_exercises":
      try {
        const exercises = await searchExercises(
          args.query,
          args.category as ExerciseCategory | undefined,
          args.limit ?? 10
        );
        result = {
          exercises: exercises.map(ex => ({
            name: ex.name,
            formCues: ex.formCues,
            muscleGroups: ex.muscleGroups,
            equipment: ex.equipment,
            category: ex.category,
            imageStatus: ex.imageStatus,
            imagesReady: ex.imageStatus === 'complete'
          })),
          count: exercises.length
        };
      } catch (error) {
        result = { error: "Search failed", message: error instanceof Error ? error.message : "Unknown error" };
      }
      break;

    case "create_exercise":
      try {
        const exercise = await getOrCreateExercise(
          args.name,
          args.formCues,
          args.muscleGroups,
          args.equipment,
          args.category as ExerciseCategory | undefined
        );
        // Queue image generation
        const hasImages = await hasCompleteImages(exercise.id);
        if (!hasImages) {
          await queueImageGeneration(exercise.id, 1); // priority 1 for user-triggered
        }
        result = {
          success: true,
          exercise: {
            id: exercise.id,
            name: exercise.name,
            formCues: exercise.formCues,
            muscleGroups: exercise.muscleGroups,
            equipment: exercise.equipment,
            category: exercise.category
          },
          imageStatus: hasImages ? 'complete' : 'queued',
          message: hasImages
            ? 'Exercise found with images ready'
            : 'Exercise created, image generation queued (~30 seconds)'
        };
      } catch (error) {
        result = { error: "Failed to create exercise", message: error instanceof Error ? error.message : "Unknown error" };
      }
      break;

    case "get_exercise_images":
      try {
        const statuses = await getExerciseImageStatuses(args.exerciseNames);
        const results: Record<string, { status: string; imageUrl1?: string; imageUrl2?: string }> = {};
        for (const [name, data] of statuses) {
          results[name] = {
            status: data.status,
            imageUrl1: data.imageUrl1,
            imageUrl2: data.imageUrl2
          };
        }
        result = { exercises: results };
      } catch (error) {
        result = { error: "Failed to get image statuses", message: error instanceof Error ? error.message : "Unknown error" };
      }
      break;

    case "get_workout_stats":
      try {
        const stats = await getWorkoutStatsTool(userId);
        result = stats;
      } catch (error) {
        result = { error: "Failed to get workout stats", message: error instanceof Error ? error.message : "Unknown error" };
      }
      break;

    case "search_recipes":
      try {
        const recipes = await searchRecipesTool(
          userId,
          args.query,
          args.tags,
          args.limit ?? 10
        );
        result = {
          recipes,
          count: recipes.length,
          message: recipes.length > 0 ? `Found ${recipes.length} recipe(s)` : "No recipes found"
        };
      } catch (error) {
        result = { error: "Failed to search recipes", message: error instanceof Error ? error.message : "Unknown error" };
      }
      break;

    case "get_recipe":
      try {
        const recipe = await getRecipeTool(userId, args.slug);
        result = recipe || { error: "Recipe not found" };
      } catch (error) {
        result = { error: "Failed to get recipe", message: error instanceof Error ? error.message : "Unknown error" };
      }
      break;

    case "create_recipe":
      try {
        // Use recipeLocale from user preferences as default when creating recipes
        const createResult = await createRecipeTool(userId, {
          title: args.title,
          description: args.description,
          locale: args.locale,
          tags: args.tags,
          recipeJson: args.recipeJson
        }, recipeLocale);
        result = createResult;
      } catch (error) {
        result = { error: "Failed to create recipe", message: error instanceof Error ? error.message : "Unknown error" };
      }
      break;

    case "update_recipe":
      try {
        const updateResult = await updateRecipeTool(userId, args.slug, {
          title: args.title,
          description: args.description,
          locale: args.locale,
          tags: args.tags,
          recipeJson: args.recipeJson
        });
        result = updateResult;
      } catch (error) {
        result = { error: "Failed to update recipe", message: error instanceof Error ? error.message : "Unknown error" };
      }
      break;

    case "translate_recipe":
      try {
        // Use provided targetRegion if specified, otherwise use user's region preference
        const targetRegion = args.targetRegion || userRegion;
        const translateResult = await translateRecipeTool(
          openai,
          userId,
          args.recipeId,
          args.targetLocale as TranslationLocale,
          targetRegion,
          args.adaptMeasurements ?? true,
          args.saveAsNew ?? false
        );
        result = translateResult;
      } catch (error) {
        result = { error: "Failed to translate recipe", message: error instanceof Error ? error.message : "Unknown error" };
      }
      break;

    default:
      result = { error: `Unknown tool: ${toolCall.function.name}` };
  }

  return JSON.stringify(result);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    const { messages, sessionId, systemInstruction, pageContext } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "Invalid messages" }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Create session if needed
    let chatSession = sessionId;
    if (!chatSession) {
      const result = await query(`
        INSERT INTO chat_sessions (user_id, title) VALUES ($1, 'New Chat') RETURNING id
      `, [userId]);
      chatSession = result.rows[0].id;
    }

    // Save user message (skip if this is a hidden system instruction)
    const latestUserMessage = messages[messages.length - 1];
    if (latestUserMessage && latestUserMessage.role === 'user' && !systemInstruction) {
      await query(`
        INSERT INTO chat_messages (session_id, role, content, tool_calls)
        VALUES ($1, $2, $3, NULL)
      `, [chatSession, 'user', latestUserMessage.content]);
    }

    // Load user memories for context
    const memories = await getMemories(userId);
    const memoryContext = formatMemoriesAsContext(memories);

    // Build system prompt with date and memories
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Add hidden system instruction if provided (e.g., post-workout congratulations)
    const instructionSection = systemInstruction
      ? `\n\n**Current Task (hidden from user):**\n${systemInstruction}`
      : '';

    // Add page context if provided
    let pageContextSection = '';
    if (pageContext) {
      if (pageContext.page === 'workout' && pageContext.workoutSlug) {
        pageContextSection = `\n\n**Current Screen:**\nThe user is viewing the ${pageContext.workoutTitle || pageContext.workoutSlug} workout page. When they reference "this workout" or specific exercises, they mean this workout. You can use get_workout with slug "${pageContext.workoutSlug}" to see the full details.`;
      } else if (pageContext.page === 'home') {
        pageContextSection = `\n\n**Current Screen:**\nThe user is on the home page viewing their weekly workout schedule.`;
      } else if (pageContext.page === 'player' && pageContext.workoutSlug) {
        pageContextSection = `\n\n**Current Screen:**\nThe user is currently doing the ${pageContext.workoutTitle || pageContext.workoutSlug} workout in the guided player.`;
      } else if (pageContext.page === 'recipe' && pageContext.recipeSlug) {
        pageContextSection = `\n\n**Current Screen:**\nThe user is viewing the "${pageContext.recipeTitle || pageContext.recipeSlug}" recipe. When they reference "this recipe" or want to modify it, they mean this recipe. You can use get_recipe with slug "${pageContext.recipeSlug}" to see the full details.`;
      } else if (pageContext.page === 'recipes') {
        pageContextSection = `\n\n**Current Screen:**\nThe user is on the recipes page viewing their recipe collection. You can use search_recipes to help them find recipes.`;
      }
    }

    // Get user preferences from session
    const userTimezone = session.user.timezone ?? 'UTC';
    const userLocale = session.user.locale ?? 'en-US';
    const userUnitSystem = session.user.unitSystem ?? 'metric';
    // Recipe locale: use specific preference if set, otherwise fall back to general locale
    const recipeLocale = session.user.defaultRecipeLocale || userLocale;

    // Get user region for recipe ingredient adaptation
    // Use explicit region preference if set, otherwise derive from timezone
    const userRegionTimezone = session.user.userRegionTimezone || userTimezone;
    const userRegion = getRegionFromTimezone(userRegionTimezone);
    const regionalIngredientContext = getRegionalIngredientContext(userRegion);

    // Format unit system description for AI
    const unitSystemDescription = userUnitSystem === 'metric'
      ? 'kilograms (kg), centimeters (cm), and Celsius (°C)'
      : 'pounds (lbs), inches (in), and Fahrenheit (°F)';

    const systemPrompt = `${PERSONAL_TRAINER_PROMPT}

**Current Date:** ${dateStr}
**User Timezone:** ${userTimezone}
**User Locale:** ${userLocale}

**User Preferences:**
- Unit System: ${userUnitSystem} (use ${unitSystemDescription} for all measurements)
- Default Recipe Language: ${recipeLocale}
- User Region: ${userRegion}
- When discussing weights, measurements, temperatures, or creating recipes/workout content, always use the user's preferred unit system
- When creating new recipes:
  - Use ${recipeLocale} for the recipe content language (titles, descriptions, instructions)
  - Adapt ingredient names to ${userRegion} regional terminology
  - ${regionalIngredientContext}

**User Profile (from memory):**
${memoryContext}${pageContextSection}${instructionSection}`;

    const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    // Create a streaming response that includes tool progress
    const encoder = new TextEncoder();
    let fullContent = "";
    const allToolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] = [];

    // Human-readable tool names for display
    const TOOL_DISPLAY_NAMES: Record<string, string> = {
      get_workout: "Fetching workout",
      get_all_workouts: "Fetching all workouts",
      update_workout: "Updating workout",
      save_memory: "Saving to memory",
      get_memories: "Retrieving memories",
      delete_memory: "Deleting memory",
      web_search: "Searching the web",
      create_feedback_issue: "Recording feedback",
      search_exercises: "Searching exercises",
      create_exercise: "Creating exercise",
      get_exercise_images: "Checking exercise images",
      get_workout_stats: "Analyzing workout history",
      search_recipes: "Searching recipes",
      get_recipe: "Fetching recipe",
      create_recipe: "Creating recipe",
      update_recipe: "Updating recipe",
      translate_recipe: "Translating recipe"
    };

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // Send session ID first
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "session", sessionId: chatSession })}\n\n`));

          // Process tool calls with progress updates
          let maxIterations = 5;

          while (maxIterations > 0) {
            const response = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: apiMessages,
              tools
            });

            const message = response.choices[0].message;

            // No tool calls - ready to stream final response
            if (!message.tool_calls || message.tool_calls.length === 0) {
              break;
            }

            // Execute tool calls with progress updates
            allToolCalls.push(...message.tool_calls);
            apiMessages.push(message);

            for (const toolCall of message.tool_calls) {
              // Only handle function tool calls
              if (toolCall.type !== 'function') continue;

              // Send tool progress event
              const toolName = toolCall.function.name;
              const displayName = TOOL_DISPLAY_NAMES[toolName] || toolName;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_start", tool: displayName })}\n\n`));

              const result = await executeTool(openai, userId, toolCall, recipeLocale, userRegion);
              apiMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: result
              });

              // Send tool complete event
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_end", tool: displayName })}\n\n`));
            }

            maxIterations--;
          }

          // Check if tool call loop exhausted iterations without completing
          if (maxIterations === 0) {
            console.warn("Tool call iteration limit reached before model returned a final response");
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: "Tool execution limit reached" })}\n\n`));
            controller.close();
            return;
          }

          // Stream the final response (without tools - all tool calls already processed)
          const stream = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: apiMessages,
            stream: true
          });

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;

            if (delta?.content) {
              fullContent += delta.content;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "content", content: delta.content })}\n\n`));
            }
          }

          // Send done signal with tool calls for persistent display
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: "done",
            toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined
          })}\n\n`));

          // Save assistant message to DB
          await query(`
            INSERT INTO chat_messages (session_id, role, content, tool_calls)
            VALUES ($1, $2, $3, $4)
          `, [
            chatSession,
            'assistant',
            fullContent,
            allToolCalls.length > 0 ? JSON.stringify(allToolCalls) : null
          ]);

          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      }
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    const message = error instanceof Error ? error.message : "Failed to process chat";
    return Response.json({ error: message }, { status: 500 });
  }
}
