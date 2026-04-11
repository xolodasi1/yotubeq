import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { VideoType } from '../types';
import { Eye, ThumbsUp, TrendingUp, BarChart2, PieChart, Calendar, ChevronRight, Clock, Users, Globe, UserCheck, UserMinus, MapPin, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function StudioAnalytics() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState<'overview' | 'content' | 'audience'>('overview');
  const [stats, setStats] = useState({
    totalViews: 0,
    totalLikes: 0,
    avgViews: 0,
    subscribers: 0,
    watchTime: 0,
    topVideo: null as VideoType | null
  });
  const [popularTab, setPopularTab] = useState<'all' | 'video' | 'short' | 'music' | 'photo'>('all');

  useEffect(() => {
    if (!user) return;

    const unsubscribeSub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setStats(prev => ({ ...prev, subscribers: docSnap.data().subscribers || 0 }));
      }
    });

    const fetchAnalytics = async () => {
      try {
        const q = query(collection(db, 'videos'), where('authorId', '==', user.uid));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoType));
        
        let views = 0;
        let likes = 0;
        let topV = data[0] || null;

        data.forEach(v => {
          views += v.views || 0;
          likes += v.likes || 0;
          if (topV && (v.views || 0) > (topV.views || 0)) {
            topV = v;
          }
        });

        // Mock watch time calculation: views * avg 3 mins / 60
        const watchTime = Math.round((views * 3.5) / 60);

        setVideos(data);
        setStats(prev => ({
          ...prev,
          totalViews: views,
          totalLikes: likes,
          watchTime: watchTime,
          avgViews: data.length > 0 ? Math.round(views / data.length) : 0,
          topVideo: topV
        }));
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    return () => unsubscribeSub();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6 md:space-y-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--studio-text)]">Аналитика канала</h1>
          <p className="text-sm text-[var(--studio-muted)]">Обзор эффективности вашего контента</p>
        </div>
        <div className="flex items-center gap-2 bg-[var(--studio-sidebar)] border border-[var(--studio-border)] px-4 py-2 rounded-xl text-sm font-bold text-[var(--studio-muted)] shadow-sm uppercase tracking-wider w-fit">
          <Calendar className="w-4 h-4" />
          Последние 28 дней
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-[var(--studio-border)] overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Обзор', icon: BarChart2 },
          { id: 'content', label: 'Контент', icon: TrendingUp },
          { id: 'audience', label: 'Аудитория', icon: Users }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveMainTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
              activeMainTab === tab.id 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeMainTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-[var(--studio-sidebar)] border border-[var(--studio-border)] rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-[var(--studio-muted)] uppercase tracking-widest">Просмотры</p>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                  <Eye className="w-4 h-4 md:w-5 md:h-5" />
                </div>
              </div>
              <div>
                <p className="text-xl md:text-3xl font-bold text-[var(--studio-text)]">{stats.totalViews.toLocaleString()}</p>
                <div className="flex items-center gap-1 text-green-600 text-[10px] mt-2 font-bold">
                  <TrendingUp className="w-3 h-3" />
                  <span>+12%</span>
                </div>
              </div>
            </div>

            <div className="bg-[var(--studio-sidebar)] border border-[var(--studio-border)] rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-[var(--studio-muted)] uppercase tracking-widest">Время (часы)</p>
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                  <Clock className="w-4 h-4 md:w-5 md:h-5" />
                </div>
              </div>
              <div>
                <p className="text-xl md:text-3xl font-bold text-[var(--studio-text)]">{stats.watchTime.toLocaleString()}</p>
                <div className="flex items-center gap-1 text-green-600 text-[10px] mt-2 font-bold">
                  <TrendingUp className="w-3 h-3" />
                  <span>+8%</span>
                </div>
              </div>
            </div>

            <div className="bg-[var(--studio-sidebar)] border border-[var(--studio-border)] rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-[var(--studio-muted)] uppercase tracking-widest">Подписчики</p>
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600">
                  <Users className="w-4 h-4 md:w-5 md:h-5" />
                </div>
              </div>
              <div>
                <p className="text-xl md:text-3xl font-bold text-[var(--studio-text)]">{stats.subscribers.toLocaleString()}</p>
                <div className="flex items-center gap-1 text-green-600 text-[10px] mt-2 font-bold">
                  <TrendingUp className="w-3 h-3" />
                  <span>+4%</span>
                </div>
              </div>
            </div>

            <div className="bg-[var(--studio-sidebar)] border border-[var(--studio-border)] rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-[var(--studio-muted)] uppercase tracking-widest">Лайки</p>
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600">
                  <ThumbsUp className="w-4 h-4 md:w-5 md:h-5" />
                </div>
              </div>
              <div>
                <p className="text-xl md:text-3xl font-bold text-[var(--studio-text)]">{stats.totalLikes.toLocaleString()}</p>
                <div className="flex items-center gap-1 text-green-600 text-[10px] mt-2 font-bold">
                  <TrendingUp className="w-3 h-3" />
                  <span>+5%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Chart Placeholder */}
          <div className="bg-[var(--studio-sidebar)] border border-[var(--studio-border)] rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-lg">Динамика просмотров</h3>
              <div className="flex gap-2">
                <div className="flex items-center gap-2 text-xs text-[var(--studio-muted)]">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  Текущий период
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--studio-muted)]">
                  <div className="w-3 h-3 bg-gray-300 rounded-full" />
                  Прошлый период
                </div>
              </div>
            </div>
            <div className="h-[300px] flex items-end justify-between gap-2 md:gap-4">
              {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col gap-2 items-center group">
                  <div className="w-full relative">
                    <div className="absolute bottom-0 w-full bg-gray-100 dark:bg-gray-800 rounded-t-lg h-[100px] opacity-20" style={{ height: `${h * 0.7}%` }} />
                    <div className="bg-blue-500 rounded-t-lg transition-all duration-500 group-hover:bg-blue-600 cursor-pointer" style={{ height: `${h}%` }} />
                  </div>
                  <span className="text-[8px] md:text-[10px] text-[var(--studio-muted)] font-bold">{i + 1} апр</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeMainTab === 'content' && (
        <div className="bg-[var(--studio-sidebar)] border border-[var(--studio-border)] rounded-3xl p-6 md:p-8 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="font-bold text-lg text-[var(--studio-text)]">Самый популярный контент</h2>
            <div className="flex bg-[var(--studio-hover)] p-1 rounded-xl border border-[var(--studio-border)] overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'Все' },
                { id: 'video', label: 'Видео' },
                { id: 'short', label: 'Shorts' },
                { id: 'music', label: 'Музыка' },
                { id: 'photo', label: 'Фото' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPopularTab(tab.id as any)}
                  className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${
                    popularTab === tab.id 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {[...videos]
              .filter(v => {
                if (popularTab === 'all') return true;
                if (popularTab === 'video') return v.type === 'video' || (!v.type && !v.isShort && !v.isMusic);
                if (popularTab === 'short') return v.type === 'short' || v.isShort;
                if (popularTab === 'music') return v.type === 'music' || v.isMusic;
                if (popularTab === 'photo') return v.type === 'photo' || v.isPhoto;
                return true;
              })
              .sort((a, b) => (b.views || 0) - (a.views || 0))
              .slice(0, 10)
              .map((video, idx) => (
              <div key={video.id} className="flex items-center gap-4 group p-3 hover:bg-[var(--studio-hover)] rounded-2xl transition-all cursor-pointer border border-transparent hover:border-[var(--studio-border)]">
                <span className="text-lg font-bold text-[var(--studio-muted)] w-6 text-center">{idx + 1}</span>
                <div className={`relative ${video.isShort ? 'w-12 aspect-[9/16]' : video.isPhoto ? 'w-16 aspect-square' : 'w-24 aspect-video'} rounded-xl overflow-hidden border border-[var(--studio-border)] flex-shrink-0 shadow-sm`}>
                  <img src={video.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-[var(--studio-text)] truncate group-hover:text-blue-600 transition-colors">{video.title}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-[var(--studio-muted)] flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {video.views?.toLocaleString()}
                    </p>
                    <p className="text-xs text-[var(--studio-muted)] flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" /> {video.likes?.toLocaleString()}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--studio-muted)] group-hover:text-blue-600 transition-transform group-hover:translate-x-1" />
              </div>
            ))}
            {videos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-[var(--studio-muted)]">
                <BarChart2 className="w-16 h-16 mb-4 opacity-10" />
                <p className="text-sm italic font-medium">Данные о контенте отсутствуют</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeMainTab === 'audience' && (
        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Subscriber Growth */}
            <div className="bg-[var(--studio-sidebar)] border border-[var(--studio-border)] rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" /> Рост подписчиков
              </h3>
              <div className="space-y-6">
                <div className="p-4 bg-[var(--studio-hover)] rounded-2xl border border-[var(--studio-border)]">
                  <p className="text-[10px] text-[var(--studio-muted)] font-bold uppercase tracking-widest mb-1">За день</p>
                  <p className="text-2xl font-bold text-[var(--studio-text)]">+12</p>
                </div>
                <div className="p-4 bg-[var(--studio-hover)] rounded-2xl border border-[var(--studio-border)]">
                  <p className="text-[10px] text-[var(--studio-muted)] font-bold uppercase tracking-widest mb-1">За месяц</p>
                  <p className="text-2xl font-bold text-[var(--studio-text)]">+342</p>
                </div>
                <div className="p-4 bg-[var(--studio-hover)] rounded-2xl border border-[var(--studio-border)]">
                  <p className="text-[10px] text-[var(--studio-muted)] font-bold uppercase tracking-widest mb-1">За год</p>
                  <p className="text-2xl font-bold text-[var(--studio-text)]">+4,210</p>
                </div>
              </div>
            </div>

            {/* Demographics */}
            <div className="bg-[var(--studio-sidebar)] border border-[var(--studio-border)] rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-500" /> Демография
              </h3>
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold text-[var(--studio-muted)] uppercase tracking-widest mb-4">Возраст</p>
                  <div className="space-y-4">
                    {[
                      { range: '13-17', val: 12 },
                      { range: '18-24', val: 45 },
                      { range: '25-34', val: 28 },
                      { range: '35-44', val: 10 },
                      { range: '45+', val: 5 }
                    ].map(item => (
                      <div key={item.range} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-[var(--studio-text)]">{item.range}</span>
                          <span className="text-[var(--studio-muted)]">{item.val}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--studio-hover)] rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.val}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t border-[var(--studio-border)]">
                  <p className="text-xs font-bold text-[var(--studio-muted)] uppercase tracking-widest mb-4">Пол</p>
                  <div className="flex gap-4">
                    <div className="flex-1 text-center p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20">
                      <p className="text-xs font-bold text-blue-600">Мужчины</p>
                      <p className="text-lg font-bold text-blue-600">62%</p>
                    </div>
                    <div className="flex-1 text-center p-3 bg-pink-50 dark:bg-pink-900/10 rounded-xl border border-pink-100 dark:border-pink-900/20">
                      <p className="text-xs font-bold text-pink-600">Женщины</p>
                      <p className="text-lg font-bold text-pink-600">38%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Geography & Subscription */}
            <div className="bg-[var(--studio-sidebar)] border border-[var(--studio-border)] rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-500" /> География и подписки
              </h3>
              <div className="space-y-8">
                <div>
                  <p className="text-xs font-bold text-[var(--studio-muted)] uppercase tracking-widest mb-4">Топ регионов</p>
                  <div className="space-y-4">
                    {[
                      { name: 'Россия', val: 82 },
                      { name: 'Казахстан', val: 8 },
                      { name: 'Беларусь', val: 5 },
                      { name: 'Другие', val: 5 }
                    ].map(item => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3 text-[var(--studio-muted)]" />
                          <span className="font-medium text-[var(--studio-text)]">{item.name}</span>
                        </div>
                        <span className="font-bold text-[var(--studio-muted)]">{item.val}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="pt-6 border-t border-[var(--studio-border)] space-y-4">
                  <p className="text-xs font-bold text-[var(--studio-muted)] uppercase tracking-widest mb-4">Статус подписки</p>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-[var(--studio-text)] flex items-center gap-1.5">
                          <UserMinus className="w-3.5 h-3.5 text-red-500" /> Без подписки
                        </span>
                        <span className="text-[var(--studio-muted)]">74%</span>
                      </div>
                      <div className="w-full h-2 bg-[var(--studio-hover)] rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: '74%' }} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-[var(--studio-text)] flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-green-500" /> С подпиской
                        </span>
                        <span className="text-[var(--studio-muted)]">26%</span>
                      </div>
                      <div className="w-full h-2 bg-[var(--studio-hover)] rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: '26%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
