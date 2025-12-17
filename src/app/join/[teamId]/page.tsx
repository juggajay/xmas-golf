"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useGhostAuth } from "@/hooks/useGhostAuth";
import { useRouter, useParams } from "next/navigation";
import { useState, useRef, useCallback, useEffect } from "react";
import { generateAvatar } from "@/app/actions/generate-avatar";

// Fun loading messages for avatar generation
const LOADING_MESSAGES = [
  "Consulting the Golf Gods...",
  "Measuring your swing potential...",
  "Adding Christmas magic...",
  "Polishing your golf shoes...",
  "Checking the handicap charts...",
  "Warming up the reindeer caddies...",
];

export default function JoinTeam() {
  const params = useParams();
  const teamId = params.teamId as Id<"teams">;
  const router = useRouter();
  const { register, isAuthenticated, isLoading: authLoading } = useGhostAuth();

  const team = useQuery(api.teams.getTeam, { teamId });
  const storeAvatar = useMutation(api.storage.storeAvatarFromUrl);

  const [name, setName] = useState("");
  const [handicap, setHandicap] = useState(18);
  const [selfieData, setSelfieData] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFeatures, setAvatarFeatures] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect if already authenticated (must be in useEffect)
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/play");
    }
  }, [authLoading, isAuthenticated, router]);

  // Cycle through loading messages
  const startLoadingMessages = useCallback(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[index]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const startCamera = useCallback(async () => {
    // Check if mediaDevices API is available (requires HTTPS on mobile)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera not available. Please use HTTPS or try uploading a photo instead.");
      return;
    }

    try {
      // Try to get front-facing camera with ideal settings for selfies
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCapturing(true);
    } catch (err) {
      // Fallback: try any available camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCapturing(true);
      } catch {
        setError("Could not access camera. Please allow camera permissions or try uploading a photo.");
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  const processImageForAvatar = useCallback(
    async (imageDataUrl: string, file?: File) => {
      setIsGeneratingAvatar(true);
      const cleanup = startLoadingMessages();

      try {
        // Create FormData for the server action
        const formData = new FormData();

        if (file) {
          formData.append("selfie", file);
        } else {
          // Convert data URL to blob
          const response = await fetch(imageDataUrl);
          const blob = await response.blob();
          formData.append("selfie", blob, "selfie.jpg");
        }
        formData.append("userName", name);

        // Call the server action
        const result = await generateAvatar(formData);

        if (result.success && result.avatarUrl) {
          setAvatarUrl(result.avatarUrl);
          setAvatarFeatures(result.features || null);
        } else {
          console.error("Avatar generation failed:", result.error);
          // Show error and use fallback
          setAvatarFeatures(`API Error: ${result.error}`);
          const fallbackUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name || "player")}&backgroundColor=c41e3a,228b22&backgroundType=gradientLinear`;
          setAvatarUrl(fallbackUrl);
        }
      } catch (err) {
        console.error("Avatar generation failed:", err);
        // Generate a fallback avatar
        const fallbackUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name || "player")}&backgroundColor=c41e3a,228b22&backgroundType=gradientLinear`;
        setAvatarUrl(fallbackUrl);
      } finally {
        cleanup();
        setIsGeneratingAvatar(false);
      }
    },
    [name, startLoadingMessages]
  );

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      setSelfieData(dataUrl);

      // Convert to file for server action
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
            setSelfieFile(file);
            processImageForAvatar(dataUrl, file);
          }
        },
        "image/jpeg",
        0.8
      );

      stopCamera();
    }
  }, [stopCamera, processImageForAvatar]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setSelfieFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setSelfieData(dataUrl);
        processImageForAvatar(dataUrl, file);
      };
      reader.readAsDataURL(file);
    },
    [processImageForAvatar]
  );

  const retakePhoto = useCallback(() => {
    setSelfieData(null);
    setSelfieFile(null);
    setAvatarUrl(null);
    setAvatarFeatures(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Register the user
      const userId = await register({
        name: name.trim(),
        handicap,
        teamId,
        avatarUrl: avatarUrl || undefined,
      });

      // If we have an avatar URL, save it to Convex
      if (avatarUrl && userId) {
        await storeAvatar({
          userId: userId as Id<"users">,
          avatarUrl,
        });
      }

      router.push("/play");
    } catch (err) {
      setError("Failed to join team. Please try again.");
      setIsSubmitting(false);
    }
  }, [name, handicap, teamId, avatarUrl, register, storeAvatar, router]);

  // ============ CONDITIONAL RETURNS AFTER ALL HOOKS ============

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">⛳</div>
          <p className="text-xl text-white/80">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render form if authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  if (team === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">⛳</div>
          <p className="text-xl text-white/80">Loading team...</p>
        </div>
      </div>
    );
  }

  if (team === null) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card-christmas p-8 text-center max-w-md">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-white mb-2">Team Not Found</h2>
          <p className="text-white/60 mb-4">
            This team doesn&apos;t exist or has been removed.
          </p>
          <button
            onClick={() => router.push("/")}
            className="btn-christmas btn-red"
          >
            Back to Teams
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Fullscreen Camera Overlay */}
      {isCapturing && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Camera View */}
          <div className="flex-1 relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />

            {/* Overlay guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 sm:w-80 sm:h-80 border-4 border-white/30 rounded-full" />
            </div>

            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
              <p className="text-white text-center font-semibold text-lg">
                📸 Take Your Selfie
              </p>
              <p className="text-white/70 text-center text-sm mt-1">
                Position your face in the circle
              </p>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="bg-black/90 p-6 safe-area-bottom">
            <div className="flex items-center justify-center gap-4 sm:gap-6 max-w-md mx-auto px-4">
              <button
                type="button"
                onClick={stopCamera}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 active:bg-white/40 flex items-center justify-center text-white text-xl transition-all"
              >
                ✕
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-white active:bg-white/80 flex items-center justify-center transition-all shadow-lg shadow-white/20"
                style={{ width: '72px', height: '72px' }}
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-black/20" />
              </button>
              <div className="w-12 h-12 sm:w-14 sm:h-14" /> {/* Spacer for balance */}
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push("/")}
          className="text-white/60 hover:text-white mb-6 flex items-center gap-2"
        >
          ← Back to teams
        </button>

        <div className="max-w-md mx-auto">
          {/* Team Header */}
          <div className="card-christmas p-6 mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: team.color }}
              />
              <div>
                <h1 className="font-[var(--font-fredoka)] text-2xl font-bold text-white">
                  Join {team.name}
                </h1>
                <p className="text-white/60 text-sm">
                  {team.members.length} player
                  {team.members.length !== 1 ? "s" : ""} on this team
                </p>
              </div>
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Input */}
            <div className="card-christmas p-6">
              <label className="block text-white/80 text-sm mb-2">
                Your Name
              </label>
              <input
                type="text"
                inputMode="text"
                autoComplete="name"
                autoCapitalize="words"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#d63384] text-base"
                disabled={isSubmitting}
              />
            </div>

            {/* Handicap Input */}
            <div className="card-christmas p-6">
              <label className="block text-white/80 text-sm mb-2">
                Golf Handicap
              </label>
              <div className="flex items-center gap-3 sm:gap-4">
                <input
                  type="range"
                  min="0"
                  max="36"
                  value={handicap}
                  onChange={(e) => setHandicap(Number(e.target.value))}
                  className="flex-1 accent-[#d63384] h-8 sm:h-6"
                  disabled={isSubmitting}
                />
                <span className="text-2xl sm:text-3xl font-bold text-white w-14 text-center flex-shrink-0">
                  {handicap}
                </span>
              </div>
              <p className="text-white/40 text-xs mt-2">
                {handicap === 0
                  ? "Scratch golfer! 🏆"
                  : handicap <= 10
                  ? "Nice! You're pretty good! 👏"
                  : handicap <= 20
                  ? "Average golfer 🏌️"
                  : "We all start somewhere! 😊"}
              </p>
            </div>

            {/* Selfie Capture */}
            <div className="card-christmas p-6">
              <label className="block text-white/80 text-sm mb-2">
                Create Your Avatar
              </label>
              <p className="text-white/40 text-xs mb-4">
                Take a selfie or upload a photo - our AI will create a festive
                golf avatar!
              </p>

              {/* Hidden file input for gallery upload (no capture) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />

              {!selfieData && !isCapturing && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex-1 btn-christmas btn-green flex items-center justify-center gap-2"
                    disabled={isSubmitting}
                  >
                    📸 Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 btn-christmas btn-green flex items-center justify-center gap-2"
                    disabled={isSubmitting}
                  >
                    📁 Upload
                  </button>
                </div>
              )}

              {isCapturing && (
                <div className="text-center text-white/60">
                  <p>Camera is open - see fullscreen view</p>
                </div>
              )}

              {selfieData && (
                <div className="space-y-4">
                  {/* Avatar Generation Loading State */}
                  {isGeneratingAvatar && (
                    <div className="p-6 bg-gradient-to-br from-[#d63384]/20 to-[#0f5132]/20 rounded-xl border border-[#ffd700]/30 text-center">
                      <div className="text-5xl mb-3 animate-bounce">🎅</div>
                      <p className="text-[#ffd700] font-semibold text-lg mb-1">
                        {loadingMessage}
                      </p>
                      <p className="text-white/60 text-sm">
                        Creating your festive avatar...
                      </p>
                      <div className="mt-4 flex justify-center gap-1">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="w-2 h-2 bg-[#ffd700] rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 0.2}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Photo and Avatar Display */}
                  {!isGeneratingAvatar && (
                    <>
                      <div className="flex gap-4">
                        {/* Original selfie */}
                        <div className="flex-1">
                          <p className="text-white/40 text-xs mb-1 text-center">
                            Your Photo
                          </p>
                          <div className="relative rounded-xl overflow-hidden aspect-square border-2 border-white/20">
                            <img
                              src={selfieData}
                              alt="Your selfie"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>

                        {/* Generated avatar */}
                        <div className="flex-1">
                          <p className="text-white/40 text-xs mb-1 text-center">
                            Your Avatar
                          </p>
                          <div className="relative rounded-xl overflow-hidden aspect-square bg-gradient-to-br from-[#c41e3a] to-[#228b22] border-2 border-[#ffd700] shadow-[0_0_15px_rgba(255,215,0,0.3)]">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt="Your avatar"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-4xl">
                                🎅
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* AI analysis */}
                      {avatarFeatures && (
                        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                          <p className="text-[#ffd700] text-xs mb-1 font-semibold">
                            ✨ AI Analysis:
                          </p>
                          <p className="text-white/80 text-sm">{avatarFeatures}</p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={retakePhoto}
                        className="w-full btn-christmas bg-white/20 hover:bg-white/30"
                        disabled={isSubmitting}
                      >
                        🔄 Retake Photo
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="card-christmas p-4 bg-red-500/20 border-red-500/40">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isGeneratingAvatar || !name.trim()}
              className="w-full btn-christmas btn-red text-xl py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⛳</span> Joining the party...
                </span>
              ) : (
                "🎄 Join the Game!"
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
