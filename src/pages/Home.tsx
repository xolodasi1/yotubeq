import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import VideoCard from '../components/VideoCard';
import ShortCard from '../components/ShortCard';
import { VideoType } from '../types';
import { Loader2, Smartphone, TrendingUp, Clock, Sparkles } from 'lucide-react';
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
        const data = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()?.toISOString()
        })) as VideoType[];
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

  const regularVideos = filteredVideos.filter(v => !v.isShort);
  const shortsVideos = filteredVideos.filter(v => v.isShort);

  // Top by views (from all loaded videos)
  const topVideos = [...regularVideos].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 8);
  // New videos (already sorted by createdAt desc in fetch)
  const newVideos = regularVideos.slice(0, 8);

  return (
    <div className="p-3 md:p-6 lg:p-8 max-w-[1600px] mx-auto pb-24 md:pb-8">
      {/* Categories */}
      <div className="flex gap-2 md:gap-3 overflow-x-auto pb-4 mb-4 md:mb-6 scrollbar-hide sticky top-0 bg-ice-bg/80 backdrop-blur-md z-20 py-2">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-3 py-1.5 md:px-4 md:py-1.5 rounded-full whitespace-nowrap transition-all duration-300 text-xs md:text-sm ${
              activeCategory === category
                ? 'bg-ice-accent text-ice-bg font-medium shadow-[0_0_15px_rgba(0,242,255,0.4)]'
                : 'bg-white/5 hover:bg-white/10 text-ice-text border border-ice-border'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {searchQuery && (
        <h2 className="text-lg md:text-xl font-bold mb-6">
          Результаты поиска для: <span className="text-ice-accent">"{searchQuery}"</span>
        </h2>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-ice-accent" />
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-20 text-ice-muted">
          <p className="text-lg md:text-xl">Видео не найдены в морозном мире.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-12 md:gap-16">
          {/* Recommendations Section */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-ice-accent" />
              <h2 className="text-xl md:text-2xl font-bold">Рекомендации</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6 md:gap-x-6 md:gap-y-10">
              {regularVideos.map((video) => (
                <VideoCard key={video.id} video={video as any} />
              ))}
            </div>
          </section>

          {/* Shorts Section */}
          {shortsVideos.length > 0 && (
            <section>
              <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center gap-2">
                <Smartphone className="w-5 h-5 md:w-6 md:h-6 text-ice-accent" />
                Shorts
              </h2>
              <div className="flex gap-3 md:gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x">
                {shortsVideos.map((video) => (
                  <div key={video.id} className="snap-start">
                    <ShortCard video={video as any} />
                  </div>
                ))}
              </div>
              <div className="w-full h-px bg-ice-border mt-2"></div>
            </section>
          )}

          {/* Top by Views Section */}
          {topVideos.length > 0 && !searchQuery && activeCategory === 'Все' && (
            <section>
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-ice-accent" />
                <h2 className="text-xl md:text-2xl font-bold">Топ по просмотрам</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6 md:gap-x-6 md:gap-y-10">
                {topVideos.map((video) => (
                  <VideoCard key={video.id} video={video as any} />
                ))}
              </div>
            </section>
          )}

          {/* New Videos Section */}
          {newVideos.length > 0 && !searchQuery && activeCategory === 'Все' && (
            <section>
              <div className="flex items-center gap-2 mb-6">
                <Clock className="w-5 h-5 text-ice-accent" />
                <h2 className="text-xl md:text-2xl font-bold">Новые видео</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6 md:gap-x-6 md:gap-y-10">
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
