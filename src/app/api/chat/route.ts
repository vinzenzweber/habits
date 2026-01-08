import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { getAllWorkoutsTool, getWorkoutTool, updateWorkoutTool, getWorkoutStatsTool } from "@/lib/workout-tools";
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
   - prep (1-2 segments: "Get Ready", stretches)
   - warmup (2-4 segments: dynamic movements)
   - main (exercises repeated for multiple rounds with rest between)
   - hiit (optional: high-intensity intervals)
   - recovery (1-2 segments: cool-down stretches)

2. **Main Exercise Rounds**: Main exercises MUST be repeated for multiple rounds (typically 3):
   - Each exercise appears 3 times (once per round)
   - Add "Rest" segments (30-60 seconds) between rounds
   - Use round indicator like "Round 1 of 3", "Round 2 of 3", "Round 3 of 3"

   Example structure for 3 exercises with 3 rounds:
   - Exercise A (Round 1 of 3)
   - Exercise B (Round 1 of 3)
   - Exercise C (Round 1 of 3)
   - Rest (30-60 seconds)
   - Exercise A (Round 2 of 3)
   - Exercise B (Round 2 of 3)
   - Exercise C (Round 2 of 3)
   - Rest (30-60 seconds)
   - Exercise A (Round 3 of 3)
   - Exercise B (Round 3 of 3)
   - Exercise C (Round 3 of 3)

3. **Category Assignment**: Never mix categories incorrectly:
   - prep: Only for "Get Ready" countdown or mental preparation
   - warmup: Dynamic stretches and light movements to prepare
   - main: Primary strength/conditioning exercises
   - rest: Recovery periods between rounds or exercises
   - recovery: Cool-down stretches at the end

4. **When Adding/Removing Exercises**: Maintain round structure. If adding a new main exercise, add it to ALL rounds, not just once.

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

**Exercise Library:**
You have access to a global exercise library with AI-generated illustrations. When creating or modifying workouts:
1. Use search_exercises to find existing exercises (prefer these - they have images ready)
2. Use create_exercise only when no suitable existing exercise is found
3. New exercises automatically queue for image generation (~30 seconds)
Use get_exercise_images to check if images are ready for exercises in a workout.

**Web Search:**
You have access to web search for looking up current fitness research, exercise variations, or answering questions that benefit from up-to-date information.

**Response Style:**
- Be conversational but professional
- Use markdown formatting for clarity (headers, lists, bold for emphasis)
- Keep responses focused and practical
- For exercise instructions, include key form cues

**Post-Workout Feedback:**
When users report completing a workout and share their difficulty rating:
- **"Too Easy"**: Acknowledge their strength, suggest ways to increase intensity (heavier weights, more reps, shorter rest, tempo variations). DESCRIBE the changes but do NOT automatically apply them.
- **"Just Right"**: Congratulate them on finding the right level. This is the sweet spot for progress.
- **"Too Hard"**: Be encouraging about their effort. Suggest easier modifications (lighter weights, fewer reps, longer rest, regression exercises). DESCRIBE the changes but do NOT automatically apply them.

IMPORTANT: After receiving workout feedback, you may suggest modifications but NEVER automatically update the workout. Always describe potential changes and ask if the user wants you to apply them.

**App Feedback Detection:**
When users mention issues, suggestions, or feedback about THE APP ITSELF (not fitness-related):
1. Recognize this as product feedback (bugs, feature requests, UI issues, etc.)
2. Ask 1-2 clarifying questions to understand what happened and what they expected
3. Once you have enough context, save a summary to memory using save_memory with category "feedback"
4. Use create_feedback_issue tool to record the feedback (don't mention GitHub to the user)
5. Simply confirm: "Thanks for the feedback! I've recorded it."

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
      description: "Search the exercise library for existing exercises. Use this to find exercises with images already available when building or modifying workout plans.",
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
      description: "Create a new exercise in the library. Use when no suitable existing exercise is found via search. Automatically queues image generation.",
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
  }
];

// Execute a tool call
async function executeTool(
  openai: OpenAI,
  userId: string,
  toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall
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
      }
    }

    const systemPrompt = `${PERSONAL_TRAINER_PROMPT}

**Current Date:** ${dateStr}

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
      get_workout_stats: "Analyzing workout history"
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

              const result = await executeTool(openai, userId, toolCall);
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

          // Send done signal
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));

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
