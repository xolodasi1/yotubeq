import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { databaseService } from '../lib/databaseService';
import { VideoType, Comment, Playlist } from '../types';
import { Loader2, Camera, Heart, MessageCircle, Share2, Download, Plus, X, Globe, Lock, Send } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../App';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { safeFormatDistanceToNow } from '../lib/dateUtils';

export default function Photos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<VideoType | null>(null);
  
  // Interaction states
  const [isLiked, setIsLiked] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // Playlist states
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [playlistVisibility, setPlaylistVisibility] = useState<'public' | 'private'>('public');

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .eq('type', 'photo')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setPhotos((data || []).map(d => databaseService.mapVideo(d)));
      } catch (error) {
        console.error("Error fetching photos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPhotos();
  }, []);

  useEffect(() => {
    if (!selectedPhoto) return;

    // Reset interaction states
    setIsLiked(false);
    setIsFavorited(false);
    setComments([]);

    const fetchInteractions = async () => {
      if (user) {
        const { data: likeData } = await supabase
          .from('video_likes')
          .select('*')
          .eq('user_id', user.uid)
          .eq('video_id', selectedPhoto.id)
          .single();
        setIsLiked(!!likeData);

        const { data: favData } = await supabase
          .from('favorites')
          .select('*')
          .eq('user_id', user.uid)
          .eq('video_id', selectedPhoto.id)
          .single();
        setIsFavorited(!!favData);
      }

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*')
        .eq('video_id', selectedPhoto.id)
        .order('created_at', { ascending: false });
      
      if (commentsData) {
        setComments(commentsData.map(d => ({
          ...d,
          createdAt: d.created_at,
          authorId: d.author_id,
          authorName: d.author_name,
          authorPhotoUrl: d.author_photo_url,
          videoId: d.video_id
        })));
      }

      // Realtime comments
      const channel = supabase
        .channel(`photo_comments_${selectedPhoto.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'comments', 
          filter: `video_id=eq.${selectedPhoto.id}` 
        }, (payload) => {
          const newComment = {
            ...payload.new,
            createdAt: payload.new.created_at,
            authorId: payload.new.author_id,
            authorName: payload.new.author_name,
            authorPhotoUrl: payload.new.author_photo_url,
            videoId: payload.new.video_id
          } as Comment;
          setComments(prev => [newComment, ...prev]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    fetchInteractions();
  }, [selectedPhoto, user]);

  const handleLike = async () => {
    if (!user || !selectedPhoto) return toast.error('Войдите, чтобы ставить лайки');

    try {
      if (isLiked) {
        await supabase
          .from('video_likes')
          .delete()
          .eq('user_id', user.uid)
          .eq('video_id', selectedPhoto.id);
          
        const newLikes = Math.max(0, selectedPhoto.likes - 1);
        await supabase
          .from('videos')
          .update({ likes: newLikes })
          .eq('id', selectedPhoto.id);
          
        setSelectedPhoto({ ...selectedPhoto, likes: newLikes });
        setIsLiked(false);
      } else {
        await supabase
          .from('video_likes')
          .insert({
            user_id: user.uid,
            video_id: selectedPhoto.id,
            type: 'like'
          });
          
        const newLikes = selectedPhoto.likes + 1;
        await supabase
          .from('videos')
          .update({ likes: newLikes })
          .eq('id', selectedPhoto.id);
          
        setSelectedPhoto({ ...selectedPhoto, likes: newLikes });
        setIsLiked(true);
      }
    } catch (error) { toast.error('Ошибка'); }
  };

  const toggleFavorite = async () => {
    if (!user || !selectedPhoto) return toast.error('Войдите, чтобы добавить в избранное');
    try {
      if (isFavorited) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.uid)
          .eq('video_id', selectedPhoto.id);
        setIsFavorited(false);
        toast.success('Удалено из избранного');
      } else {
        await supabase
          .from('favorites')
          .insert({
            user_id: user.uid,
            video_id: selectedPhoto.id
          });
        setIsFavorited(true);
        toast.success('Добавлено в избранное');
      }
    } catch (error) { toast.error('Ошибка'); }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhoto || !newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          video_id: selectedPhoto.id,
          author_id: user?.uid || 'anonymous',
          author_name: user?.displayName || 'Аноним',
          author_photo_url: user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
          text: newComment,
          likes: 0
        });
      
      if (error) throw error;
      
      // Update comment count on the photo
      const newCount = (selectedPhoto as any).commentsCount ? (selectedPhoto as any).commentsCount + 1 : 1;
      await supabase
        .from('videos')
        .update({ comments_count: newCount })
        .eq('id', selectedPhoto.id);

      setNewComment('');
      toast.success('Комментарий добавлен');
    } catch (error) { toast.error('Ошибка'); } finally { setSubmittingComment(false); }
  };

  const fetchUserPlaylists = async () => {
    if (!user) return toast.error('Войдите, чтобы управлять плейлистами');
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('author_id', user.uid);
    
    if (!error && data) {
      setUserPlaylists(data.map(d => ({
        id: d.id,
        title: d.title,
        authorId: d.author_id,
        videoIds: d.video_ids || [],
        visibility: d.visibility,
        createdAt: d.created_at
      } as Playlist)));
    }
    setShowPlaylistModal(true);
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!selectedPhoto) return;
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('video_ids')
        .eq('id', playlistId)
        .single();
      
      if (error) throw error;

      const videoIds = data.video_ids || [];
      if (videoIds.includes(selectedPhoto.id)) return toast.info('Уже в плейлисте');
      
      await supabase
        .from('playlists')
        .update({ video_ids: [...videoIds, selectedPhoto.id] })
        .eq('id', playlistId);
        
      toast.success('Добавлено в плейлист');
      setShowPlaylistModal(false);
    } catch (error) { toast.error('Ошибка'); }
  };

  const createPlaylist = async () => {
    if (!user || !newPlaylistTitle.trim() || !selectedPhoto) return;
    try {
      await supabase
        .from('playlists')
        .insert({
          title: newPlaylistTitle,
          author_id: user.uid,
          video_ids: [selectedPhoto.id],
          visibility: playlistVisibility
        });
      toast.success('Плейлист создан');
      setNewPlaylistTitle('');
      setShowPlaylistModal(false);
    } catch (error) { toast.error('Ошибка'); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest">Загрузка галереи...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-10 max-w-[1800px] mx-auto pb-24 md:pb-10">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 bg-pink-500/10 rounded-2xl flex items-center justify-center text-pink-500">
          <Camera className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Фотогалерея</h1>
          <p className="text-sm text-[var(--text-secondary)] font-medium">Моменты, запечатленные в IceTube</p>
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-[var(--text-secondary)]">
          <Camera className="w-16 h-16 opacity-10 mb-4" />
          <p className="text-lg font-bold text-[var(--text-primary)]">Фотографий пока нет</p>
          <p className="text-sm mt-1">Будьте первым, кто поделится моментом!</p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
          {photos.map((photo) => (
            <motion.div
              layoutId={photo.id}
              key={photo.id}
              onClick={() => navigate(`/video/${photo.id}`)}
              className="relative group cursor-pointer break-inside-avoid rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface)] hover:shadow-2xl hover:shadow-pink-500/10 transition-all duration-500"
            >
              <img 
                src={photo.videoUrl} 
                alt={photo.title} 
                className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6">
                <h3 className="text-white font-bold text-lg line-clamp-1 mb-1">{photo.title}</h3>
                <div className="flex items-center gap-3">
                  <img src={photo.authorPhotoUrl} alt={photo.authorName} className="w-6 h-6 rounded-full border border-white/20" />
                  <span className="text-white/80 text-xs font-medium">{photo.authorName}</span>
                </div>
                <div className="flex items-center gap-4 mt-4 text-white/90">
                  <div className="flex items-center gap-1.5">
                    <Heart className="w-4 h-4" />
                    <span className="text-xs font-bold">{photo.likes}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-xs font-bold">{(photo as any).commentsCount || 0}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-black/95 backdrop-blur-xl"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              layoutId={selectedPhoto.id}
              className="relative max-w-6xl w-full max-h-[90vh] flex flex-col md:flex-row bg-[var(--surface)] rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex-1 bg-black flex items-center justify-center overflow-hidden relative">
                <img 
                  src={selectedPhoto.videoUrl} 
                  alt={selectedPhoto.title} 
                  className="max-w-full max-h-full object-contain"
                />
                <button 
                  onClick={() => setSelectedPhoto(null)}
                  className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="w-full md:w-[400px] flex flex-col bg-[var(--surface)] border-l border-[var(--border)]">
                {/* Header */}
                <div className="p-6 border-b border-[var(--border)]">
                  <div className="flex items-center justify-between mb-4">
                    <Link to={`/channel/${selectedPhoto.authorId}`} className="flex items-center gap-3 group">
                      <img src={selectedPhoto.authorPhotoUrl} alt={selectedPhoto.authorName} className="w-10 h-10 rounded-full border-2 border-pink-500" />
                      <div className="min-w-0">
                        <p className="font-bold text-[var(--text-primary)] group-hover:text-pink-500 transition-colors truncate">{selectedPhoto.authorName}</p>
                        <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Автор</p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      <button onClick={toggleFavorite} className={`p-2 rounded-full transition-colors ${isFavorited ? 'bg-yellow-500/10 text-yellow-500' : 'hover:bg-[var(--hover)] text-[var(--text-secondary)]'}`}>
                        <Plus className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
                      </button>
                      <a href={selectedPhoto.videoUrl} download target="_blank" rel="noreferrer" className="p-2 hover:bg-[var(--hover)] rounded-full text-[var(--text-secondary)] transition-colors">
                        <Download className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">{selectedPhoto.title}</h2>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-3">{selectedPhoto.description || 'Нет описания'}</p>
                </div>

                {/* Comments Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)] mb-4">
                    <MessageCircle className="w-4 h-4" />
                    <span>{comments.length} Комментариев</span>
                  </div>
                  
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <img src={comment.authorPhotoUrl} alt="" className="w-8 h-8 rounded-full shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-[var(--text-primary)]">{comment.authorName}</span>
                          <span className="text-[10px] text-[var(--text-secondary)]">
                            {safeFormatDistanceToNow(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--text-primary)] leading-relaxed">{comment.text}</p>
                      </div>
                    </div>
                  ))}
                  
                  {comments.length === 0 && (
                    <div className="text-center py-10">
                      <MessageCircle className="w-10 h-10 text-[var(--text-secondary)] opacity-10 mx-auto mb-2" />
                      <p className="text-xs text-[var(--text-secondary)]">Будьте первым, кто оставит комментарий!</p>
                    </div>
                  )}
                </div>

                {/* Footer / Actions */}
                <div className="p-6 border-t border-[var(--border)] bg-[var(--surface)]">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-6">
                      <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
                        <Heart className={`w-6 h-6 transition-colors ${isLiked ? 'text-pink-500 fill-current' : 'text-[var(--text-secondary)] group-hover:text-pink-500'}`} />
                        <span className="text-[10px] font-bold text-[var(--text-secondary)]">{selectedPhoto.likes}</span>
                      </button>
                      <button onClick={fetchUserPlaylists} className="flex flex-col items-center gap-1 group">
                        <Plus className="w-6 h-6 text-[var(--text-secondary)] group-hover:text-blue-500 transition-colors" />
                        <span className="text-[10px] font-bold text-[var(--text-secondary)]">В плейлист</span>
                      </button>
                      <button className="flex flex-col items-center gap-1 group">
                        <Share2 className="w-6 h-6 text-[var(--text-secondary)] group-hover:text-green-500 transition-colors" />
                        <span className="text-[10px] font-bold text-[var(--text-secondary)]">Поделиться</span>
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handlePostComment} className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Добавить комментарий..."
                      className="flex-1 bg-[var(--hover)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-pink-500 transition-all"
                    />
                    <button 
                      type="submit"
                      disabled={submittingComment || !newComment.trim()}
                      className="p-2 bg-pink-500 text-white rounded-xl hover:bg-pink-600 disabled:opacity-50 transition-all"
                    >
                      {submittingComment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Playlist Modal */}
      <AnimatePresence>
        {showPlaylistModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowPlaylistModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[var(--surface)] rounded-2xl p-6 w-full max-w-md shadow-2xl border border-[var(--border)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-[var(--text-primary)]">Сохранить в...</h3>
                <button onClick={() => setShowPlaylistModal(false)} className="p-2 hover:bg-[var(--hover)] rounded-full transition-colors">
                  <X className="w-5 h-5 text-[var(--text-secondary)]" />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto mb-6 pr-2 scrollbar-thin">
                {userPlaylists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => handleAddToPlaylist(playlist.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-[var(--hover)] rounded-xl transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[var(--hover)] rounded-lg flex items-center justify-center text-[var(--text-secondary)]">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-[var(--text-primary)]">{playlist.title}</span>
                    </div>
                    {playlist.visibility === 'private' ? <Lock className="w-4 h-4 text-[var(--text-secondary)]" /> : <Globe className="w-4 h-4 text-[var(--text-secondary)]" />}
                  </button>
                ))}
                {userPlaylists.length === 0 && (
                  <p className="text-center py-4 text-sm text-[var(--text-secondary)]">У вас пока нет плейлистов</p>
                )}
              </div>

              <div className="pt-6 border-t border-[var(--border)] space-y-4">
                <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Создать новый плейлист</p>
                <input
                  type="text"
                  placeholder="Название плейлиста"
                  value={newPlaylistTitle}
                  onChange={(e) => setNewPlaylistTitle(e.target.value)}
                  className="w-full bg-[var(--hover)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setPlaylistVisibility('public')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all ${playlistVisibility === 'public' ? 'bg-blue-600 border-blue-600 text-white' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--hover)]'}`}
                  >
                    <Globe className="w-4 h-4" />
                    Публичный
                  </button>
                  <button
                    onClick={() => setPlaylistVisibility('private')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all ${playlistVisibility === 'private' ? 'bg-blue-600 border-blue-600 text-white' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--hover)]'}`}
                  >
                    <Lock className="w-4 h-4" />
                    Приватный
                  </button>
                </div>
                <button
                  onClick={createPlaylist}
                  disabled={!newPlaylistTitle.trim()}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  Создать и добавить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
