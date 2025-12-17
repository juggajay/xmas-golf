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
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setStoredUserId(stored as Id<"users">);
      } catch {
        // Invalid stored value, clear it
        localStorage.removeItem(STORAGE_KEY);
      }
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
      localStorage.setItem(STORAGE_KEY, userId);
      setStoredUserId(userId);

      return userId;
    },
    [createUserMutation]
  );

  // Log out (clear localStorage)
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
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

// Hook to get just the user ID from localStorage (for server components)
export function getStoredUserId(): Id<"users"> | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(STORAGE_KEY);
  return stored as Id<"users"> | null;
}

// Utility to clear session
export function clearGhostSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
