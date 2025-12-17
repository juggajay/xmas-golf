"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "merry_mulligan_user_id";

export type GhostUser = {
  _id: Id<"users">;
  name: string;
  handicap: number;
  teamId: Id<"teams">;
  avatarUrl?: string;
  role: "captain" | "player";
  hasSnake: boolean;
  team: {
    _id: Id<"teams">;
    name: string;
    color: string;
  } | null;
};

export function useGhostAuth() {
  const [storedUserId, setStoredUserId] = useState<Id<"users"> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user ID from localStorage on mount
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setStoredUserId(stored as Id<"users">);
        }
      }
    } catch (err) {
      // localStorage not available or error
      console.error("localStorage error:", err);
    }
    setIsLoading(false);
  }, []);

  // Fetch user data from Convex
  const user = useQuery(
    api.users.getUserSafe,
    storedUserId ? { userId: storedUserId } : { userId: undefined }
  );

  // Create user mutation
  const createUserMutation = useMutation(api.users.createUser);

  // Register a new ghost user
  const register = useCallback(
    async (data: {
      name: string;
      handicap: number;
      teamId: Id<"teams">;
      avatarUrl?: string;
      avatarStorageId?: Id<"_storage">;
    }) => {
      const userId = await createUserMutation(data);

      // Store in localStorage
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, userId);
        }
      } catch (err) {
        console.error("localStorage setItem error:", err);
      }
      setStoredUserId(userId);

      return userId;
    },
    [createUserMutation]
  );

  // Log out (clear localStorage)
  const logout = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.error("localStorage removeItem error:", err);
    }
    setStoredUserId(null);
  }, []);

  // Check if user is a captain
  const isCaptain = user?.role === "captain";

  // Check if user has the snake
  const hasSnake = user?.hasSnake ?? false;

  return {
    user: user as GhostUser | null | undefined,
    userId: storedUserId,
    isLoading: isLoading || user === undefined,
    isAuthenticated: !!user,
    isCaptain,
    hasSnake,
    register,
    logout,
  };
}

// Hook to get just the user ID from localStorage (client-side only)
export function getStoredUserId(): Id<"users"> | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored as Id<"users"> | null;
  } catch {
    return null;
  }
}

// Utility to clear session (client-side only)
export function clearGhostSession() {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore localStorage errors
  }
}
