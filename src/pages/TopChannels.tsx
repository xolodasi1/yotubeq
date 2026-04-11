import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { Loader2, Trophy, Users, Music, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { VideoType } from '../types';

interface TopChannel {
  uid: string;
  displayName: string;
  photoURL: string;
  bio?: string;
  subscribers: number;
  totalMusicViews: number;
  musicCount: number;
}

export default function TopChannels() {
  const [channels, setChannels] = useState<TopChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'subscribers' | 'music'>('subscribers');

  useEffect(() => {
    const fetchTopData = async () => {
      try {
        // 1. Fetch top users by subscribers
        const usersQuery = query(
          collection(db, 'users'),
          orderBy('subscribers', 'desc')
        );
        
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = usersSnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        })) as any[];

        // 2. Fetch all music videos to aggregate views
        const musicQuery = query(
          collection(db, 'videos'),
          where('isMusic', '==', true)
        );
        const musicSnapshot = await getDocs(musicQuery);
        const musicVideos = musicSnapshot.docs.map(doc => doc.data()) as VideoType[];

        // 3. Aggregate music stats per user
        const musicStats: Record<string, { views: number, count: number }> = {};
        musicVideos.forEach(video => {
          if (!musicStats[video.authorId]) {
            musicStats[video.authorId] = { views: 0, count: 0 };
          }
          musicStats[video.authorId].views += (video.views || 0);
          musicStats[video.authorId].count += 1;
        });

        // 4. Combine data
        const combinedData: TopChannel[] = usersData.map(user => ({
          uid: user.uid,
          displayName: user.displayName || 'User',
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
          bio: user.bio || '',
          subscribers: user.subscribers || 0,
          totalMusicViews: musicStats[user.uid]?.views || 0,
          musicCount: musicStats[user.uid]?.count || 0
        }));

        // Sort by a combination or just keep subscriber sort? 
        // User asked "чтоб топы шитали и подпишики и всего прослушивание треков"
        // Let's sort by subscribers primarily but show both.
        setChannels(combinedData);
      } catch (error) {
        console.error("Error fetching top data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopData();
  }, []);

  const sortedChannels = [...channels].sort((a, b) => {
    if (sortBy === 'subscribers') {
      return b.subscribers - a.subscribers;
    }
    return b.totalMusicViews - a.totalMusicViews;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-blue-600/20 flex items-center justify-center shrink-0">
          <Trophy className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--studio-text)]">Топ авторов</h1>
          <p className="text-xs md:text-sm text-[var(--studio-muted)]">Откройте для себя самых популярных создателей</p>
        </div>
        <div className="ml-auto flex bg-[var(--studio-sidebar)] p-1 rounded-xl border border-[var(--studio-border)]">
          <button 
            onClick={() => setSortBy('subscribers')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${sortBy === 'subscribers' ? 'bg-blue-600 text-white shadow-md' : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'}`}
          >
            ПО ПОДПИСЧИКАМ
          </button>
          <button 
            onClick={() => setSortBy('music')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${sortBy === 'music' ? 'bg-blue-600 text-white shadow-md' : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'}`}
          >
            ПО ПРОСЛУШИВАНИЯМ
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {sortedChannels.map((channel, index) => (
          <Link 
            key={channel.uid} 
            to={`/channel/${channel.uid}`}
            className="bg-[var(--studio-sidebar)] rounded-xl md:rounded-2xl p-4 md:p-6 border border-[var(--studio-border)] hover:border-blue-300 hover:shadow-lg hover:shadow-blue-50 transition-all group relative overflow-hidden"
          >
            {/* Rank Badge */}
            <div className={`absolute top-0 right-0 w-12 h-12 md:w-16 md:h-16 flex items-start justify-end p-2 md:p-3 rounded-bl-2xl md:rounded-bl-3xl ${
              index === 0 ? 'bg-yellow-500/20 text-yellow-600' :
              index === 1 ? 'bg-gray-400/20 text-gray-500' :
              index === 2 ? 'bg-amber-700/20 text-amber-800' :
              'bg-[var(--studio-hover)] text-[var(--studio-muted)]'
            }`}>
              <span className="font-bold text-base md:text-lg">#{index + 1}</span>
            </div>

            <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
              <img 
                src={channel.photoURL} 
                alt={channel.displayName} 
                className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-blue-100 group-hover:border-blue-500 transition-colors object-cover"
              />
              <div className="min-w-0 pr-8">
                <h2 className="text-lg md:text-xl font-bold group-hover:text-blue-600 transition-colors line-clamp-1 text-[var(--studio-text)]">{channel.displayName}</h2>
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex items-center gap-2 text-[var(--studio-muted)]">
                    <Users className="w-3.5 h-3.5" />
                    <span className="font-bold text-[11px] uppercase tracking-wider">{channel.subscribers.toLocaleString()} подписчиков</span>
                  </div>
                  {channel.musicCount > 0 && (
                    <div className="flex items-center gap-2 text-blue-500">
                      <Music className="w-3.5 h-3.5" />
                      <span className="font-bold text-[11px] uppercase tracking-wider">{channel.totalMusicViews.toLocaleString()} прослушиваний</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {channel.bio && (
              <p className="text-xs md:text-sm text-[var(--studio-text)]/80 line-clamp-2 mt-1 md:mt-2">
                {channel.bio}
              </p>
            )}
          </Link>
        ))}

        {channels.length === 0 && (
          <div className="col-span-full text-center py-16 md:py-20 text-[var(--studio-muted)]">
            <Users className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 opacity-20" />
            <h2 className="text-xl md:text-2xl font-bold">Авторы не найдены</h2>
            <p className="mt-2 text-sm md:text-base">Станьте первым, кто создаст канал!</p>
          </div>
        )}
      </div>
    </div>
  );
}
