import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import VideoCard from '../components/VideoCard';
import { VideoType } from '../types';
import { Loader2, Heart } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';

export default function Favorites() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchFavorites = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'favorites'), where('userId', '==', user.uid), orderBy('addedAt', 'desc'));
        const snap = await getDocs(q);
        
        const videoPromises = snap.docs.map(async (d) => {
          const videoDoc = await getDoc(doc(db, 'videos', d.data().videoId));
          if (videoDoc.exists()) {
            return {
              ...videoDoc.data(),
              createdAt: videoDoc.data().createdAt?.toDate()?.toISOString()
            } as VideoType;
          }
          return null;
        });

        const results = await Promise.all(videoPromises);
        setVideos(results.filter(v => v !== null) as VideoType[]);
      } catch (error) {
        console.error("Error fetching favorites:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-ice-muted">
        <h2 className="text-2xl font-bold mb-4">Войдите, чтобы видеть понравившиеся видео</h2>
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
      <div className="flex items-center gap-3 mb-8">
        <Heart className="w-6 h-6 text-red-500" />
        <h1 className="text-2xl md:text-3xl font-bold">Понравившиеся</h1>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-20 text-ice-muted">
          <p className="text-lg">Список пуст.</p>
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
