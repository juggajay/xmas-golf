"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

// Set max duration for Vercel serverless function
export const maxDuration = 60;

export interface AvatarGenerationResult {
  success: boolean;
  avatarUrl?: string;
  avatarBase64?: string;
  features?: string;
  error?: string;
}

// Use the standard AI Key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function generateAvatar(
  formData: FormData
): Promise<AvatarGenerationResult> {
  const selfieFile = formData.get("selfie") as File | null;

  if (!selfieFile) {
    return { success: false, error: "No selfie provided" };
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return { success: false, error: "GOOGLE_API_KEY is not set" };
  }

  try {
    const arrayBuffer = await selfieFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    // 1. VISION: Ask Gemini 1.5 Pro to describe the user's face
    // (This ensures the cartoon actually looks like them)
    const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const descriptionResult = await visionModel.generateContent([
      `Look at this selfie. Describe the person's key physical features for a character artist.
       Focus on: Hair style/color, facial hair, glasses, eye color, skin tone, and distinct expression.
       Output just the description, no intro text.`,
      { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
    ]);
    const description = descriptionResult.response.text();

    console.log("Vision description:", description);

    // 2. GENERATION: Try Imagen 3 first, fallback to Gemini 2.0 Flash
    let avatarImageBase64: string | null = null;
    let avatarMimeType = "image/png";

    try {
      // Try Imagen 3 for high-quality generation
      const imageModel = genAI.getGenerativeModel({
        model: "imagen-3.0-generate-001",
      });
      const prompt = `Create a 3D Pixar-style cartoon avatar based on this description: ${description}

The character is wearing a festive red and green Christmas golf outfit and a Santa hat.
They are holding a golf club over their shoulder.
Background: A sunny, vibrant golf course with Christmas decorations.
Style: Cute, expressive, 3D render, 4k, high quality, digital art, Pixar animation style.`;

      const imageResult = await imageModel.generateContent(prompt);
      const response = imageResult.response;

      // Handle Imagen response format
      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts as Array<{ inlineData?: { data: string; mimeType: string } }>) {
        if (part.inlineData?.data) {
          avatarImageBase64 = part.inlineData.data;
          avatarMimeType = part.inlineData.mimeType || "image/png";
          break;
        }
      }
    } catch (imagenError) {
      console.log("Imagen 3 not available, falling back to Gemini 2.0 Flash:", imagenError);

      // Fallback to Gemini 2.0 Flash experimental with image generation
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Create a 3D Pixar-style cartoon avatar of a person with these features: ${description}

IMPORTANT styling:
- Wearing a festive Christmas golf polo (green with red trim)
- Santa hat on their head
- Holding a golden golf club over their shoulder
- Confident, friendly smile
- Sunny golf course background with Christmas lights and decorations

Style: High quality 3D Pixar animation, cute and expressive, head and shoulders portrait, 4k digital art.`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ["IMAGE", "TEXT"],
            },
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        const parts = result.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            avatarImageBase64 = part.inlineData.data;
            avatarMimeType = part.inlineData.mimeType || "image/png";
            break;
          }
        }
      }
    }

    // 3. Return the Image
    if (avatarImageBase64) {
      return {
        success: true,
        avatarUrl: `data:${avatarMimeType};base64,${avatarImageBase64}`,
        avatarBase64: avatarImageBase64,
        features: description.substring(0, 200),
      };
    }

    // No image generated - return fallback
    return {
      success: false,
      error: "Could not generate avatar image. Try a different photo.",
      features: description,
    };
  } catch (error) {
    console.error("Avatar Gen Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate avatar. Please try a different photo.",
    };
  }
}
