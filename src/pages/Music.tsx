import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { VideoType } from '../types';
import { Loader2, Music as MusicIcon, Play, Heart, Share2, MoreVertical, ListMusic } from 'lucide-react';
import VideoCard from '../components/VideoCard';

export default function Music() {
  const [music, setMusic] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMusic = async () => {
      try {
        const q = query(
          collection(db, 'videos'), 
          where('isMusic', '==', true),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as VideoType[];
        setMusic(data);
      } catch (error) {
        console.error("Error fetching music:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMusic();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest">Загрузка музыки...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-10 max-w-[1800px] mx-auto bg-[var(--bg)] min-h-screen">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <ListMusic className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">Музыка</h1>
          <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">Лучшие треки и клипы</p>
        </div>
      </div>

      {music.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-[var(--text-secondary)]">
          <div className="w-20 h-20 bg-[var(--hover)] rounded-full flex items-center justify-center mb-6">
            <MusicIcon className="w-10 h-10 opacity-20" />
          </div>
          <p className="text-lg font-bold text-[var(--text-primary)]">Музыка не найдена</p>
          <p className="text-sm mt-2">Будьте первым, кто загрузит музыкальный клип!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-10">
          {music.map((item) => (
            <VideoCard key={item.id} video={item as any} />
          ))}
        </div>
      )}
    </div>
  );
}
