import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, orderBy, setDoc, doc, serverTimestamp, getDoc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { VideoType, Comment } from '../types';
import { Loader2, Smartphone, Heart, MessageSquare, Share2, Music as MusicIcon, X, Send, Snowflake, Ban } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const ShortPlayer: React.FC<{ short: VideoType, isActive: boolean, user: any }> = ({ short, isActive, user }) => {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(short.likes || 0);
  const [isIced, setIsIced] = useState(false);
  const [icesCount, setIcesCount] = useState(short.ices || 0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [authorData, setAuthorData] = useState<{ displayName: string, photoURL: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchAuthor = async () => {
      try {
        const authorSnap = await getDoc(doc(db, 'users', short.authorId));
        if (authorSnap.exists()) {
          setAuthorData(authorSnap.data() as any);
        }
      } catch (e) {
        console.error("Error fetching author data:", e);
      }
    };
    fetchAuthor();
  }, [short.authorId]);

  useEffect(() => {
    if (isActive) {
      videoRef.current?.play().catch(e => console.log("Auto-play prevented:", e));
    } else {
      videoRef.current?.pause();
      if (videoRef.current) videoRef.current.currentTime = 0;
    }
  }, [isActive]);

  useEffect(() => {
    if (!user) return;
    const fetchInteractions = async () => {
      try {
        const likeId = `${user.uid}_${short.id}`;
        const likeSnap = await getDoc(doc(db, 'video_likes', likeId));
        setIsLiked(likeSnap.exists() && likeSnap.data().type === 'like');

        const iceId = `${user.uid}_${short.id}`;
        const iceSnap = await getDoc(doc(db, 'video_ices', iceId));
        setIsIced(iceSnap.exists());

        const subId = `${user.uid}_${short.authorId}`;
        const subSnap = await getDoc(doc(db, 'subscriptions', subId));
        setIsSubscribed(subSnap.exists());
      } catch (err) {
        console.error("Error fetching interactions:", err);
      }
    };
    fetchInteractions();
  }, [user, short.id, short.authorId]);

  const fetchComments = async () => {
    try {
      const q = query(collection(db, 'comments'), where('videoId', '==', short.id), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setComments(snap.docs.map(d => ({ ...d.data(), createdAt: d.data().createdAt?.toDate?.()?.toISOString() || d.data().createdAt })) as Comment[]);
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
  };

  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments]);

  const handleLike = async () => {
    if (!user) return toast.error('Войдите, чтобы ставить лайки');
    const likeId = `${user.uid}_${short.id}`;
    const likeRef = doc(db, 'video_likes', likeId);
    const videoRef = doc(db, 'videos', short.id);

    try {
      if (isLiked) {
        await deleteDoc(likeRef);
        await updateDoc(videoRef, { likes: Math.max(0, likesCount - 1) });
        setLikesCount(Math.max(0, likesCount - 1));
        setIsLiked(false);
      } else {
        await setDoc(likeRef, { id: likeId, userId: user.uid, videoId: short.id, type: 'like' });
        await updateDoc(videoRef, { likes: likesCount + 1 });
        setLikesCount(likesCount + 1);
        setIsLiked(true);
      }
    } catch (err) {
      toast.error('Не удалось обновить лайк');
    }
  };

  const handleIce = async () => {
    if (!user) return toast.error('Войдите, чтобы ставить снежинки');
    const iceId = `${user.uid}_${short.id}`;
    const iceRef = doc(db, 'video_ices', iceId);
    const videoRef = doc(db, 'videos', short.id);

    try {
      if (isIced) {
        await deleteDoc(iceRef);
        await updateDoc(videoRef, { ices: Math.max(0, icesCount - 1) });
        setIcesCount(Math.max(0, icesCount - 1));
        setIsIced(false);
      } else {
        await setDoc(iceRef, { id: iceId, userId: user.uid, videoId: short.id, createdAt: serverTimestamp() });
        await updateDoc(videoRef, { ices: icesCount + 1 });
        setIcesCount(icesCount + 1);
        setIsIced(true);
      }
    } catch (err) {
      toast.error('Не удалось обновить снежинку');
    }
  };

  const handleSubscribe = async () => {

    if (!user) return toast.error('Войдите, чтобы подписаться');
    if (user.uid === short.authorId) return toast.error('Нельзя подписаться на себя');

    const subId = `${user.uid}_${short.authorId}`;
    const subRef = doc(db, 'subscriptions', subId);
    const channelRef = doc(db, 'users', short.authorId);

    try {
      if (isSubscribed) {
        await deleteDoc(subRef);
        await updateDoc(channelRef, { subscribers: increment(-1) }).catch(() => {});
        setIsSubscribed(false);
        toast.success('Вы отписались');
      } else {
        await setDoc(subRef, { id: subId, subscriberId: user.uid, channelId: short.authorId, createdAt: serverTimestamp() });
        await updateDoc(channelRef, { subscribers: increment(1) }).catch(() => {});
        setIsSubscribed(true);
        toast.success('Вы подписались!');
      }
    } catch (err) {
      toast.error('Не удалось обновить подписку');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/video/${short.id}`);
    toast.success('Ссылка скопирована');
  };

  const handleHideChannel = async () => {
    if (!user) return toast.error('Войдите, чтобы скрыть канал');
    try {
      const hiddenId = `${user.uid}_${short.authorId}`;
      await setDoc(doc(db, 'hidden_channels', hiddenId), {
        id: hiddenId,
        userId: user.uid,
        channelId: short.authorId,
        addedAt: serverTimestamp()
      });
      toast.success('Канал больше не будет рекомендоваться');
      // Ideally we'd remove it from the UI immediately, but a reload or state update is needed
      window.location.reload();
    } catch (err) {
      toast.error('Не удалось скрыть канал');
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error('Войдите, чтобы оставить комментарий');
    if (!newComment.trim()) return;
    
    setSubmittingComment(true);
    try {
      const commentId = crypto.randomUUID();
      const commentData = {
        id: commentId,
        videoId: short.id,
        authorId: user.uid,
        authorName: user.displayName || 'User',
        authorPhotoUrl: user.photoURL || '',
        text: newComment.trim(),
        createdAt: new Date(),
        likes: 0,
        dislikes: 0
      };
      await setDoc(doc(db, 'comments', commentId), commentData);
      setComments([{ ...commentData, createdAt: commentData.createdAt.toISOString() } as any, ...comments]);
      setNewComment('');
      toast.success('Комментарий добавлен');
    } catch (err) {
      toast.error('Не удалось добавить комментарий');
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="h-full w-full snap-start relative flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src={short.videoUrl}
        className="h-full w-full object-contain"
        loop
        playsInline
        muted={!isActive}
        onClick={() => {
          if (videoRef.current) {
            if (videoRef.current.paused) videoRef.current.play();
            else videoRef.current.pause();
          }
        }}
      />
      
      {/* Overlay Info */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white z-10 pointer-events-none">
        <div className="flex items-center gap-3 mb-4 pointer-events-auto">
          <div 
            onClick={() => navigate(`/channel/${short.authorId}`)}
            className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 cursor-pointer hover:scale-105 transition-transform"
          >
            <img src={authorData?.photoURL || short.authorPhotoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${short.authorId}`} alt={authorData?.displayName || short.authorName} />
          </div>
          <div>
            <h3 
              onClick={() => navigate(`/channel/${short.authorId}`)}
              className="font-bold text-sm cursor-pointer hover:underline"
            >
              {authorData?.displayName || short.authorName}
            </h3>
            {authorData?.pseudonym && (
              <p 
                onClick={() => navigate(`/channel/${short.authorId}`)}
                className="text-xs text-white/70 cursor-pointer hover:underline"
              >
                @{authorData.pseudonym}
              </p>
            )}
            <button 
              onClick={handleSubscribe}
              className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mt-1 transition-colors ${isSubscribed ? 'bg-white/20 text-white' : 'bg-white text-black'}`}
            >
              {isSubscribed ? 'Вы подписаны' : 'Подписаться'}
            </button>
          </div>
        </div>
        <p className="text-sm font-medium line-clamp-2 mb-2">{short.title}</p>
        {short.hashtags && short.hashtags.length > 0 && (
          <p className="text-xs text-blue-400 font-bold mb-4">
            {short.hashtags.map(tag => `#${tag}`).join(' ')}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs opacity-80">
          <MusicIcon className="w-3 h-3" />
          <span>{short.soundName || `Оригинальный звук - ${short.authorName}`}</span>
        </div>
      </div>

      {/* Side Actions */}
      <div className="absolute right-4 bottom-24 flex flex-col gap-6 items-center text-white z-10">
        <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
          <div className={`w-12 h-12 backdrop-blur-md rounded-full flex items-center justify-center transition-all ${isLiked ? 'bg-blue-600' : 'bg-white/10 group-hover:bg-white/20'}`}>
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
          </div>
          <span className="text-xs font-bold shadow-black drop-shadow-md">{likesCount}</span>
        </button>
        <button onClick={handleIce} className="flex flex-col items-center gap-1 group">
          <div className={`w-12 h-12 backdrop-blur-md rounded-full flex items-center justify-center transition-all ${isIced ? 'bg-blue-400' : 'bg-white/10 group-hover:bg-white/20'}`}>
            <Snowflake className={`w-6 h-6 ${isIced ? 'fill-current' : ''}`} />
          </div>
          <span className="text-xs font-bold shadow-black drop-shadow-md">{icesCount}</span>
        </button>
        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1 group">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center group-hover:bg-white/20 transition-all">
            <MessageSquare className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold shadow-black drop-shadow-md">Комментарии</span>
        </button>
        <button onClick={handleShare} className="flex flex-col items-center gap-1 group">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center group-hover:bg-white/20 transition-all">
            <Share2 className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold shadow-black drop-shadow-md">Поделиться</span>
        </button>
        <button onClick={handleHideChannel} className="flex flex-col items-center gap-1 group">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center group-hover:bg-red-500/50 transition-all">
            <Ban className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold shadow-black drop-shadow-md text-center leading-tight">Не реком.</span>
        </button>
      </div>

      {/* Comments Modal */}
      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 h-[60%] bg-[var(--surface)] rounded-t-3xl z-50 flex flex-col shadow-2xl border-t border-[var(--border)]"
          >
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="font-bold text-[var(--text-primary)]">Комментарии</h3>
              <button onClick={() => setShowComments(false)} className="p-2 hover:bg-[var(--hover)] rounded-full text-[var(--text-secondary)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.length === 0 ? (
                <p className="text-center text-[var(--text-secondary)] py-8">Пока нет комментариев. Будьте первым!</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <img src={comment.authorPhotoUrl} alt="" className="w-8 h-8 rounded-full" />
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-sm text-[var(--text-primary)]">{comment.authorName}</span>
                        <span className="text-xs text-[var(--text-secondary)]">
                          {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ru }) : ''}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-primary)] mt-1">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-[var(--border)] bg-[var(--surface)]">
              <form onSubmit={handlePostComment} className="flex items-center gap-2">
                <img src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=guest`} alt="" className="w-8 h-8 rounded-full" />
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Добавьте комментарий..."
                  className="flex-1 bg-[var(--hover)] border-none rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-[var(--text-primary)]"
                />
                <button 
                  type="submit" 
                  disabled={!newComment.trim() || submittingComment}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-full disabled:opacity-50 transition-opacity"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function Shorts() {
  const { user } = useAuth();
  const [shorts, setShorts] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchShorts = async () => {
      try {
        let hiddenChannelIds: string[] = [];
        if (user) {
          const hiddenQ = query(collection(db, 'hidden_channels'), where('userId', '==', user.uid));
          const hiddenSnap = await getDocs(hiddenQ);
          hiddenChannelIds = hiddenSnap.docs.map(doc => doc.data().channelId);
        }

        const q = query(
          collection(db, 'videos'), 
          where('isShort', '==', true),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        let data = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as VideoType[];
        
        if (hiddenChannelIds.length > 0) {
          data = data.filter(video => !hiddenChannelIds.includes(video.authorId));
        }
        
        setShorts(data);
      } catch (error) {
        console.error("Error fetching shorts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchShorts();
  }, [user]);

  useEffect(() => {
    if (!user || shorts.length === 0) return;
    
    const currentShort = shorts[currentIndex];
    if (!currentShort) return;

    const addToHistory = async () => {
      try {
        const historyId = `${user.uid}_${currentShort.id}`;
        await setDoc(doc(db, 'history', historyId), {
          id: historyId,
          userId: user.uid,
          videoId: currentShort.id,
          watchedAt: serverTimestamp()
        });
      } catch (err) {
        console.error("Failed to add short to history:", err);
      }
    };
    addToHistory();
  }, [currentIndex, user, shorts]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollPos = e.currentTarget.scrollTop;
    const height = e.currentTarget.clientHeight;
    const index = Math.round(scrollPos / height);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest">Загрузка Shorts...</p>
      </div>
    );
  }

  if (shorts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] text-[var(--text-secondary)]">
        <Smartphone className="w-16 h-16 opacity-20 mb-4" />
        <p className="text-lg font-bold text-[var(--text-primary)]">Shorts пока нет</p>
        <p className="text-sm mt-2">Будьте первым, кто загрузит короткое видео!</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="h-[calc(100vh-64px)] overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-black relative"
    >
      {shorts.map((short, index) => (
        <ShortPlayer 
          key={short.id} 
          short={short} 
          isActive={index === currentIndex} 
          user={user} 
        />
      ))}
    </div>
  );
}

