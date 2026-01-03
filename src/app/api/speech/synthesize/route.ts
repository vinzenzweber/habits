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

    // Use gpt-4o-mini-tts for best quality with instructions
    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "coral",
      input: truncatedText,
      instructions: "Speak clearly and at a moderate pace, like a friendly fitness coach. Pronounce exercise names carefully.",
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
  } catch (error: any) {
    console.error("TTS error:", error);

    // Fallback to tts-1 if gpt-4o model not available
    if (error.message?.includes("model") || error.message?.includes("instructions")) {
      try {
        const { text } = await request.json();
        const truncatedText = text.slice(0, 4000);
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const response = await openai.audio.speech.create({
          model: "tts-1",
          voice: "nova",
          input: truncatedText,
          response_format: "mp3",
          speed: 1.0,
        });

        const audioBuffer = Buffer.from(await response.arrayBuffer());

        return new Response(audioBuffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length.toString(),
          },
        });
      } catch (fallbackError: any) {
        return Response.json({ error: fallbackError.message }, { status: 500 });
      }
    }

    return Response.json({ error: error.message || "Speech synthesis failed" }, { status: 500 });
  }
}
