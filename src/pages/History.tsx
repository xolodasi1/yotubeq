import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import VideoCard from '../components/VideoCard';
import { VideoType } from '../types';
import { Loader2, History as HistoryIcon, Trash2, Search, Calendar, Clock, X, Settings } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { format, isToday, isYesterday, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function History() {
  const { user, activeChannel } = useAuth();
  const [videos, setVideos] = useState<(VideoType & { watchedAt: any, historyId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user || !activeChannel) return;

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'history'), where('userId', '==', activeChannel.id), orderBy('watchedAt', 'desc'));
        const snap = await getDocs(q);
        
        const videoPromises = snap.docs.map(async (d) => {
          const videoDoc = await getDoc(doc(db, 'videos', d.data().videoId));
          if (videoDoc.exists()) {
            return {
              ...videoDoc.data(),
              id: videoDoc.id,
              createdAt: videoDoc.data().createdAt?.toDate()?.toISOString(),
              watchedAt: d.data().watchedAt?.toDate(),
              historyId: d.id
            } as VideoType & { watchedAt: any, historyId: string };
          }
          return null;
        });

        const results = await Promise.all(videoPromises);
        setVideos(results.filter(v => v !== null) as (VideoType & { watchedAt: any, historyId: string })[]);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  const removeHistoryItem = async (historyId: string) => {
    try {
      await deleteDoc(doc(db, 'history', historyId));
      setVideos(videos.filter(v => v.historyId !== historyId));
      toast.success('Удалено из истории');
    } catch (error) {
      toast.error('Не удалось удалить');
    }
  };

  const clearHistory = async () => {
    if (!user || !activeChannel) return;
    if (!window.confirm('Очистить всю историю просмотров?')) return;
    try {
      const q = query(collection(db, 'history'), where('userId', '==', activeChannel.id));
      const snap = await getDocs(q);
      const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      setVideos([]);
      toast.success('История очищена');
    } catch (error) {
      toast.error('Не удалось очистить историю');
    }
  };

  const filteredVideos = videos.filter(v => 
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.authorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupVideosByDate = (vids: typeof videos) => {
    const groups: { [key: string]: typeof videos } = {};
    vids.forEach(video => {
      let dateKey = '';
      if (isToday(video.watchedAt)) dateKey = 'Сегодня';
      else if (isYesterday(video.watchedAt)) dateKey = 'Вчера';
      else dateKey = format(video.watchedAt, 'd MMMM', { locale: ru });

      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(video);
    });
    return groups;
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
        <div className="w-20 h-20 bg-[var(--hover)] rounded-full flex items-center justify-center mb-6">
          <HistoryIcon className="w-10 h-10 text-[var(--text-secondary)]" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Отслеживайте историю просмотров</h2>
        <p className="text-[var(--text-secondary)] max-w-md mb-8">
          Здесь будут отображаться видео, которые вы посмотрели. Войдите в аккаунт, чтобы сохранять историю.
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

  const groupedVideos = groupVideosByDate(filteredVideos);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-8 p-4 md:p-8">
        {/* Main Content */}
        <div className="flex-1 space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">История просмотра</h1>
            <div className="lg:hidden">
              <button 
                onClick={clearHistory}
                className="p-2 hover:bg-red-500/10 text-red-500 rounded-full transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {filteredVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-[var(--hover)] rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-[var(--text-secondary)]" />
              </div>
              <p className="text-[var(--text-secondary)] font-medium">
                {searchQuery ? 'Ничего не найдено' : 'В этой ленте нет видео.'}
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {Object.entries(groupedVideos).map(([date, vids]) => (
                <div key={date} className="space-y-6">
                  <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    {date}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {vids.map((video) => (
                      <div key={video.historyId} className="relative group">
                        <VideoCard video={video} />
                        <button 
                          onClick={() => removeHistoryItem(video.historyId)}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                          title="Удалить из истории"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Controls */}
        <div className="w-full lg:w-80 space-y-6">
          <div className="sticky top-24 space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input
                type="text"
                placeholder="Поиск в истории"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 space-y-6">
              <div className="space-y-4">
                <button 
                  onClick={clearHistory}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                  Очистить историю
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--hover)] rounded-2xl transition-all">
                  <Clock className="w-5 h-5" />
                  Не записывать историю
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--hover)] rounded-2xl transition-all">
                  <Settings className="w-5 h-5" />
                  Управление историей
                </button>
              </div>

              <div className="pt-6 border-t border-[var(--border)]">
                <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-[var(--text-secondary)]">Тип контента</h3>
                <div className="space-y-2">
                  {['Все', 'Видео', 'Shorts', 'Музыка'].map(type => (
                    <label key={type} className="flex items-center gap-3 px-2 py-1 cursor-pointer group">
                      <input type="radio" name="type" defaultChecked={type === 'Все'} className="w-4 h-4 accent-blue-600" />
                      <span className="text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

