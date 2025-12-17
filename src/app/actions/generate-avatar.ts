"use server";

import { GoogleAuth } from "google-auth-library";

export interface AvatarGenerationResult {
  success: boolean;
  avatarUrl?: string;
  avatarBase64?: string;
  features?: string;
  error?: string;
}

async function getAccessToken() {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (!credentialsJson) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON is not set");
  }

  const credentials = JSON.parse(credentialsJson);

  const auth = new GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return { token: token.token, projectId: credentials.project_id };
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

    const { token, projectId } = await getAccessToken();

    // Imagen 3 REST API endpoint
    const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-generate-002:predict`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: `A 3D Pixar-style rendering of this person. Maintain exact facial structure, eye shape, and nose. Outfit: Red and green Christmas golf polo, santa hat. Action: Holding a golden golf club, confident smile. Background: High-end golf course, sunny day. Style: 8k, cinematic lighting, cute but realistic likeness.`,
            referenceImages: [
              {
                referenceImage: {
                  bytesBase64Encoded: base64Image,
                },
                referenceType: 2, // SUBJECT_REFERENCE
              },
            ],
          },
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: "1:1",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Imagen API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.predictions?.[0]?.bytesBase64Encoded) {
      throw new Error("No image generated");
    }

    const generatedImageBase64 = result.predictions[0].bytesBase64Encoded;
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
