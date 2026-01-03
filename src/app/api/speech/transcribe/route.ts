import OpenAI from "openai";
import { auth } from "@/lib/auth";

export const runtime = 'nodejs';

// Exercise terminology prompt to improve recognition accuracy
const EXERCISE_PROMPT = `Transcribe fitness workout instructions. Common terms include:
kettlebell, dumbbell, barbell, Romanian deadlift, RDL, goblet squat, push-up, pull-up,
renegade rows, halo, floor press, overhead press, HIIT, warmup, cooldown, rest period,
jumping jacks, inchworms, cat-cow, arm circles, hip hinges, tempo, reps, sets, rounds,
glutes, hamstrings, quads, lats, delts, pecs, core, abs, obliques.`;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return Response.json({ error: "No audio file provided" }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Use whisper-1 for transcription
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      prompt: EXERCISE_PROMPT,
      language: "en",
    });

    return Response.json({ text: transcription.text });
  } catch (error: any) {
    console.error("Transcription error:", error);
    return Response.json({ error: error.message || "Transcription failed" }, { status: 500 });
  }
}
