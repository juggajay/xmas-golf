"use server";

import { VertexAI } from "@google-cloud/vertexai";

export interface AvatarGenerationResult {
  success: boolean;
  avatarUrl?: string;
  avatarBase64?: string;
  features?: string;
  error?: string;
}

// Setup Auth - Parse the JSON from Vercel Env
function getVertexAI() {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (!credentialsJson) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON is not set");
  }

  const serviceAccount = JSON.parse(credentialsJson);

  return new VertexAI({
    project: serviceAccount.project_id,
    location: "us-central1",
    googleAuthOptions: {
      credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key,
      },
    },
  });
}

export async function generateAvatar(
  formData: FormData
): Promise<AvatarGenerationResult> {
  const selfieFile = formData.get("selfie") as File | null;
  const userName = formData.get("userName") as string | null;

  if (!selfieFile) {
    return { success: false, error: "No selfie provided" };
  }

  try {
    // Convert file to base64
    const arrayBuffer = await selfieFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = selfieFile.type || "image/jpeg";

    const vertexAI = getVertexAI();

    // Use Gemini to analyze the selfie first for feature extraction
    const geminiModel = vertexAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const analysisPrompt = `Analyze this person's selfie briefly. Describe in 1-2 sentences:
- Hair color and style
- Whether they wear glasses
- Facial hair (if any)
- Skin tone
Be concise and positive!`;

    const analysisResult = await geminiModel.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: analysisPrompt },
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
    });

    const features =
      analysisResult.response.candidates?.[0]?.content?.parts?.[0]?.text ||
      "A friendly person";

    // Try Imagen 3 for avatar generation
    try {
      const imagenModel = vertexAI.preview.getImageGenerationModel({
        model: "imagen-3.0-generate-002",
      });

      const imagePrompt = `A 3D Pixar-style cartoon portrait of a person with these features: ${features}.
Outfit: Festive Christmas golf polo (green with red trim), wearing a Santa hat.
Action: Confidently holding a golden golf club over shoulder, warm friendly smile.
Background: Sunny golf course with Christmas decorations, bokeh lights.
Style: High quality 3D render, Pixar animation style, cute and appealing, cinematic lighting, 4k quality.
The portrait should be head and shoulders, looking at camera.`;

      const imageResult = await imagenModel.generateImages({
        prompt: imagePrompt,
        numberOfImages: 1,
        aspectRatio: "1:1",
        // @ts-expect-error - referenceImages may exist in preview API
        referenceImages: [
          {
            referenceImage: {
              bytesBase64Encoded: base64Image,
            },
            referenceType: "SUBJECT_REFERENCE",
          },
        ],
      });

      if (
        imageResult.images &&
        imageResult.images.length > 0 &&
        imageResult.images[0].bytesBase64Encoded
      ) {
        const generatedImageBase64 = imageResult.images[0].bytesBase64Encoded;
        const dataUrl = `data:image/png;base64,${generatedImageBase64}`;

        return {
          success: true,
          avatarUrl: dataUrl,
          avatarBase64: generatedImageBase64,
          features,
        };
      }
    } catch (imagenError) {
      console.log("Imagen 3 generation failed, trying Gemini:", imagenError);

      // Fallback to Gemini 2.0 Flash with image generation
      try {
        const gemini2Model = vertexAI.getGenerativeModel({
          model: "gemini-2.0-flash-exp",
          generationConfig: {
            // @ts-expect-error - responseModalities for image generation
            responseModalities: ["image", "text"],
          },
        });

        const geminiImagePrompt = `Generate a 3D Pixar-style cartoon avatar portrait based on these features: ${features}

Style requirements:
- Pixar/Disney 3D animation style
- Wearing a Santa hat and Christmas golf polo (green with red trim)
- Holding a golf club confidently
- Warm, friendly smile
- Sunny golf course background with Christmas decorations
- High quality, cute and appealing
- Head and shoulders portrait`;

        const geminiResult = await gemini2Model.generateContent({
          contents: [{ role: "user", parts: [{ text: geminiImagePrompt }] }],
        });

        const response = geminiResult.response;
        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const partAny = part as any;
            if (partAny.inlineData) {
              const imageData = partAny.inlineData.data;
              const imageMimeType = partAny.inlineData.mimeType || "image/png";
              const dataUrl = `data:${imageMimeType};base64,${imageData}`;

              return {
                success: true,
                avatarUrl: dataUrl,
                avatarBase64: imageData,
                features,
              };
            }
          }
        }
      } catch (geminiError) {
        console.log("Gemini image generation failed:", geminiError);
      }
    }

    // Final fallback: DiceBear with analyzed features
    const avatarUrl = generateFallbackAvatar(features, userName || "player");
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
      success: true,
      avatarUrl: fallbackUrl,
      error: `Using fallback: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// Generate fallback avatar using feature analysis
function generateFallbackAvatar(features: string, userName: string): string {
  const featuresLower = features.toLowerCase();

  // Detect key characteristics
  const hasGlasses = featuresLower.includes("glasses");

  // Use a unique seed based on features + name
  const seed = encodeURIComponent(`${userName}-${features.slice(0, 30)}`);

  // Use lorelei style for better looking avatars
  let avatarUrl = `https://api.dicebear.com/9.x/lorelei/svg?seed=${seed}`;
  avatarUrl += `&backgroundColor=c41e3a,228b22&backgroundType=gradientLinear`;

  if (hasGlasses) {
    avatarUrl += `&glasses=variant01,variant02,variant03,variant04,variant05&glassesProbability=100`;
  }

  return avatarUrl;
}
