"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export interface AvatarGenerationResult {
  success: boolean;
  avatarUrl?: string;
  avatarBase64?: string;
  features?: string;
  error?: string;
}

export async function generateAvatar(
  formData: FormData
): Promise<AvatarGenerationResult> {
  try {
    const selfieFile = formData.get("selfie") as File | null;
    const userName = formData.get("userName") as string | null;

    if (!selfieFile) {
      return { success: false, error: "No selfie provided" };
    }

    // Convert file to base64
    const bytes = await selfieFile.arrayBuffer();
    const base64Data = Buffer.from(bytes).toString("base64");

    // Step 1: Analyze selfie with Gemini Vision
    const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const analysisPrompt = `Analyze this person's selfie and describe their physical features in exactly 2 sentences. Focus on:
- Hair color and style
- Whether they wear glasses
- Facial hair (if any)
- Their expression/vibe

Be concise, positive, and fun! This will be used to create a cartoon avatar.`;

    const visionResult = await visionModel.generateContent([
      analysisPrompt,
      {
        inlineData: {
          mimeType: selfieFile.type || "image/jpeg",
          data: base64Data,
        },
      },
    ]);

    const features = visionResult.response.text();

    // Step 2: Generate avatar image prompt
    const avatarPrompt = `A high-quality 3D Pixar-style character portrait based on: ${features}.
They are wearing festive Christmas golf attire (green polo with red trim, Santa hat).
They are confidently holding a golf club over their shoulder.
Background is a sunny golf course with Christmas decorations.
Cinematic lighting, 4k quality, cute and confident expression, slight smile.`;

    // Step 3: Try to generate image using Gemini's experimental image generation
    // Note: As of now, Gemini doesn't have direct image generation in the standard API
    // We'll use a creative fallback with DiceBear + feature-based styling

    // Generate a unique, feature-based avatar using DiceBear
    // We'll extract key features to customize the avatar
    const avatarSeed = encodeURIComponent(
      `${userName || "player"}-${features.slice(0, 50)}`
    );

    // Determine avatar style based on features
    const hasGlasses = features.toLowerCase().includes("glasses");
    const hasBeard =
      features.toLowerCase().includes("beard") ||
      features.toLowerCase().includes("facial hair");
    const isFemale =
      features.toLowerCase().includes("she") ||
      features.toLowerCase().includes("her") ||
      features.toLowerCase().includes("woman");

    // Use adventurer style with Christmas colors
    const backgroundColor = "c41e3a,228b22"; // Christmas red and green gradient
    const avatarStyle = isFemale ? "adventurer" : "adventurer";

    // Build DiceBear URL with features
    let diceBearUrl = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${avatarSeed}`;
    diceBearUrl += `&backgroundColor=${backgroundColor}`;
    diceBearUrl += `&backgroundType=gradientLinear`;

    if (hasGlasses) {
      diceBearUrl += `&glasses=variant01,variant02,variant03`;
      diceBearUrl += `&glassesProbability=100`;
    }

    // For a more "wow" factor, let's also try to create a custom styled avatar
    // by fetching and converting to base64 for Convex storage
    const avatarResponse = await fetch(diceBearUrl);
    const avatarSvg = await avatarResponse.text();

    // Convert SVG to a data URL
    const svgBase64 = Buffer.from(avatarSvg).toString("base64");
    const avatarDataUrl = `data:image/svg+xml;base64,${svgBase64}`;

    return {
      success: true,
      avatarUrl: diceBearUrl,
      avatarBase64: svgBase64,
      features,
    };
  } catch (error) {
    console.error("Avatar generation error:", error);
    return {
      success: false,
      error: `Failed to generate avatar: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// Alternative: Generate a more elaborate avatar description for future image gen
export async function analyzeSelfieFeaturesOnly(
  base64Data: string,
  mimeType: string = "image/jpeg"
): Promise<{ success: boolean; features?: string; prompt?: string; error?: string }> {
  try {
    const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const analysisPrompt = `Analyze this person's selfie and describe their physical features in exactly 2 sentences. Focus on:
- Hair color and style
- Whether they wear glasses
- Facial hair (if any)
- Their expression/vibe

Be concise, positive, and fun!`;

    const visionResult = await visionModel.generateContent([
      analysisPrompt,
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
    ]);

    const features = visionResult.response.text();

    // Generate the ideal image prompt
    const imagePrompt = `A high-quality 3D Pixar-style character portrait: ${features}. Wearing festive Christmas golf attire (green polo with red trim, Santa hat), confidently holding a golf club. Sunny golf course background with Christmas decorations. Cinematic lighting, 4k, cute and confident.`;

    return {
      success: true,
      features,
      prompt: imagePrompt,
    };
  } catch (error) {
    return {
      success: false,
      error: `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
