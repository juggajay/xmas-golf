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

    // Imagen 3 via Google AI API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: `A 3D Pixar-style rendering of this person. Maintain exact facial structure, eye shape, and nose. Outfit: Red and green Christmas golf polo, santa hat. Action: Holding a golden golf club, confident smile. Background: High-end golf course, sunny day. Style: 8k, cinematic lighting, cute but realistic likeness.`,
              image: {
                bytesBase64Encoded: base64Image,
              },
            },
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Imagen API error:", errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    if (result.predictions?.[0]?.bytesBase64Encoded) {
      const imageData = result.predictions[0].bytesBase64Encoded;
      const dataUrl = `data:image/png;base64,${imageData}`;

      return {
        success: true,
        avatarUrl: dataUrl,
        avatarBase64: imageData,
      };
    }

    throw new Error("No image in response");
  } catch (error) {
    console.error("Avatar generation failed:", error);
    return {
      success: false,
      error: `Failed to generate avatar: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
