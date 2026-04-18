import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import VideoCard from '../components/VideoCard';
import { VideoType } from '../types';
import { Loader2, Heart, Play, Shuffle, ListFilter, Search, Clock, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { databaseService } from '../lib/databaseService';
// Supabase refactored
import { toast } from 'sonner';

export default function Favorites() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<(VideoType & { addedAt: any, favoriteId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');

  useEffect(() => {
    if (!user) return;

    const fetchFavorites = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('favorites')
          .select('*, videos!fk_favorites_video(*)')
          .eq('user_id', user.uid)
          .order('added_at', { ascending: false });
        
        if (error) throw error;
        
        const results = (data || []).map(item => {
          if (!item['videos!fk_favorites_video']) return null;
          return {
            ...databaseService.mapVideo(item['videos!fk_favorites_video']),
            addedAt: new Date(item.added_at),
            favoriteId: item.id
          } as VideoType & { addedAt: any, favoriteId: string };
        }).filter(v => v !== null);

        setVideos(results as (VideoType & { addedAt: any, favoriteId: string })[]);
      } catch (error) {
        console.error("Error fetching favorites:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  const removeFavorite = async (favoriteId: string) => {
    try {
      await supabase.from('favorites').delete().eq('id', favoriteId);
      setVideos(videos.filter(v => v.favoriteId !== favoriteId));
      toast.success('Удалено из понравившихся');
    } catch (error) {
      toast.error('Не удалось удалить');
    }
  };

  const sortedVideos = [...videos].sort((a, b) => {
    if (sortBy === 'newest') return b.addedAt - a.addedAt;
    if (sortBy === 'oldest') return a.addedAt - b.addedAt;
    if (sortBy === 'popular') return (b.views || 0) - (a.views || 0);
    return 0;
  }).filter(v => 
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.authorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <Heart className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Избранные видео</h2>
        <p className="text-[var(--text-secondary)] max-w-md mb-8">
          Здесь будут отображаться видео, которые вы добавили в избранное.
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
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Playlist Preview Card */}
          <div className="w-full md:w-80 lg:w-96 flex-shrink-0">
            <div className="bg-gradient-to-b from-blue-600/20 to-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 space-y-6 sticky top-24">
              <div className="aspect-video relative rounded-2xl overflow-hidden shadow-2xl group">
                {videos[0] ? (
                  <img src={videos[0].thumbnailUrl} className="w-full h-full object-cover" alt="Playlist cover" />
                ) : (
                  <div className="w-full h-full bg-[var(--hover)] flex items-center justify-center">
                    <Heart className="w-12 h-12 text-[var(--text-secondary)]" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-12 h-12 text-white fill-white" />
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-black tracking-tight">Избранные</h1>
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] font-bold">
                  <span>{user.displayName}</span>
                  <span>•</span>
                  <span>{videos.length} видео</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 bg-white text-black hover:bg-white/90 px-4 py-3 rounded-2xl font-bold transition-all">
                  <Play className="w-5 h-5 fill-black" />
                  Воспроизвести
                </button>
                <button className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                  <Shuffle className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Videos List */}
          <div className="flex-1 space-y-6 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  placeholder="Поиск в понравившихся"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-[var(--text-secondary)]" />
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-sm font-bold text-[var(--text-secondary)] focus:outline-none cursor-pointer"
                >
                  <option value="newest">Сначала новые</option>
                  <option value="oldest">Сначала старые</option>
                  <option value="popular">По популярности</option>
                </select>
              </div>
            </div>

            {sortedVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-[var(--text-secondary)] font-medium">
                  {searchQuery ? 'Ничего не найдено' : 'Список пуст.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sortedVideos.map((video) => (
                  <div key={video.favoriteId} className="relative group">
                    <VideoCard video={video} />
                    <button 
                      onClick={() => removeFavorite(video.favoriteId)}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                      title="Удалить из понравившихся"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

