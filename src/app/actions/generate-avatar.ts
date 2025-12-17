"use server";

import { VertexAI } from "@google-cloud/vertexai";

export interface AvatarGenerationResult {
  success: boolean;
  avatarUrl?: string;
  avatarBase64?: string;
  features?: string;
  error?: string;
}

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

  if (!selfieFile) {
    return { success: false, error: "No selfie provided" };
  }

  try {
    const arrayBuffer = await selfieFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    const vertexAI = getVertexAI();

    // Imagen 3 (Nano Banana Pro)
    const imagenModel = vertexAI.preview.getImageGenerationModel({
      model: "imagen-3.0-generate-002",
    });

    const result = await imagenModel.generateImages({
      prompt: `A 3D Pixar-style rendering of this person. Maintain exact facial structure, eye shape, and nose. Outfit: Red and green Christmas golf polo, santa hat. Action: Holding a golden golf club, confident smile. Background: High-end golf course, sunny day. Style: 8k, cinematic lighting, cute but realistic likeness.`,
      numberOfImages: 1,
      aspectRatio: "1:1",
      // @ts-expect-error - Subject Reference for face cloning
      referenceImages: [
        {
          referenceImage: {
            bytesBase64Encoded: base64Image,
          },
          referenceType: "SUBJECT_REFERENCE",
        },
      ],
    });

    if (!result.images?.[0]?.bytesBase64Encoded) {
      throw new Error("No image generated");
    }

    const generatedImageBase64 = result.images[0].bytesBase64Encoded;
    const dataUrl = `data:image/png;base64,${generatedImageBase64}`;

    return {
      success: true,
      avatarUrl: dataUrl,
      avatarBase64: generatedImageBase64,
    };
  } catch (error) {
    console.error("Imagen 3 generation failed:", error);
    return {
      success: false,
      error: `Failed to generate avatar: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
