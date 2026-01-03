import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { getAllWorkoutsTool, getWorkoutTool, updateWorkoutTool } from "@/lib/workout-tools";
import {
  saveMemory,
  getMemories,
  deleteMemory,
  formatMemoriesAsContext,
  MEMORY_CATEGORIES,
  type MemoryCategory
} from "@/lib/memory-tools";

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

**Web Search:**
You have access to web search for looking up current fitness research, exercise variations, or answering questions that benefit from up-to-date information.

**Response Style:**
- Be conversational but professional
- Use markdown formatting for clarity (headers, lists, bold for emphasis)
- Keep responses focused and practical
- For exercise instructions, include key form cues`;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    const { messages, sessionId } = await request.json();

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

    // Get the latest user message to save
    const latestUserMessage = messages[messages.length - 1];
    if (latestUserMessage && latestUserMessage.role === 'user') {
      await query(`
        INSERT INTO chat_messages (session_id, role, content, tool_calls)
        VALUES ($1, $2, $3, NULL)
      `, [chatSession, 'user', latestUserMessage.content]);
    }

    // Load user memories for context
    const memories = await getMemories(userId);
    const memoryContext = formatMemoriesAsContext(memories);

    // Build system prompt with user context and current date
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const systemPrompt = `${PERSONAL_TRAINER_PROMPT}

**Current Date:** ${dateStr}

**User Profile (from memory):**
${memoryContext}`;

    // Define all tools
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
      }
    ];

    // Initial API call - use gpt-4o for function calling (search-preview doesn't support tools)
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      tools
    });

    // Handle tool calls
    const message = response.choices[0].message;
    let finalMessage = message;
    let allToolCalls: any[] = []; // Track all tool calls made

    console.log('AI Response tool_calls:', message.tool_calls);

    if (message.tool_calls && message.tool_calls.length > 0) {
      // Collect initial tool calls
      allToolCalls.push(...message.tool_calls);
      const toolMessages: any[] = [message];

      for (const toolCall of message.tool_calls) {
        if (toolCall.type !== 'function') continue;

        console.log('Executing tool:', toolCall.function.name, 'with args:', toolCall.function.arguments);

        const args = JSON.parse(toolCall.function.arguments);
        let toolResult: any;

        switch (toolCall.function.name) {
          case "get_workout":
            const workout = await getWorkoutTool(userId, args.slug);
            toolResult = workout || { error: "Workout not found" };
            break;

          case "get_all_workouts":
            const allWorkouts = await getAllWorkoutsTool(userId);
            toolResult = allWorkouts.length > 0
              ? { workouts: allWorkouts }
              : { error: "No workouts found" };
            break;

          case "update_workout":
            try {
              const workoutData = args.workout || args;
              console.log('Calling updateWorkoutTool with:', userId, args.slug);
              const result = await updateWorkoutTool(userId, args.slug, workoutData);
              console.log('updateWorkoutTool result:', result);
              toolResult = result;
            } catch (error: any) {
              console.error('updateWorkoutTool error:', error);
              toolResult = { error: error.message || "Failed to update workout" };
            }
            break;

          case "save_memory":
            toolResult = await saveMemory(
              userId,
              args.category as MemoryCategory,
              args.key,
              args.value
            );
            break;

          case "get_memories":
            const userMemories = await getMemories(userId, args.category);
            toolResult = userMemories.length > 0
              ? { memories: userMemories }
              : { message: "No memories stored yet" };
            break;

          case "delete_memory":
            toolResult = await deleteMemory(
              userId,
              args.category as MemoryCategory,
              args.key
            );
            break;

          case "web_search":
            // Use OpenAI's built-in web search via a separate call
            try {
              const searchResponse = await openai.chat.completions.create({
                model: "gpt-4o-search-preview",
                messages: [
                  {
                    role: "user",
                    content: `Search the web and summarize findings for: ${args.query}`
                  }
                ],
                web_search_options: {
                  search_context_size: "medium"
                }
              });
              toolResult = {
                results: searchResponse.choices[0].message.content,
                query: args.query
              };
            } catch (searchError: any) {
              console.error('Web search error:', searchError);
              toolResult = { error: "Web search failed", query: args.query };
            }
            break;

          default:
            toolResult = { error: `Unknown tool: ${toolCall.function.name}` };
        }

        toolMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        });
      }

      // Continue conversation with tool results - keep looping while AI wants to call more tools
      let allToolMessages = [...toolMessages];
      let maxIterations = 5;

      while (maxIterations > 0) {
        const followupResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            ...allToolMessages
          ],
          tools
        });

        finalMessage = followupResponse.choices[0].message;

        // If no more tool calls, we're done
        if (!finalMessage.tool_calls || finalMessage.tool_calls.length === 0) {
          break;
        }

        console.log('Follow-up tool_calls:', finalMessage.tool_calls);

        // Collect follow-up tool calls
        allToolCalls.push(...finalMessage.tool_calls);

        // Handle the new tool calls
        allToolMessages.push(finalMessage);

        for (const toolCall of finalMessage.tool_calls) {
          if (toolCall.type !== 'function') continue;

          console.log('Executing follow-up tool:', toolCall.function.name);

          const args = JSON.parse(toolCall.function.arguments);
          let toolResult: any;

          switch (toolCall.function.name) {
            case "get_workout":
              const workout = await getWorkoutTool(userId, args.slug);
              toolResult = workout || { error: "Workout not found" };
              break;

            case "get_all_workouts":
              const allWorkouts = await getAllWorkoutsTool(userId);
              toolResult = allWorkouts.length > 0
                ? { workouts: allWorkouts }
                : { error: "No workouts found" };
              break;

            case "update_workout":
              try {
                const workoutData = args.workout || args;
                console.log('Calling updateWorkoutTool with:', userId, args.slug);
                const result = await updateWorkoutTool(userId, args.slug, workoutData);
                console.log('updateWorkoutTool result:', result);
                toolResult = result;
              } catch (error: any) {
                console.error('updateWorkoutTool error:', error);
                toolResult = { error: error.message || "Failed to update workout" };
              }
              break;

            case "save_memory":
              toolResult = await saveMemory(
                userId,
                args.category as MemoryCategory,
                args.key,
                args.value
              );
              break;

            case "get_memories":
              const userMemories = await getMemories(userId, args.category);
              toolResult = userMemories.length > 0
                ? { memories: userMemories }
                : { message: "No memories stored yet" };
              break;

            case "delete_memory":
              toolResult = await deleteMemory(
                userId,
                args.category as MemoryCategory,
                args.key
              );
              break;

            case "web_search":
              try {
                const searchResponse = await openai.chat.completions.create({
                  model: "gpt-4o-search-preview",
                  messages: [
                    {
                      role: "user",
                      content: `Search the web and summarize findings for: ${args.query}`
                    }
                  ],
                  web_search_options: {
                    search_context_size: "medium"
                  }
                });
                toolResult = {
                  results: searchResponse.choices[0].message.content,
                  query: args.query
                };
              } catch (searchError: any) {
                console.error('Web search error:', searchError);
                toolResult = { error: "Web search failed", query: args.query };
              }
              break;

            default:
              toolResult = { error: `Unknown tool: ${toolCall.function.name}` };
          }

          allToolMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult)
          });
        }

        maxIterations--;
      }
    }

    // Save assistant message to DB with all tool_calls that were made
    await query(`
      INSERT INTO chat_messages (session_id, role, content, tool_calls)
      VALUES ($1, $2, $3, $4)
    `, [
      chatSession,
      'assistant',
      finalMessage.content || "",
      allToolCalls.length > 0 ? JSON.stringify(allToolCalls) : null
    ]);

    return Response.json({
      message: finalMessage,
      sessionId: chatSession
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return Response.json({
      error: error.message || "Failed to process chat"
    }, { status: 500 });
  }
}
