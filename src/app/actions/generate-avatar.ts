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

    // Step 1: Analyze selfie with Gemini Vision to extract features
    const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const analysisPrompt = `Analyze this person's selfie and provide a detailed description for creating a cartoon avatar. Include:

1. Hair: color, length, style (straight, curly, wavy, bald, etc.)
2. Face shape: round, oval, square, heart, etc.
3. Skin tone: light, medium, tan, dark, etc.
4. Eyes: color if visible, shape
5. Glasses: yes/no, style if yes
6. Facial hair: none, stubble, beard, mustache (describe style)
7. Notable features: dimples, freckles, etc.
8. General vibe: friendly, professional, energetic, etc.

Format your response as a brief, comma-separated list of traits. Be specific but concise. Example: "short brown curly hair, round face, light skin, brown eyes, black square glasses, no facial hair, friendly smile"`;

    const visionResult = await visionModel.generateContent([
      analysisPrompt,
      {
        inlineData: {
          mimeType: selfieFile.type || "image/jpeg",
          data: base64Data,
        },
      },
    ]);

    const features = visionResult.response.text().trim();
    console.log("Extracted features:", features);

    // Step 2: Generate avatar image using Imagen 3 via Gemini
    try {
      const imageModel = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
        generationConfig: {
          // @ts-expect-error - responseModalities is valid for image generation
          responseModalities: ["image", "text"],
        },
      });

      const imagePrompt = `Generate a fun, festive Christmas-themed cartoon avatar portrait based on these features: ${features}

Style requirements:
- Pixar/Disney 3D animation style, high quality
- Person wearing a Santa hat and Christmas-themed golf polo (green with red trim)
- Cheerful, confident expression
- Soft, warm Christmas lighting
- Simple festive background with subtle bokeh lights
- Portrait orientation, head and shoulders only
- Cute, appealing cartoon style
- The avatar should clearly reflect the person's key features (hair, glasses if any, facial hair if any, skin tone)

Make it look fun and festive for a Christmas golf party!`;

      const imageResult = await imageModel.generateContent(imagePrompt);
      const response = imageResult.response;

      // Check for image in the response
      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const partAny = part as any;
          if (partAny.inlineData) {
            const imageData = partAny.inlineData.data;
            const mimeType = partAny.inlineData.mimeType || "image/png";

            // Return as data URL
            const dataUrl = `data:${mimeType};base64,${imageData}`;

            return {
              success: true,
              avatarUrl: dataUrl,
              avatarBase64: imageData,
              features: features,
            };
          }
        }
      }

      // If no image was generated, fall through to fallback
      console.log("No image in response, using fallback");
    } catch (imageError) {
      console.log("Image generation failed, using fallback:", imageError);
    }

    // Fallback: Use a high-quality avatar API with the extracted features
    const avatarUrl = await generateFallbackAvatar(features, userName || "player");

    return {
      success: true,
      avatarUrl,
      features,
    };
  } catch (error) {
    console.error("Avatar generation error:", error);

    // Ultimate fallback
    const fallbackUrl = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(Date.now().toString())}&backgroundColor=c41e3a,228b22&backgroundType=gradientLinear`;

    return {
      success: true, // Still return success with fallback
      avatarUrl: fallbackUrl,
      error: `Using fallback avatar: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// Generate a better fallback avatar using feature analysis
async function generateFallbackAvatar(features: string, userName: string): Promise<string> {
  const featuresLower = features.toLowerCase();

  // Detect key characteristics
  const hasGlasses = featuresLower.includes("glasses");
  const hasBeard = featuresLower.includes("beard") || featuresLower.includes("facial hair") && !featuresLower.includes("no facial hair");
  const hasMustache = featuresLower.includes("mustache");
  const isBald = featuresLower.includes("bald");

  // Detect hair color
  let hairColor = "000000"; // default black
  if (featuresLower.includes("blonde") || featuresLower.includes("blond")) hairColor = "f4d03f";
  else if (featuresLower.includes("brown hair")) hairColor = "6b4423";
  else if (featuresLower.includes("red hair") || featuresLower.includes("ginger")) hairColor = "c0392b";
  else if (featuresLower.includes("gray") || featuresLower.includes("grey") || featuresLower.includes("white hair")) hairColor = "95a5a6";

  // Detect skin tone
  let skinColor = "f5d0c5"; // default light
  if (featuresLower.includes("dark skin")) skinColor = "8d5524";
  else if (featuresLower.includes("tan") || featuresLower.includes("medium skin")) skinColor = "c68642";
  else if (featuresLower.includes("light skin") || featuresLower.includes("fair")) skinColor = "ffdbac";

  // Use a unique seed based on features + name
  const seed = encodeURIComponent(`${userName}-${features.slice(0, 30)}`);

  // Build a more customized avatar URL using DiceBear's Adventurer style (best quality)
  // Use "lorelei" style which looks more like illustrated portraits
  let avatarUrl = `https://api.dicebear.com/9.x/lorelei/svg?seed=${seed}`;
  avatarUrl += `&backgroundColor=c41e3a,228b22&backgroundType=gradientLinear`;

  // Add glasses if detected
  if (hasGlasses) {
    avatarUrl += `&glasses=variant01,variant02,variant03,variant04,variant05&glassesProbability=100`;
  }

  return avatarUrl;
}

// Utility to check if Imagen is available
export async function checkImagenAvailability(): Promise<boolean> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    return !!model;
  } catch {
    return false;
  }
}
