import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { VideoType } from '../types';
import { Eye, ThumbsUp, MessageSquare, Trash2, Edit, ExternalLink, Search, Filter, MoreVertical, BarChart2, X, Save, Snowflake, Plus, Loader2, Sparkles, AlertCircle, Layout, Video as VideoIcon, Image as ImageIcon, Music as MusicIcon, Smartphone, Clock, ChevronDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';

const CLOUDINARY_CLOUD_NAME = 'du6zw4m8g';
const CLOUDINARY_UPLOAD_PRESET = 'icetube_uploads';

export default function StudioContent() {
  const { user, activeChannel } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [activeTab, setActiveTab] = useState<'videos' | 'shorts' | 'music' | 'photos' | 'playlists'>('videos');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'views' | 'likes' | 'ices'>('newest');
  const [editingVideo, setEditingVideo] = useState<VideoType | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editThumbnail, setEditThumbnail] = useState('');
  const [editHashtags, setEditHashtags] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editAudience, setEditAudience] = useState<'kids' | 'not-kids'>('not-kids');
  const [editVisibility, setEditVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [editPlaylistId, setEditPlaylistId] = useState('');
  const [editTimestamps, setEditTimestamps] = useState<{ time: string; label: string }[]>([]);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [analyticsVideo, setAnalyticsVideo] = useState<VideoType | null>(null);

  useEffect(() => {
    if (!user || !activeChannel) return;

    const fetchVideos = async () => {
      try {
        const q = query(
          collection(db, 'videos'),
          where('authorId', '==', activeChannel.id),
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
  }, [user, activeChannel]);

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

  useEffect(() => {
    if (!user || !activeChannel) return;

    const fetchPlaylists = async () => {
      try {
        const q = query(collection(db, 'playlists'), where('authorId', '==', activeChannel.id));
        const snap = await getDocs(q);
        setPlaylists(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching playlists:", error);
      }
    };

    fetchPlaylists();
  }, [user, activeChannel]);

  const handleEditClick = (video: VideoType) => {
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditDescription(video.description || '');
    setEditThumbnail(video.thumbnailUrl || '');
    setEditHashtags(video.hashtags?.join(', ') || '');
    setEditCategory(video.category || '');
    setEditAudience(video.audience || 'not-kids');
    setEditVisibility(video.visibility || 'public');
    setEditTimestamps(video.timestamps || []);
    
    // Find if video is in any playlist
    const currentPlaylist = playlists.find(p => p.videoIds?.includes(video.id));
    setEditPlaylistId(currentPlaylist?.id || '');
  };

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const resourceType = file.type.startsWith('image/') ? 'image' : 'video';
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', `icetube/${folder}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Загрузка не удалась');
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error: any) {
      console.error("Cloudinary upload error:", error);
      throw new Error(error.message || 'Ошибка при загрузке на сервер хранения');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingVideo) return;
    setIsSaving(true);
    try {
      let thumbnailUrl = editThumbnail;

      if (thumbnailFile) {
        setUploadingThumbnail(true);
        thumbnailUrl = await uploadFile(thumbnailFile, 'thumbnails');
        setUploadingThumbnail(false);
      }

      const videoRef = doc(db, 'videos', editingVideo.id);
      const hashtagsArray = editHashtags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
      
      const updateData: any = {
        title: editTitle,
        description: editDescription,
        thumbnailUrl,
        category: editCategory,
        hashtags: hashtagsArray,
        audience: editAudience,
        visibility: editVisibility,
        timestamps: editTimestamps
      };

      await updateDoc(videoRef, updateData);

      // Handle Playlist update
      if (editPlaylistId) {
        const playlistRef = doc(db, 'playlists', editPlaylistId);
        const playlistSnap = await getDoc(playlistRef);
        if (playlistSnap.exists()) {
          const pData = playlistSnap.data();
          const videoIds = pData.videoIds || [];
          if (!videoIds.includes(editingVideo.id)) {
            await updateDoc(playlistRef, {
              videoIds: [...videoIds, editingVideo.id]
            });
          }
        }
      }

      setVideos(videos.map(v => v.id === editingVideo.id ? { 
        ...v, 
        ...updateData
      } : v));
      toast.success('Видео успешно обновлено');
      setEditingVideo(null);
      setThumbnailFile(null);
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

  const filteredVideos = displayedContent
    .filter(v => v.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'views') return (b.views || 0) - (a.views || 0);
      if (sortBy === 'likes') return (b.likes || 0) - (a.likes || 0);
      if (sortBy === 'ices') return (b.ices || 0) - (a.ices || 0);
      return 0;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-primary)]">Контент канала</h1>
          <p className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-widest">Управление публикациями и плейлистами</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/studio/upload')}
            className="flex-1 md:flex-none bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Добавить контент
          </button>
        </div>
      </div>

      <div className="flex gap-8 border-b border-[var(--border)] overflow-x-auto no-scrollbar">
        {[
          { id: 'videos', label: 'Видео' },
          { id: 'shorts', label: 'Shorts' },
          { id: 'music', label: 'Музыка' },
          { id: 'photos', label: 'Фото' },
          { id: 'playlists', label: 'Плейлисты' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${
              activeTab === tab.id ? 'text-blue-600' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-6 border-b border-[var(--border)] flex flex-col lg:flex-row gap-6 items-center justify-between bg-[var(--surface)]">
          <div className="relative w-full lg:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              placeholder="Поиск по названию или описанию..."
              className="w-full pl-12 pr-4 py-3 bg-[var(--hover)] border border-[var(--border)] rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-[var(--text-primary)]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-2 lg:pb-0 no-scrollbar w-full lg:w-auto">
            <div className="flex items-center gap-1.5 bg-[var(--hover)] p-1 rounded-xl border border-[var(--border)]">
              {[
                { id: 'newest', label: 'Новые' },
                { id: 'oldest', label: 'Старые' },
                { id: 'views', label: 'Просмотры' },
                { id: 'likes', label: 'Лайки' },
                { id: 'ices', label: 'Снежинки' }
              ].map((s) => (
                <button 
                  key={s.id}
                  onClick={() => setSortBy(s.id as any)}
                  className={`px-4 py-2 text-[10px] font-black rounded-lg transition-all uppercase tracking-wider whitespace-nowrap ${
                    sortBy === s.id ? 'bg-[var(--surface)] text-blue-600 shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="h-8 w-px bg-[var(--border)] mx-2 hidden lg:block" />
            <button className="flex items-center gap-2 px-5 py-2.5 text-[10px] font-black text-[var(--text-secondary)] hover:bg-[var(--hover)] hover:text-[var(--text-primary)] rounded-xl transition-all uppercase tracking-widest border border-transparent hover:border-[var(--border)]">
              <Filter className="w-4 h-4" />
              Фильтры
            </button>
          </div>
        </div>

        {/* Table/Card List */}
        <div className="overflow-x-auto">
          {activeTab === 'playlists' ? (
            <div className="p-24 text-center space-y-4">
              <div className="w-20 h-20 bg-[var(--hover)] rounded-3xl flex items-center justify-center mx-auto border border-[var(--border)]">
                <MoreVertical className="w-10 h-10 opacity-20" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tighter">Плейлисты в разработке</p>
                <p className="text-xs font-medium text-[var(--text-secondary)]">Скоро вы сможете создавать и управлять плейлистами.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <table className="w-full text-left border-collapse hidden md:table">
                <thead className="bg-[var(--hover)] border-b border-[var(--border)] text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.15em]">
                  <tr>
                    <th className="px-8 py-5 font-black">{activeTab === 'photos' ? 'Фото' : activeTab === 'music' ? 'Трек' : 'Контент'}</th>
                    <th className="px-8 py-5 font-black">Параметры</th>
                    <th className="px-8 py-5 font-black">Дата</th>
                    <th className="px-8 py-5 font-black">Статистика</th>
                    <th className="px-8 py-5 font-black text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredVideos.map((video) => (
                    <tr key={video.id} className="hover:bg-[var(--hover)] transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex gap-6 items-center min-w-[400px]">
                          <div className={`relative ${activeTab === 'shorts' ? 'w-20 aspect-[9/16]' : activeTab === 'photos' ? 'w-28 aspect-square' : 'w-40 aspect-video'} rounded-xl overflow-hidden border border-[var(--border)] shrink-0 shadow-sm group-hover:shadow-md transition-shadow`}>
                            <img src={video.thumbnailUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="" />
                            {activeTab !== 'photos' && (
                              <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                                {video.duration}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 space-y-1">
                            <h4 className="font-black text-sm text-[var(--text-primary)] truncate group-hover:text-blue-600 transition-colors cursor-pointer" onClick={() => navigate(`/video/${video.id}`)}>
                              {video.title}
                            </h4>
                            <p className="text-xs font-medium text-[var(--text-secondary)] line-clamp-1 leading-relaxed">{video.description || 'Без описания'}</p>
                            <div className="flex items-center gap-2 mt-2">
                              {video.hashtags?.slice(0, 3).map(tag => (
                                <span key={tag} className="text-[9px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">#{tag}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${video.visibility === 'public' ? 'bg-green-500' : video.visibility === 'unlisted' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)]">
                              {video.visibility === 'public' ? 'Открытый' : video.visibility === 'unlisted' ? 'По ссылке' : 'Ограниченный'}
                            </span>
                          </div>
                          <p className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                            {video.audience === 'kids' ? 'Для детей' : 'Не для детей'}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-[var(--text-primary)]">{video.createdAt ? format(new Date(video.createdAt), 'dd MMM yyyy', { locale: ru }) : '-'}</p>
                          <p className="text-[9px] font-mono text-[var(--text-secondary)] uppercase">Опубликовано</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 min-w-[150px]">
                          <div className="flex items-center gap-2">
                            <Eye className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                            <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{video.views?.toLocaleString() || 0}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ThumbsUp className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                            <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{video.likes?.toLocaleString() || 0}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Snowflake className="w-3.5 h-3.5 text-blue-400" />
                            <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{video.ices?.toLocaleString() || 0}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                            <span className="font-mono text-xs font-bold text-[var(--text-primary)]">0</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          <button 
                            onClick={() => navigate(`/video/${video.id}`)}
                            className="p-2.5 bg-[var(--hover)] hover:bg-blue-600 hover:text-white rounded-xl text-[var(--text-secondary)] transition-all shadow-sm"
                            title="Открыть"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleEditClick(video)}
                            className="p-2.5 bg-[var(--hover)] hover:bg-blue-600 hover:text-white rounded-xl text-[var(--text-secondary)] transition-all shadow-sm"
                            title="Редактировать"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setAnalyticsVideo(video)}
                            className="p-2.5 bg-[var(--hover)] hover:bg-blue-600 hover:text-white rounded-xl text-[var(--text-secondary)] transition-all shadow-sm"
                            title="Аналитика"
                          >
                            <BarChart2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(video.id)}
                            className="p-2.5 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-xl text-red-500 transition-all shadow-sm"
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
                  <div key={video.id} className="p-6 space-y-6 hover:bg-[var(--hover)] transition-colors">
                    <div className="flex gap-5">
                      <div className={`relative ${activeTab === 'shorts' ? 'w-24 aspect-[9/16]' : activeTab === 'photos' ? 'w-28 aspect-square' : 'w-36 aspect-video'} rounded-xl overflow-hidden border border-[var(--border)] shrink-0 shadow-sm`}>
                        <img src={video.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                        {activeTab !== 'photos' && (
                          <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">
                            {video.duration}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <h4 className="font-black text-sm text-[var(--text-primary)] line-clamp-2 leading-tight">
                          {video.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${video.visibility === 'public' ? 'bg-green-500' : video.visibility === 'unlisted' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                          <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)]">
                            {video.visibility === 'public' ? 'Открытый' : video.visibility === 'unlisted' ? 'По ссылке' : 'Ограниченный'}
                          </span>
                        </div>
                        <p className="text-[9px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">
                          {video.createdAt ? format(new Date(video.createdAt), 'dd MMM yyyy', { locale: ru }) : '-'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 p-4 bg-[var(--hover)] rounded-2xl border border-[var(--border)]">
                      <div className="flex flex-col items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                        <span className="font-mono text-xs font-black text-[var(--text-primary)]">{video.views?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <ThumbsUp className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                        <span className="font-mono text-xs font-black text-[var(--text-primary)]">{video.likes?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <Snowflake className="w-3.5 h-3.5 text-blue-400" />
                        <span className="font-mono text-xs font-black text-[var(--text-primary)]">{video.ices?.toLocaleString() || 0}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => navigate(activeTab === 'photos' ? '/photos' : `/video/${video.id}`)}
                          className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-secondary)] shadow-sm active:scale-95 transition-transform"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEditClick(video)}
                          className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-secondary)] shadow-sm active:scale-95 transition-transform"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setAnalyticsVideo(video)}
                          className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-secondary)] shadow-sm active:scale-95 transition-transform"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </button>
                      </div>
                      <button 
                        onClick={() => handleDelete(video.id)}
                        className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 shadow-sm active:scale-95 transition-transform"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {filteredVideos.length === 0 && (
                <div className="px-8 py-32 text-center space-y-4">
                  <div className="w-20 h-20 bg-[var(--hover)] rounded-3xl flex items-center justify-center mx-auto border border-[var(--border)]">
                    <Search className="w-10 h-10 opacity-10" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest italic">Контент не найден</p>
                    <p className="text-[10px] font-medium text-[var(--text-secondary)]">Попробуйте изменить параметры поиска или фильтры</p>
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
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              <div>
                <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Название</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2 bg-[var(--hover)] border border-[var(--border)] rounded-xl focus:outline-none focus:border-blue-500 text-[var(--text-primary)] font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Описание</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 bg-[var(--hover)] border border-[var(--border)] rounded-xl focus:outline-none focus:border-blue-500 text-[var(--text-primary)] resize-none font-medium"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Значок (превью)</label>
                  <div className="relative group aspect-video rounded-xl overflow-hidden border-2 border-dashed border-[var(--border)] hover:border-blue-500 transition-all cursor-pointer bg-[var(--hover)]">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    {thumbnailFile ? (
                      <img src={URL.createObjectURL(thumbnailFile)} alt="Preview" className="w-full h-full object-cover" />
                    ) : editThumbnail ? (
                      <img src={editThumbnail} alt="Current" className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-secondary)]">
                        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Загрузить фото</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Edit className="w-6 h-6" />
                    </div>
                    {uploadingThumbnail && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest text-center mt-1">Нажмите, чтобы изменить</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Категория</label>
                    <input
                      type="text"
                      list="edit-category-options"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full px-4 py-2 bg-[var(--hover)] border border-[var(--border)] rounded-xl focus:outline-none focus:border-blue-500 text-[var(--text-primary)] text-sm font-medium"
                      placeholder="Выберите или введите свою..."
                    />
                    <datalist id="edit-category-options">
                      <option value="Игры" />
                      <option value="Музыка" />
                      <option value="Образование" />
                      <option value="Развлечения" />
                      <option value="Технологии" />
                      <option value="Спорт" />
                      <option value="Влоги" />
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Плейлист</label>
                    <select
                      value={editPlaylistId}
                      onChange={(e) => setEditPlaylistId(e.target.value)}
                      className="w-full px-4 py-2 bg-[var(--hover)] border border-[var(--border)] rounded-xl focus:outline-none focus:border-blue-500 text-[var(--text-primary)] text-sm font-medium"
                    >
                      <option value="">Без плейлиста</option>
                      {playlists.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Хештеги (через запятую)</label>
                <input
                  type="text"
                  value={editHashtags}
                  onChange={(e) => setEditHashtags(e.target.value)}
                  className="w-full px-4 py-2 bg-[var(--hover)] border border-[var(--border)] rounded-xl focus:outline-none focus:border-blue-500 text-[var(--text-primary)] text-sm"
                  placeholder="ice, tube, video"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">Таймкоды</label>
                  <button 
                    onClick={() => setEditTimestamps([...editTimestamps, { time: '', label: '' }])}
                    className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                  >
                    + Добавить
                  </button>
                </div>
                <div className="space-y-3">
                  {editTimestamps.map((ts, idx) => (
                    <div key={idx} className="flex gap-3 items-center">
                      <input
                        type="text"
                        value={ts.time}
                        onChange={(e) => {
                          const newTs = [...editTimestamps];
                          newTs[idx].time = e.target.value;
                          setEditTimestamps(newTs);
                        }}
                        placeholder="00:00"
                        className="w-24 px-4 py-2 bg-[var(--hover)] border border-[var(--border)] rounded-xl focus:outline-none focus:border-blue-500 text-[var(--text-primary)] text-xs font-mono"
                      />
                      <input
                        type="text"
                        value={ts.label}
                        onChange={(e) => {
                          const newTs = [...editTimestamps];
                          newTs[idx].label = e.target.value;
                          setEditTimestamps(newTs);
                        }}
                        placeholder="Название эпизода"
                        className="flex-1 px-4 py-2 bg-[var(--hover)] border border-[var(--border)] rounded-xl focus:outline-none focus:border-blue-500 text-[var(--text-primary)] text-xs font-medium"
                      />
                      <button 
                        onClick={() => setEditTimestamps(editTimestamps.filter((_, i) => i !== idx))}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {editTimestamps.length === 0 && (
                    <p className="text-[10px] text-[var(--text-secondary)] italic">Таймкоды не добавлены</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[var(--border)]">
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Аудитория</label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="editAudience" 
                        checked={editAudience === 'kids'} 
                        onChange={() => setEditAudience('kids')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-[var(--text-primary)]">Для детей</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="editAudience" 
                        checked={editAudience === 'not-kids'} 
                        onChange={() => setEditAudience('not-kids')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-[var(--text-primary)]">Не для детей</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Доступ</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'private', label: 'Ограниченный' },
                      { id: 'unlisted', label: 'По ссылке' },
                      { id: 'public', label: 'Открытый' }
                    ].map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setEditVisibility(v.id as any)}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${
                          editVisibility === v.id 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-[var(--hover)] text-[var(--text-secondary)] border-[var(--border)] hover:border-blue-500'
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Добавить в плейлист</label>
                <select
                  value={editPlaylistId}
                  onChange={(e) => setEditPlaylistId(e.target.value)}
                  className="w-full px-4 py-2 bg-[var(--hover)] border border-[var(--border)] rounded-xl focus:outline-none focus:border-blue-500 text-[var(--text-primary)] text-sm font-medium"
                >
                  <option value="">Без плейлиста</option>
                  {playlists.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
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
