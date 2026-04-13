import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { VideoType } from '../types';
import { Eye, ThumbsUp, TrendingUp, BarChart2, PieChart, Calendar, ChevronRight, Clock, Users, Globe, UserCheck, UserMinus, MapPin, Search, Snowflake } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function StudioAnalytics() {
  const { user, activeChannel } = useAuth();
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState<'overview' | 'content' | 'audience'>('overview');
  const [stats, setStats] = useState({
    totalViews: 0,
    totalLikes: 0,
    totalIces: 0,
    avgViews: 0,
    subscribers: 0,
    watchTime: 0,
    topVideo: null as VideoType | null
  });
  const [popularTab, setPopularTab] = useState<'all' | 'video' | 'short' | 'music' | 'photo'>('all');

  useEffect(() => {
    if (!user || !activeChannel) return;

    const unsubscribeSub = onSnapshot(doc(db, 'channels', activeChannel.id), (docSnap) => {
      if (docSnap.exists()) {
        setStats(prev => ({ ...prev, subscribers: docSnap.data().subscribers || 0 }));
      }
    });

    const fetchAnalytics = async () => {
      try {
        const q = query(collection(db, 'videos'), where('authorId', '==', activeChannel.id));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoType));
        
        let views = 0;
        let likes = 0;
        let ices = 0;
        let topV = data[0] || null;

        data.forEach(v => {
          views += v.views || 0;
          likes += v.likes || 0;
          ices += v.ices || 0;
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
          totalIces: ices,
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
  }, [user, activeChannel?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-primary)]">Аналитика канала</h1>
          <p className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-widest">Глубокий анализ эффективности контента</p>
        </div>
        <div className="flex items-center gap-3 bg-[var(--surface)] border border-[var(--border)] px-5 py-2.5 rounded-2xl text-[10px] font-black text-[var(--text-secondary)] shadow-sm uppercase tracking-[0.2em] w-fit">
          <Calendar className="w-4 h-4 text-blue-600" />
          Последние 28 дней
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex bg-[var(--surface)] border border-[var(--border)] p-1.5 rounded-2xl w-fit overflow-x-auto no-scrollbar">
        {[
          { id: 'overview', label: 'Обзор', icon: BarChart2 },
          { id: 'content', label: 'Контент', icon: TrendingUp },
          { id: 'audience', label: 'Аудитория', icon: Users }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveMainTab(tab.id as any)}
            className={`flex items-center gap-3 px-8 py-3 text-[11px] font-black transition-all rounded-xl whitespace-nowrap uppercase tracking-widest ${
              activeMainTab === tab.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeMainTab === 'overview' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { label: 'Просмотры', val: stats.totalViews, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-500/5', trend: '+12%' },
              { label: 'Время (часы)', val: stats.watchTime, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-500/5', trend: '+8%' },
              { label: 'Подписчики', val: stats.subscribers, icon: Users, color: 'text-green-600', bg: 'bg-green-500/5', trend: '+4%' },
              { label: 'Лайки', val: stats.totalLikes, icon: ThumbsUp, color: 'text-red-600', bg: 'bg-red-500/5', trend: '+5%' },
              { label: 'Снежинки', val: stats.totalIces, icon: Snowflake, color: 'text-blue-400', bg: 'bg-blue-400/5', trend: '+7%' }
            ].map((s, i) => (
              <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-8 shadow-sm space-y-6 group hover:border-blue-500/30 transition-all">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">{s.label}</p>
                  <div className={`p-3 ${s.bg} rounded-2xl ${s.color} group-hover:scale-110 transition-transform`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-black text-[var(--text-primary)] tracking-tight">{s.val.toLocaleString()}</p>
                  <div className="flex items-center gap-1.5 text-green-600 text-[10px] mt-3 font-black uppercase tracking-widest">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>{s.trend}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Main Chart */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2.5rem] p-10 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
              <div className="space-y-1">
                <h3 className="font-black text-xl text-[var(--text-primary)] uppercase tracking-tight">Динамика просмотров</h3>
                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Ежедневная активность за текущий период</p>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-3 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">
                  <div className="w-3 h-3 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
                  Текущий
                </div>
                <div className="flex items-center gap-3 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">
                  <div className="w-3 h-3 bg-[var(--border)] rounded-full" />
                  Прошлый
                </div>
              </div>
            </div>
            <div className="h-[350px] flex items-end justify-between gap-3 md:gap-6">
              {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col gap-4 items-center group">
                  <div className="w-full relative h-full flex items-end">
                    <div className="absolute bottom-0 w-full bg-[var(--hover)] rounded-t-xl h-[100px] opacity-50" style={{ height: `${h * 0.7}%` }} />
                    <div className="w-full bg-blue-600 rounded-t-xl transition-all duration-700 group-hover:bg-blue-700 cursor-pointer shadow-lg group-hover:shadow-blue-600/20" style={{ height: `${h}%` }} />
                  </div>
                  <span className="text-[9px] text-[var(--text-secondary)] font-black uppercase tracking-tighter">{i + 1} апр</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeMainTab === 'content' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
            {/* Top Videos */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2.5rem] p-10 shadow-sm space-y-8">
              <div className="space-y-1">
                <h2 className="font-black text-xl text-[var(--text-primary)] uppercase tracking-tight">Топ видео</h2>
                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Лучшие обычные видео по просмотрам</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {videos
                  .filter(v => v.type === 'video' || (!v.type && !v.isShort && !v.isMusic && !v.isPhoto))
                  .sort((a, b) => (b.views || 0) - (a.views || 0))
                  .slice(0, 10)
                  .map((video, idx) => (
                  <div key={video.id} className="flex items-center gap-6 group p-4 hover:bg-[var(--hover)] rounded-3xl transition-all cursor-pointer border border-transparent hover:border-[var(--border)]">
                    <span className="text-xl font-black text-[var(--text-secondary)]/30 w-8 text-center font-mono">{String(idx + 1).padStart(2, '0')}</span>
                    <div className="relative w-32 aspect-video rounded-2xl overflow-hidden border border-[var(--border)] flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      <img src={video.thumbnailUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-[var(--text-primary)] truncate group-hover:text-blue-600 transition-colors uppercase tracking-tight">{video.title}</h4>
                      <div className="flex items-center gap-6 mt-3">
                        <p className="text-[10px] font-black text-[var(--text-secondary)] flex items-center gap-2 uppercase tracking-widest">
                          <Eye className="w-3.5 h-3.5 text-blue-600" /> {video.views?.toLocaleString()}
                        </p>
                        <p className="text-[10px] font-black text-[var(--text-secondary)] flex items-center gap-2 uppercase tracking-widest">
                          <ThumbsUp className="w-3.5 h-3.5 text-red-600" /> {video.likes?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {videos.filter(v => v.type === 'video' || (!v.type && !v.isShort && !v.isMusic && !v.isPhoto)).length === 0 && (
                  <p className="text-center py-10 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Нет данных</p>
                )}
              </div>
            </div>

            {/* Top Shorts */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2.5rem] p-10 shadow-sm space-y-8">
              <div className="space-y-1">
                <h2 className="font-black text-xl text-[var(--text-primary)] uppercase tracking-tight">Топ Shorts</h2>
                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Лучшие короткие видео по просмотрам</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {videos
                  .filter(v => v.type === 'short' || v.isShort)
                  .sort((a, b) => (b.views || 0) - (a.views || 0))
                  .slice(0, 10)
                  .map((video, idx) => (
                  <div key={video.id} className="flex items-center gap-6 group p-4 hover:bg-[var(--hover)] rounded-3xl transition-all cursor-pointer border border-transparent hover:border-[var(--border)]">
                    <span className="text-xl font-black text-[var(--text-secondary)]/30 w-8 text-center font-mono">{String(idx + 1).padStart(2, '0')}</span>
                    <div className="relative w-14 aspect-[9/16] rounded-2xl overflow-hidden border border-[var(--border)] flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      <img src={video.thumbnailUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-[var(--text-primary)] truncate group-hover:text-blue-600 transition-colors uppercase tracking-tight">{video.title}</h4>
                      <div className="flex items-center gap-6 mt-3">
                        <p className="text-[10px] font-black text-[var(--text-secondary)] flex items-center gap-2 uppercase tracking-widest">
                          <Eye className="w-3.5 h-3.5 text-blue-600" /> {video.views?.toLocaleString()}
                        </p>
                        <p className="text-[10px] font-black text-[var(--text-secondary)] flex items-center gap-2 uppercase tracking-widest">
                          <ThumbsUp className="w-3.5 h-3.5 text-red-600" /> {video.likes?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {videos.filter(v => v.type === 'short' || v.isShort).length === 0 && (
                  <p className="text-center py-10 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Нет данных</p>
                )}
              </div>
            </div>
          </div>

          {/* Other Content (Music & Photos) */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2.5rem] p-10 shadow-sm space-y-8">
            <div className="space-y-1">
              <h2 className="font-black text-xl text-[var(--text-primary)] uppercase tracking-tight">Другой контент</h2>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Музыка и фотографии</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Music */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Топ Музыки</h3>
                <div className="space-y-2">
                  {videos
                    .filter(v => v.type === 'music' || v.isMusic)
                    .sort((a, b) => (b.views || 0) - (a.views || 0))
                    .slice(0, 5)
                    .map((video, idx) => (
                    <div key={video.id} className="flex items-center gap-4 p-3 hover:bg-[var(--hover)] rounded-2xl transition-all border border-transparent hover:border-[var(--border)]">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-[var(--border)] flex-shrink-0">
                        <img src={video.thumbnailUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-[var(--text-primary)] truncate uppercase tracking-tight">{video.title}</p>
                        <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">{video.views} просмотров</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Photos */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-purple-600 uppercase tracking-[0.2em]">Топ Фото</h3>
                <div className="space-y-2">
                  {videos
                    .filter(v => v.type === 'photo' || v.isPhoto)
                    .sort((a, b) => (b.views || 0) - (a.views || 0))
                    .slice(0, 5)
                    .map((video, idx) => (
                    <div key={video.id} className="flex items-center gap-4 p-3 hover:bg-[var(--hover)] rounded-2xl transition-all border border-transparent hover:border-[var(--border)]">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-[var(--border)] flex-shrink-0">
                        <img src={video.thumbnailUrl} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-[var(--text-primary)] truncate uppercase tracking-tight">{video.title}</p>
                        <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">{video.views} просмотров</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeMainTab === 'audience' && (
        stats.totalViews < 50 ? (
          <div className="flex flex-col items-center justify-center py-32 text-[var(--text-secondary)] animate-in fade-in duration-700 bg-[var(--surface)] border border-[var(--border)] rounded-[2.5rem] shadow-sm">
            <div className="w-24 h-24 bg-[var(--hover)] rounded-[2rem] flex items-center justify-center mb-8">
              <Users className="w-12 h-12 opacity-30" />
            </div>
            <h3 className="text-xl font-black text-[var(--text-primary)] mb-3 uppercase tracking-tight">Недостаточно данных</h3>
            <p className="text-xs font-medium max-w-sm text-center px-8 leading-relaxed text-[var(--text-secondary)]">Для отображения подробной аналитики аудитории необходимо больше просмотров и подписчиков. Продолжайте публиковать контент!</p>
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Subscriber Growth */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2.5rem] p-10 shadow-sm space-y-10">
                <div className="space-y-1">
                  <h3 className="font-black text-lg flex items-center gap-3 uppercase tracking-tight">
                    <TrendingUp className="w-6 h-6 text-green-600" /> Статистика подписчиков
                  </h3>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Динамика роста вашей базы зрителей</p>
                </div>
                <div className="space-y-6">
                  <div className="p-6 bg-[var(--hover)] rounded-3xl border border-[var(--border)] group hover:border-blue-500/30 transition-all">
                    <p className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-[0.2em] mb-2">Всего подписчиков</p>
                    <p className="text-3xl font-black text-[var(--text-primary)] tracking-tight">{stats.subscribers.toLocaleString()}</p>
                  </div>
                  <div className="p-6 bg-[var(--hover)] rounded-3xl border border-[var(--border)] group hover:border-green-500/30 transition-all">
                    <p className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-[0.2em] mb-2">Новые (28 дн.)</p>
                    <p className="text-3xl font-black text-green-600 tracking-tight">+{Math.round(stats.subscribers * 0.15)}</p>
                  </div>
                  <div className="p-6 bg-[var(--hover)] rounded-3xl border border-[var(--border)] group hover:border-purple-500/30 transition-all">
                    <p className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-[0.2em] mb-2">Просмотры на подписчика</p>
                    <p className="text-3xl font-black text-[var(--text-primary)] tracking-tight">{(stats.totalViews / (stats.subscribers || 1)).toFixed(1)}</p>
                  </div>
                </div>
              </div>

              {/* Demographics */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2.5rem] p-10 shadow-sm space-y-10">
                <div className="space-y-1">
                  <h3 className="font-black text-lg flex items-center gap-3 uppercase tracking-tight">
                    <PieChart className="w-6 h-6 text-blue-600" /> Демография
                  </h3>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Возрастной и половой состав аудитории</p>
                </div>
                <div className="space-y-10">
                  <div className="space-y-6">
                    {[
                      { range: '13-17', val: 15 },
                      { range: '18-24', val: 40 },
                      { range: '25-34', val: 30 },
                      { range: '35-44', val: 10 },
                      { range: '45+', val: 5 }
                    ].map(item => (
                      <div key={item.range} className="space-y-2.5">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-[var(--text-primary)]">{item.range}</span>
                          <span className="text-[var(--text-secondary)]">{item.val}%</span>
                        </div>
                        <div className="w-full h-2 bg-[var(--hover)] rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.3)]" style={{ width: `${item.val}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-10 border-t border-[var(--border)]">
                    <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-6">Распределение по полу</p>
                    <div className="flex gap-6">
                      <div className="flex-1 text-center p-5 bg-blue-500/5 rounded-3xl border border-blue-500/10">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Мужчины</p>
                        <p className="text-2xl font-black text-blue-600">58%</p>
                      </div>
                      <div className="flex-1 text-center p-5 bg-pink-500/5 rounded-3xl border border-pink-500/10">
                        <p className="text-[10px] font-black text-pink-600 uppercase tracking-widest mb-1">Женщины</p>
                        <p className="text-2xl font-black text-pink-600">42%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Geography & Subscription */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2.5rem] p-10 shadow-sm space-y-10">
                <div className="space-y-1">
                  <h3 className="font-black text-lg flex items-center gap-3 uppercase tracking-tight">
                    <Globe className="w-6 h-6 text-purple-600" /> География
                  </h3>
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Региональное распределение зрителей</p>
                </div>
                <div className="space-y-10">
                  <div className="space-y-6">
                    {[
                      { name: 'Россия', val: 75 },
                      { name: 'Украина', val: 12 },
                      { name: 'Казахстан', val: 8 },
                      { name: 'Другие', val: 5 }
                    ].map(item => (
                      <div key={item.name} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[var(--hover)] rounded-xl group-hover:bg-purple-500/10 transition-colors">
                            <MapPin className="w-4 h-4 text-purple-600" />
                          </div>
                          <span className="text-xs font-black text-[var(--text-primary)] uppercase tracking-tight">{item.name}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-[var(--text-secondary)]">{item.val}%</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-10 border-t border-[var(--border)] space-y-8">
                    <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Статус подписки</p>
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-[var(--text-primary)] flex items-center gap-2">
                            <UserMinus className="w-4 h-4 text-red-600" /> Без подписки
                          </span>
                          <span className="text-[var(--text-secondary)]">65%</span>
                        </div>
                        <div className="w-full h-2.5 bg-[var(--hover)] rounded-full overflow-hidden">
                          <div className="h-full bg-red-600 rounded-full shadow-[0_0_8px_rgba(220,38,38,0.3)]" style={{ width: '65%' }} />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-[var(--text-primary)] flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-green-600" /> С подпиской
                          </span>
                          <span className="text-[var(--text-secondary)]">35%</span>
                        </div>
                        <div className="w-full h-2.5 bg-[var(--hover)] rounded-full overflow-hidden">
                          <div className="h-full bg-green-600 rounded-full shadow-[0_0_8px_rgba(22,163,74,0.3)]" style={{ width: '35%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
