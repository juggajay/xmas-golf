import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { selfieBase64, userName } = await request.json();

    if (!selfieBase64) {
      return NextResponse.json(
        { error: "No selfie provided" },
        { status: 400 }
      );
    }

    // Step 1: Analyze selfie with Gemini 1.5 Pro Vision
    const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Remove data URL prefix if present
    const base64Data = selfieBase64.replace(/^data:image\/\w+;base64,/, "");

    const analysisPrompt = `Analyze this selfie and describe the person's key visual features in a brief, avatar-friendly way. Include:
- Hair color and style (e.g., "short brown hair", "long blonde curls")
- Facial hair if any (e.g., "full beard", "clean shaven")
- Notable features (e.g., "glasses", "freckles")
- Skin tone (e.g., "fair", "tan", "dark")
- Expression/vibe (e.g., "friendly smile", "confident look")

Keep it to 2-3 short phrases, suitable for generating a cartoon avatar. Be positive and fun!`;

    const visionResult = await visionModel.generateContent([
      analysisPrompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data,
        },
      },
    ]);

    const features = visionResult.response.text();

    // Step 2: Generate avatar description for image generation
    // Note: Gemini doesn't directly generate images, so we'll create a detailed prompt
    // that could be used with an image generation service, or we'll use a placeholder

    const avatarPrompt = `3D Pixar style character portrait, Christmas elf golfer hybrid, ${features}, wearing a red and green Christmas sweater with golf motifs, Santa hat with a golf ball pompom, confident cheerful expression, snowy golf course background, warm festive lighting, 4k quality, cartoon style, friendly and approachable`;

    // For now, we'll return the analysis and prompt
    // In production, you'd call an image generation API here (DALL-E, Midjourney, etc.)

    // Generate a fun placeholder avatar URL using DiceBear API
    const seed = encodeURIComponent(userName || features.slice(0, 20));
    const placeholderAvatarUrl = `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${seed}&backgroundColor=c0392b,27ae60&backgroundType=gradientLinear`;

    return NextResponse.json({
      success: true,
      features,
      avatarPrompt,
      avatarUrl: placeholderAvatarUrl,
      message: "Avatar analysis complete! Using placeholder avatar for now.",
    });
  } catch (error) {
    console.error("Avatar generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate avatar", details: String(error) },
      { status: 500 }
    );
  }
}
