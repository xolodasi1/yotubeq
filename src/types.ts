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
  createdAt: any; // Timestamp
  category: string;
  duration: string;
}

export type VideoType = Video;

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  subscribers: number;
  bio: string;
  joinedAt: any;
}

export interface Comment {
  id: string;
  videoId: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl: string;
  text: string;
  createdAt: any;
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
