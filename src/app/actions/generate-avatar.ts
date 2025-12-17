"use server";

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
    const mimeType = selfieFile.type || "image/jpeg";

    // Use Gemini 2.0 Flash to generate cartoon avatar from photo
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Transform this photo into a fun 3D Pixar-style cartoon avatar.

IMPORTANT: The cartoon MUST look like the same person - keep their:
- Face shape and structure
- Hair color and style
- Skin tone
- Glasses (if they have them)
- Facial hair (if they have it)

Add these festive elements:
- Wearing a Christmas golf polo (green with red trim)
- Santa hat on their head
- Holding a golden golf club
- Confident, friendly smile
- Sunny golf course background with Christmas lights

Style: High quality 3D Pixar animation, cute but recognizable as the person, head and shoulders portrait.`,
                },
                {
                  inlineData: {
                    mimeType,
                    data: base64Image,
                  },
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return {
        success: false,
        error: `API returned ${response.status}: ${errorText.substring(0, 200)}`,
      };
    }

    const result = await response.json();

    // Look for image in response
    const parts = result.candidates?.[0]?.content?.parts || [];

    for (const part of parts) {
      if (part.inlineData?.data) {
        const imageData = part.inlineData.data;
        const imageMimeType = part.inlineData.mimeType || "image/png";

        return {
          success: true,
          avatarUrl: `data:${imageMimeType};base64,${imageData}`,
          avatarBase64: imageData,
          features: "AI-generated cartoon avatar",
        };
      }
    }

    // No image found - check if there's text explaining why
    const textPart = parts.find((p: { text?: string }) => p.text);
    const errorMsg = textPart?.text || "No image generated";

    console.error("No image in response:", JSON.stringify(result, null, 2));
    return {
      success: false,
      error: errorMsg.substring(0, 200),
    };
  } catch (error) {
    console.error("Avatar generation error:", error);
    return {
      success: false,
      error: `Exception: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
