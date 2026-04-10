import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { VideoType, Comment, SubscriptionType, VideoLikeType } from '../types';
import { ThumbsUp, ThumbsDown, Share2, MoreHorizontal, Send, Loader2, Snowflake } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, limit, getDocs, setDoc, deleteDoc, orderBy, increment } from 'firebase/firestore';
import { toast } from 'sonner';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function VideoPlayer() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [video, setVideo] = useState<VideoType | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Real interactions state
  const [isLiked, setIsLiked] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [replyCommentText, setReplyCommentText] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!id) return;
    
    const fetchVideoAndInteractions = async () => {
      try {
        setLoading(true);
        const videoDocRef = doc(db, 'videos', id);
        const videoSnap = await getDoc(videoDocRef);
        
        if (!videoSnap.exists()) {
          throw new Error('Video not found');
        }
        
        const data = {
          ...videoSnap.data(),
          createdAt: videoSnap.data().createdAt?.toDate()?.toISOString()
        } as VideoType;
        
        setVideo(data);

        // Increment views
        await updateDoc(videoDocRef, {
          views: data.views + 1
        });

        // Fetch related videos
        const relatedQ = query(collection(db, 'videos'), limit(10));
        const relatedSnap = await getDocs(relatedQ);
        const relatedData = relatedSnap.docs
          .map(d => ({
            ...d.data(),
            createdAt: d.data().createdAt?.toDate()?.toISOString()
          }))
          .filter((v: any) => v.id !== id) as VideoType[];
          
        setRelatedVideos(relatedData);

        // Fetch comments
        const commentsQ = query(collection(db, 'comments'), where('videoId', '==', id), orderBy('createdAt', 'desc'));
        const commentsSnap = await getDocs(commentsQ);
        setComments(commentsSnap.docs.map(d => ({
          ...d.data(),
          createdAt: d.data().createdAt?.toDate()?.toISOString()
        })) as Comment[]);

        // Fetch user interactions if logged in
        if (user) {
          // Check like
          const likeId = `${user.uid}_${id}`;
          const likeSnap = await getDoc(doc(db, 'video_likes', likeId));
          if (likeSnap.exists() && likeSnap.data().type === 'like') {
            setIsLiked(true);
          }

          // Check subscription
          const subId = `${user.uid}_${data.authorId}`;
          const subSnap = await getDoc(doc(db, 'subscriptions', subId));
          if (subSnap.exists()) {
            setIsSubscribed(true);
          }
        }

      } catch (error) {
        console.error("Error fetching video:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideoAndInteractions();
    window.scrollTo(0, 0);
  }, [id, user]);

  const handleLike = async () => {
    if (!user || !video) {
      toast.error('Пожалуйста, войдите, чтобы ставить лайки');
      return;
    }

    const likeId = `${user.uid}_${video.id}`;
    const likeRef = doc(db, 'video_likes', likeId);
    const videoRef = doc(db, 'videos', video.id);

    try {
      if (isLiked) {
        await deleteDoc(likeRef);
        await updateDoc(videoRef, { likes: Math.max(0, video.likes - 1) });
        setVideo({ ...video, likes: Math.max(0, video.likes - 1) });
        setIsLiked(false);
      } else {
        await setDoc(likeRef, { id: likeId, userId: user.uid, videoId: video.id, type: 'like' });
        await updateDoc(videoRef, { likes: video.likes + 1 });
        setVideo({ ...video, likes: video.likes + 1 });
        setIsLiked(true);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error('Не удалось обновить лайк');
    }
  };

  const handleSubscribe = async () => {
    if (!user || !video) {
      toast.error('Пожалуйста, войдите, чтобы подписаться');
      return;
    }
    if (user.uid === video.authorId) {
      toast.error("Вы не можете подписаться на самого себя");
      return;
    }

    const subId = `${user.uid}_${video.authorId}`;
    const subRef = doc(db, 'subscriptions', subId);
    const channelRef = doc(db, 'users', video.authorId);

    try {
      if (isSubscribed) {
        await deleteDoc(subRef);
        await updateDoc(channelRef, { subscribers: increment(-1) }).catch(() => {});
        setIsSubscribed(false);
        toast.success('Вы отписались');
      } else {
        await setDoc(subRef, {
          id: subId,
          subscriberId: user.uid,
          channelId: video.authorId,
          createdAt: new Date()
        });
        await updateDoc(channelRef, { subscribers: increment(1) }).catch(() => {});
        setIsSubscribed(true);
        toast.success('Вы подписались!');
      }
    } catch (error) {
      console.error("Error toggling subscription:", error);
      toast.error('Не удалось обновить подписку');
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!video || !newComment.trim()) return;

    setSubmittingComment(true);
    try {
      let authorName = 'Аноним';
      let authorPhotoUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`;
      let authorId = 'anonymous';

      if (user) {
        // Fetch current user data to get the latest display name
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        authorName = userDoc.exists() && userDoc.data().displayName ? userDoc.data().displayName : (user.displayName || 'User');
        authorPhotoUrl = userDoc.exists() && userDoc.data().photoURL ? userDoc.data().photoURL : (user.photoURL || '');
        authorId = user.uid;
      }

      const commentId = crypto.randomUUID();
      const commentData = {
        id: commentId,
        videoId: video.id,
        authorId: authorId,
        authorName: authorName,
        authorPhotoUrl: authorPhotoUrl,
        text: newComment.trim(),
        createdAt: new Date(),
        likes: 0,
        dislikes: 0
      };

      await setDoc(doc(db, 'comments', commentId), commentData);
      
      setComments([{ ...commentData, createdAt: commentData.createdAt.toISOString() } as any, ...comments]);
      setNewComment('');
      toast.success('Комментарий опубликован');
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error('Не удалось опубликовать комментарий');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editCommentText.trim()) return;
    try {
      await updateDoc(doc(db, 'comments', commentId), {
        text: editCommentText.trim(),
        isEdited: true
      });
      setComments(comments.map(c => c.id === commentId ? { ...c, text: editCommentText.trim(), isEdited: true } : c));
      setEditingCommentId(null);
      setEditCommentText('');
      toast.success('Комментарий обновлен');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `comments/${commentId}`);
      toast.error('Не удалось обновить комментарий');
    }
  };

  const handleReplyComment = async (parentId: string) => {
    if (!replyCommentText.trim() || !video) return;
    try {
      let authorName = 'Аноним';
      let authorPhotoUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`;
      let authorId = 'anonymous';

      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        authorName = userDoc.exists() && userDoc.data().displayName ? userDoc.data().displayName : (user.displayName || 'User');
        authorPhotoUrl = userDoc.exists() && userDoc.data().photoURL ? userDoc.data().photoURL : (user.photoURL || '');
        authorId = user.uid;
      }

      const commentId = crypto.randomUUID();
      const commentData = {
        id: commentId,
        videoId: video.id,
        authorId: authorId,
        authorName: authorName,
        authorPhotoUrl: authorPhotoUrl,
        text: replyCommentText.trim(),
        createdAt: new Date(),
        parentId: parentId,
        likes: 0,
        dislikes: 0
      };

      await setDoc(doc(db, 'comments', commentId), commentData);
      setComments([{ ...commentData, createdAt: commentData.createdAt.toISOString() } as any, ...comments]);
      setReplyingCommentId(null);
      setReplyCommentText('');
      toast.success('Ответ опубликован');
    } catch (error) {
      toast.error('Не удалось опубликовать ответ');
    }
  };

  const handleCommentAction = async (commentId: string, action: 'like' | 'dislike' | 'heart') => {
    if (!user && action !== 'heart') {
      toast.error('Пожалуйста, войдите, чтобы взаимодействовать с комментариями');
      return;
    }
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    try {
      const commentRef = doc(db, 'comments', commentId);
      if (action === 'like') {
        const newLikes = (comment.likes || 0) + 1;
        await updateDoc(commentRef, { likes: newLikes });
        setComments(comments.map(c => c.id === commentId ? { ...c, likes: newLikes } : c));
      } else if (action === 'dislike') {
        const newDislikes = (comment.dislikes || 0) + 1;
        await updateDoc(commentRef, { dislikes: newDislikes });
        setComments(comments.map(c => c.id === commentId ? { ...c, dislikes: newDislikes } : c));
      } else if (action === 'heart') {
        if (user?.uid !== video?.authorId) return;
        const newHearted = !comment.authorHearted;
        await updateDoc(commentRef, { authorHearted: newHearted });
        setComments(comments.map(c => c.id === commentId ? { ...c, authorHearted: newHearted } : c));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `comments/${commentId}`);
      toast.error('Не удалось обновить комментарий');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-ice-accent" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-ice-muted">
        <Snowflake className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-2xl font-bold">Видео заморожено или не найдено</h2>
      </div>
    );
  }

  const formattedDate = video.createdAt 
    ? formatDistanceToNow(new Date(video.createdAt), { addSuffix: true }) 
    : 'недавно';

  return (
    <div className="max-w-[1800px] mx-auto p-3 md:p-6 pb-24 md:pb-6 flex flex-col xl:flex-row gap-6">
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className={`rounded-2xl md:rounded-3xl overflow-hidden glass border border-ice-border shadow-2xl relative group ${video.isShort ? 'aspect-[9/16] max-w-[400px] mx-auto' : 'aspect-video'}`}>
          <video
            ref={videoRef}
            src={video.videoUrl}
            controls
            autoPlay
            className="w-full h-full object-contain bg-black"
          />
        </div>

        <h1 className="text-xl md:text-3xl font-bold mt-4 md:mt-6 mb-3 md:mb-4 ice-text-glow leading-tight">{video.title}</h1>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 md:gap-4">
            <Link to={`/channel/${video.authorId}`} className="flex items-center gap-2 md:gap-3 group">
              <img
                src={video.authorPhotoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.authorId}`}
                alt={video.authorName}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-ice-accent shadow-[0_0_10px_rgba(0,242,255,0.3)] group-hover:scale-105 transition-transform"
              />
              <div>
                <h3 className="font-bold text-base md:text-lg group-hover:text-ice-accent transition-colors line-clamp-1">{video.authorName}</h3>
                <p className="text-xs text-ice-muted">Канал</p>
              </div>
            </Link>
            <button 
              onClick={handleSubscribe}
              className={`px-4 py-1.5 md:px-6 md:py-2 rounded-full font-bold transition-colors text-sm md:text-base ${
                isSubscribed 
                  ? 'bg-white/10 text-ice-text hover:bg-white/20' 
                  : 'bg-ice-text text-ice-bg hover:bg-white/90'
              }`}
            >
              {isSubscribed ? 'Вы подписаны' : 'Подписаться'}
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
            <div className="flex items-center bg-white/5 rounded-full border border-ice-border">
              <button 
                onClick={handleLike}
                className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 hover:bg-white/10 rounded-l-full transition-colors ${isLiked ? 'text-ice-accent' : ''}`}
              >
                <ThumbsUp className={`w-4 h-4 md:w-5 md:h-5 ${isLiked ? 'fill-current' : ''}`} />
                <span className="font-medium text-sm md:text-base">{video.likes}</span>
              </button>
              <div className="w-px h-5 md:h-6 bg-ice-border"></div>
              <button className="px-3 py-1.5 md:px-4 md:py-2 hover:bg-white/10 rounded-r-full transition-colors">
                <ThumbsDown className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
            <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-ice-border px-3 py-1.5 md:px-4 md:py-2 rounded-full transition-colors font-medium text-sm md:text-base">
              <Share2 className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Поделиться</span>
            </button>
          </div>
        </div>

        <div className="glass rounded-xl md:rounded-2xl p-3 md:p-4 border border-ice-border hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-3 md:gap-4 text-xs md:text-sm font-medium mb-2">
            <span>{video.views.toLocaleString()} просмотров</span>
            <span>{formattedDate}</span>
            <span className="text-ice-accent">#{video.category.replace(/\s+/g, '')}</span>
          </div>
          <p className="text-xs md:text-sm whitespace-pre-wrap">{video.description}</p>
        </div>

        {/* Comments Section */}
        <div className="mt-6 md:mt-8">
          <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6">{comments.length} Комментариев</h3>
          
          <div className="flex gap-3 md:gap-4 mb-6 md:mb-8">
            <img
              src={user?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=anonymous'}
              alt="Current user"
              className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-ice-accent"
            />
            <form onSubmit={handlePostComment} className="flex-1 relative">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={user ? "Добавьте крутой комментарий..." : "Добавить комментарий (как Аноним)..."}
                disabled={submittingComment}
                className="w-full bg-transparent border-b border-ice-border pb-2 focus:outline-none focus:border-ice-accent transition-colors peer disabled:opacity-50 text-sm md:text-base"
              />
              <div className="absolute right-0 bottom-2 opacity-0 peer-focus:opacity-100 transition-opacity flex gap-2">
                <button type="button" onClick={() => setNewComment('')} className="text-xs md:text-sm font-medium hover:text-ice-accent transition-colors">Отмена</button>
                <button type="submit" disabled={!newComment.trim() || submittingComment} className="bg-ice-accent text-ice-bg px-3 py-1 md:px-4 md:py-1 rounded-full text-xs md:text-sm font-bold hover:bg-ice-accent/90 transition-colors disabled:opacity-50">
                  {submittingComment ? 'Публикация...' : 'Оставить'}
                </button>
              </div>
            </form>
          </div>

          {/* Real Comments */}
          {comments.length === 0 ? (
            <p className="text-ice-muted text-center py-8 text-sm md:text-base">Комментариев пока нет. Будьте первым!</p>
          ) : (
            comments.filter(c => !c.parentId).map((comment) => {
              const renderComment = (c: Comment, isReply = false) => (
                <div key={c.id} className={`flex gap-3 md:gap-4 mb-5 md:mb-6 ${isReply ? 'ml-8 md:ml-12 mt-3 md:mt-4' : ''}`}>
                  <img
                    src={c.authorPhotoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.authorId}`}
                    alt={c.authorName}
                    className="w-8 h-8 md:w-10 md:h-10 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-xs md:text-sm">@{c.authorName.replace(/\s+/g, '').toLowerCase()}</span>
                      <span className="text-[10px] md:text-xs text-ice-muted">
                        {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : 'только что'}
                      </span>
                      {c.isEdited && <span className="text-[10px] md:text-xs text-ice-muted">(изменено)</span>}
                    </div>
                    
                    {editingCommentId === c.id ? (
                      <div className="mb-2">
                        <input
                          type="text"
                          value={editCommentText}
                          onChange={(e) => setEditCommentText(e.target.value)}
                          className="w-full bg-transparent border-b border-ice-border pb-1 focus:outline-none focus:border-ice-accent text-xs md:text-sm"
                        />
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => setEditingCommentId(null)} className="text-[10px] md:text-xs hover:text-ice-accent">Отмена</button>
                          <button onClick={() => handleEditComment(c.id)} className="text-[10px] md:text-xs bg-ice-accent text-ice-bg px-2 py-1 rounded">Сохранить</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs md:text-sm mb-2 leading-relaxed">{c.text}</p>
                    )}

                    <div className="flex items-center gap-3 md:gap-4">
                      <button onClick={() => handleCommentAction(c.id, 'like')} className="flex items-center gap-1 text-ice-muted hover:text-ice-text transition-colors">
                        <ThumbsUp className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        <span className="text-[10px] md:text-xs">{c.likes || 0}</span>
                      </button>
                      <button onClick={() => handleCommentAction(c.id, 'dislike')} className="flex items-center gap-1 text-ice-muted hover:text-ice-text transition-colors">
                        <ThumbsDown className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        <span className="text-[10px] md:text-xs">{c.dislikes || 0}</span>
                      </button>
                      
                      {!isReply && (
                        <button onClick={() => { setReplyingCommentId(c.id); setReplyCommentText(''); }} className="text-[10px] md:text-xs text-ice-muted hover:text-ice-text font-medium">
                          Ответить
                        </button>
                      )}

                      {user?.uid === c.authorId && (
                        <button onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.text); }} className="text-[10px] md:text-xs text-ice-muted hover:text-ice-text font-medium">
                          Изменить
                        </button>
                      )}

                      {c.authorHearted && (
                        <div className="flex items-center gap-1 text-ice-accent" title="Отмечено автором">
                          <Snowflake className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          <img src={video?.authorPhotoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video?.authorId}`} className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full border border-ice-accent" alt="Author" />
                        </div>
                      )}

                      {user?.uid === video?.authorId && !c.authorHearted && (
                        <button onClick={() => handleCommentAction(c.id, 'heart')} className="text-[10px] md:text-xs text-ice-muted hover:text-ice-accent" title="Отметить комментарий">
                          <Snowflake className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </button>
                      )}
                    </div>

                    {replyingCommentId === c.id && (
                      <div className="mt-3 md:mt-4 flex gap-2 md:gap-3">
                        <img src={user?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=anonymous'} className="w-7 h-7 md:w-8 md:h-8 rounded-full" alt="User" />
                        <div className="flex-1">
                          <input
                            type="text"
                            value={replyCommentText}
                            onChange={(e) => setReplyCommentText(e.target.value)}
                            placeholder="Напишите ответ..."
                            className="w-full bg-transparent border-b border-ice-border pb-1 focus:outline-none focus:border-ice-accent text-xs md:text-sm"
                          />
                          <div className="flex gap-2 mt-2 justify-end">
                            <button onClick={() => setReplyingCommentId(null)} className="text-[10px] md:text-xs hover:text-ice-accent">Отмена</button>
                            <button onClick={() => handleReplyComment(c.id)} className="text-[10px] md:text-xs bg-ice-accent text-ice-bg px-3 py-1 rounded-full font-bold">Ответить</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {!isReply && comments.filter(reply => reply.parentId === c.id).reverse().map(reply => renderComment(reply, true))}
                  </div>
                </div>
              );

              return renderComment(comment);
            })
          )}
        </div>
      </div>

      {/* Related Videos */}
      <div className="xl:w-[400px] shrink-0">
        <h3 className="text-lg font-bold mb-4">Похожие видео</h3>
        <div className="flex flex-col gap-4">
          {relatedVideos.map((v) => (
            <Link key={v.id} to={`/video/${v.id}`} className="flex gap-3 group">
              <div className="w-32 md:w-40 aspect-video rounded-xl overflow-hidden shrink-0 border border-ice-border relative">
                <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-medium">
                  {v.duration}
                </div>
              </div>
              <div className="flex flex-col py-0.5 md:py-1">
                <h4 className="font-bold text-xs md:text-sm line-clamp-2 group-hover:text-ice-accent transition-colors leading-tight mb-1">
                  {v.title}
                </h4>
                <span className="text-[10px] md:text-xs text-ice-muted">{v.authorName}</span>
                <span className="text-[10px] md:text-xs text-ice-muted">{v.views} просмотров • {v.createdAt ? formatDistanceToNow(new Date(v.createdAt)) : 'недавно'}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
