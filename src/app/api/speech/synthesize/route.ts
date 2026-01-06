import OpenAI from "openai";
import { auth } from "@/lib/auth";

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return Response.json({ error: "No text provided" }, { status: 400 });
    }

    // Limit text length for TTS
    const truncatedText = text.slice(0, 4000);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Use tts-1 with nova voice for natural speech
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input: truncatedText,
      response_format: "mp3",
      speed: 1.0,
    });

    // Return audio as stream
    const audioBuffer = Buffer.from(await response.arrayBuffer());

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    const message = error instanceof Error ? error.message : "Speech synthesis failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
