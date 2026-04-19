import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Получить все видео
export const getVideos = query({
  args: { 
    category: v.optional(v.string()),
    authorId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    let videos = await ctx.db.query("videos").order("desc").collect();
    
    if (args.authorId) {
      videos = videos.filter(v => v.authorId === args.authorId);
    }
    
    if (args.category && args.category !== 'Все') {
      videos = videos.filter(v => v.category === args.category);
    }
    
    return videos;
  },
});

// Добавить видео
export const createVideo = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    videoUrl: v.string(),
    thumbnailUrl: v.string(),
    authorId: v.string(),
    authorName: v.string(),
    authorPhotoUrl: v.optional(v.string()),
    duration: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("videos", {
      ...args,
      views: 0,
      likes: 0,
      ices: 0,
      isShort: false,
      isMusic: false,
      isPhoto: false,
      createdAt: new Date().toISOString(),
    });
  },
});

export const incrementViews = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (video) {
      await ctx.db.patch(args.videoId, { views: video.views + 1 });
    }
  },
});
