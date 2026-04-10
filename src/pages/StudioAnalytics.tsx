import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { VideoType } from '../types';
import { Eye, ThumbsUp, TrendingUp, BarChart2, PieChart, Calendar, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function StudioAnalytics() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalLikes: 0,
    avgViews: 0,
    topVideo: null as VideoType | null
  });

  useEffect(() => {
    if (!user) return;

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

        setVideos(data);
        setStats({
          totalViews: views,
          totalLikes: likes,
          avgViews: data.length > 0 ? Math.round(views / data.length) : 0,
          topVideo: topV
        });
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
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
        <h1 className="text-2xl font-bold text-gray-900">Аналитика канала</h1>
        <div className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-sm text-sm font-bold text-gray-600 shadow-sm uppercase tracking-wider">
          <Calendar className="w-4 h-4" />
          Последние 28 дней
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Просмотры</p>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Eye className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalViews.toLocaleString()}</p>
            <div className="flex items-center gap-1 text-green-600 text-xs mt-2 font-bold">
              <TrendingUp className="w-3 h-3" />
              <span>+12%</span>
              <span className="text-gray-400 font-medium ml-1">vs прошлый период</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Лайки</p>
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <ThumbsUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalLikes.toLocaleString()}</p>
            <div className="flex items-center gap-1 text-green-600 text-xs mt-2 font-bold">
              <TrendingUp className="w-3 h-3" />
              <span>+5%</span>
              <span className="text-gray-400 font-medium ml-1">vs прошлый период</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Среднее на видео</p>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <BarChart2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{stats.avgViews.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-2 font-medium">Показатель вовлеченности</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Content */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-6">
          <h2 className="font-bold text-lg text-gray-900">Самый популярный контент</h2>
          <div className="space-y-4">
            {[...videos].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5).map((video, idx) => (
              <div key={video.id} className="flex items-center gap-4 group p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                <span className="text-lg font-bold text-gray-200 w-6 text-center">{idx + 1}</span>
                <div className="relative w-20 aspect-video rounded overflow-hidden border border-gray-100 flex-shrink-0">
                  <img src={video.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-gray-800 truncate group-hover:text-blue-600 transition-colors">{video.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">{video.views?.toLocaleString()} просмотров</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600" />
              </div>
            ))}
            {videos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <BarChart2 className="w-12 h-12 mb-4 opacity-10" />
                <p className="text-sm italic">Данные отсутствуют</p>
              </div>
            )}
          </div>
        </div>

        {/* Audience Overview (Mock) */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-6">
          <h2 className="font-bold text-lg text-gray-900">Аудитория</h2>
          <div className="space-y-8">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-medium">Новые зрители</span>
                <span className="font-bold text-gray-900">65%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '65%' }} />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-medium">Постоянные зрители</span>
                <span className="font-bold text-gray-900">35%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: '35%' }} />
              </div>
            </div>
            
            <div className="pt-6 grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Устройства</p>
                <p className="text-sm font-bold text-gray-800">Мобильные (82%)</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Регионы</p>
                <p className="text-sm font-bold text-gray-800">Россия (94%)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
