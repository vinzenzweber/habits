import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import {
  saveMemory,
  getMemories,
  formatMemoriesAsContext,
  MEMORY_CATEGORIES,
  type MemoryCategory
} from "@/lib/memory-tools";
import { generateWorkoutPlan } from "@/lib/workout-generator";

export const runtime = 'nodejs';

// Onboarding system prompt - designed for gathering info and creating personalized plans
const ONBOARDING_PROMPT = `You are an expert personal trainer welcoming a new client. Your goal is to learn about them through friendly conversation and create a personalized weekly workout plan.

**Your Approach:**
- Be warm, encouraging, and professional
- Ask questions naturally, one topic at a time
- Listen actively and respond to what they share
- Don't interrogate - let the conversation flow
- Remember everything they share using save_memory
- Use web_search when you need scientific evidence to support your recommendations

**Information to Gather (in natural order):**

1. **Experience & Background**
   - Current fitness level (beginner/intermediate/advanced)
   - Training history (how long, what type)
   - Sports background
   - What workouts they've enjoyed or struggled with

2. **Equipment Available**
   - Home gym or commercial gym?
   - Specific equipment (dumbbells, kettlebells, barbells, bands, pull-up bar, etc.)
   - Weight ranges available

3. **Goals**
   - Primary goal (strength, muscle building, fat loss, endurance, general fitness)
   - Any specific targets (e.g., first pull-up, deadlift 2x bodyweight)
   - Timeline expectations

4. **Schedule**
   - Days per week available for training
   - Time per session
   - Preferred training times
   - Any schedule constraints

5. **Limitations** (ask gently)
   - Any injuries (current or past)
   - Medical conditions affecting exercise
   - Movements to avoid

**Conversation Flow:**
1. Start with a warm welcome and ask about their fitness background
2. Let them share naturally - they may volunteer information across categories
3. After each significant piece of information, use save_memory to store it
4. Use web_search when discussing training methods, exercise science, or when they ask questions you want to verify
5. Once you have enough information (at minimum: experience level, equipment, goals, available days), summarize what you learned
6. Ask if they're ready for you to create their plan
7. Call generate_workout_plan with their profile
8. Present the plan and explain the reasoning
9. Ask if they'd like any adjustments
10. Call complete_onboarding when ANY of these conditions are met:
    - User says they're ready, happy, or satisfied with the plan
    - User wants to get started or try the workouts
    - User says "yes", "looks good", "let's do it", "sounds great", etc.
    - User indicates they don't need changes
    - You've presented the plan and user responds positively

**Memory Categories:**
- equipment: Available equipment and weights
- goals: Fitness goals and targets
- medical: Injuries, conditions, limitations
- preferences: Exercise likes/dislikes
- experience: Training background and level
- schedule: Available days and time constraints
- measurements: Body stats, PRs (if shared)

**IMPORTANT:**
- Use save_memory after EACH piece of information shared
- Be thorough but not overwhelming
- If they seem eager to get started, you can gather minimum info and create a starter plan
- The plan will be generated based on the memories you've saved
- Call complete_onboarding PROACTIVELY when the user seems satisfied - don't wait for explicit confirmation
- If the user responds positively after seeing their plan (e.g., "great", "thanks", "let's go"), immediately call complete_onboarding
- The user should NOT have to explicitly ask to finish onboarding - infer their readiness from context`;

// Tool definitions for onboarding
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "save_memory",
      description: "Save important information about the user. Call this after each significant piece of information they share.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: MEMORY_CATEGORIES as unknown as string[],
            description: "Category: equipment, goals, medical, preferences, experience, schedule, or measurements"
          },
          key: {
            type: "string",
            description: "Short identifier (e.g., 'experience_level', 'primary_goal', 'available_days')"
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
      description: "Retrieve all stored information about the user. Use to review what you know before creating their plan.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for fitness research, exercise science, or to verify recommendations. Use when discussing training methods or answering specific questions.",
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
      name: "generate_workout_plan",
      description: "Generate a personalized 7-day workout plan based on the user's profile. Call this after gathering their information.",
      parameters: {
        type: "object",
        properties: {
          experienceLevel: {
            type: "string",
            enum: ["beginner", "intermediate", "advanced"],
            description: "User's training experience level"
          },
          primaryGoal: {
            type: "string",
            enum: ["strength", "hypertrophy", "fat_loss", "endurance", "general_fitness"],
            description: "User's primary fitness goal"
          },
          daysPerWeek: {
            type: "number",
            description: "Number of training days per week (2-7)"
          },
          minutesPerSession: {
            type: "number",
            description: "Available time per session in minutes (20-90)"
          },
          equipment: {
            type: "array",
            items: { type: "string" },
            description: "Available equipment (e.g., ['dumbbells', 'kettlebells', 'pull-up bar'])"
          },
          limitations: {
            type: "array",
            items: { type: "string" },
            description: "Injuries or limitations to work around (e.g., ['bad knee', 'shoulder impingement'])"
          }
        },
        required: ["experienceLevel", "primaryGoal", "daysPerWeek", "equipment"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "complete_onboarding",
      description: "Mark onboarding as complete and redirect user to their workouts. Call this PROACTIVELY when: (1) user responds positively to their plan, (2) user says thanks/great/looks good, (3) user wants to start working out, or (4) user indicates they're ready. Don't wait for explicit confirmation - infer readiness from positive responses.",
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
): Promise<{ result: string; onboardingComplete?: boolean }> {
  if (toolCall.type !== 'function') {
    return { result: JSON.stringify({ error: `Unsupported tool type: ${toolCall.type}` }) };
  }

  const args = JSON.parse(toolCall.function.arguments);
  let result: unknown;
  let onboardingComplete = false;

  switch (toolCall.function.name) {
    case "save_memory":
      result = await saveMemory(userId, args.category as MemoryCategory, args.key, args.value);
      break;

    case "get_memories":
      const memories = await getMemories(userId);
      result = memories.length > 0 ? { memories } : { message: "No information stored yet" };
      break;

    case "web_search":
      try {
        const searchResponse = await openai.chat.completions.create({
          model: "gpt-4o-search-preview",
          messages: [{ role: "user", content: `Search for fitness/exercise science information: ${args.query}` }],
          web_search_options: { search_context_size: "medium" }
        });
        result = { results: searchResponse.choices[0].message.content, query: args.query };
      } catch {
        result = { error: "Web search failed", query: args.query };
      }
      break;

    case "generate_workout_plan":
      try {
        const workouts = await generateWorkoutPlan(userId, {
          experienceLevel: args.experienceLevel,
          primaryGoal: args.primaryGoal,
          daysPerWeek: args.daysPerWeek,
          minutesPerSession: args.minutesPerSession || 45,
          equipment: args.equipment || [],
          limitations: args.limitations || []
        });
        result = {
          success: true,
          message: `Created ${workouts.length}-day workout plan`,
          workouts: workouts.map(w => ({
            day: w.slug,
            title: w.title,
            focus: w.focus,
            duration: Math.round(w.totalSeconds / 60) + " minutes",
            exercises: w.segments.filter(s => s.category === 'main').length + " exercises"
          }))
        };
      } catch (error) {
        result = { error: "Failed to generate workout plan", message: error instanceof Error ? error.message : "Unknown error" };
      }
      break;

    case "complete_onboarding":
      try {
        // Mark onboarding as complete in database
        await query(`
          UPDATE users
          SET onboarding_completed = true, onboarding_completed_at = NOW()
          WHERE id = $1
        `, [userId]);
        result = { success: true, message: "Onboarding completed!" };
        onboardingComplete = true;
      } catch (error) {
        result = { error: "Failed to complete onboarding", message: error instanceof Error ? error.message : "Unknown error" };
      }
      break;

    default:
      result = { error: `Unknown tool: ${toolCall.function.name}` };
  }

  return { result: JSON.stringify(result), onboardingComplete };
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    const { messages, sessionId, startConversation } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: "Invalid messages" }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Create session if needed
    let chatSession = sessionId;
    if (!chatSession) {
      const result = await query(`
        INSERT INTO chat_sessions (user_id, title) VALUES ($1, 'Onboarding') RETURNING id
      `, [userId]);
      chatSession = result.rows[0].id;
    }

    // Save user message if not starting conversation
    const latestUserMessage = messages[messages.length - 1];
    if (latestUserMessage && latestUserMessage.role === 'user' && !startConversation) {
      await query(`
        INSERT INTO chat_messages (session_id, role, content, tool_calls)
        VALUES ($1, $2, $3, NULL)
      `, [chatSession, 'user', latestUserMessage.content]);
    }

    // Load existing memories for context
    const memories = await getMemories(userId);
    const memoryContext = formatMemoriesAsContext(memories);

    // Build system prompt
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Include existing memories if resuming
    const resumeContext = memories.length > 0
      ? `\n\n**Previously Gathered Information:**\n${memoryContext}\n\nThe user is returning to continue onboarding. Acknowledge what you already know and pick up where you left off.`
      : '';

    const systemPrompt = `${ONBOARDING_PROMPT}

**Current Date:** ${dateStr}${resumeContext}`;

    const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    // If starting conversation, add initial prompt
    if (startConversation && messages.length === 0) {
      apiMessages.push({
        role: "user",
        content: "Hi, I just signed up and I'm ready to get started with my fitness program."
      });
    }

    // Stream response
    const encoder = new TextEncoder();
    let fullContent = "";
    const allToolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] = [];
    let shouldSendComplete = false;

    const TOOL_DISPLAY_NAMES: Record<string, string> = {
      save_memory: "Remembering...",
      get_memories: "Reviewing profile...",
      web_search: "Researching...",
      generate_workout_plan: "Creating your plan...",
      complete_onboarding: "Finishing setup..."
    };

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "session", sessionId: chatSession })}\n\n`));

          let maxIterations = 10; // Allow more iterations for onboarding

          while (maxIterations > 0) {
            const response = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: apiMessages,
              tools
            });

            const message = response.choices[0].message;

            if (!message.tool_calls || message.tool_calls.length === 0) {
              break;
            }

            allToolCalls.push(...message.tool_calls);
            apiMessages.push(message);

            for (const toolCall of message.tool_calls) {
              if (toolCall.type !== 'function') continue;

              const toolName = toolCall.function.name;
              const displayName = TOOL_DISPLAY_NAMES[toolName] || toolName;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_start", tool: displayName })}\n\n`));

              const { result, onboardingComplete } = await executeTool(openai, userId, toolCall);

              if (onboardingComplete) {
                shouldSendComplete = true;
              }

              apiMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: result
              });

              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_end", tool: displayName })}\n\n`));
            }

            maxIterations--;
          }

          // Stream final response
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

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));

          // Send onboarding complete signal if applicable
          if (shouldSendComplete) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "onboarding_complete" })}\n\n`));
          }

          // Save assistant message
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
    console.error("Onboarding API error:", error);
    const message = error instanceof Error ? error.message : "Failed to process onboarding";
    return Response.json({ error: message }, { status: 500 });
  }
}
