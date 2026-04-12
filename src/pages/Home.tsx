import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import VideoCard from '../components/VideoCard';
import ShortCard from '../components/ShortCard';
import { VideoType } from '../types';
import { Loader2, Smartphone, TrendingUp, Clock, Sparkles, Filter } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const CATEGORIES = ['Все', 'Игры', 'Музыка', 'Shorts', 'Фото', 'Образование', 'Развлечения', 'Технологии', 'Зимний спорт', 'Арктика', 'Релакс'];

export default function Home() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const [activeCategory, setActiveCategory] = useState('Все');
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => {
          const videoData = doc.data();
          return {
            ...videoData,
            id: doc.id,
            createdAt: videoData.createdAt?.toDate?.()?.toISOString() || videoData.createdAt
          };
        }) as VideoType[];
        setVideos(data);
      } catch (error) {
        console.error("Error fetching videos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  const filteredVideos = videos.filter(video => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = video.title.toLowerCase().includes(searchLower) ||
                         video.authorName.toLowerCase().includes(searchLower) ||
                         video.category?.toLowerCase().includes(searchLower);
    
    let matchesCategory = false;
    if (activeCategory === 'Все') {
      matchesCategory = true;
    } else if (activeCategory === 'Музыка') {
      matchesCategory = !!video.isMusic || video.category?.toLowerCase() === 'музыка';
    } else if (activeCategory === 'Shorts') {
      matchesCategory = !!video.isShort;
    } else if (activeCategory === 'Фото') {
      matchesCategory = !!video.isPhoto || video.type === 'photo';
    } else {
      matchesCategory = video.category?.toLowerCase() === activeCategory.toLowerCase();
    }
    
    return matchesSearch && matchesCategory;
  });

  const topVideos = [...filteredVideos].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 8);
  const newVideos = [...filteredVideos].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);

  return (
    <div className="p-4 md:p-6 lg:p-10 max-w-[1800px] mx-auto pb-24 md:pb-10 bg-[var(--bg)] min-h-screen">
      {/* Categories */}
      <div className="flex items-center gap-4 overflow-x-auto pb-4 mb-8 scrollbar-hide sticky top-14 bg-[var(--bg)]/95 backdrop-blur-sm z-20 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] shrink-0">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Фильтр</span>
        </div>
        <div className="flex gap-2.5">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-1.5 rounded-lg whitespace-nowrap transition-all duration-200 text-sm font-bold tracking-tight ${
                activeCategory === category
                  ? 'bg-[var(--text-primary)] text-[var(--bg)] shadow-md shadow-blue-500/10'
                  : 'bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--hover)] hover:border-blue-500/50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {searchQuery && (
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            Результаты поиска для: <span className="text-blue-600">"{searchQuery}"</span>
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Найдено {filteredVideos.length} видео</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
          <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest">Загрузка контента...</p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-[var(--text-secondary)]">
          <div className="w-20 h-20 bg-[var(--hover)] rounded-full flex items-center justify-center mb-6">
            <Sparkles className="w-10 h-10 opacity-20" />
          </div>
          <p className="text-lg font-bold text-[var(--text-primary)]">Видео не найдены</p>
          <p className="text-sm mt-2">Попробуйте изменить параметры поиска или категорию</p>
        </div>
      ) : (
        <div className="flex flex-col gap-16">
          {/* Main Content Section */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-500">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">
                    {activeCategory !== 'Все' ? activeCategory : 'Рекомендации'}
                  </h2>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-0.5">
                    {searchQuery ? 'Результаты поиска' : 'Контент'}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-10">
              {filteredVideos.map((video) => (
                <VideoCard key={video.id} video={video as any} />
              ))}
            </div>
          </section>

          {/* Top by Views Section - Only show if not searching and in 'Все' */}
          {!searchQuery && activeCategory === 'Все' && topVideos.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-orange-900/20 rounded-xl flex items-center justify-center text-orange-500">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">Топ по просмотрам</h2>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-0.5">Самые популярные</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-10">
                {topVideos.map((video) => (
                  <VideoCard key={video.id} video={video as any} />
                ))}
              </div>
            </section>
          )}

          {/* New Videos Section - Only show if not searching and in 'Все' */}
          {!searchQuery && activeCategory === 'Все' && newVideos.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-500">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">Новые видео</h2>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-0.5">Свежий контент</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-10">
                {newVideos.map((video) => (
                  <VideoCard key={video.id} video={video as any} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
