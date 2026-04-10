import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { VideoType } from '../types';
import { Eye, ThumbsUp, MessageSquare, Users, TrendingUp, Play, Plus, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function StudioDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalLikes: 0,
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
        const vData = vSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoType));
        setVideos(vData);

        const allVq = query(collection(db, 'videos'), where('authorId', '==', user.uid));
        const allVSnapshot = await getDocs(allVq);
        let views = 0;
        let likes = 0;
        allVSnapshot.docs.forEach(doc => {
          const d = doc.data();
          views += d.views || 0;
          likes += d.likes || 0;
        });

        const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
        const userData = userDoc.docs[0]?.data();

        setStats({
          totalViews: views,
          totalLikes: likes,
          subscribers: userData?.subscribers || 0
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Панель управления каналом</h1>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/studio/upload')}
            className="bg-blue-600 text-white px-4 py-2 rounded-sm font-bold text-sm uppercase flex items-center gap-2 hover:bg-blue-700 transition-all shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Создать
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Latest Video Performance */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col">
          <h2 className="font-bold text-lg mb-6">Эффективность последнего видео</h2>
          {videos.length > 0 ? (
            <div className="space-y-6 flex-1 flex flex-col">
              <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-100 group cursor-pointer" onClick={() => navigate(`/video/${videos[0].id}`)}>
                <img src={videos[0].thumbnailUrl} alt={videos[0].title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm line-clamp-2 hover:text-blue-600 cursor-pointer" onClick={() => navigate(`/video/${videos[0].id}`)}>{videos[0].title}</h3>
                <p className="text-xs text-gray-500">Опубликовано: {formatDistanceToNow(new Date(videos[0].createdAt), { addSuffix: true, locale: ru })}</p>
              </div>
              <div className="space-y-4 pt-4 border-t border-gray-50">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Eye className="w-4 h-4" />
                    <span>Просмотры</span>
                  </div>
                  <span className="font-bold">{videos[0].views?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <ThumbsUp className="w-4 h-4" />
                    <span>Лайки</span>
                  </div>
                  <span className="font-bold">{videos[0].likes?.toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-auto pt-6">
                <Link to="/studio/content" className="flex items-center justify-center gap-2 w-full text-blue-600 text-xs font-bold hover:bg-blue-50 py-2 rounded transition-colors uppercase tracking-wider">
                  Перейти к аналитике видео
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-gray-400">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Play className="w-8 h-8 opacity-20" />
              </div>
              <p className="text-sm">Загрузите видео, чтобы увидеть статистику</p>
            </div>
          )}
        </div>

        {/* Channel Analytics */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col">
          <h2 className="font-bold text-lg mb-6">Аналитика по каналу</h2>
          <div className="space-y-8 flex-1">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Подписчики</p>
              <p className="text-4xl font-bold text-gray-900">{stats.subscribers.toLocaleString()}</p>
              <div className="flex items-center gap-1 text-green-600 text-xs mt-1 font-medium">
                <TrendingUp className="w-3 h-3" />
                <span>+0 за последние 28 дней</span>
              </div>
            </div>
            
            <div className="pt-6 border-t border-gray-50 space-y-4">
              <h3 className="font-bold text-sm text-gray-800">Сводка (все время)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Просмотры</p>
                  <p className="text-lg font-bold">{stats.totalViews.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Лайки</p>
                  <p className="text-lg font-bold">{stats.totalLikes.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-auto pt-6">
            <Link to="/studio/analytics" className="flex items-center justify-center gap-2 w-full text-blue-600 text-xs font-bold hover:bg-blue-50 py-2 rounded transition-colors uppercase tracking-wider">
              Перейти к аналитике канала
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Recent Content List */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex flex-col">
          <h2 className="font-bold text-lg mb-6">Последний контент</h2>
          <div className="space-y-4 flex-1">
            {videos.slice(1).map(video => (
              <div key={video.id} className="flex gap-4 items-center group cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors" onClick={() => navigate(`/video/${video.id}`)}>
                <div className="relative w-24 aspect-video rounded overflow-hidden border border-gray-100 flex-shrink-0">
                  <img src={video.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-gray-800 line-clamp-1 group-hover:text-blue-600 transition-colors">{video.title}</h4>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                    <span>{video.views} просм.</span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(video.createdAt), { addSuffix: true, locale: ru })}</span>
                  </div>
                </div>
              </div>
            ))}
            {videos.length > 1 ? (
              <div className="mt-auto pt-6">
                <Link to="/studio/content" className="flex items-center justify-center gap-2 w-full text-blue-600 text-xs font-bold hover:bg-blue-50 py-2 rounded transition-colors uppercase tracking-wider">
                  Перейти к контенту
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ) : videos.length === 1 ? (
              <div className="flex-1 flex items-center justify-center text-center py-12 text-gray-400 italic text-sm">
                Больше видео не найдено
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
