import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import VideoCard from '../components/VideoCard';
import ShortCard from '../components/ShortCard';
import { VideoType } from '../types';
import { Loader2, Smartphone, TrendingUp, Clock, Sparkles, Filter, Snowflake, Users, Music as MusicIcon, Camera, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { databaseService } from '../lib/databaseService';
import { useAuth } from '../App';

import { APP_LOGO_URL } from '../constants';

const BASE_CATEGORIES = ['Все', 'Музыка', 'Shorts', 'Фото'];

export default function Home() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const [activeCategory, setActiveCategory] = useState('Все');
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dynamicCategories, setDynamicCategories] = useState<string[]>(BASE_CATEGORIES);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let hiddenChannelIds: string[] = [];
        if (user) {
          const { data: hiddenData } = await supabase
            .from('hidden_channels')
            .select('channel_id')
            .eq('user_id', user.uid);
          hiddenChannelIds = (hiddenData || []).map(d => d.channel_id);
        }

        // Fetch Videos from Supabase
        let { data: videosData, error: videosError } = await supabase
          .from('videos')
          .select('*')
          .order('created_at', { ascending: false });

        if (videosError) throw videosError;

        let mappedVideos = (videosData || []).map(v => databaseService.mapVideo(v));
        
        if (hiddenChannelIds.length > 0) {
          mappedVideos = mappedVideos.filter(video => !hiddenChannelIds.includes(video.authorId));
        }
        
        // Extract unique categories from videos
        const uniqueCategories = new Set<string>();
        mappedVideos.forEach(video => {
          if (video.category && typeof video.category === 'string') {
            const cat = video.category.trim();
            if (cat && !BASE_CATEGORIES.some(baseCat => baseCat.toLowerCase() === cat.toLowerCase())) {
              const formattedCat = cat.charAt(0).toUpperCase() + cat.slice(1);
              uniqueCategories.add(formattedCat);
            }
          }
        });
        
        setDynamicCategories([...BASE_CATEGORIES, ...Array.from(uniqueCategories)]);

        // Fetch Users (Channels) for recommendations/metadata
        const { data: channelsDataRaw, error: channelsError } = await supabase
          .from('channels')
          .select('*');

        if (channelsError) throw channelsError;

        const channelsMap = (channelsDataRaw || []).reduce((acc: any, c) => {
          acc[c.id] = c;
          return acc;
        }, {});

        const { data: usersDataRaw, error: usersError } = await supabase
          .from('users')
          .select('*');

        if (usersError) throw usersError;

        let usersData = (usersDataRaw || []).map(u => ({
          ...u,
          uid: u.id,
          displayName: u.display_name,
          photoURL: u.photo_url
        }));
        
        if (hiddenChannelIds.length > 0) {
          usersData = usersData.filter(u => !hiddenChannelIds.includes(u.uid));
        }

        // Calculate recommendation score for each video
        mappedVideos = mappedVideos.map(video => {
          const channelReputation = channelsMap[video.authorId]?.ices || 0;
          const views = Number(video.views) || 0;
          const likes = Number(video.likes) || 0;
          const ices = Number(video.ices) || 0;
          
          // Score formula: views (40%) + likes (30%) + reputation (30%)
          const score = (views * 0.4) + (likes * 10 * 0.3) + (channelReputation * 5 * 0.3) + (ices * 20 * 0.1);
          
          return { ...video, recommendationScore: score } as any;
        });
        
        setVideos(mappedVideos as any);
        setUsers(usersData);
      } catch (error: any) {
        console.error("Error fetching data from Supabase:", error);
        // Supabase often fails if tables are not created. 
        // We should warn the user to run the migration.
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const filteredVideos = videos.filter(video => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = video.title.toLowerCase().includes(searchLower) ||
                         (video.authorName || '').toLowerCase().includes(searchLower) ||
                         (video.category || '').toLowerCase().includes(searchLower);
    
    const matchesCategory = activeCategory === 'Все' || 
                           (activeCategory === 'Музыка' && (!!video.isMusic || video.category?.toLowerCase() === 'музыка')) ||
                           (activeCategory === 'Shorts' && !!video.isShort) ||
                           (activeCategory === 'Фото' && (!!video.isPhoto || video.type === 'photo')) ||
                           video.category?.toLowerCase() === activeCategory.toLowerCase();
    
    const isVisible = video.visibility === 'public' || !video.visibility;
    
    return matchesSearch && matchesCategory && isVisible;
  });

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return false;
    const searchLower = searchQuery.toLowerCase();
    const matchesName = user.displayName?.toLowerCase().includes(searchLower) || user.uid.toLowerCase().includes(searchLower);
    const matchesAliases = user.searchAliases?.some((alias: string) => alias.toLowerCase().includes(searchLower));
    return matchesName || matchesAliases;
  });

  const regularVideos = filteredVideos
    .filter(v => !v.isShort && !v.isMusic && !v.isPhoto && v.type !== 'photo')
    .sort((a, b) => {
      if (activeCategory === 'Все' && !searchQuery) {
        return (b.recommendationScore || 0) - (a.recommendationScore || 0);
      }
      return 0; // Keep original (descending by createdAt from query)
    });
  const shortsVideos = filteredVideos.filter(v => v.isShort);
  const musicVideos = filteredVideos.filter(v => v.isMusic);
  const photoVideos = filteredVideos.filter(v => v.isPhoto || v.type === 'photo');

  const topVideos = [...regularVideos].sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0)).slice(0, 8);
  const newVideos = [...regularVideos].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
  }).slice(0, 8);
  const topIcedVideos = [...regularVideos].sort((a, b) => (Number(b.ices) || 0) - (Number(a.ices) || 0)).slice(0, 8);

  const recommendedChannels = [...users]
    .filter(u => u.uid !== user?.uid)
    .sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0))
    .slice(0, 5);

  return (
    <div className="p-4 md:p-6 lg:p-10 max-w-[1800px] mx-auto pb-24 md:pb-10 bg-[var(--bg)] min-h-screen">
      {/* Categories */}
      <div className="flex items-center gap-4 overflow-x-auto pb-4 mb-8 scrollbar-hide sticky top-14 bg-[var(--bg)]/95 backdrop-blur-sm z-20 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] shrink-0">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Фильтр</span>
        </div>
        <div className="flex gap-2.5">
          {dynamicCategories.map((category) => (
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
          <p className="text-sm text-[var(--text-secondary)] mt-1">Найдено {filteredVideos.length} видео и {filteredUsers.length} каналов</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
          <div className="relative">
            <img 
              src={APP_LOGO_URL} 
              alt="IceTube Logo" 
              className="w-24 h-24 rounded-3xl shadow-[0_0_30px_rgba(37,99,235,0.4)] animate-pulse object-contain"
              crossOrigin="anonymous"
            />
            <div className="absolute -inset-4 border-4 border-blue-600/20 border-t-blue-600 rounded-[2.5rem] animate-spin"></div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-2xl font-black tracking-tighter text-blue-600">IceTube</h2>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            </div>
          </div>
        </div>
      ) : filteredVideos.length === 0 && filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-[var(--text-secondary)]">
          <div className="w-20 h-20 bg-[var(--hover)] rounded-full flex items-center justify-center mb-6">
            <Sparkles className="w-10 h-10 opacity-20" />
          </div>
          <p className="text-lg font-bold text-[var(--text-primary)]">Ничего не найдено</p>
          <p className="text-sm mt-2">Попробуйте изменить параметры поиска или категорию</p>
        </div>
      ) : (
        <div className="flex flex-col gap-16">
          {/* Channels Search Results */}
          {searchQuery && filteredUsers.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-500">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">Каналы</h2>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-0.5">Авторы</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredUsers.map(user => (
                  <Link key={user.uid} to={`/channel/${user.uid}`} className="flex items-center gap-4 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl hover:border-blue-500/50 hover:shadow-lg transition-all group">
                    <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt={user.displayName} className="w-16 h-16 rounded-full object-cover group-hover:scale-105 transition-transform" />
                    <div>
                      <h3 className="font-bold text-lg text-[var(--text-primary)] group-hover:text-blue-500 transition-colors">{user.displayName}</h3>
                      <p className="text-sm text-[var(--text-secondary)]">{user.subscribers || 0} подписчиков</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Main Content Section */}
          {regularVideos.length > 0 && (
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
                {regularVideos.map((video) => (
                  <VideoCard key={video.id} video={video as any} />
                ))}
              </div>
            </section>
          )}

          {/* IceTube Loves to Watch Section */}
          {!searchQuery && activeCategory === 'Все' && topVideos.length > 0 && (
            <section className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
              
              <div className="flex items-center gap-3 mb-8 relative z-10">
                <div className="w-12 h-12 bg-red-600/10 rounded-2xl flex items-center justify-center text-red-500">
                  <Heart className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[var(--text-primary)]">На IceTube любят смотреть</h2>
                  <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">Топ просмотров за все время</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 overflow-x-auto pb-4 scrollbar-hide relative z-10 snap-x">
                {topVideos.map(video => (
                  <div key={video.id} className="min-w-[280px] w-[280px] snap-center shrink-0">
                    <VideoCard video={video as any} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Who to Follow Section */}
          {!searchQuery && activeCategory === 'Все' && recommendedChannels.length > 0 && (
            <section className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
              
              <div className="flex items-center gap-3 mb-8 relative z-10">
                <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[var(--text-primary)]">Кого смотреть</h2>
                  <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">Интересные авторы</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 overflow-x-auto pb-4 scrollbar-hide relative z-10 snap-x">
                {recommendedChannels.map(user => (
                  <Link 
                    key={user.uid} 
                    to={`/channel/${user.uid}`} 
                    className="flex flex-col items-center gap-3 p-6 bg-[var(--bg)] border border-[var(--border)] rounded-2xl hover:border-blue-500/50 hover:shadow-lg transition-all group min-w-[160px] snap-center shrink-0"
                  >
                    <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt={user.displayName} className="w-20 h-20 rounded-full object-cover group-hover:scale-105 transition-transform border-4 border-[var(--surface)]" />
                    <div className="text-center">
                      <h3 className="font-bold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors line-clamp-1">{user.displayName}</h3>
                      <p className="text-xs text-[var(--text-secondary)]">{user.subscribers || 0} подп.</p>
                    </div>
                    <button className="w-full mt-2 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors dark:bg-blue-500/10 dark:text-blue-400">
                      Перейти
                    </button>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Music Section */}
          {musicVideos.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-purple-900/20 rounded-xl flex items-center justify-center text-purple-500">
                  <MusicIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">Музыка</h2>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-0.5">Треки и клипы</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-10">
                {musicVideos.map((video) => (
                  <VideoCard key={video.id} video={video as any} />
                ))}
              </div>
            </section>
          )}

          {/* Photos Section */}
          {photoVideos.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-green-900/20 rounded-xl flex items-center justify-center text-green-500">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">Фото</h2>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-0.5">Изображения</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-10">
                {photoVideos.map((video) => (
                  <VideoCard key={video.id} video={video as any} />
                ))}
              </div>
            </section>
          )}

          {/* Shorts Section */}
          {shortsVideos.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-red-900/20 rounded-xl flex items-center justify-center text-red-500">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">Shorts</h2>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-0.5">Короткие видео</p>
                </div>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x">
                {shortsVideos.map((video) => (
                  <div key={video.id} className="snap-start">
                    <ShortCard video={video as any} />
                  </div>
                ))}
              </div>
            </section>
          )}

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

          {/* Top by Ices Section - Only show if not searching and in 'Все' */}
          {!searchQuery && activeCategory === 'Все' && topIcedVideos.length > 0 && topIcedVideos.some(v => (v.ices || 0) > 0) && (
            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-400">
                  <Snowflake className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">Топ по снежинкам</h2>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-0.5">Самые крутые видео</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-10">
                {topIcedVideos.filter(v => (v.ices || 0) > 0).map((video) => (
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
