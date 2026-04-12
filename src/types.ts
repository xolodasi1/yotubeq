export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  authorId: string; // This will now be the channelId
  authorName: string;
  authorPhotoUrl: string;
  views: number;
  likes: number;
  dislikes: number;
  ices?: number;
  createdAt: any; // Timestamp
  category: string;
  duration: string;
  isShort?: boolean;
  isMusic?: boolean;
  isPhoto?: boolean;
  type?: 'video' | 'short' | 'music' | 'photo';
  soundName?: string;
  hashtags?: string[];
  audience?: 'kids' | 'not-kids';
  visibility?: 'public' | 'unlisted' | 'private';
  musicMetadata?: {
    author?: string;
    composer?: string;
    performer?: string;
    otherParticipants?: string;
    album?: string;
    releaseYear?: string;
  };
}

export type VideoType = Video;

export interface Channel {
  id: string;
  ownerId: string; // The user's UID
  displayName: string;
  photoURL: string;
  bannerUrl?: string;
  subscribers: number;
  bio: string;
  isPrimary: boolean;
  createdAt: any;
  pseudonym?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  bannerUrl?: string;
  subscribers: number; // For backward compatibility or if we treat the user as a channel too
  photosCount?: number;
  bio: string;
  joinedAt: any;
  lastPostAt?: any;
  socialLinks?: {
    website?: string;
    telegram?: string;
    vk?: string;
    instagram?: string;
  };
  primaryChannelId?: string;
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
