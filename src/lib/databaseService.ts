import { supabase } from './supabase';

export interface Video {
  id: string;
  title: string;
  description: string;
  category: string;
  videoUrl: string;
  thumbnailUrl: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl: string;
  views: number;
  likes: number;
  ices: number;
  duration: string;
  soundName?: string;
  hashtags?: string[];
  isShort?: boolean;
  isMusic?: boolean;
  isPhoto?: boolean;
  type?: string;
  musicMetadata?: any;
  recommendationScore?: number;
  createdAt: string;
}

export const databaseService = {
  // VIDEOS
  async getVideos(options: { 
    category?: string, 
    limit?: number, 
    isShort?: boolean, 
    isMusic?: boolean, 
    isPhoto?: boolean,
    searchQuery?: string,
    authorId?: string,
    orderBy?: 'created_at' | 'views' | 'likes',
    orderDirection?: 'asc' | 'desc'
  } = {}) {
    let query = supabase.from('videos').select('*');
    
    if (options.authorId) {
      query = query.eq('author_id', options.authorId);
    }
    
    if (options.category && options.category !== 'Все') {
      query = query.eq('category', options.category);
    }
    
    if (options.isShort !== undefined) query = query.eq('is_short', options.isShort);
    if (options.isMusic !== undefined) query = query.eq('is_music', options.isMusic);
    if (options.isPhoto !== undefined) query = query.eq('is_photo', options.isPhoto);
    
    if (options.searchQuery) {
      query = query.or(`title.ilike.%${options.searchQuery}%,description.ilike.%${options.searchQuery}%`);
    }

    query = query.order(options.orderBy || 'created_at', { ascending: options.orderDirection === 'asc' });
    
    if (options.limit) query = query.limit(options.limit);
    
    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map(this.mapVideo);
  },

  async getVideoById(id: string) {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return this.mapVideo(data);
  },

  async getVideosByChannelId(channelId: string) {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('author_id', channelId);
    
    if (error) throw error;
    return (data || []).map(this.mapVideo);
  },

  async createVideo(video: any) {
    const { data, error } = await supabase
      .from('videos')
      .insert({
        id: video.id || crypto.randomUUID(),
        title: video.title,
        description: video.description,
        category: video.category,
        video_url: video.videoUrl,
        thumbnail_url: video.thumbnailUrl,
        author_id: video.authorId,
        author_name: video.authorName,
        author_photo_url: video.authorPhotoUrl,
        duration: video.duration,
        is_short: video.isShort || false,
        is_music: video.isMusic || false,
        is_photo: video.isPhoto || false,
        sound_name: video.soundName,
        hashtags: video.hashtags,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return this.mapVideo(data);
  },

  async updateVideo(id: string, updates: any) {
    const supabaseUpdates: any = {};
    if (updates.title) supabaseUpdates.title = updates.title;
    if (updates.description) supabaseUpdates.description = updates.description;
    if (updates.authorName) supabaseUpdates.author_name = updates.authorName;
    if (updates.authorPhotoUrl) supabaseUpdates.author_photo_url = updates.authorPhotoUrl;
    if (updates.views !== undefined) supabaseUpdates.views = updates.views;
    if (updates.likes !== undefined) supabaseUpdates.likes = updates.likes;
    
    const { data, error } = await supabase
      .from('videos')
      .update(supabaseUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return this.mapVideo(data);
  },

  async deleteVideo(id: string) {
    const { error } = await supabase.from('videos').delete().eq('id', id);
    if (error) throw error;
  },

  async incrementViews(videoId: string) {
    const { data: current } = await supabase.from('videos').select('views').eq('id', videoId).single();
    if (current) {
      await supabase.from('videos').update({ views: (current.views || 0) + 1 }).eq('id', videoId);
    }
  },

  // COMMENTS
  async getComments(videoId: string, limitNum: number = 50) {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false })
      .limit(limitNum);
    
    if (error) throw error;
    return (data || []).map(this.mapComment);
  },

  async getCommentsByVideoIds(videoIds: string[], limitNum: number = 100) {
    if (videoIds.length === 0) return [];
    
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .in('video_id', videoIds)
      .order('created_at', { ascending: false })
      .limit(limitNum);
    
    if (error) throw error;
    return (data || []).map(this.mapComment);
  },

  async getCommentById(id: string) {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return this.mapComment(data);
  },

  async createComment(comment: any) {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        video_id: comment.videoId,
        author_id: comment.authorId,
        author_name: comment.authorName,
        author_photo_url: comment.authorPhotoUrl,
        text: comment.text,
        parent_id: comment.parentId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return this.mapComment(data);
  },

  async deleteComment(id: string) {
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (error) throw error;
  },

  // CHANNELS
  async getChannels(options: { searchQuery?: string, limit?: number } = {}) {
    let query = supabase.from('channels').select('*');
    
    if (options.searchQuery) {
      query = query.ilike('display_name', `%${options.searchQuery}%`);
    }
    
    if (options.limit) query = query.limit(options.limit);
    
    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map(this.mapChannel);
  },

  async getChannelById(id: string) {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return this.mapChannel(data);
  },

  async getChannelsByOwnerId(ownerId: string) {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .eq('owner_id', ownerId);
    if (error) throw error;
    return (data || []).map(this.mapChannel);
  },

  async createChannel(channel: any) {
    const { data, error } = await supabase
      .from('channels')
      .insert({
        id: channel.id || crypto.randomUUID(),
        owner_id: channel.ownerId,
        display_name: channel.displayName,
        photo_url: channel.photoURL,
        is_primary: channel.isPrimary || false,
        subscribers: 0,
        ices: 0,
        bio: channel.bio || '',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return this.mapChannel(data);
  },

  async updateChannel(id: string, updates: any) {
    const supabaseUpdates: any = {};
    if (updates.displayName) supabaseUpdates.display_name = updates.displayName;
    if (updates.photoURL) supabaseUpdates.photo_url = updates.photoURL;
    if (updates.bannerUrl) supabaseUpdates.banner_url = updates.bannerUrl;
    if (updates.bio !== undefined) supabaseUpdates.bio = updates.bio;
    if (updates.socialLinks) supabaseUpdates.social_links = updates.socialLinks;
    if (updates.homeLayout) supabaseUpdates.home_layout = updates.homeLayout;
    if (updates.pseudonym) supabaseUpdates.pseudonym = updates.pseudonym;
    if (updates.searchAliases) supabaseUpdates.search_aliases = updates.searchAliases;
    
    const { data, error } = await supabase
      .from('channels')
      .update(supabaseUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return this.mapChannel(data);
  },

  async deleteChannel(id: string) {
    const { error } = await supabase.from('channels').delete().eq('id', id);
    if (error) throw error;
  },

  // USERS
  async getUserById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return this.mapUser(data);
  },

  async updateUser(id: string, updates: any) {
    const supabaseUpdates: any = {};
    if (updates.displayName) supabaseUpdates.display_name = updates.displayName;
    if (updates.photoURL) supabaseUpdates.photo_url = updates.photoURL;
    if (updates.primaryChannelId) supabaseUpdates.primary_channel_id = updates.primaryChannelId;
    
    const { data, error } = await supabase
      .from('users')
      .update(supabaseUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return this.mapUser(data);
  },

  async deleteUser(id: string) {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
  },

  // ADMIN / STATS
  async getStats() {
    const [
      { count: totalChannels },
      { count: totalVideos },
      { count: totalShorts },
      { count: totalMusic },
      { count: totalPhotos }
    ] = await Promise.all([
      supabase.from('channels').select('*', { count: 'exact', head: true }),
      supabase.from('videos').select('*', { count: 'exact', head: true }).eq('type', 'video'),
      supabase.from('videos').select('*', { count: 'exact', head: true }).eq('type', 'short'),
      supabase.from('videos').select('*', { count: 'exact', head: true }).eq('is_music', true),
      supabase.from('videos').select('*', { count: 'exact', head: true }).eq('type', 'photo')
    ]);

    return {
      totalChannels: totalChannels || 0,
      totalVideos: totalVideos || 0,
      totalShorts: totalShorts || 0,
      totalMusic: totalMusic || 0,
      totalPhotos: totalPhotos || 0,
      onlineNow: Math.floor(Math.random() * 20) + 5 // Placeholder for real-time online
    };
  },

  async getAdminSettings() {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('key', 'general')
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data?.value || { moderators: [] };
  },

  async updateAdminSettings(settings: any) {
    const { error } = await supabase
      .from('admin_settings')
      .upsert({ key: 'general', value: settings });
    
    if (error) throw error;
  },

  // NOTIFICATIONS
  async getNotifications(userId: string, limitNum: number = 50) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(limitNum);
    
    if (error) throw error;
    return (data || []).map(this.mapNotification);
  },

  async markNotificationAsRead(id: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (error) throw error;
  },

  async markAllNotificationsAsRead(userId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    if (error) throw error;
  },

  // USER PREFERENCES / LISTS
  async getHiddenChannels(userId: string) {
    const { data, error } = await supabase
      .from('hidden_channels')
      .select('*, channels(*)')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return (data || []).map(item => {
      const channelData = item.channels;
      return {
        id: item.id,
        channelId: item.channel_id,
        displayName: channelData?.display_name || 'Неизвестный канал',
        photoURL: channelData?.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.channel_id}`,
        addedAt: item.created_at
      };
    });
  },

  async unhideChannel(id: string) {
    const { error } = await supabase
      .from('hidden_channels')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async hideChannel(userId: string, channelId: string) {
    const { error } = await supabase
      .from('hidden_channels')
      .upsert({
        user_id: userId,
        channel_id: channelId,
        added_at: new Date().toISOString()
      });
    if (error) throw error;
  },

  async addToWatchLater(userId: string, videoId: string) {
    const { error } = await supabase
      .from('watch_later')
      .upsert({
        user_id: userId,
        video_id: videoId,
        added_at: new Date().toISOString()
      });
    if (error) throw error;
  },

  // HELPERS
  mapVideo(v: any): Video {
    return {
      id: v.id,
      title: v.title,
      description: v.description,
      category: v.category,
      videoUrl: v.video_url,
      thumbnailUrl: v.thumbnail_url,
      authorId: v.author_id,
      authorName: v.author_name,
      authorPhotoUrl: v.author_photo_url,
      views: v.views || 0,
      likes: v.likes || 0,
      ices: v.ices || 0,
      duration: v.duration,
      soundName: v.sound_name,
      hashtags: v.hashtags,
      isShort: v.is_short,
      isMusic: v.is_music,
      isPhoto: v.is_photo,
      musicMetadata: v.music_metadata,
      recommendationScore: v.recommendation_score,
      createdAt: v.created_at
    };
  },

  mapChannel(c: any) {
    return {
      id: c.id,
      ownerId: c.owner_id,
      displayName: c.display_name,
      photoURL: c.photo_url,
      bannerUrl: c.banner_url || c.banner_URL,
      isPrimary: c.is_primary,
      subscribers: c.subscribers || 0,
      ices: c.ices || 0,
      competitors: c.competitors || [],
      pinnedAchievements: c.pinned_achievements || [],
      isBanned: c.is_banned,
      bio: c.bio,
      pseudonym: c.pseudonym,
      searchAliases: c.search_aliases || [],
      socialLinks: c.social_links || {},
      homeLayout: c.home_layout || ['videos', 'shorts', 'music', 'photos'],
      createdAt: c.created_at
    };
  },

  mapComment(c: any) {
    return {
      id: c.id,
      videoId: c.video_id,
      authorId: c.author_id,
      authorName: c.author_name,
      authorPhotoUrl: c.author_photo_url,
      text: c.text,
      createdAt: c.created_at,
      parentId: c.parent_id,
      authorHearted: c.author_hearted
    };
  },

  mapUser(u: any) {
    return {
      uid: u.id,
      displayName: u.display_name,
      email: u.email,
      photoURL: u.photo_url,
      primaryChannelId: u.primary_channel_id,
      subscribers: u.subscribers || 0,
      ices: u.ices || 0,
      createdAt: u.created_at
    };
  },

  mapNotification(n: any) {
    return {
      id: n.id,
      userId: n.user_id,
      fromUserId: n.from_user_id,
      fromUserName: n.from_user_name,
      fromUserAvatar: n.from_user_avatar,
      type: n.type,
      videoId: n.video_id,
      videoTitle: n.video_title,
      commentText: n.comment_text,
      read: n.read,
      createdAt: n.created_at
    };
  },

  mapCommunityPost(d: any) {
    return {
      id: d.id,
      authorId: d.author_id,
      authorName: d.author_name,
      authorPhotoUrl: d.author_photo_url,
      text: d.text,
      type: d.type,
      likes: d.likes || 0,
      createdAt: d.created_at,
      options: d.options,
      votes: d.votes
    };
  }
};
