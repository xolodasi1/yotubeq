import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { VideoType } from '../types';
import { Eye, ThumbsUp, MessageSquare, Trash2, Edit, ExternalLink, Search, Filter, MoreVertical } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';

export default function StudioContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchVideos = async () => {
      try {
        const q = query(
          collection(db, 'videos'),
          where('authorId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoType));
        setVideos(data);
      } catch (error) {
        console.error("Error fetching studio content:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [user]);

  const handleDelete = async (videoId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить это видео?')) return;

    try {
      await deleteDoc(doc(db, 'videos', videoId));
      setVideos(videos.filter(v => v.id !== videoId));
      toast.success('Видео успешно удалено');
    } catch (error) {
      toast.error('Ошибка при удалении видео');
    }
  };

  const filteredVideos = videos.filter(v => 
    v.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Контент на канале</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-white">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по видео"
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded transition-colors uppercase tracking-wider">
              <Filter className="w-4 h-4" />
              Фильтр
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4 font-bold">Видео</th>
                <th className="px-6 py-4 font-bold">Дата</th>
                <th className="px-6 py-4 font-bold">Просмотры</th>
                <th className="px-6 py-4 font-bold">Лайки</th>
                <th className="px-6 py-4 font-bold text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredVideos.map((video) => (
                <tr key={video.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex gap-4 items-center min-w-[350px]">
                      <div className="relative w-32 aspect-video rounded overflow-hidden border border-gray-100 shrink-0 shadow-sm">
                        <img src={video.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded font-bold">
                          {video.duration}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-gray-900 truncate group-hover:text-blue-600 transition-colors cursor-pointer" onClick={() => navigate(`/video/${video.id}`)}>
                          {video.title}
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-1 mt-1">{video.description || 'Нет описания'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                    {video.createdAt ? format(new Date(video.createdAt), 'dd MMM yyyy', { locale: ru }) : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {video.views?.toLocaleString() || 0}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {video.likes?.toLocaleString() || 0}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => navigate(`/video/${video.id}`)}
                        className="p-2 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
                        title="Открыть"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-2 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
                        title="Редактировать"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(video.id)}
                        className="p-2 hover:bg-red-50 rounded-full text-red-600 transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredVideos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Search className="w-12 h-12 mb-4 opacity-10" />
                      <p className="text-sm italic">Контент не найден</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
