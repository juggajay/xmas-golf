"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useRef, useState, useEffect } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<ConvexReactClient | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Only runs on client after hydration
    if (!clientRef.current) {
      const url = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (url) {
        clientRef.current = new ConvexReactClient(url.trim());
      }
    }
    setIsReady(true);
  }, []);

  // Always render same structure for hydration matching
  if (!isReady || !clientRef.current) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">⛳</div>
          <p className="text-xl text-white/80">Loading...</p>
        </div>
      </div>
    );
  }

  return <ConvexProvider client={clientRef.current}>{children}</ConvexProvider>;
}
