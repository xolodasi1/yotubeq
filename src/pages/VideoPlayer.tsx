import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { VideoType, Comment, SubscriptionType, VideoLikeType, Playlist } from '../types';
import { ThumbsUp, ThumbsDown, Share2, MoreHorizontal, Send, Loader2, Snowflake, Heart, Clock, ListPlus, Plus, Settings as SettingsIcon, MessageSquare, ChevronDown, ChevronUp, Play, Pause, VolumeX, Volume1, Volume2, Maximize, Minimize, Music as MusicIcon, ExternalLink, SkipBack, SkipForward, Repeat, Shuffle, Captions } from 'lucide-react';
import { MeltingAvatar } from '../components/MeltingAvatar';
import { safeFormatDistanceToNow } from '../lib/dateUtils';
import { ru } from 'date-fns/locale';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, limit, getDocs, setDoc, deleteDoc, orderBy, increment, serverTimestamp, onSnapshot, addDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { motion } from 'motion/react';

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
  const [musicVideos, setMusicVideos] = useState<VideoType[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [authorData, setAuthorData] = useState<any>(null);
  
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [replyCommentText, setReplyCommentText] = useState('');
  const [quality, setQuality] = useState('1080p');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(false);

  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [playlistVisibility, setPlaylistVisibility] = useState<'public' | 'private'>('public');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Custom Video Player State
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      setCurrentTime(current);
      setProgress((current / total) * 100);
    }
  };

  const handleProgress = () => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      const duration = videoRef.current.duration;
      if (duration > 0) {
        setBuffered((bufferedEnd / duration) * 100);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = (Number(e.target.value) / 100) * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
      setProgress(Number(e.target.value));
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
      if (newMutedState) {
        setVolume(0);
      } else {
        setVolume(1);
        videoRef.current.volume = 1;
      }
    }
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;

    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const handleMouseLeave = () => {
    if (isPlaying) {
      setShowControls(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      
      switch(e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'arrowright':
          e.preventDefault();
          if (videoRef.current) videoRef.current.currentTime += 5;
          break;
        case 'arrowleft':
          e.preventDefault();
          if (videoRef.current) videoRef.current.currentTime -= 5;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted]);

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
        const authorSnap = await getDoc(doc(db, 'channels', data.authorId));
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

        // Fetch related videos of the same type and category
        let relatedQ;
        if (data.isShort) {
          relatedQ = query(collection(db, 'videos'), where('isShort', '==', true), limit(20));
        } else if (data.isMusic) {
          relatedQ = query(collection(db, 'videos'), where('isMusic', '==', true), limit(20));
        } else if (data.isPhoto || data.type === 'photo') {
          relatedQ = query(collection(db, 'videos'), where('type', '==', 'photo'), limit(20));
        } else {
          // Try to get videos from the same category first
          relatedQ = query(
            collection(db, 'videos'), 
            where('category', '==', data.category),
            where('isShort', '==', false),
            where('isMusic', '==', false),
            where('type', '!=', 'photo'),
            limit(20)
          );
        }

        const relatedSnap = await getDocs(relatedQ);
        let relatedData = relatedSnap.docs
          .map(d => {
            const vData = d.data();
            return {
              id: d.id,
              ...(vData as any),
              createdAt: (vData as any).createdAt?.toDate?.()?.toISOString() || (vData as any).createdAt
            };
          })
          .filter((v: any) => v.id !== id) as VideoType[];
          
        // If not enough related videos from same category, fetch some general ones
        if (relatedData.length < 5 && !data.isShort && !data.isMusic && !data.isPhoto && data.type !== 'photo') {
          const generalQ = query(
            collection(db, 'videos'),
            where('isShort', '==', false),
            where('isMusic', '==', false),
            where('type', '!=', 'photo'),
            limit(20)
          );
          const generalSnap = await getDocs(generalQ);
          const generalData = generalSnap.docs
            .map(d => {
              const vData = d.data();
              return {
                id: d.id,
                ...(vData as any),
                createdAt: (vData as any).createdAt?.toDate?.()?.toISOString() || (vData as any).createdAt
              };
            })
            .filter((v: any) => v.id !== id && !relatedData.find(rv => rv.id === v.id)) as VideoType[];
          
          relatedData = [...relatedData, ...generalData].slice(0, 15);
        }

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

  useEffect(() => {
    if (!video) return;

    const fetchMusicVideos = async () => {
      try {
        let q;
        if (video.soundName) {
          q = query(
            collection(db, 'videos'),
            where('soundName', '==', video.soundName),
            limit(10)
          );
        } else if (video.musicMetadata?.author) {
          q = query(
            collection(db, 'videos'),
            where('musicMetadata.author', '==', video.musicMetadata.author),
            limit(10)
          );
        } else {
          return;
        }

        const snap = await getDocs(q);
        const data = snap.docs
          .map(d => ({ id: d.id, ...(d.data() as any) } as VideoType))
          .filter(v => v.id !== video.id);
        setMusicVideos(data);
      } catch (err) {
        console.error("Error fetching music videos:", err);
      }
    };

    fetchMusicVideos();
  }, [video?.id, video?.soundName, video?.musicMetadata?.author]);

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

    if (user.uid === video.authorId) {
      toast.error('Вы не можете ставить снежинки своим видео');
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
    const channelRef = doc(db, 'channels', video.authorId);

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
        videoAuthorId: video.authorId,
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
        videoAuthorId: video.authorId,
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

  const formattedDate = safeFormatDistanceToNow(video.createdAt);

  return (
    <div className="max-w-[1800px] mx-auto p-3 md:p-6 pb-24 md:pb-6 flex flex-col xl:flex-row gap-6">
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className={`rounded-2xl md:rounded-3xl overflow-hidden glass border border-ice-border shadow-2xl relative group ${video.isShort ? 'aspect-[9/16] max-w-[400px] mx-auto' : 'aspect-video'}`}>
          {video.isMusic ? (
            <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900/20 to-black overflow-hidden p-6 md:p-12">
              {/* Background Blur */}
              <img 
                src={video.thumbnailUrl} 
                alt={video.title} 
                className="absolute inset-0 w-full h-full object-cover opacity-20 blur-3xl scale-125 pointer-events-none"
              />
              
              {/* Main Player Card */}
              <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-8">
                {/* Album Art */}
                <motion.div 
                  animate={{ 
                    rotate: isPlaying ? 360 : 0,
                    scale: isPlaying ? 1.05 : 1
                  }}
                  transition={{ 
                    rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                    scale: { duration: 2, repeat: Infinity, repeatType: "reverse" }
                  }}
                  className="relative w-48 h-48 md:w-64 md:h-64"
                >
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-pulse" />
                  <div className="relative w-full h-full rounded-full shadow-2xl overflow-hidden border-8 border-white/10 p-1 bg-black">
                    <img 
                      src={video.thumbnailUrl} 
                      alt={video.title} 
                      className="w-full h-full object-cover rounded-full" 
                    />
                    {/* Vinyl Hole */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-black rounded-full border-4 border-white/20 shadow-inner" />
                  </div>
                </motion.div>

                {/* Track Info */}
                <div className="text-center space-y-2">
                  <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight line-clamp-1">{video.title}</h2>
                  <p className="text-blue-400 font-bold uppercase tracking-[0.2em] text-xs">{video.authorName}</p>
                </div>

                {/* Controls */}
                <div className="w-full space-y-6">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div 
                      className="relative w-full h-2 bg-white/10 rounded-full cursor-pointer group"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pos = (e.clientX - rect.left) / rect.width;
                        if (videoRef.current) videoRef.current.currentTime = pos * duration;
                      }}
                    >
                      <div 
                        className="absolute top-0 left-0 h-full bg-blue-500 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.6)]"
                        style={{ width: `${progress}%` }}
                      />
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform"
                        style={{ left: `calc(${progress}% - 8px)` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-black text-white/40 uppercase tracking-widest font-mono">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Playback Buttons */}
                  <div className="flex items-center justify-center gap-8">
                    <button className="text-white/40 hover:text-white transition-colors">
                      <Shuffle className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => { if(videoRef.current) videoRef.current.currentTime = 0; }}
                      className="text-white hover:text-blue-400 transition-colors"
                    >
                      <SkipBack className="w-8 h-8 fill-current" />
                    </button>
                    <button 
                      onClick={handlePlayPause}
                      className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:scale-110 transition-transform"
                    >
                      {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                    </button>
                    <button 
                      onClick={() => {
                        if (musicVideos.length > 0) {
                          window.location.href = `/video/${musicVideos[0].id}`;
                        } else {
                          toast.info('Следующих треков пока нет');
                        }
                      }}
                      className="text-white hover:text-blue-400 transition-colors"
                    >
                      <SkipForward className="w-8 h-8 fill-current" />
                    </button>
                    <button className="text-white/40 hover:text-white transition-colors">
                      <Repeat className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Hidden Video Element */}
              <video
                ref={videoRef}
                src={video.videoUrl}
                autoPlay
                onTimeUpdate={handleTimeUpdate}
                onProgress={handleProgress}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
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
            <div 
              ref={playerContainerRef}
              className="relative w-full h-full bg-black flex items-center justify-center group/player"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <video
                ref={videoRef}
                src={video.videoUrl}
                autoPlay
                onClick={handlePlayPause}
                onDoubleClick={(e) => {
                  if (!videoRef.current) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  if (x > rect.width / 2) {
                    videoRef.current.currentTime += 10;
                  } else {
                    videoRef.current.currentTime -= 10;
                  }
                }}
                onTimeUpdate={handleTimeUpdate}
                onProgress={handleProgress}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="w-full h-full object-contain cursor-pointer"
              />

              {/* Subtitles Overlay */}
              {showSubtitles && isPlaying && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-white text-sm font-medium text-center max-w-[80%] pointer-events-none animate-fade-in">
                  [Автоматические субтитры: {video.title}]
                </div>
              )}
              
              {/* Big Play Button Overlay */}
              {!isPlaying && (
                <div 
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <div className="w-20 h-20 bg-blue-600/80 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(37,99,235,0.5)] transform transition-transform hover:scale-110">
                    <Play className="w-10 h-10 fill-current ml-2" />
                  </div>
                </div>
              )}

              {/* Custom Controls Overlay */}
              <div 
                className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-4 pt-12 pb-4 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
              >
                {/* Progress Bar */}
                <div className="relative w-full h-1.5 bg-white/20 rounded-full mb-4 cursor-pointer group/progress" onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = (e.clientX - rect.left) / rect.width;
                  if (videoRef.current) {
                    videoRef.current.currentTime = pos * duration;
                  }
                }}>
                  {/* Buffered Bar */}
                  <div 
                    className="absolute top-0 left-0 h-full bg-white/40 rounded-full transition-all duration-300"
                    style={{ width: `${buffered}%` }}
                  />
                  {/* Progress Bar */}
                  <div 
                    className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover/progress:opacity-100 transition-opacity"
                    style={{ left: `calc(${progress}% - 6px)` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Play/Pause */}
                    <button onClick={handlePlayPause} className="text-white hover:text-blue-400 transition-colors">
                      {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                    </button>

                    {/* Volume */}
                    <div className="flex items-center gap-2 group/volume">
                      <button onClick={toggleMute} className="text-white hover:text-blue-400 transition-colors">
                        {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : volume < 0.5 ? <Volume1 className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05" 
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-0 group-hover/volume:w-20 opacity-0 group-hover/volume:opacity-100 transition-all duration-300 accent-blue-500 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Time */}
                    <div className="text-white text-xs font-medium font-mono">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Settings/Quality */}
                    <div className="relative">
                      <button 
                        onClick={() => setShowQualityMenu(!showQualityMenu)}
                        className="text-white hover:text-blue-400 transition-colors"
                      >
                        <SettingsIcon className="w-5 h-5" />
                      </button>
                      
                      {showQualityMenu && (
                        <div className="absolute bottom-full right-0 mb-2 bg-black/90 border border-white/10 rounded-lg overflow-hidden shadow-xl min-w-[100px]">
                          {['2160p (4K)', '1440p', '1080p', '720p', '480p', '360p'].map((q) => (
                            <button
                              key={q}
                              onClick={() => { setQuality(q.split(' ')[0]); setShowQualityMenu(false); }}
                              className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-white/10 transition-colors ${quality === q.split(' ')[0] ? 'text-blue-400' : 'text-white'}`}
                            >
                              {q}
                            </button>
                          ))}
                          <div className="border-t border-white/10 mt-1 pt-1">
                            <button
                              onClick={() => { setShowSubtitles(!showSubtitles); setShowQualityMenu(false); }}
                              className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-white/10 transition-colors flex items-center justify-between ${showSubtitles ? 'text-blue-400' : 'text-white'}`}
                            >
                              <div className="flex items-center gap-2">
                                <Captions className="w-3 h-3" />
                                <span>Субтитры</span>
                              </div>
                              <span className="text-[10px] opacity-60">{showSubtitles ? 'ВКЛ' : 'ВЫКЛ'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Fullscreen */}
                    <button onClick={toggleFullscreen} className="text-white hover:text-blue-400 transition-colors">
                      {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <h1 className="text-xl md:text-3xl font-bold mt-4 md:mt-6 mb-3 md:mb-4 text-[var(--studio-text)] leading-tight">{video.title}</h1>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 md:gap-4">
            <Link to={`/channel/${video.authorId}`} className="flex items-center gap-2 md:gap-3 group">
              <MeltingAvatar 
                photoURL={video.authorPhotoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.authorId}`}
                lastPostAt={authorData?.lastPostAt}
                size="lg"
                className="border-2 border-blue-100 shadow-[0_0_10px_rgba(37,99,235,0.2)] group-hover:scale-105 transition-transform shrink-0"
              />
              <div>
                <h3 className="font-bold text-base md:text-lg group-hover:text-blue-600 transition-colors line-clamp-1 text-[var(--studio-text)]">{video.authorName}</h3>
                <p className="text-xs text-[var(--studio-muted)]">{authorData?.subscribers || 0} подписчиков</p>
              </div>
            </Link>
            {user?.uid !== video.authorId && (
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
            )}
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
              <span className="inline">Избранное</span>
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

        <div className="mt-4 p-3 md:p-4 bg-[var(--studio-hover)] rounded-xl border border-[var(--studio-border)] group/desc cursor-pointer" onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}>
          <div className="flex items-center gap-3 text-xs md:text-sm font-bold mb-2 text-[var(--studio-text)]">
            <span>{(video.views || 0).toLocaleString()} просмотров</span>
            <span>{formattedDate}</span>
            <span className="text-blue-600">#{video.category?.replace(/\s+/g, '') || 'БезКатегории'}</span>
          </div>
          <div className={`relative overflow-hidden transition-all duration-300 ${isDescriptionExpanded ? 'max-h-[2000px]' : 'max-h-12 md:max-h-16'}`}>
            <p className="text-xs md:text-sm whitespace-pre-wrap text-[var(--studio-text)]/90">{video.description}</p>
            {!isDescriptionExpanded && (
              <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[var(--studio-hover)] to-transparent" />
            )}
          </div>
          
          <button 
            className="mt-2 text-[10px] md:text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:underline"
          >
            {isDescriptionExpanded ? (
              <>Свернуть <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>Развернуть <ChevronDown className="w-3 h-3" /></>
            )}
          </button>

          {musicVideos.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--studio-border)]">
              <div className="flex items-center gap-2 mb-3">
                <MusicIcon className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-black uppercase tracking-widest text-blue-600">Музыка из этого видео</h4>
              </div>
              <div className="flex flex-col gap-3">
                {musicVideos.map((mv) => (
                  <Link 
                    key={mv.id} 
                    to={`/video/${mv.id}`}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all group"
                  >
                    <img 
                      src={mv.thumbnailUrl} 
                      alt={mv.title} 
                      className="w-16 h-10 object-cover rounded-lg shadow-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[var(--studio-text)] truncate group-hover:text-blue-600 transition-colors">{mv.title}</p>
                      <p className="text-[10px] text-[var(--studio-muted)] truncate">{mv.authorName}</p>
                    </div>
                    <ExternalLink className="w-3 h-3 text-[var(--studio-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>
          )}
          
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
                            {safeFormatDistanceToNow(c.createdAt)}
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-[var(--studio-text)] uppercase tracking-tight">
            {video.isShort ? 'Похожие Shorts' : video.isMusic ? 'Похожие треки' : video.isPhoto ? 'Похожие фото' : 'Рекомендации'}
          </h3>
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Следующее</span>
        </div>
        <div className="flex flex-col gap-4">
          {relatedVideos.map((v) => (
            <Link key={v.id} to={`/video/${v.id}`} className="flex gap-4 group p-2 hover:bg-[var(--studio-hover)] rounded-2xl transition-all border border-transparent hover:border-[var(--studio-border)]">
              <div className={`shrink-0 rounded-xl overflow-hidden border border-[var(--studio-border)] relative shadow-sm group-hover:scale-105 transition-transform ${v.isShort ? 'w-20 aspect-[9/16]' : 'w-36 aspect-video'}`}>
                <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute bottom-1.5 right-1.5 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-white">
                  {v.duration}
                </div>
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="w-6 h-6 text-white fill-current" />
                </div>
              </div>
              <div className="flex flex-col py-1 min-w-0">
                <h4 className="font-black text-xs md:text-sm line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight mb-2 text-[var(--studio-text)] uppercase tracking-tight">
                  {v.title}
                </h4>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[var(--studio-muted)] uppercase tracking-widest block truncate">{v.authorName}</span>
                  <div className="flex items-center gap-2 text-[9px] font-black text-[var(--studio-muted)] uppercase tracking-widest">
                    <span>{(v.views || 0).toLocaleString()} просмотров</span>
                    <span className="w-1 h-1 bg-[var(--studio-muted)] rounded-full opacity-30" />
                    <span>{safeFormatDistanceToNow(v.createdAt, { locale: ru })}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {relatedVideos.length === 0 && (
            <div className="py-20 text-center space-y-3 opacity-20">
              <Play className="w-12 h-12 mx-auto" />
              <p className="text-[10px] font-black uppercase tracking-widest">Нет рекомендаций</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
