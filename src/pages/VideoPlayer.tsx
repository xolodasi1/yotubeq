import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { VideoType, Comment, SubscriptionType, VideoLikeType, Playlist } from '../types';
import { ThumbsUp, ThumbsDown, Share2, MoreHorizontal, Send, Loader2, Snowflake, Heart, Clock, ListPlus, Plus, Settings as SettingsIcon, MessageSquare } from 'lucide-react';
import { MeltingAvatar } from '../components/MeltingAvatar';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, limit, getDocs, setDoc, deleteDoc, orderBy, increment, serverTimestamp, onSnapshot, addDoc } from 'firebase/firestore';
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
  const { user, activeChannel } = useAuth();
  const [video, setVideo] = useState<VideoType | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Real interactions state
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isIced, setIsIced] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [authorData, setAuthorData] = useState<any>(null);
  
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [replyCommentText, setReplyCommentText] = useState('');
  const [quality, setQuality] = useState('1080p');
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [playlistVisibility, setPlaylistVisibility] = useState<'public' | 'private'>('public');

  const videoRef = useRef<HTMLVideoElement>(null);

  const seekTo = (time: string) => {
    if (!videoRef.current) return;
    const parts = time.split(':').map(Number);
    let seconds = 0;
    if (parts.length === 2) {
      seconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    videoRef.current.currentTime = seconds;
    videoRef.current.play();
  };

  useEffect(() => {
    if (!id) return;
    
    const fetchVideo = async () => {
      try {
        setLoading(true);
        const videoDocRef = doc(db, 'videos', id);
        const videoSnap = await getDoc(videoDocRef);
        
        if (!videoSnap.exists()) {
          throw new Error('Video not found');
        }
        
        const data = {
          id: videoSnap.id,
          ...videoSnap.data(),
          createdAt: videoSnap.data().createdAt?.toDate?.()?.toISOString() || videoSnap.data().createdAt
        } as VideoType;
        
        setVideo(data);

        // Fetch author data
        const authorSnap = await getDoc(doc(db, 'users', data.authorId));
        if (authorSnap.exists()) {
          setAuthorData(authorSnap.data());
        }

        // Increment views
        try {
          await updateDoc(videoDocRef, {
            views: increment(1)
          });
        } catch (err) {
          console.error("Failed to increment views:", err);
        }

        // Fetch related videos of the same type
        let relatedQ;
        if (data.isShort) {
          relatedQ = query(collection(db, 'videos'), where('isShort', '==', true), limit(12));
        } else if (data.isMusic) {
          relatedQ = query(collection(db, 'videos'), where('isMusic', '==', true), limit(12));
        } else if (data.isPhoto || data.type === 'photo') {
          relatedQ = query(collection(db, 'videos'), where('type', '==', 'photo'), limit(12));
        } else {
          relatedQ = query(collection(db, 'videos'), where('isShort', '==', false), where('isMusic', '==', false), where('type', '!=', 'photo'), limit(12));
        }

        const relatedSnap = await getDocs(relatedQ);
        const relatedData = relatedSnap.docs
          .map(d => {
            const vData = d.data();
            return {
              id: d.id,
              ...(vData as any),
              createdAt: (vData as any).createdAt?.toDate?.()?.toISOString() || (vData as any).createdAt
            };
          })
          .filter((v: any) => v.id !== id) as VideoType[];
          
        setRelatedVideos(relatedData);

        // Fetch comments
        const commentsQ = query(collection(db, 'comments'), where('videoId', '==', id), orderBy('createdAt', 'desc'));
        const commentsSnap = await getDocs(commentsQ);
        setComments(commentsSnap.docs.map(d => {
          const cData = d.data();
          return {
            ...cData,
            createdAt: cData.createdAt?.toDate?.()?.toISOString() || cData.createdAt
          };
        }) as Comment[]);

      } catch (error) {
        console.error("Error fetching video:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (!id || !video) return;

    if (!user) {
      setIsLiked(false);
      setIsFavorited(false);
      setIsWatchLater(false);
      setIsSubscribed(false);
      return;
    }

    const fetchInteractions = async () => {
      try {
        // Add to History
        try {
          const historyId = `${activeChannel?.id || user.uid}_${id}`;
          await setDoc(doc(db, 'history', historyId), {
            id: historyId,
            userId: activeChannel?.id || user.uid,
            videoId: id,
            watchedAt: serverTimestamp()
          });
        } catch (err) {
          console.error("Failed to add to history:", err);
        }

        // Check like/dislike
        const likeId = `${user.uid}_${id}`;
        const likeSnap = await getDoc(doc(db, 'video_likes', likeId));
        if (likeSnap.exists()) {
          const type = likeSnap.data().type;
          setIsLiked(type === 'like');
          setIsDisliked(type === 'dislike');
        } else {
          setIsLiked(false);
          setIsDisliked(false);
        }

        // Check ice
        const iceId = `${user.uid}_${id}`;
        const iceSnap = await getDoc(doc(db, 'video_ices', iceId));
        setIsIced(iceSnap.exists());

        // Check favorite
        const favSnap = await getDoc(doc(db, 'favorites', likeId));
        setIsFavorited(favSnap.exists());

        // Check watch later
        const wlSnap = await getDoc(doc(db, 'watch_later', likeId));
        setIsWatchLater(wlSnap.exists());

        // Check subscription
        const subId = `${user.uid}_${video.authorId}`;
        const subSnap = await getDoc(doc(db, 'subscriptions', subId));
        setIsSubscribed(subSnap.exists());
      } catch (error) {
        console.error("Error fetching interactions:", error);
      }
    };

    fetchInteractions();
  }, [id, user, video?.authorId]);

  const handleLike = async (type: 'like' | 'dislike') => {
    if (!user || !video) {
      toast.error('Пожалуйста, войдите, чтобы взаимодействовать с видео');
      return;
    }

    // Restriction: Only primary channel can interact
    if (!activeChannel?.isPrimary) {
      toast.error('Взаимодействовать с контентом можно только с основного канала');
      return;
    }
    
    const likeId = `${user.uid}_${video.id}`;
    const likeRef = doc(db, 'video_likes', likeId);
    const videoRef = doc(db, 'videos', video.id);

    try {
      const currentType = isLiked ? 'like' : isDisliked ? 'dislike' : null;

      if (currentType === type) {
        // Remove interaction
        await deleteDoc(likeRef);
        await updateDoc(videoRef, { [type === 'like' ? 'likes' : 'dislikes']: increment(-1) });
        setVideo({ ...video, [type === 'like' ? 'likes' : 'dislikes']: Math.max(0, (video[type === 'like' ? 'likes' : 'dislikes'] || 0) - 1) });
        if (type === 'like') setIsLiked(false);
        else setIsDisliked(false);
      } else if (currentType) {
        // Switch interaction
        await updateDoc(likeRef, { type });
        await updateDoc(videoRef, { 
          [type === 'like' ? 'likes' : 'dislikes']: increment(1),
          [currentType === 'like' ? 'likes' : 'dislikes']: increment(-1)
        });
        setVideo({ 
          ...video, 
          [type === 'like' ? 'likes' : 'dislikes']: (video[type === 'like' ? 'likes' : 'dislikes'] || 0) + 1,
          [currentType === 'like' ? 'likes' : 'dislikes']: Math.max(0, (video[currentType === 'like' ? 'likes' : 'dislikes'] || 0) - 1)
        });
        setIsLiked(type === 'like');
        setIsDisliked(type === 'dislike');
      } else {
        // New interaction
        await setDoc(likeRef, { id: likeId, userId: user.uid, videoId: video.id, type });
        await updateDoc(videoRef, { [type === 'like' ? 'likes' : 'dislikes']: increment(1) });
        
        if (type === 'like' && video.authorId !== user.uid) {
          await addDoc(collection(db, 'notifications'), {
            userId: video.authorId,
            type: 'like',
            videoId: video.id,
            videoTitle: video.title,
            fromUserId: user.uid,
            fromUserName: user.displayName,
            fromUserAvatar: user.photoURL,
            createdAt: new Date(),
            read: false
          });
        }

        setVideo({ ...video, [type === 'like' ? 'likes' : 'dislikes']: (video[type === 'like' ? 'likes' : 'dislikes'] || 0) + 1 });
        setIsLiked(type === 'like');
        setIsDisliked(type === 'dislike');
      }
    } catch (error) {
      console.error("Error toggling like/dislike:", error);
      toast.error('Не удалось обновить реакцию');
    }
  };

  const handleIce = async () => {
    if (!user || !video) {
      toast.error('Пожалуйста, войдите, чтобы ставить снежинки');
      return;
    }

    const iceId = `${user.uid}_${video.id}`;
    const iceRef = doc(db, 'video_ices', iceId);
    const videoRef = doc(db, 'videos', video.id);

    try {
      if (isIced) {
        await deleteDoc(iceRef);
        await updateDoc(videoRef, { ices: Math.max(0, (video.ices || 0) - 1) });
        setVideo({ ...video, ices: Math.max(0, (video.ices || 0) - 1) });
        setIsIced(false);
      } else {
        await setDoc(iceRef, { id: iceId, userId: user.uid, videoId: video.id, createdAt: serverTimestamp() });
        await updateDoc(videoRef, { ices: (video.ices || 0) + 1 });
        setVideo({ ...video, ices: (video.ices || 0) + 1 });
        setIsIced(true);
      }
    } catch (error) {
      console.error("Error toggling ice:", error);
      toast.error('Не удалось обновить снежинку');
    }
  };

  const toggleFavorite = async () => {
    if (!user || !id) return toast.error('Войдите, чтобы добавить в избранное');
    const favId = `${user.uid}_${id}`;
    const favRef = doc(db, 'favorites', favId);
    try {
      if (isFavorited) {
        await deleteDoc(favRef);
        setIsFavorited(false);
        toast.success('Удалено из избранного');
      } else {
        await setDoc(favRef, { id: favId, userId: user.uid, videoId: id, addedAt: serverTimestamp() });
        setIsFavorited(true);
        toast.success('Добавлено в избранное');
      }
    } catch (error) { toast.error('Ошибка'); }
  };

  const toggleWatchLater = async () => {
    if (!user || !id) return toast.error('Войдите, чтобы посмотреть позже');
    const wlId = `${user.uid}_${id}`;
    const wlRef = doc(db, 'watch_later', wlId);
    try {
      if (isWatchLater) {
        await deleteDoc(wlRef);
        setIsWatchLater(false);
        toast.success('Удалено из "Смотреть позже"');
      } else {
        await setDoc(wlRef, { id: wlId, userId: user.uid, videoId: id, addedAt: serverTimestamp() });
        setIsWatchLater(true);
        toast.success('Добавлено в "Смотреть позже"');
      }
    } catch (error) { toast.error('Ошибка'); }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!id) return;
    const playlistRef = doc(db, 'playlists', playlistId);
    try {
      const snap = await getDoc(playlistRef);
      if (snap.exists()) {
        const videoIds = snap.data().videoIds || [];
        if (videoIds.includes(id)) {
          toast.info('Уже в плейлисте');
          return;
        }
        await updateDoc(playlistRef, { videoIds: [...videoIds, id] });
        toast.success('Добавлено в плейлист');
        setShowPlaylistModal(false);
      }
    } catch (error) { toast.error('Ошибка'); }
  };

  const createPlaylist = async () => {
    if (!user || !activeChannel || !newPlaylistTitle.trim() || !id) return;
    try {
      const playlistId = crypto.randomUUID();
      await setDoc(doc(db, 'playlists', playlistId), {
        id: playlistId,
        title: newPlaylistTitle,
        authorId: activeChannel.id,
        videoIds: [id],
        visibility: playlistVisibility,
        createdAt: serverTimestamp(),
        type: video.type || 'video'
      });
      toast.success('Плейлист создан');
      setNewPlaylistTitle('');
      setShowPlaylistModal(false);
    } catch (error) { toast.error('Ошибка'); }
  };

  const fetchUserPlaylists = async () => {
    if (!user || !activeChannel) return;
    const q = query(collection(db, 'playlists'), where('authorId', '==', activeChannel.id));
    const snap = await getDocs(q);
    setUserPlaylists(snap.docs.map(d => d.data() as Playlist));
    setShowPlaylistModal(true);
  };

  const handleSubscribe = async () => {
    if (!user || !video || !authorData) {
      toast.error('Пожалуйста, войдите, чтобы подписаться');
      return;
    }

    // Restriction: Only primary channel can interact
    if (!activeChannel?.isPrimary) {
      toast.error('Подписываться можно только с основного канала');
      return;
    }

    // Restriction: Cannot subscribe to own channels
    if (user.uid === authorData.ownerId || user.uid === video.authorId) {
      toast.error("Вы не можете подписаться на свои каналы");
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
        
        // Add notification
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: video.authorId,
            type: 'subscribe',
            fromUserId: user.uid,
            fromUserName: user.displayName,
            fromUserAvatar: user.photoURL,
            createdAt: new Date(),
            read: false
          });
        } catch (err) {
          console.error("Error adding notification:", err);
        }

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

    if (user && !activeChannel?.isPrimary) {
      toast.error('Оставлять комментарии можно только с основного канала');
      return;
    }

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
      
      // Add notification
      if (user && video.authorId !== user.uid) {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: video.authorId,
            type: 'comment',
            videoId: video.id,
            videoTitle: video.title,
            fromUserId: user.uid,
            fromUserName: authorName,
            fromUserAvatar: authorPhotoUrl,
            commentText: newComment.trim(),
            createdAt: new Date(),
            read: false
          });
        } catch (err) {
          console.error("Error adding notification:", err);
        }
      }

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

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот комментарий?')) return;
    try {
      await deleteDoc(doc(db, 'comments', commentId));
      setComments(comments.filter(c => c.id !== commentId && c.parentId !== commentId));
      toast.success('Комментарий удален');
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error('Не удалось удалить комментарий');
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
    if (!user) {
      toast.error('Пожалуйста, войдите, чтобы взаимодействовать с комментариями');
      return;
    }
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    try {
      const commentRef = doc(db, 'comments', commentId);
      
      if (action === 'heart') {
        if (user?.uid !== video?.authorId) return;
        const newHearted = !comment.authorHearted;
        await updateDoc(commentRef, { authorHearted: newHearted });
        setComments(comments.map(c => c.id === commentId ? { ...c, authorHearted: newHearted } : c));
        return;
      }

      // Handle Like/Dislike with persistence
      const actionId = `${user.uid}_${commentId}`;
      const actionRef = doc(db, 'commentActions', actionId);
      const actionSnap = await getDoc(actionRef);
      const currentAction = actionSnap.exists() ? actionSnap.data().type : null;

      if (currentAction === action) {
        // Remove action
        await deleteDoc(actionRef);
        const updateData: any = { [action === 'like' ? 'likes' : 'dislikes']: increment(-1) };
        await updateDoc(commentRef, updateData);
        setComments(comments.map(c => c.id === commentId ? { ...c, [action === 'like' ? 'likes' : 'dislikes']: (c[action === 'like' ? 'likes' : 'dislikes'] || 0) - 1 } : c));
      } else if (currentAction) {
        // Switch action
        await updateDoc(actionRef, { type: action });
        const updateData: any = {
          [action === 'like' ? 'likes' : 'dislikes']: increment(1),
          [action === 'like' ? 'dislikes' : 'likes']: increment(-1)
        };
        await updateDoc(commentRef, updateData);
        setComments(comments.map(c => c.id === commentId ? { 
          ...c, 
          [action === 'like' ? 'likes' : 'dislikes']: (c[action === 'like' ? 'likes' : 'dislikes'] || 0) + 1,
          [action === 'like' ? 'dislikes' : 'likes']: (c[action === 'like' ? 'dislikes' : 'likes'] || 0) - 1
        } : c));
      } else {
        // New action
        await setDoc(actionRef, {
          userId: user.uid,
          commentId,
          type: action
        });
        const updateData: any = { [action === 'like' ? 'likes' : 'dislikes']: increment(1) };
        await updateDoc(commentRef, updateData);
        setComments(comments.map(c => c.id === commentId ? { ...c, [action === 'like' ? 'likes' : 'dislikes']: (c[action === 'like' ? 'likes' : 'dislikes'] || 0) + 1 } : c));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `comments/${commentId}`);
      toast.error('Не удалось обновить реакцию');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-gray-400">
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
          {video.isMusic ? (
            <div className="w-full h-full relative flex items-center justify-center bg-gradient-to-br from-gray-900 to-black overflow-hidden">
              <img 
                src={video.thumbnailUrl} 
                alt={video.title} 
                className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl scale-110"
              />
              <div className="relative z-10 flex flex-col items-center gap-6">
                <div className="w-48 h-48 md:w-64 md:h-64 rounded-2xl shadow-2xl overflow-hidden border-4 border-white/10 animate-pulse-slow">
                  <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Сейчас играет</span>
                  </div>
                </div>
              </div>
              <video
                ref={videoRef}
                src={video.videoUrl}
                controls
                autoPlay
                className="absolute bottom-0 left-0 w-full h-12 bg-black/60 backdrop-blur-md"
              />
            </div>
          ) : video.isPhoto || video.type === 'photo' ? (
            <div className="w-full h-full flex items-center justify-center bg-black/20 backdrop-blur-sm">
              <img 
                src={video.videoUrl} 
                alt={video.title} 
                className="max-w-full max-h-full object-contain shadow-2xl"
              />
            </div>
          ) : (
            <video
              ref={videoRef}
              src={video.videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain bg-black"
            />
          )}
          
          {/* Quality Selector Overlay */}
          <div className="absolute top-4 right-4 z-10">
            <div className="relative">
              <button 
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className="bg-black/60 hover:bg-black/80 text-white text-[10px] font-bold px-2 py-1 rounded border border-white/20 backdrop-blur-sm transition-all flex items-center gap-1"
              >
                <SettingsIcon className="w-3 h-3" />
                {quality}
              </button>
              
              {showQualityMenu && (
                <div className="absolute top-full right-0 mt-1 bg-black/90 border border-white/10 rounded-lg overflow-hidden shadow-xl min-w-[80px]">
                  {['2160p (4K)', '1440p', '1080p', '720p', '480p', '360p'].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setQuality(q.split(' ')[0]); setShowQualityMenu(false); }}
                      className={`w-full text-left px-3 py-1.5 text-[10px] font-medium hover:bg-white/10 transition-colors ${quality === q.split(' ')[0] ? 'text-blue-400' : 'text-white'}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <h1 className="text-xl md:text-3xl font-bold mt-4 md:mt-6 mb-3 md:mb-4 text-[var(--studio-text)] leading-tight">{video.title}</h1>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 md:gap-4">
            <Link to={`/channel/${video.authorId}`} className="flex items-center gap-2 md:gap-3 group">
              <MeltingAvatar 
                photoURL={video.authorPhotoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.authorId}`}
                lastPostAt={authorData?.lastPostAt}
                size="lg"
                className="border-2 border-blue-100 shadow-[0_0_10px_rgba(37,99,235,0.2)] group-hover:scale-105 transition-transform"
              />
              <div>
                <h3 className="font-bold text-base md:text-lg group-hover:text-blue-600 transition-colors line-clamp-1 text-[var(--studio-text)]">{video.authorName}</h3>
                <p className="text-xs text-[var(--studio-muted)]">Канал</p>
              </div>
            </Link>
            <button 
              onClick={handleSubscribe}
              className={`px-4 py-1.5 md:px-6 md:py-2 rounded-full font-bold transition-colors text-sm md:text-base ${
                isSubscribed 
                  ? 'bg-[var(--studio-hover)] text-[var(--studio-text)] hover:bg-gray-200' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isSubscribed ? 'Вы подписаны' : 'Подписаться'}
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
            <div className="flex items-center bg-[var(--studio-hover)] rounded-full border border-[var(--studio-border)]">
              <button 
                onClick={() => handleLike('like')}
                className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 hover:bg-[var(--hover)] rounded-l-full transition-colors ${isLiked ? 'text-blue-600' : 'text-[var(--studio-text)]'}`}
              >
                <ThumbsUp className={`w-4 h-4 md:w-5 md:h-5 ${isLiked ? 'fill-current' : ''}`} />
                <span className="font-medium text-sm md:text-base">{video.likes}</span>
              </button>
              <div className="w-px h-5 md:h-6 bg-[var(--studio-border)]"></div>
              <button 
                onClick={() => handleLike('dislike')}
                className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 hover:bg-[var(--hover)] transition-colors ${isDisliked ? 'text-red-500' : 'text-[var(--studio-text)]'}`}
              >
                <ThumbsDown className={`w-4 h-4 md:w-5 md:h-5 ${isDisliked ? 'fill-current' : ''}`} />
                <span className="font-medium text-sm md:text-base">{video.dislikes || 0}</span>
              </button>
              <div className="w-px h-5 md:h-6 bg-[var(--studio-border)]"></div>
              <button 
                onClick={handleIce}
                className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 hover:bg-[var(--hover)] rounded-r-full transition-colors ${isIced ? 'text-blue-400' : 'text-[var(--studio-text)]'}`}
              >
                <Snowflake className={`w-4 h-4 md:w-5 md:h-5 ${isIced ? 'fill-current' : ''}`} />
                <span className="font-medium text-sm md:text-base">{video.ices || 0}</span>
              </button>
            </div>
            
            <button 
              onClick={toggleFavorite}
              className={`flex items-center gap-2 bg-[var(--studio-hover)] hover:bg-[var(--hover)] border border-[var(--studio-border)] px-3 py-1.5 md:px-4 md:py-2 rounded-full transition-colors font-medium text-sm md:text-base ${isFavorited ? 'text-blue-600 border-blue-400/50' : 'text-[var(--studio-text)]'}`}
            >
              <Heart className={`w-4 h-4 md:w-5 md:h-5 ${isFavorited ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">Избранное</span>
            </button>

            <button 
              onClick={toggleWatchLater}
              className={`flex items-center gap-2 bg-[var(--studio-hover)] hover:bg-[var(--hover)] border border-[var(--studio-border)] px-3 py-1.5 md:px-4 md:py-2 rounded-full transition-colors font-medium text-sm md:text-base ${isWatchLater ? 'text-blue-600 border-blue-400/50' : 'text-[var(--studio-text)]'}`}
            >
              <Clock className={`w-4 h-4 md:w-5 md:h-5 ${isWatchLater ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">Позже</span>
            </button>

            <button 
              onClick={fetchUserPlaylists}
              className="flex items-center gap-2 bg-[var(--studio-hover)] hover:bg-[var(--hover)] border border-[var(--studio-border)] px-3 py-1.5 md:px-4 md:py-2 rounded-full transition-colors font-medium text-sm md:text-base text-[var(--studio-text)]"
            >
              <ListPlus className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Плейлист</span>
            </button>

            <button className="flex items-center gap-2 bg-[var(--studio-hover)] hover:bg-[var(--hover)] border border-[var(--studio-border)] px-3 py-1.5 md:px-4 md:py-2 rounded-full transition-colors font-medium text-sm md:text-base text-[var(--studio-text)]">
              <Share2 className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Поделиться</span>
            </button>
          </div>
        </div>

        {/* Playlist Modal */}
        {showPlaylistModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="glass w-full max-w-md rounded-3xl border border-ice-border p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Добавить в плейлист</h3>
                <button onClick={() => setShowPlaylistModal(false)} className="text-ice-muted hover:text-ice-text">✕</button>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto mb-6 pr-2 scrollbar-hide">
                {userPlaylists.map(pl => (
                  <button 
                    key={pl.id} 
                    onClick={() => handleAddToPlaylist(pl.id)}
                    className="w-full text-left p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-ice-border transition-all flex items-center justify-between group"
                  >
                    <span className="font-medium">{pl.title}</span>
                    <Plus className="w-4 h-4 opacity-0 group-hover:opacity-100 text-ice-accent" />
                  </button>
                ))}
                {userPlaylists.length === 0 && <p className="text-center text-ice-muted py-4">У вас пока нет плейлистов</p>}
              </div>

              <div className="space-y-3 mb-6">
                <input 
                  type="text" 
                  value={newPlaylistTitle}
                  onChange={(e) => setNewPlaylistTitle(e.target.value)}
                  placeholder="Название нового плейлиста"
                  className="w-full bg-white/5 border border-ice-border rounded-xl px-4 py-2 focus:outline-none focus:border-ice-accent"
                />
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="visibility" 
                      checked={playlistVisibility === 'public'} 
                      onChange={() => setPlaylistVisibility('public')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Для всех</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="visibility" 
                      checked={playlistVisibility === 'private'} 
                      onChange={() => setPlaylistVisibility('private')}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Только для меня</span>
                  </label>
                </div>
                <button 
                  onClick={createPlaylist}
                  disabled={!newPlaylistTitle.trim()}
                  className="w-full bg-ice-accent text-ice-bg py-2 rounded-xl font-bold hover:bg-ice-accent/90 transition-colors disabled:opacity-50"
                >
                  Создать и добавить
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 p-3 md:p-4 bg-[var(--studio-hover)] rounded-xl border border-[var(--studio-border)]">
          <div className="flex items-center gap-3 text-xs md:text-sm font-bold mb-2 text-[var(--studio-text)]">
            <span>{video.views.toLocaleString()} просмотров</span>
            <span>{formattedDate}</span>
            <span className="text-blue-600">#{video.category.replace(/\s+/g, '')}</span>
          </div>
          <p className="text-xs md:text-sm whitespace-pre-wrap text-[var(--studio-text)]/90">{video.description}</p>
          
          {video.timestamps && video.timestamps.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--studio-border)]">
              <h4 className="text-xs font-black uppercase tracking-widest text-blue-600 mb-3">Эпизоды</h4>
              <div className="flex flex-wrap gap-2">
                {video.timestamps.map((ts, idx) => (
                  <button 
                    key={idx}
                    onClick={() => seekTo(ts.time)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[var(--hover)] hover:bg-blue-500/10 rounded-lg border border-[var(--studio-border)] hover:border-blue-500/30 transition-all group"
                  >
                    <span className="text-[10px] font-mono font-black text-blue-600">{ts.time}</span>
                    <span className="text-[10px] font-bold text-[var(--studio-text)] uppercase tracking-tight">{ts.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="mt-6 md:mt-8">
          <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6 text-[var(--studio-text)]">{comments.length} Комментариев</h3>
          
          <div className="flex gap-3 md:gap-4 mb-6 md:mb-8">
            <img
              src={user?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=anonymous'}
              alt="Current user"
              className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-blue-200"
            />
            <form onSubmit={handlePostComment} className="flex-1 relative">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={user ? "Добавьте крутой комментарий..." : "Добавить комментарий (как Аноним)..."}
                disabled={submittingComment}
                className="w-full bg-transparent border-b border-[var(--studio-border)] pb-2 focus:outline-none focus:border-blue-600 transition-colors peer disabled:opacity-50 text-sm md:text-base text-[var(--studio-text)]"
              />
              <div className="absolute right-0 bottom-2 opacity-0 peer-focus:opacity-100 transition-opacity flex gap-2">
                <button type="button" onClick={() => setNewComment('')} className="text-xs md:text-sm font-medium hover:text-blue-600 transition-colors text-[var(--studio-muted)]">Отмена</button>
                <button type="submit" disabled={!newComment.trim() || submittingComment} className="bg-blue-600 text-white px-3 py-1 md:px-4 md:py-1 rounded-full text-xs md:text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
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
                          <span className="font-bold text-xs md:text-sm text-[var(--studio-text)]">@{c.authorName.replace(/\s+/g, '').toLowerCase()}</span>
                          <span className="text-[10px] md:text-xs text-[var(--studio-muted)]">
                            {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: ru }) : 'только что'}
                          </span>
                          {c.isEdited && <span className="text-[10px] md:text-xs text-[var(--studio-muted)]">(изменено)</span>}
                        </div>
                        
                        {editingCommentId === c.id ? (
                          <div className="mb-2">
                            <input
                              type="text"
                              value={editCommentText}
                              onChange={(e) => setEditCommentText(e.target.value)}
                              className="w-full bg-transparent border-b border-[var(--studio-border)] pb-1 focus:outline-none focus:border-blue-600 text-xs md:text-sm text-[var(--studio-text)]"
                            />
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => setEditingCommentId(null)} className="text-[10px] md:text-xs hover:text-blue-600 text-[var(--studio-muted)]">Отмена</button>
                              <button onClick={() => handleEditComment(c.id)} className="text-[10px] md:text-xs bg-blue-600 text-white px-2 py-1 rounded">Сохранить</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs md:text-sm mb-2 leading-relaxed text-[var(--studio-text)]/90">{c.text}</p>
                        )}

                        <div className="flex items-center gap-3 md:gap-4">
                          <button onClick={() => handleCommentAction(c.id, 'like')} className="flex items-center gap-1 text-[var(--studio-muted)] hover:text-blue-600 transition-colors">
                            <ThumbsUp className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            <span className="text-[10px] md:text-xs">{c.likes || 0}</span>
                          </button>
                          <button onClick={() => handleCommentAction(c.id, 'dislike')} className="flex items-center gap-1 text-[var(--studio-muted)] hover:text-blue-600 transition-colors">
                            <ThumbsDown className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            <span className="text-[10px] md:text-xs">{c.dislikes || 0}</span>
                          </button>
                      
                    {!isReply && (
                      <button onClick={() => { setReplyingCommentId(c.id); setReplyCommentText(''); }} className="text-[10px] md:text-xs text-[var(--studio-muted)] hover:text-blue-600 font-medium">
                        Ответить
                      </button>
                    )}

                    {user?.uid === c.authorId && (
                      <>
                        <button onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.text); }} className="text-[10px] md:text-xs text-[var(--studio-muted)] hover:text-blue-600 font-medium">
                          Изменить
                        </button>
                        <button onClick={() => handleDeleteComment(c.id)} className="text-[10px] md:text-xs text-[var(--studio-muted)] hover:text-red-600 font-medium">
                          Удалить
                        </button>
                      </>
                    )}

                    {c.authorHearted && (
                      <div className="flex items-center gap-1 text-blue-400" title="Отмечено автором">
                        <Snowflake className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        <img src={video?.authorPhotoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video?.authorId}`} className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full border border-blue-400" alt="Author" />
                      </div>
                    )}

                      {user?.uid === video?.authorId && (
                        <button 
                          onClick={() => handleCommentAction(c.id, 'heart')} 
                          className={`text-[10px] md:text-xs transition-colors flex items-center gap-1 ${c.authorHearted ? 'text-blue-400' : 'text-gray-400 hover:text-blue-400'}`}
                          title={c.authorHearted ? "Убрать снежинку" : "Поставить снежинку"}
                        >
                          <Snowflake className={`w-3.5 h-3.5 md:w-4 md:h-4 ${c.authorHearted ? 'fill-current' : ''}`} />
                          <span className="hidden sm:inline">{c.authorHearted ? 'Снежинка!' : 'Снежинка'}</span>
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
                            className="w-full bg-transparent border-b border-[var(--studio-border)] pb-1 focus:outline-none focus:border-blue-600 text-xs md:text-sm text-[var(--studio-text)]"
                          />
                          <div className="flex gap-2 mt-2 justify-end">
                            <button onClick={() => setReplyingCommentId(null)} className="text-[10px] md:text-xs hover:text-blue-600 text-[var(--studio-muted)]">Отмена</button>
                            <button onClick={() => handleReplyComment(c.id)} className="text-[10px] md:text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-bold">Ответить</button>
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

      {/* Related Content */}
      <div className="xl:w-[400px] shrink-0">
        <h3 className="text-lg font-bold mb-4 text-[var(--studio-text)]">
          {video.isShort ? 'Похожие Shorts' : video.isMusic ? 'Похожие треки' : video.isPhoto ? 'Похожие фото' : 'Похожие видео'}
        </h3>
        <div className="flex flex-col gap-4">
          {relatedVideos.map((v) => (
            <Link key={v.id} to={`/video/${v.id}`} className="flex gap-3 group">
              <div className="w-32 md:w-40 aspect-video rounded-xl overflow-hidden shrink-0 border border-[var(--studio-border)] relative">
                <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-medium text-white">
                  {v.duration}
                </div>
              </div>
              <div className="flex flex-col py-0.5 md:py-1">
                <h4 className="font-bold text-xs md:text-sm line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight mb-1 text-[var(--studio-text)]">
                  {v.title}
                </h4>
                <span className="text-[10px] md:text-xs text-[var(--studio-muted)]">{v.authorName}</span>
                <span className="text-[10px] md:text-xs text-[var(--studio-muted)]">{v.views} просмотров • {v.createdAt ? formatDistanceToNow(new Date(v.createdAt), { locale: ru }) : 'недавно'}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
