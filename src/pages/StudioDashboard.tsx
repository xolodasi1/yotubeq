import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { VideoType } from '../types';
import { Eye, ThumbsUp, MessageSquare, Users, TrendingUp, Play, Plus, ChevronRight, Snowflake } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

import { APP_LOGO_URL } from '../constants';

export default function StudioDashboard() {
  const { user, activeChannel } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalLikes: 0,
    totalIces: 0,
    subscribers: 0
  });

  useEffect(() => {
    if (!user || !activeChannel) return;

    const fetchStudioData = async () => {
      try {
        const vq = query(
          collection(db, 'videos'),
          where('authorId', '==', activeChannel.id),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const vSnapshot = await getDocs(vq);
        const vData = vSnapshot.docs.map(doc => {
          const videoData = doc.data();
          return {
            id: doc.id,
            ...videoData,
            createdAt: videoData.createdAt?.toDate?.()?.toISOString() || videoData.createdAt
          } as VideoType;
        });
        setVideos(vData);

        const allVq = query(collection(db, 'videos'), where('authorId', '==', activeChannel.id));
        const allVSnapshot = await getDocs(allVq);
        let views = 0;
        let likes = 0;
        let ices = 0;
        allVSnapshot.docs.forEach(doc => {
          const d = doc.data();
          views += d.views || 0;
          likes += d.likes || 0;
          ices += d.ices || 0;
        });

        setStats({
          totalViews: views,
          totalLikes: likes,
          totalIces: ices,
          subscribers: activeChannel.subscribers || 0
        });
      } catch (error) {
        console.error("Error fetching studio data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudioData();
  }, [user, activeChannel]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="relative">
          <img 
            src={APP_LOGO_URL} 
            alt="IceStudio Logo" 
            className="w-20 h-20 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.3)] animate-pulse object-contain"
            crossOrigin="anonymous"
          />
          <div className="absolute -inset-3 border-4 border-blue-600/20 border-t-blue-600 rounded-[1.75rem] animate-spin"></div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <h2 className="text-xl font-black tracking-tighter text-blue-600">IceStudio</h2>
          <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-primary)]">Панель управления</h1>
          <p className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-widest">Обзор канала и статистика</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/studio/upload')}
            className="flex-1 md:flex-none bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Создать контент
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Latest Video Performance */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col group hover:border-blue-500/50 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-sm uppercase tracking-widest text-[var(--text-secondary)]">Эффективность видео</h2>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          
          {videos.length > 0 ? (
            <div className="space-y-6 flex-1 flex flex-col">
              <div className="relative aspect-video rounded-xl overflow-hidden border border-[var(--border)] cursor-pointer" onClick={() => navigate(`/video/${videos[0].id}`)}>
                <img src={videos[0].thumbnailUrl} alt={videos[0].title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                  {videos[0].duration}
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-bold text-base line-clamp-2 hover:text-blue-600 cursor-pointer text-[var(--text-primary)] transition-colors" onClick={() => navigate(`/video/${videos[0].id}`)}>
                  {videos[0].title}
                </h3>
                <p className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">
                  {videos[0].createdAt ? formatDistanceToNow(new Date(videos[0].createdAt), { addSuffix: true, locale: ru }) : 'Неизвестно'}
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-[var(--border)]">
                <div className="flex justify-between items-center group/item">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Eye className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Просмотры</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{videos[0].views?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center group/item">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Лайки</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{videos[0].likes?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center group/item">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Snowflake className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold uppercase tracking-wider">Снежинки</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{videos[0].ices?.toLocaleString() || 0}</span>
                </div>
              </div>

              <div className="mt-auto pt-6">
                <Link to="/studio/content" className="flex items-center justify-center gap-2 w-full bg-[var(--hover)] text-[var(--text-primary)] text-[10px] font-bold py-3 rounded-xl transition-all uppercase tracking-widest hover:bg-blue-600 hover:text-white">
                  Подробная аналитика
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-[var(--text-secondary)]">
              <div className="w-16 h-16 bg-[var(--hover)] rounded-full flex items-center justify-center mb-4 border border-[var(--border)]">
                <Play className="w-8 h-8 opacity-20" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest">Нет контента</p>
              <p className="text-[10px] mt-2">Загрузите видео, чтобы увидеть статистику</p>
            </div>
          )}
        </div>

        {/* Channel Analytics */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col hover:border-blue-500/50 transition-colors">
          <h2 className="font-bold text-sm uppercase tracking-widest text-[var(--text-secondary)] mb-8">Аналитика канала</h2>
          
          <div className="space-y-10 flex-1">
            <div className="relative">
              <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mb-1">Всего подписчиков</p>
              <p className="text-5xl font-black text-[var(--text-primary)] tracking-tighter font-mono">
                {stats.subscribers.toLocaleString()}
              </p>
              <div className="flex items-center gap-1.5 text-green-500 text-[10px] mt-2 font-bold uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+0 за 28 дней</span>
              </div>
            </div>
            
            <div className="pt-8 border-t border-[var(--border)] space-y-6">
              <h3 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Сводка (все время)</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between p-4 bg-[var(--hover)] rounded-xl border border-[var(--border)] group hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <Eye className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Просмотры</span>
                  </div>
                  <p className="text-xl font-bold text-[var(--text-primary)] font-mono">{stats.totalViews.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between p-4 bg-[var(--hover)] rounded-xl border border-[var(--border)] group hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                      <ThumbsUp className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Лайки</span>
                  </div>
                  <p className="text-xl font-bold text-[var(--text-primary)] font-mono">{stats.totalLikes.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between p-4 bg-[var(--hover)] rounded-xl border border-[var(--border)] group hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-400/10 flex items-center justify-center text-blue-400">
                      <Snowflake className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Снежинки</span>
                  </div>
                  <p className="text-xl font-bold text-[var(--text-primary)] font-mono">{stats.totalIces.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-auto pt-6">
            <Link to="/studio/analytics" className="flex items-center justify-center gap-2 w-full bg-[var(--hover)] text-[var(--text-primary)] text-[10px] font-bold py-3 rounded-xl transition-all uppercase tracking-widest hover:bg-blue-600 hover:text-white">
              Аналитика канала
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Recent Content List */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col hover:border-blue-500/50 transition-colors">
          <h2 className="font-bold text-sm uppercase tracking-widest text-[var(--text-secondary)] mb-6">Последние публикации</h2>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {videos.slice(1).map(video => (
              <div key={video.id} className="flex gap-4 items-center group cursor-pointer p-3 hover:bg-[var(--hover)] rounded-xl transition-all border border-transparent hover:border-[var(--border)]" onClick={() => navigate(`/video/${video.id}`)}>
                <div className="relative w-24 aspect-video rounded-lg overflow-hidden border border-[var(--border)] flex-shrink-0 shadow-sm">
                  <img src={video.thumbnailUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="" />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-[var(--text-primary)] line-clamp-1 group-hover:text-blue-600 transition-colors">{video.title}</h4>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-[var(--text-secondary)] uppercase">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {video.views}</span>
                    <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {video.likes}</span>
                  </div>
                </div>
              </div>
            ))}
            {videos.length > 1 ? (
              <div className="mt-auto pt-6">
                <Link to="/studio/content" className="flex items-center justify-center gap-2 w-full bg-[var(--hover)] text-[var(--text-primary)] text-[10px] font-bold py-3 rounded-xl transition-all uppercase tracking-widest hover:bg-blue-600 hover:text-white">
                  Весь контент
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ) : videos.length === 1 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-[var(--text-secondary)]">
                <div className="w-12 h-12 bg-[var(--hover)] rounded-full flex items-center justify-center mb-3 opacity-20">
                  <Play className="w-6 h-6" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest italic">Больше ничего нет</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
