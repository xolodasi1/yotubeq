import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { VideoType } from '../types';
import { Eye, ThumbsUp, MessageSquare, Trash2, Edit, ExternalLink, Search, Filter, MoreVertical, BarChart2, X, Save, Snowflake } from 'lucide-react';
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

  const [activeTab, setActiveTab] = useState<'videos' | 'shorts' | 'music' | 'photos' | 'playlists'>('videos');
  const [editingVideo, setEditingVideo] = useState<VideoType | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [analyticsVideo, setAnalyticsVideo] = useState<VideoType | null>(null);

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
        const data = snapshot.docs.map(doc => {
          const videoData = doc.data();
          return {
            id: doc.id,
            ...videoData,
            createdAt: videoData.createdAt?.toDate?.()?.toISOString() || videoData.createdAt
          } as VideoType;
        });
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

  const handleEditClick = (video: VideoType) => {
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditDescription(video.description || '');
  };

  const handleSaveEdit = async () => {
    if (!editingVideo) return;
    setIsSaving(true);
    try {
      const videoRef = doc(db, 'videos', editingVideo.id);
      await updateDoc(videoRef, {
        title: editTitle,
        description: editDescription
      });
      setVideos(videos.map(v => v.id === editingVideo.id ? { ...v, title: editTitle, description: editDescription } : v));
      toast.success('Видео успешно обновлено');
      setEditingVideo(null);
    } catch (error) {
      console.error("Error updating video:", error);
      toast.error('Ошибка при обновлении видео');
    } finally {
      setIsSaving(false);
    }
  };

  const regularVideos = videos.filter(v => v.type === 'video' || (!v.type && !v.isShort && !v.isMusic && !v.isPhoto));
  const shortsVideos = videos.filter(v => v.type === 'short' || v.isShort);
  const musicVideos = videos.filter(v => v.type === 'music' || v.isMusic);
  const photoVideos = videos.filter(v => v.type === 'photo' || v.isPhoto);

  const displayedContent = 
    activeTab === 'videos' ? regularVideos : 
    activeTab === 'shorts' ? shortsVideos : 
    activeTab === 'music' ? musicVideos :
    activeTab === 'photos' ? photoVideos :
    [];

  const filteredVideos = displayedContent.filter(v => 
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
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">Контент на канале</h1>
      </div>

      <div className="flex gap-4 md:gap-6 border-b border-[var(--border)] overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('videos')}
          className={`pb-4 text-sm font-bold transition-colors relative ${
            activeTab === 'videos' ? 'text-blue-600' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Видео
          {activeTab === 'videos' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('shorts')}
          className={`pb-4 text-sm font-bold transition-colors relative ${
            activeTab === 'shorts' ? 'text-blue-600' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Shorts
          {activeTab === 'shorts' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('music')}
          className={`pb-4 text-sm font-bold transition-colors relative ${
            activeTab === 'music' ? 'text-blue-600' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Музыка
          {activeTab === 'music' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('photos')}
          className={`pb-4 text-sm font-bold transition-colors relative ${
            activeTab === 'photos' ? 'text-blue-600' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Фото
          {activeTab === 'photos' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('playlists')}
          className={`pb-4 text-sm font-bold transition-colors relative ${
            activeTab === 'playlists' ? 'text-blue-600' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Плейлисты
          {activeTab === 'playlists' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
          )}
        </button>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-[var(--border)] flex flex-col sm:flex-row gap-4 items-center justify-between bg-[var(--surface)]">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Поиск по контенту"
              className="w-full pl-10 pr-4 py-2 bg-[var(--hover)] border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-[var(--text-primary)]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--hover)] rounded transition-colors uppercase tracking-wider">
              <Filter className="w-4 h-4" />
              Фильтр
            </button>
          </div>
        </div>

        {/* Table/Card List */}
        <div className="overflow-x-auto">
          {activeTab === 'playlists' ? (
            <div className="p-12 text-center text-[var(--text-secondary)]">
              <p className="text-lg font-bold text-[var(--text-primary)]">Плейлисты в разработке</p>
              <p className="text-sm mt-2">Скоро вы сможете создавать и управлять плейлистами.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <table className="w-full text-left border-collapse hidden md:table">
                <thead className="bg-[var(--hover)] border-b border-[var(--border)] text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4 font-bold">{activeTab === 'photos' ? 'Фото' : activeTab === 'music' ? 'Трек' : 'Видео'}</th>
                    <th className="px-6 py-4 font-bold">Дата</th>
                    <th className="px-6 py-4 font-bold">Просмотры</th>
                    <th className="px-6 py-4 font-bold">Лайки</th>
                    <th className="px-6 py-4 font-bold">Снежинки</th>
                    <th className="px-6 py-4 font-bold text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredVideos.map((video) => (
                    <tr key={video.id} className="hover:bg-[var(--hover)] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex gap-4 items-center min-w-[350px]">
                          <div className={`relative ${activeTab === 'shorts' ? 'w-16 aspect-[9/16]' : activeTab === 'photos' ? 'w-24 aspect-square' : 'w-32 aspect-video'} rounded overflow-hidden border border-[var(--border)] shrink-0 shadow-sm`}>
                            <img src={video.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                            {activeTab !== 'photos' && (
                              <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded font-bold">
                                {video.duration}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-[var(--text-primary)] truncate group-hover:text-blue-600 transition-colors cursor-pointer" onClick={() => navigate(`/video/${video.id}`)}>
                              {video.title}
                            </h4>
                            <p className="text-xs text-[var(--text-secondary)] line-clamp-1 mt-1">{video.description || 'Нет описания'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)] whitespace-nowrap">
                        {video.createdAt ? format(new Date(video.createdAt), 'dd MMM yyyy', { locale: ru }) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-[var(--studio-text)]">
                        {video.views?.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-[var(--studio-text)]">
                        {video.likes?.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-[var(--studio-text)]">
                        {video.ices?.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => navigate(`/video/${video.id}`)}
                            className="p-2 hover:bg-[var(--hover)] rounded-full text-[var(--text-secondary)] transition-colors"
                            title="Открыть"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleEditClick(video)}
                            className="p-2 hover:bg-[var(--hover)] rounded-full text-[var(--text-secondary)] transition-colors"
                            title="Редактировать"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setAnalyticsVideo(video)}
                            className="p-2 hover:bg-[var(--hover)] rounded-full text-[var(--text-secondary)] transition-colors"
                            title="Аналитика"
                          >
                            <BarChart2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(video.id)}
                            className="p-2 hover:bg-red-500/10 rounded-full text-red-500 transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Card List */}
              <div className="md:hidden divide-y divide-[var(--border)]">
                {filteredVideos.map((video) => (
                  <div key={video.id} className="p-4 space-y-4">
                    <div className="flex gap-4">
                      <div className={`relative ${activeTab === 'shorts' ? 'w-20 aspect-[9/16]' : activeTab === 'photos' ? 'w-24 aspect-square' : 'w-32 aspect-video'} rounded-lg overflow-hidden border border-[var(--border)] shrink-0 shadow-sm`}>
                        <img src={video.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                        {activeTab !== 'photos' && (
                          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded font-bold">
                            {video.duration}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-[var(--text-primary)] line-clamp-2">
                          {video.title}
                        </h4>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                          {video.createdAt ? format(new Date(video.createdAt), 'dd MMM yyyy', { locale: ru }) : '-'}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-secondary)]">
                            <Eye className="w-3 h-3" /> {video.views?.toLocaleString() || 0}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-secondary)]">
                            <ThumbsUp className="w-3 h-3" /> {video.likes?.toLocaleString() || 0}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-secondary)]">
                            <Snowflake className="w-3 h-3 text-blue-400" /> {video.ices?.toLocaleString() || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex gap-1">
                        <button 
                          onClick={() => navigate(activeTab === 'photos' ? '/photos' : `/video/${video.id}`)}
                          className="p-2.5 bg-[var(--hover)] rounded-xl text-[var(--text-secondary)]"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEditClick(video)}
                          className="p-2.5 bg-[var(--hover)] rounded-xl text-[var(--text-secondary)]"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setAnalyticsVideo(video)}
                          className="p-2.5 bg-[var(--hover)] rounded-xl text-[var(--text-secondary)]"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </button>
                      </div>
                      <button 
                        onClick={() => handleDelete(video.id)}
                        className="p-2.5 bg-red-500/10 rounded-xl text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {filteredVideos.length === 0 && (
                <div className="px-6 py-24 text-center">
                  <div className="flex flex-col items-center justify-center text-[var(--text-secondary)]">
                    <Search className="w-12 h-12 mb-4 opacity-10" />
                    <p className="text-sm italic">Контент не найден</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit Video Modal */}
      {editingVideo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--studio-sidebar)] rounded-lg shadow-xl p-6 w-full max-w-2xl relative flex flex-col gap-6">
            <button 
              onClick={() => setEditingVideo(null)}
              className="absolute top-4 right-4 p-2 hover:bg-[var(--hover)] rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-[var(--studio-muted)]" />
            </button>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Редактировать видео</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Название</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-[var(--hover)] border border-[var(--border)] rounded-md focus:outline-none focus:border-blue-500 text-[var(--text-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Описание</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-2 bg-[var(--hover)] border border-[var(--border)] rounded-md focus:outline-none focus:border-blue-500 text-[var(--text-primary)] resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setEditingVideo(null)}
                className="px-4 py-2 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--hover)] rounded-md transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {analyticsVideo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--studio-sidebar)] rounded-lg shadow-xl p-6 w-full max-w-2xl relative flex flex-col gap-6">
            <button 
              onClick={() => setAnalyticsVideo(null)}
              className="absolute top-4 right-4 p-2 hover:bg-[var(--hover)] rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-[var(--studio-muted)]" />
            </button>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Аналитика видео</h2>
            
            <div className="flex gap-4 items-center p-4 bg-[var(--hover)] rounded-lg border border-[var(--border)]">
              <div className={`relative ${analyticsVideo.isShort ? 'w-16 aspect-[9/16]' : 'w-32 aspect-video'} rounded overflow-hidden shrink-0`}>
                <img src={analyticsVideo.thumbnailUrl} className="w-full h-full object-cover" alt="" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--text-primary)] line-clamp-1">{analyticsVideo.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Опубликовано: {analyticsVideo.createdAt ? format(new Date(analyticsVideo.createdAt), 'dd MMM yyyy', { locale: ru }) : '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-6 bg-[var(--studio-hover)] rounded-lg border border-[var(--studio-border)] flex flex-col items-center justify-center">
                <p className="text-sm text-[var(--text-secondary)] mb-2 font-bold uppercase tracking-wider">Просмотры</p>
                <p className="text-4xl font-black text-[var(--text-primary)]">{analyticsVideo.views?.toLocaleString() || 0}</p>
              </div>
              <div className="p-6 bg-[var(--studio-hover)] rounded-lg border border-[var(--studio-border)] flex flex-col items-center justify-center">
                <p className="text-sm text-[var(--text-secondary)] mb-2 font-bold uppercase tracking-wider">Лайки</p>
                <p className="text-4xl font-black text-[var(--text-primary)]">{analyticsVideo.likes?.toLocaleString() || 0}</p>
              </div>
              <div className="p-6 bg-[var(--studio-hover)] rounded-lg border border-[var(--studio-border)] flex flex-col items-center justify-center">
                <p className="text-sm text-[var(--text-secondary)] mb-2 font-bold uppercase tracking-wider">Снежинки</p>
                <p className="text-4xl font-black text-[var(--text-primary)]">{analyticsVideo.ices?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
