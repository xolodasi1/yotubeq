import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import VideoCard from '../components/VideoCard';
import { VideoType } from '../types';
import { Loader2, Clock, Trash2, Search, X } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export default function WatchLater() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<(VideoType & { addedAt: any, watchLaterId: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchWatchLater = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'watch_later'), where('userId', '==', user.uid), orderBy('addedAt', 'desc'));
        const snap = await getDocs(q);
        
        const videoPromises = snap.docs.map(async (d) => {
          const videoDoc = await getDoc(doc(db, 'videos', d.data().videoId));
          if (videoDoc.exists()) {
            return {
              ...videoDoc.data(),
              id: videoDoc.id,
              createdAt: videoDoc.data().createdAt?.toDate()?.toISOString(),
              addedAt: d.data().addedAt?.toDate(),
              watchLaterId: d.id
            } as VideoType & { addedAt: any, watchLaterId: string };
          }
          return null;
        });

        const results = await Promise.all(videoPromises);
        setVideos(results.filter(v => v !== null) as (VideoType & { addedAt: any, watchLaterId: string })[]);
      } catch (error) {
        console.error("Error fetching watch later:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWatchLater();
  }, [user]);

  const removeWatchLaterItem = async (watchLaterId: string) => {
    try {
      await deleteDoc(doc(db, 'watch_later', watchLaterId));
      setVideos(videos.filter(v => v.watchLaterId !== watchLaterId));
      toast.success('Удалено из "Смотреть позже"');
    } catch (error) {
      toast.error('Не удалось удалить');
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <div className="w-20 h-20 bg-[var(--hover)] rounded-full flex items-center justify-center mb-6">
          <Clock className="w-10 h-10 text-[var(--text-secondary)]" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Смотрите позже</h2>
        <p className="text-[var(--text-secondary)] max-w-md mb-8">
          Войдите, чтобы сохранять видео для просмотра позже.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Clock className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-black tracking-tight">Смотреть позже</h1>
      </div>

      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-[var(--hover)] rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-[var(--text-secondary)]" />
          </div>
          <p className="text-[var(--text-secondary)] font-medium">Список пуст.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video) => (
            <div key={video.watchLaterId} className="relative group">
              <VideoCard video={video} />
              <button 
                onClick={() => removeWatchLaterItem(video.watchLaterId)}
                className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                title="Удалить из списка"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
