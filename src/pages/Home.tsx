import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import VideoCard from '../components/VideoCard';
import ShortCard from '../components/ShortCard';
import { VideoType } from '../types';
import { Loader2, Smartphone, TrendingUp, Clock, Sparkles, Filter } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const CATEGORIES = ['Все', 'Игры', 'Музыка', 'Образование', 'Развлечения', 'Технологии', 'Зимний спорт', 'Арктика', 'Релакс'];

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
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.authorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'Все' || video.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const regularVideos = filteredVideos.filter(v => !v.isShort && !v.isMusic);
  const shortsVideos = filteredVideos.filter(v => v.isShort);
  const musicVideos = filteredVideos.filter(v => v.isMusic);

  const topVideos = [...regularVideos].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 8);
  const newVideos = regularVideos.slice(0, 8);

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
          {/* Recommendations Section */}
          <section>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-500">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">Рекомендации</h2>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-0.5">Специально для вас</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-10">
              {regularVideos.map((video) => (
                <VideoCard key={video.id} video={video as any} />
              ))}
            </div>
          </section>

          {/* Top by Views Section */}
          {topVideos.length > 0 && !searchQuery && activeCategory === 'Все' && (
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

          {/* New Videos Section */}
          {newVideos.length > 0 && !searchQuery && activeCategory === 'Все' && (
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
