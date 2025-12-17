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

    // Try Imagen 3 via Google AI API
    const imagenResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: `A 3D Pixar-style cartoon avatar portrait of this person. Maintain their facial features. Wearing a red and green Christmas golf polo and santa hat. Holding a golden golf club with a confident smile. Background: sunny golf course with Christmas decorations. Style: Pixar animation, cute, 8k quality.`,
          referenceImages: [
            {
              referenceImage: {
                imageBytes: base64Image,
              },
              referenceId: 1,
              referenceType: "STYLE_REFERENCE",
            },
          ],
          config: {
            numberOfImages: 1,
            aspectRatio: "1:1",
            personGeneration: "ALLOW_ADULT",
          },
        }),
      }
    );

    console.log("Imagen response status:", imagenResponse.status);

    if (imagenResponse.ok) {
      const imagenResult = await imagenResponse.json();
      console.log("Imagen result keys:", Object.keys(imagenResult));

      if (imagenResult.generatedImages?.[0]?.image?.imageBytes) {
        const imageData = imagenResult.generatedImages[0].image.imageBytes;
        return {
          success: true,
          avatarUrl: `data:image/png;base64,${imageData}`,
          avatarBase64: imageData,
        };
      }
    }

    const errorText = await imagenResponse.text();
    console.log("Imagen error:", errorText);

    // Fallback: Use Gemini 2.0 Flash for image generation
    console.log("Trying Gemini 2.0 Flash...");

    const geminiResponse = await fetch(
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
                  text: `Look at this person's photo and generate a fun 3D Pixar-style cartoon avatar of them. They should be wearing a Christmas golf outfit (red and green polo, santa hat) and holding a golf club. Make it cute and festive! Keep their key facial features recognizable.`,
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

    console.log("Gemini response status:", geminiResponse.status);

    if (geminiResponse.ok) {
      const geminiResult = await geminiResponse.json();

      const parts = geminiResult.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const imageData = part.inlineData.data;
          const imageMimeType = part.inlineData.mimeType || "image/png";
          return {
            success: true,
            avatarUrl: `data:${imageMimeType};base64,${imageData}`,
            avatarBase64: imageData,
          };
        }
      }
    }

    const geminiError = await geminiResponse.text();
    console.log("Gemini error:", geminiError);

    return {
      success: false,
      error: "Both Imagen and Gemini failed to generate image",
    };
  } catch (error) {
    console.error("Avatar generation error:", error);
    return {
      success: false,
      error: `Exception: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
