import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    uid: v.string(), // ID из Clerk или Supabase
    displayName: v.optional(v.string()),
    email: v.optional(v.string()),
    photoURL: v.optional(v.string()),
    primaryChannelId: v.optional(v.string()),
    bio: v.optional(v.string()),
    socialLinks: v.optional(v.any()), // Можно сделать строгую типизацию позже
    isSubscriptionPublic: v.optional(v.boolean()),
    subscribers: v.optional(v.number()),
    ices: v.optional(v.number()),
    createdAt: v.string(),
  }).index("by_uid", ["uid"]),

  channels: defineTable({
    ownerId: v.string(),
    displayName: v.string(),
    photoURL: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    isPrimary: v.optional(v.boolean()),
    subscribers: v.optional(v.number()),
    ices: v.optional(v.number()),
    bio: v.optional(v.string()),
    pseudonym: v.optional(v.string()),
    socialLinks: v.optional(v.any()),
    createdAt: v.string(),
  }).index("by_owner", ["ownerId"]),

  videos: defineTable({
    title: v.string(),
    description: v.string(),
    category: v.string(),
    videoUrl: v.string(),
    thumbnailUrl: v.string(),
    authorId: v.string(),
    authorName: v.string(),
    authorPhotoUrl: v.optional(v.string()),
    views: v.number(),
    likes: v.number(),
    ices: v.number(),
    duration: v.optional(v.string()),
    isShort: v.optional(v.boolean()),
    isMusic: v.optional(v.boolean()),
    isPhoto: v.optional(v.boolean()),
    type: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_author", ["authorId"])
    .index("by_category", ["category"]),

  comments: defineTable({
    videoId: v.string(),
    authorId: v.string(),
    authorName: v.string(),
    authorPhotoUrl: v.optional(v.string()),
    text: v.string(),
    createdAt: v.string(),
    parentId: v.optional(v.string()),
  }).index("by_video", ["videoId"])
    .index("by_author", ["authorId"]),

  notifications: defineTable({
    userId: v.string(),
    fromUserId: v.optional(v.string()),
    fromUserName: v.optional(v.string()),
    fromUserAvatar: v.optional(v.string()),
    type: v.string(),
    videoId: v.optional(v.string()),
    videoTitle: v.optional(v.string()),
    commentText: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.string(),
  }).index("by_user", ["userId"]),
});
