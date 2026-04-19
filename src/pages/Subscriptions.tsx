import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import VideoCard from '../components/VideoCard';
import ShortCard from '../components/ShortCard';
import { VideoType, UserType } from '../types';
import { Loader2, Users, Bell, Video, Music, Smartphone, Camera } from 'lucide-react';
import { appwriteClient, appwriteConfig } from '../lib/appwrite';
import { databaseService } from '../lib/databaseService';
import { Query } from 'appwrite';
// Supabase refactored
import { Link } from 'react-router-dom';

export default function Subscriptions() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<UserType[]>([]);
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'video' | 'short' | 'music' | 'photo'>('video');

  useEffect(() => {
    if (!user) return;

    const fetchSubscriptions = async () => {
      try {
        setLoading(true);
        const subData = await databaseService.getDocumentsByQuery('subscriptions', [Query.equal('userId', user.uid)]);
        
        const channelIds = (subData || []).map(d => d.channelId);
        
        if (channelIds.length === 0) {
          setLoading(false);
          return;
        }

        // Fetch channel info
        // We will fetch channels one by one or using batch if Appwrite supports it. For now, max 10 can be done easily via Query.equal on a loop or array
        const channelData = await databaseService.getChannelsByIds(channelIds);

        setChannels((channelData || []).map(data => ({
          uid: data.id || data.$id,
          email: '',
          joinedAt: data.createdAt,
          displayName: data.displayName || data.title,
          photoURL: data.photoUrl || data.logoUrl,
          pseudonym: data.pseudonym,
          bio: data.bio,
          subscribers: data.subscribers
        } as UserType)));

        // Fetch videos from these channels
        // Since appwrite doesn't support "in" natively for many items, we query up to 10 or 20 and merge or we can use Query.contains/Query.equal
        const queries = [
           Query.equal('type', activeTab),
           Query.orderDesc('createdAt'),
           Query.limit(30)
        ];
        // Note: For simplicity if channelIds has too many, it might fail. Better to map arrays in a custom method if needed, but Query.contains or just fetch all videos over an index.
        // As a workaround here, we'll fetch videos by activeTab and filter them client-side if "in" is not supported by custom function.
        // In a real app we would use custom logic. I'll rely on Appwrite's client or a small fetch.
        let videosData = await databaseService.getVideos({ queries });
        // Filter by channelIds
        videosData = videosData.filter(v => channelIds.includes(v.authorId));

        setVideos(videosData as any);

      } catch (error) {
        console.error("Error fetching subscriptions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, [user, activeTab]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-gray-400">
        <h2 className="text-2xl font-bold mb-4 text-blue-900">Войдите, чтобы видеть подписки</h2>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Users className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl md:text-3xl font-bold text-blue-900">Подписки</h1>
      </div>

      {channels.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-6 mb-8 scrollbar-hide border-b border-[var(--border)]">
          {channels.map(channel => (
            <Link key={channel.uid} to={`/channel/${channel.uid}`} className="flex flex-col items-center gap-2 min-w-[80px] group">
              <img 
                src={channel.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${channel.uid}`} 
                className="w-14 h-14 rounded-full border-2 border-gray-200 group-hover:border-blue-500 transition-all" 
                alt={channel.displayName} 
              />
              <span className="text-xs text-center line-clamp-1 w-full font-medium">{channel.displayName}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="flex gap-4 border-b border-[var(--border)] mb-8 overflow-x-auto scrollbar-hide">
        {[
          { id: 'video', label: 'Видео', icon: Video },
          { id: 'short', label: 'Shorts', icon: Smartphone },
          { id: 'music', label: 'Музыка', icon: Music },
          { id: 'photo', label: 'Фото', icon: Camera },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 pb-4 border-b-2 font-bold text-sm uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-20 text-ice-muted">
          <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg">В этой категории пока нет нового контента от ваших подписок.</p>
        </div>
      ) : (
        <div className={activeTab === 'short' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"}>
          {videos.map((video) => (
            activeTab === 'short' ? <ShortCard video={video} /> : <VideoCard video={video} />
          ))}
        </div>
      )}
    </div>
  );
}
