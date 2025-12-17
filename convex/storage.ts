import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate an upload URL for client-side uploads
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Get a URL for a stored file
export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Save avatar to user profile after upload
export const saveAvatarToUser = mutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    // Get the URL for the stored file
    const avatarUrl = await ctx.storage.getUrl(args.storageId);

    if (!avatarUrl) {
      throw new Error("Failed to get avatar URL");
    }

    // Update user with avatar
    await ctx.db.patch(args.userId, {
      avatarStorageId: args.storageId,
      avatarUrl: avatarUrl,
    });

    return { success: true, avatarUrl };
  },
});

// Upload avatar from base64 (server-side)
export const storeAvatarFromUrl = mutation({
  args: {
    userId: v.id("users"),
    avatarUrl: v.string(),
  },
  handler: async (ctx, args) => {
    // Just save the URL directly (for external URLs like DiceBear)
    await ctx.db.patch(args.userId, {
      avatarUrl: args.avatarUrl,
    });

    return { success: true, avatarUrl: args.avatarUrl };
  },
});

// Delete a stored file
export const deleteFile = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId);
    return { success: true };
  },
});
