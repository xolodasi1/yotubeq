import React, { useState, useEffect } from 'react';
import { databaseService } from '../lib/databaseService';
import { VideoType } from '../types';
import { Loader2, PlaySquare } from 'lucide-react';
import VideoCard from '../components/VideoCard';
import { useAuth } from '../App';

export default function Videos() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const mappedData = await databaseService.getVideos({ orderBy: 'created_at', orderDirection: 'desc' });
        
        // Filter only regular videos
        const regularVideos = mappedData.filter(v => 
          !v.isShort && !v.isMusic && !v.isPhoto && v.type !== 'photo'
        );
        setVideos(regularVideos);
      } catch (error) {
        console.error("Error fetching videos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest">Загрузка видео...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-10 max-w-[1800px] mx-auto bg-[var(--bg)] min-h-screen">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <PlaySquare className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">Видео</h1>
          <p className="text-[var(--text-secondary)] text-sm font-medium mt-1">Обычные длинные видео</p>
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 bg-[var(--surface)] rounded-full flex items-center justify-center mb-6 border border-[var(--border)]">
            <PlaySquare className="w-10 h-10 text-[var(--text-secondary)] opacity-50" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Нет видео</h2>
          <p className="text-[var(--text-secondary)] max-w-md">Здесь пока нет обычных видео.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}
