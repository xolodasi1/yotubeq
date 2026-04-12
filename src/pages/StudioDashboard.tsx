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
  const { user } = useAuth();
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
    if (!user) return;

    const fetchStudioData = async () => {
      try {
        const vq = query(
          collection(db, 'videos'),
          where('authorId', '==', user.uid),
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

        const allVq = query(collection(db, 'videos'), where('authorId', '==', user.uid));
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
          subscribers: user.subscribers || 0
        });
      } catch (error) {
        console.error("Error fetching studio data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudioData();
  }, [user]);

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
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6 md:space-y-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">Панель управления каналом</h1>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/studio/upload')}
            className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm uppercase flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-5 h-5" />
            Создать
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Latest Video Performance */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 md:p-6 shadow-sm flex flex-col">
          <h2 className="font-bold text-lg mb-6 text-[var(--text-primary)]">Эффективность последнего видео</h2>
          {videos.length > 0 ? (
            <div className="space-y-6 flex-1 flex flex-col">
              <div className="relative aspect-video rounded-xl overflow-hidden border border-[var(--border)] group cursor-pointer" onClick={() => navigate(`/video/${videos[0].id}`)}>
                <img src={videos[0].thumbnailUrl} alt={videos[0].title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm line-clamp-2 hover:text-blue-600 cursor-pointer text-[var(--text-primary)]" onClick={() => navigate(`/video/${videos[0].id}`)}>{videos[0].title}</h3>
                <p className="text-xs text-[var(--text-secondary)]">Опубликовано: {videos[0].createdAt ? formatDistanceToNow(new Date(videos[0].createdAt), { addSuffix: true, locale: ru }) : 'Неизвестно'}</p>
              </div>
              <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Eye className="w-4 h-4" />
                    <span>Просмотры</span>
                  </div>
                  <span className="font-bold text-[var(--text-primary)]">{videos[0].views?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <ThumbsUp className="w-4 h-4" />
                    <span>Лайки</span>
                  </div>
                  <span className="font-bold text-[var(--text-primary)]">{videos[0].likes?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Snowflake className="w-4 h-4 text-blue-400" />
                    <span>Снежинки</span>
                  </div>
                  <span className="font-bold text-[var(--text-primary)]">{videos[0].ices?.toLocaleString() || 0}</span>
                </div>
              </div>
              <div className="mt-auto pt-6">
                <Link to="/studio/content" className="flex items-center justify-center gap-2 w-full text-blue-600 text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-900/10 py-3 rounded-xl transition-colors uppercase tracking-wider">
                  Перейти к аналитике видео
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-[var(--text-secondary)]">
              <div className="w-16 h-16 bg-[var(--hover)] rounded-full flex items-center justify-center mb-4">
                <Play className="w-8 h-8 opacity-20" />
              </div>
              <p className="text-sm">Загрузите видео, чтобы увидеть статистику</p>
            </div>
          )}
        </div>

        {/* Channel Analytics */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 md:p-6 shadow-sm flex flex-col">
          <h2 className="font-bold text-lg mb-6 text-[var(--text-primary)]">Аналитика по каналу</h2>
          <div className="space-y-8 flex-1">
            <div>
              <p className="text-xs text-[var(--text-secondary)] font-medium uppercase tracking-wider mb-2">Подписчики</p>
              <p className="text-4xl font-bold text-[var(--text-primary)]">{stats.subscribers.toLocaleString()}</p>
              <div className="flex items-center gap-1 text-green-600 text-xs mt-1 font-medium">
                <TrendingUp className="w-3 h-3" />
                <span>+0 за последние 28 дней</span>
              </div>
            </div>
            
            <div className="pt-6 border-t border-[var(--border)] space-y-4">
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Сводка (все время)</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[var(--hover)] p-3 rounded-xl border border-[var(--border)]">
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold mb-1">Просмотры</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">{stats.totalViews.toLocaleString()}</p>
                </div>
                <div className="bg-[var(--hover)] p-3 rounded-xl border border-[var(--border)]">
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold mb-1">Лайки</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">{stats.totalLikes.toLocaleString()}</p>
                </div>
                <div className="bg-[var(--hover)] p-3 rounded-xl border border-[var(--border)]">
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold mb-1">Снежинки</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">{stats.totalIces.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-auto pt-6">
            <Link to="/studio/analytics" className="flex items-center justify-center gap-2 w-full text-blue-600 text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-900/10 py-3 rounded-xl transition-colors uppercase tracking-wider">
              Перейти к аналитике канала
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Recent Content List */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 md:p-6 shadow-sm flex flex-col">
          <h2 className="font-bold text-lg mb-6 text-[var(--text-primary)]">Последний контент</h2>
          <div className="space-y-4 flex-1">
            {videos.slice(1).map(video => (
              <div key={video.id} className="flex gap-4 items-center group cursor-pointer p-2 hover:bg-[var(--hover)] rounded-xl transition-colors" onClick={() => navigate(`/video/${video.id}`)}>
                <div className="relative w-24 aspect-video rounded-lg overflow-hidden border border-[var(--border)] flex-shrink-0">
                  <img src={video.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-[var(--text-primary)] line-clamp-1 group-hover:text-blue-600 transition-colors">{video.title}</h4>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--text-secondary)]">
                    <span>{video.views} просм.</span>
                    <span>•</span>
                    <span>{video.createdAt ? formatDistanceToNow(new Date(video.createdAt), { addSuffix: true, locale: ru }) : 'Неизвестно'}</span>
                  </div>
                </div>
              </div>
            ))}
            {videos.length > 1 ? (
              <div className="mt-auto pt-6">
                <Link to="/studio/content" className="flex items-center justify-center gap-2 w-full text-blue-600 text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-900/10 py-3 rounded-xl transition-colors uppercase tracking-wider">
                  Перейти к контенту
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ) : videos.length === 1 ? (
              <div className="flex-1 flex items-center justify-center text-center py-12 text-gray-400 dark:text-gray-500 italic text-sm">
                Больше видео не найдено
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
