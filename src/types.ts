export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl: string;
  views: number;
  likes: number;
  ices?: number;
  createdAt: any; // Timestamp
  category: string;
  duration: string;
  isShort?: boolean;
  isMusic?: boolean;
  isPhoto?: boolean;
  type?: 'video' | 'short' | 'music' | 'photo';
}

export type VideoType = Video;

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  bannerUrl?: string;
  subscribers: number;
  photosCount?: number;
  bio: string;
  joinedAt: any;
  socialLinks?: {
    website?: string;
    telegram?: string;
    vk?: string;
    instagram?: string;
  };
}

export type UserType = UserProfile;

export interface Comment {
  id: string;
  videoId: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl: string;
  text: string;
  createdAt: any;
  parentId?: string;
  likes?: number;
  dislikes?: number;
  isEdited?: boolean;
  authorHearted?: boolean;
}

export interface SubscriptionType {
  id: string; // subscriberId_channelId
  subscriberId: string;
  channelId: string;
  createdAt: any;
}

export interface VideoLikeType {
  id: string; // userId_videoId
  userId: string;
  videoId: string;
  type: 'like' | 'dislike';
}

export interface Playlist {
  id: string;
  title: string;
  authorId: string;
  videoIds: string[];
  visibility?: 'public' | 'private';
  createdAt: any;
  type?: 'video' | 'short' | 'music' | 'photo';
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl: string;
  text: string;
  type: 'text' | 'poll';
  pollOptions?: { text: string; votes: number; voters: string[] }[];
  createdAt: any;
  likes: number;
}

export interface HistoryItem {
  id: string; // userId_videoId
  userId: string;
  videoId: string;
  watchedAt: any;
}

export interface WatchLaterItem {
  id: string; // userId_videoId
  userId: string;
  videoId: string;
  addedAt: any;
}

export interface FavoriteItem {
  id: string; // userId_videoId
  userId: string;
  videoId: string;
  addedAt: any;
}

export interface CommentAction {
  id: string; // userId_commentId
  userId: string;
  commentId: string;
  type: 'like' | 'dislike';
}
