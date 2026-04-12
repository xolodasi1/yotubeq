import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import VideoCard from '../components/VideoCard';
import ShortCard from '../components/ShortCard';
import { VideoType } from '../types';
import { Loader2, Smartphone, TrendingUp, Clock, Sparkles, Filter, Snowflake, Users, Music as MusicIcon, Camera } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { useAuth } from '../App';

import { APP_LOGO_URL } from '../constants';

const CATEGORIES = ['Все', 'Игры', 'Музыка', 'Shorts', 'Фото', 'Образование', 'Развлечения', 'Технологии', 'Зимний спорт', 'Арктика', 'Релакс'];

export default function Home() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const [activeCategory, setActiveCategory] = useState('Все');
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let hiddenChannelIds: string[] = [];
        if (user) {
          const hiddenQ = query(collection(db, 'hidden_channels'), where('userId', '==', user.uid));
          const hiddenSnap = await getDocs(hiddenQ);
          hiddenChannelIds = hiddenSnap.docs.map(doc => doc.data().channelId);
        }

        const videosQuery = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
        const videosSnapshot = await getDocs(videosQuery);
        let videosData = videosSnapshot.docs.map(doc => {
          const videoData = doc.data();
          return {
            ...videoData,
            id: doc.id,
            createdAt: videoData.createdAt?.toDate?.()?.toISOString() || videoData.createdAt
          };
        }) as VideoType[];
        
        if (hiddenChannelIds.length > 0) {
          videosData = videosData.filter(video => !hiddenChannelIds.includes(video.authorId));
        }
        
        setVideos(videosData);

        const usersQuery = query(collection(db, 'users'));
        const usersSnapshot = await getDocs(usersQuery);
        let usersData = usersSnapshot.docs.map(doc => ({
          ...doc.data(),
          uid: doc.id
        }));
        
        if (hiddenChannelIds.length > 0) {
          usersData = usersData.filter(u => !hiddenChannelIds.includes(u.uid));
        }
        
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

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

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return false;
    const searchLower = searchQuery.toLowerCase();
    const matchesName = user.displayName?.toLowerCase().includes(searchLower) || user.uid.toLowerCase().includes(searchLower);
    const matchesAliases = user.searchAliases?.some((alias: string) => alias.toLowerCase().includes(searchLower));
    return matchesName || matchesAliases;
  });

  const regularVideos = filteredVideos.filter(v => !v.isShort && !v.isMusic && !v.isPhoto && v.type !== 'photo');
  const shortsVideos = filteredVideos.filter(v => v.isShort);
  const musicVideos = filteredVideos.filter(v => v.isMusic);
  const photoVideos = filteredVideos.filter(v => v.isPhoto || v.type === 'photo');

  const topVideos = [...regularVideos].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 8);
  const newVideos = [...regularVideos].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);
  const topIcedVideos = [...regularVideos].sort((a, b) => (b.ices || 0) - (a.ices || 0)).slice(0, 8);

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
