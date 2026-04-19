import { ID, Query, databases, appwriteConfig } from './appwrite';

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
    const queries: any[] = [];
    
    if (options.authorId) {
      queries.push(Query.equal('authorId', options.authorId));
    }
    
    if (options.category && options.category !== 'Все') {
      queries.push(Query.equal('category', options.category));
    }
    
    if (options.isShort !== undefined) queries.push(Query.equal('isShort', options.isShort));
    if (options.isMusic !== undefined) queries.push(Query.equal('isMusic', options.isMusic));
    if (options.isPhoto !== undefined) queries.push(Query.equal('isPhoto', options.isPhoto));
    
    // NOTE: Appwrite's 'search' requires fulltext index on the attributes. 
    // For prototyping we will fetch and filter if there's no index, but let's use equal/startsWith or fetch all for now:
    
    if (options.orderBy === 'views') {
      queries.push(options.orderDirection === 'asc' ? Query.orderAsc('views') : Query.orderDesc('views'));
    } else if (options.orderBy === 'likes') {
      queries.push(options.orderDirection === 'asc' ? Query.orderAsc('likes') : Query.orderDesc('likes'));
    } else {
      queries.push(options.orderDirection === 'asc' ? Query.orderAsc('$createdAt') : Query.orderDesc('$createdAt'));
    }

    if (options.limit) queries.push(Query.limit(options.limit));
    else queries.push(Query.limit(100)); // Appwrite default is 25

    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId, 
        appwriteConfig.videosId,
        queries
      );
      
      let results = response.documents.map(this.mapVideo);
      
      // Client-side search for simplicity if Appwrite indexes aren't fully configured
      if (options.searchQuery && options.searchQuery.trim() !== '') {
        const qs = options.searchQuery.toLowerCase();
        results = results.filter(v => v.title.toLowerCase().includes(qs) || (v.description && v.description.toLowerCase().includes(qs)));
      }
      
      return results;
    } catch (error) {
      console.error("Error fetching videos:", error);
      return [];
    }
  },

  async getVideoById(id: string) {
    const doc = await databases.getDocument(appwriteConfig.databaseId, appwriteConfig.videosId, id);
    return this.mapVideo(doc);
  },

  async getVideosByChannelId(channelId: string) {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId, 
      appwriteConfig.videosId,
      [Query.equal('authorId', channelId), Query.orderDesc('$createdAt'), Query.limit(100)]
    );
    return response.documents.map(this.mapVideo);
  },

  async createVideo(video: any) {
    const docId = video.id || ID.unique();
    const doc = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.videosId,
      docId,
      {
        title: video.title || '',
        description: video.description || '',
        category: video.category || 'Прочее',
        videoUrl: video.videoUrl || '',
        thumbnailUrl: video.thumbnailUrl || '',
        authorId: video.authorId || '',
        authorName: video.authorName || 'Unknown',
        authorPhotoUrl: video.authorPhotoUrl || '',
        duration: video.duration || '0:00',
        isShort: video.isShort || false,
        isMusic: video.isMusic || false,
        isPhoto: video.isPhoto || false,
        views: 0,
        likes: 0,
        ices: 0,
        // hashtags: video.hashtags || []  // Make sure array is created
      }
    );
    return this.mapVideo(doc);
  },

  async updateVideo(id: string, updates: any) {
    const appwriteUpdates: any = {};
    if (updates.title) appwriteUpdates.title = updates.title;
    if (updates.description) appwriteUpdates.description = updates.description;
    if (updates.authorName) appwriteUpdates.authorName = updates.authorName;
    if (updates.authorPhotoUrl) appwriteUpdates.authorPhotoUrl = updates.authorPhotoUrl;
    if (updates.views !== undefined) appwriteUpdates.views = updates.views;
    if (updates.likes !== undefined) appwriteUpdates.likes = updates.likes;
    
    // In Appwrite, you don't need to specify fields that didn't change
    const doc = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.videosId,
      id,
      appwriteUpdates
    );
    return this.mapVideo(doc);
  },

  async deleteVideo(id: string) {
    await databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.videosId, id);
  },

  async incrementViews(videoId: string) {
    try {
      const v = await databases.getDocument(appwriteConfig.databaseId, appwriteConfig.videosId, videoId);
      await databases.updateDocument(appwriteConfig.databaseId, appwriteConfig.videosId, videoId, {
        views: (v.views || 0) + 1
      });
    } catch (e) {
      console.warn("Could not increment views", e);
    }
  },

  // COMMENTS
  async getComments(videoId: string, limitNum: number = 50) {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.commentsId,
        [Query.equal('videoId', videoId), Query.orderDesc('$createdAt'), Query.limit(limitNum)]
      );
      return response.documents.map(this.mapComment);
    } catch(e) {
      return [];
    }
  },

  async getCommentsByVideoIds(videoIds: string[], limitNum: number = 100) {
    if (!videoIds || videoIds.length === 0) return [];
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.commentsId,
        [
          Query.equal('videoId', videoIds), // Appwrite supports array for equal
          Query.orderDesc('$createdAt'),
          Query.limit(limitNum)
        ]
      );
      return response.documents.map(this.mapComment);
    } catch (e) {
      return [];
    }
  },

  async getCommentById(id: string) {
    const doc = await databases.getDocument(appwriteConfig.databaseId, appwriteConfig.commentsId, id);
    return this.mapComment(doc);
  },

  async createComment(comment: any) {
    const doc = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.commentsId,
      ID.unique(),
      {
        videoId: comment.videoId,
        authorId: comment.authorId,
        authorName: comment.authorName,
        authorPhotoUrl: comment.authorPhotoUrl,
        text: comment.text,
        parentId: comment.parentId || ''
      }
    );
    return this.mapComment(doc);
  },

  async deleteComment(id: string) {
    await databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.commentsId, id);
  },

  // CHANNELS
  async getChannels(options: { searchQuery?: string, limit?: number } = {}) {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.channelsId,
        [Query.orderDesc('$createdAt'), Query.limit(options.limit || 50)]
      );
      let chans = response.documents.map(this.mapChannel);
      
      if (options.searchQuery && options.searchQuery.trim() !== '') {
        const qs = options.searchQuery.toLowerCase();
        chans = chans.filter(c => c.displayName.toLowerCase().includes(qs));
      }
      return chans;
    } catch (e) {
      return [];
    }
  },

  async getChannelById(id: string) {
    const doc = await databases.getDocument(appwriteConfig.databaseId, appwriteConfig.channelsId, id);
    return this.mapChannel(doc);
  },

  async getChannelsByOwnerId(ownerId: string) {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.channelsId,
        [Query.equal('ownerId', ownerId)]
      );
      return response.documents.map(this.mapChannel);
    } catch (e) {
      return [];
    }
  },

  async getChannelsByIds(ids: string[]) {
    if (!ids || ids.length === 0) return [];
    try {
      const resp = await databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.channelsId, [Query.equal('$id', ids), Query.limit(100)]);
      return resp.documents.map(this.mapChannel);
    } catch(e) { return []; }
  },

  async getCommunityPostsByAuthorId(authorId: string) {
    try {
      const resp = await databases.listDocuments(appwriteConfig.databaseId, 'community_posts', [Query.equal('authorId', authorId), Query.orderDesc('$createdAt')]);
      return resp.documents.map(this.mapCommunityPost);
    } catch(e) { return []; }
  },

  async createCommunityPost(post: any) {
    try {
      const doc = await databases.createDocument(appwriteConfig.databaseId, 'community_posts', ID.unique(), post);
      return this.mapCommunityPost(doc);
    } catch (e) {
      console.error(e);
      throw e;
    }
  },

  async deleteCommunityPost(id: string) {
    try {
      await databases.deleteDocument(appwriteConfig.databaseId, 'community_posts', id);
    } catch(e) {
      console.error(e);
      throw e;
    }
  },

  async createChannel(channel: any) {
    const doc = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.channelsId,
      channel.id || ID.unique(),
      {
        ownerId: channel.ownerId,
        displayName: channel.displayName,
        photoURL: channel.photoURL || '',
        isPrimary: channel.isPrimary || false,
        subscribers: 0,
        ices: 0,
        bio: channel.bio || ''
      }
    );
    return this.mapChannel(doc);
  },

  async updateChannel(id: string, updates: any) {
    const appwriteUpdates: any = {};
    if (updates.displayName !== undefined) appwriteUpdates.displayName = updates.displayName;
    if (updates.photoURL !== undefined) appwriteUpdates.photoURL = updates.photoURL;
    if (updates.bannerUrl !== undefined) appwriteUpdates.bannerUrl = updates.bannerUrl;
    if (updates.bio !== undefined) appwriteUpdates.bio = updates.bio;
    if (updates.pseudonym !== undefined) appwriteUpdates.pseudonym = updates.pseudonym;
    
    const doc = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.channelsId,
      id,
      appwriteUpdates
    );
    return this.mapChannel(doc);
  },

  async deleteChannel(id: string) {
    await databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.channelsId, id);
  },

  async updateUser(id: string, updates: any) {
    try {
      const doc = await databases.updateDocument(appwriteConfig.databaseId, appwriteConfig.usersId, id, updates);
      return this.mapUser(doc);
    } catch(e) { console.error(e); throw e; }
  },

  async updateChannel(id: string, updates: any) {
    try {
      const doc = await databases.updateDocument(appwriteConfig.databaseId, appwriteConfig.channelsId, id, updates);
      return this.mapChannel(doc);
    } catch(e) { console.error(e); throw e; }
  },
  
  async getSubscriptionsByChannelId(channelId: string) {
    try {
      const resp = await databases.listDocuments(appwriteConfig.databaseId, 'subscriptions', [Query.equal('channelId', channelId), Query.limit(5000)]);
      return resp.documents.map((d: any) => ({ userId: d.userId, channelId: d.channelId }));
    } catch(e) { return []; }
  },

  async getMusicByFingerprint(fingerprint: string) {
    try {
      const resp = await databases.listDocuments(appwriteConfig.databaseId, 'music_registry', [Query.equal('fingerprint', fingerprint)]);
      if (resp.documents.length > 0) return resp.documents[0];
      return null;
    } catch(e) { return null; }
  },

  async createNotification(data: any) {
    try {
      await databases.createDocument(appwriteConfig.databaseId, 'notifications', ID.unique(), data);
    } catch(e) {}
  },
  
  async createMusicRegistryEntity(data: any) {
    try {
      await databases.createDocument(appwriteConfig.databaseId, 'music_registry', ID.unique(), data);
    } catch(e) {}
  },
  
  async updatePlaylist(id: string, updates: any) {
    try {
      await databases.updateDocument(appwriteConfig.databaseId, 'playlists', id, updates);
    } catch(e) {}
  },
  
  async getUsers() {
    try {
      const resp = await databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.usersId, [Query.limit(100)]);
      return resp.documents.map(this.mapUser);
    } catch(e) { return []; }
  },
  async getUserById(id: string) {
    // In Appwrite, UID might just be stored as 'uid' or as the document $id. Assuming $id == uid
    try {
      const doc = await databases.getDocument(appwriteConfig.databaseId, appwriteConfig.usersId, id);
      return this.mapUser(doc);
    } catch (e) {
      // User doc not found
      throw e;
    }
  },

  async updateUser(id: string, updates: any) {
    const appwriteUpdates: any = {};
    if (updates.displayName !== undefined) appwriteUpdates.displayName = updates.displayName;
    if (updates.photoURL !== undefined) appwriteUpdates.photoURL = updates.photoURL;
    if (updates.primaryChannelId !== undefined) appwriteUpdates.primaryChannelId = updates.primaryChannelId;
    if (updates.bio !== undefined) appwriteUpdates.bio = updates.bio;
    if (updates.isSubscriptionPublic !== undefined) appwriteUpdates.isSubscriptionPublic = updates.isSubscriptionPublic;
    
    const doc = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersId,
      id,
      appwriteUpdates
    );
    return this.mapUser(doc);
  },

  async deleteUser(id: string) {
    await databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.usersId, id);
  },

  // ADMIN / STATS Mocks (since we lack aggregation in Appwrite without cloud functions)
  async getStats() {
    return {
      totalChannels: 0,
      totalVideos: 0,
      totalShorts: 0,
      totalMusic: 0,
      totalPhotos: 0,
      onlineNow: Math.floor(Math.random() * 20) + 5
    };
  },

  async checkUserActionState(collectionName: string, queries: any[]) {
    try {
      const resp = await databases.listDocuments(appwriteConfig.databaseId, collectionName, queries);
      if (resp.documents.length > 0) return resp.documents[0];
      return null;
    } catch(e) { return null; }
  },

  async createUserAction(collectionName: string, data: any) {
    try {
      return await databases.createDocument(appwriteConfig.databaseId, collectionName, ID.unique(), data);
    } catch(e) { throw e; }
  },

  async updateUserAction(collectionName: string, docId: string, data: any) {
    try {
      return await databases.updateDocument(appwriteConfig.databaseId, collectionName, docId, data);
    } catch(e) { throw e; }
  },

  async deleteUserAction(collectionName: string, docId: string) {
    try {
      await databases.deleteDocument(appwriteConfig.databaseId, collectionName, docId);
    } catch(e) { throw e; }
  },
  async getModerators() {
    return { moderators: [] };
  },

  async updateAdminSettings(settings: any) {
    // no-op
  },

  // MOCK NOTIFICATIONS & META
  async getNotifications() { return []; },
  async markNotificationAsRead() {},
  async markAllNotificationsAsRead() {},
  async getHiddenChannels() { return []; },
  async hideChannel() {},
  async unhideChannel() {},

  async getFavorites(userId: string) {
    try {
      const resp = await databases.listDocuments(appwriteConfig.databaseId, 'favorites', [Query.equal('userId', userId), Query.orderDesc('$createdAt'), Query.limit(100)]);
      if(resp.documents.length === 0) return [];
      const vidsResponse = await databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.videosId, [Query.equal('$id', resp.documents.map(d => d.videoId))]);
      return resp.documents.map(item => {
        const doc = vidsResponse.documents.find(v => v.$id === item.videoId);
        if(!doc) return null;
        return { ...this.mapVideo(doc), addedAt: new Date(item.$createdAt), favoriteId: item.$id };
      }).filter(v => v !== null) as any[];
    } catch(e) { return []; }
  },
  async getWatchLater(userId: string) {
    try {
      const resp = await databases.listDocuments(appwriteConfig.databaseId, 'watch_later', [Query.equal('userId', userId), Query.orderDesc('$createdAt'), Query.limit(100)]);
      if(resp.documents.length === 0) return [];
      const vidsResponse = await databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.videosId, [Query.equal('$id', resp.documents.map(d => d.videoId))]);
      return resp.documents.map(item => {
        const doc = vidsResponse.documents.find(v => v.$id === item.videoId);
        if(!doc) return null;
        return { ...this.mapVideo(doc), addedAt: new Date(item.$createdAt), watchLaterId: item.$id };
      }).filter(v => v !== null) as any[];
    } catch(e) { return []; }
  },
  async addToWatchLater(userId: string, videoId: string) {
    // Check if exists
    try {
      const existing = await databases.listDocuments(appwriteConfig.databaseId, 'watch_later', [Query.equal('userId', userId), Query.equal('videoId', videoId)]);
      if (existing.total === 0) {
        await databases.createDocument(appwriteConfig.databaseId, 'watch_later', ID.unique(), { userId, videoId });
      }
    } catch(e) {}
  },
  async getHistory(userId: string) {
    try {
      const resp = await databases.listDocuments(appwriteConfig.databaseId, 'history', [Query.equal('userId', userId), Query.orderDesc('$createdAt'), Query.limit(100)]);
      if(resp.documents.length === 0) return [];
      const vidsResponse = await databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.videosId, [Query.equal('$id', resp.documents.map(d => d.videoId))]);
      return resp.documents.map(item => {
        const doc = vidsResponse.documents.find(v => v.$id === item.videoId);
        if(!doc) return null;
        return { ...this.mapVideo(doc), watchedAt: new Date(item.$createdAt), historyId: item.$id };
      }).filter(v => v !== null) as any[];
    } catch(e) { return []; }
  },

  // PLAYLISTS
  async getPlaylistsByAuthorId(authorId: string) {
    try {
      const resp = await databases.listDocuments(appwriteConfig.databaseId, 'playlists', [Query.equal('authorId', authorId), Query.orderDesc('$createdAt'), Query.limit(100)]);
      return resp.documents.map(d => ({
        id: d.$id,
        title: d.title,
        description: d.description,
        privacy: d.privacy,
        authorId: d.authorId,
        videoIds: d.videoIds || [],
        createdAt: d.$createdAt,
        type: d.type
      }));
    } catch(e) { return []; }
  },
  async deletePlaylist(id: string) {
    await databases.deleteDocument(appwriteConfig.databaseId, 'playlists', id);
  },
  async getPlaylistById(id: string) {
    const doc = await databases.getDocument(appwriteConfig.databaseId, 'playlists', id);
    return {
      id: doc.$id,
      title: doc.title,
      description: doc.description,
      privacy: doc.privacy,
      authorId: doc.authorId,
      videoIds: doc.videoIds || [],
      createdAt: doc.$createdAt,
      type: doc.type
    };
  },
  async getVideosByIds(ids: string[]) {
    if(!ids || ids.length === 0) return [];
    try {
      // Using Queries to get multiple IDs
      const resp = await databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.videosId, [Query.equal('$id', ids), Query.limit(100)]);
      return resp.documents.map(this.mapVideo);
    } catch(e) { return []; }
  },

  mapVideo(v: any): Video {
    return {
      id: v.$id,
      title: v.title || '',
      description: v.description || '',
      category: v.category || '',
      videoUrl: v.videoUrl || '',
      thumbnailUrl: v.thumbnailUrl || '',
      authorId: v.authorId || '',
      authorName: v.authorName || 'Unknown',
      authorPhotoUrl: v.authorPhotoUrl || '',
      views: v.views || 0,
      likes: v.likes || 0,
      ices: v.ices || 0,
      duration: v.duration || '0:00',
      hashtags: v.hashtags || [],
      isShort: !!v.isShort,
      isMusic: !!v.isMusic,
      isPhoto: !!v.isPhoto,
      createdAt: v.$createdAt
    };
  },

  mapChannel(c: any) {
    return {
      id: c.$id,
      ownerId: c.ownerId,
      displayName: c.displayName || 'Unknown',
      photoURL: c.photoURL || '',
      bannerUrl: c.bannerUrl || '',
      isPrimary: !!c.isPrimary,
      subscribers: c.subscribers || 0,
      ices: c.ices || 0,
      competitors: [],
      pinnedAchievements: [],
      isBanned: false,
      bio: c.bio || '',
      pseudonym: c.pseudonym || '',
      searchAliases: [],
      socialLinks: {},
      homeLayout: ['videos', 'shorts', 'music', 'photos'],
      createdAt: c.$createdAt
    };
  },

  mapComment(c: any) {
    return {
      id: c.$id,
      videoId: c.videoId,
      authorId: c.authorId,
      authorName: c.authorName || 'Unknown',
      authorPhotoUrl: c.authorPhotoUrl || '',
      text: c.text || '',
      createdAt: c.$createdAt,
      parentId: c.parentId || null,
      authorHearted: !!c.authorHearted
    };
  },

  mapUser(u: any) {
    return {
      uid: u.$id, // or u.uid
      displayName: u.displayName || 'User',
      email: u.email || '',
      photoURL: u.photoURL || '',
      primaryChannelId: u.primaryChannelId,
      bio: u.bio || '',
      socialLinks: {},
      isSubscriptionPublic: u.isSubscriptionPublic !== false,
      subscribers: u.subscribers || 0,
      ices: u.ices || 0,
      createdAt: u.$createdAt
    };
  }
};
