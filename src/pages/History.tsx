import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import VideoCard from '../components/VideoCard';
import { VideoType } from '../types';
import { Loader2, History as HistoryIcon, Trash2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export default function History() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'history'), where('userId', '==', user.uid), orderBy('watchedAt', 'desc'));
        const snap = await getDocs(q);
        
        const videoPromises = snap.docs.map(async (d) => {
          const videoDoc = await getDoc(doc(db, 'videos', d.data().videoId));
          if (videoDoc.exists()) {
            return {
              ...videoDoc.data(),
              createdAt: videoDoc.data().createdAt?.toDate()?.toISOString(),
              historyId: d.id
            } as VideoType & { historyId: string };
          }
          return null;
        });

        const results = await Promise.all(videoPromises);
        setVideos(results.filter(v => v !== null) as VideoType[]);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  const clearHistory = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'history'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      setVideos([]);
      toast.success('История очищена');
    } catch (error) {
      toast.error('Не удалось очистить историю');
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-ice-muted">
        <h2 className="text-2xl font-bold mb-4">Войдите, чтобы видеть историю</h2>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-ice-accent" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <HistoryIcon className="w-6 h-6 text-ice-accent" />
          <h1 className="text-2xl md:text-3xl font-bold">История просмотра</h1>
        </div>
        {videos.length > 0 && (
          <button 
            onClick={clearHistory}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-ice-muted hover:text-red-400 border border-ice-border transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Очистить историю</span>
          </button>
        )}
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-20 text-ice-muted">
          <p className="text-lg">История пуста.</p>
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
