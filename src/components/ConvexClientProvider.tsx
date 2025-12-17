"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useRef, useState, useEffect } from "react";

// Create client outside component to avoid re-creation, but only on client
let globalClient: ConvexReactClient | null = null;

function getConvexClient(): ConvexReactClient | null {
  if (typeof window === "undefined") return null;

  if (!globalClient) {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
      console.error("NEXT_PUBLIC_CONVEX_URL is not set");
      return null;
    }
    globalClient = new ConvexReactClient(url.trim());
  }
  return globalClient;
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ConvexReactClient | null>(null);

  useEffect(() => {
    // Only create client on mount (client-side only)
    const convexClient = getConvexClient();
    setClient(convexClient);
  }, []);

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">⛳</div>
          <p className="text-xl text-white/80">Loading...</p>
        </div>
      </div>
    );
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
