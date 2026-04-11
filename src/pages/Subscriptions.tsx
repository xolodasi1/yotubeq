import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import VideoCard from '../components/VideoCard';
import { VideoType, UserType } from '../types';
import { Loader2, Users, Bell } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc, limit } from 'firebase/firestore';
import { Link } from 'react-router-dom';

export default function Subscriptions() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<UserType[]>([]);
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchSubscriptions = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'subscriptions'), where('subscriberId', '==', user.uid));
        const snap = await getDocs(q);
        
        const channelIds = snap.docs.map(d => d.data().channelId);
        
        if (channelIds.length === 0) {
          setLoading(false);
          return;
        }

        // Fetch channel info
        const channelPromises = channelIds.map(id => getDoc(doc(db, 'users', id)));
        const channelSnaps = await Promise.all(channelPromises);
        setChannels(channelSnaps.filter(s => s.exists()).map(s => s.data() as UserType));

        // Fetch videos from these channels
        const videosQ = query(
          collection(db, 'videos'), 
          where('authorId', 'in', channelIds.slice(0, 10)), // Firestore limit for 'in'
          orderBy('createdAt', 'desc'),
          limit(30)
        );
        const videosSnap = await getDocs(videosQ);
        setVideos(videosSnap.docs.map(d => ({
          ...d.data(),
          createdAt: d.data().createdAt?.toDate()?.toISOString()
        })) as VideoType[]);

      } catch (error) {
        console.error("Error fetching subscriptions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, [user]);

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
        <div className="flex gap-4 overflow-x-auto pb-6 mb-8 scrollbar-hide">
          {channels.map(channel => (
            <Link key={channel.uid} to={`/channel/${channel.uid}`} className="flex flex-col items-center gap-2 min-w-[80px] group">
              <img 
                src={channel.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${channel.uid}`} 
                className="w-14 h-14 rounded-full border-2 border-gray-200 group-hover:border-blue-500 transition-all" 
                alt={channel.displayName} 
              />
              <span className="text-xs text-center line-clamp-1 w-full">{channel.displayName}</span>
            </Link>
          ))}
        </div>
      )}

      {videos.length === 0 ? (
        <div className="text-center py-20 text-ice-muted">
          <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg">Новых видео от ваших подписок пока нет.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}
