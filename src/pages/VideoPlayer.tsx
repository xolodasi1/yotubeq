import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { VideoType, Comment, SubscriptionType, VideoLikeType, Playlist } from '../types';
import { ThumbsUp, ThumbsDown, Share2, MoreHorizontal, Send, Loader2, Snowflake, Heart, Clock, ListPlus, Plus, Settings as SettingsIcon, MessageSquare, ChevronDown, ChevronUp, Play, Pause, VolumeX, Volume1, Volume2, Maximize, Minimize, Music as MusicIcon, ExternalLink, SkipBack, SkipForward, Repeat, Shuffle, Captions } from 'lucide-react';
import { MeltingAvatar } from '../components/MeltingAvatar';
import { safeFormatDistanceToNow } from '../lib/dateUtils';
import { ru } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { databaseService } from '../lib/databaseService';
import { toast } from 'sonner';
import { motion } from 'motion/react';

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
    
    const fetchVideoData = async () => {
      try {
        setLoading(true);
        
        // Fetch Video from Supabase
        const { data: vData, error: vError } = await supabase
          .from('videos')
          .select('*')
          .eq('id', id)
          .single();
        
        if (vError || !vData) {
          throw new Error('Video not found');
        }
        
        const data = databaseService.mapVideo(vData);
        setVideo(data as any);

        // Fetch author data
        const { data: authorDataRaw } = await supabase
          .from('channels')
          .select('*')
          .eq('id', data.authorId)
          .single();
        
        if (authorDataRaw) {
          setAuthorData(databaseService.mapChannel(authorDataRaw));
        }

        // Increment views in Supabase
        try {
          await supabase.from('videos').update({ views: (Number(vData.views) || 0) + 1 }).eq('id', id);
        } catch (err) {
          console.error("Failed to increment views:", err);
        }

        // Fetch related videos
        let relatedQuery = supabase.from('videos').select('*');
        if (data.isShort) {
          relatedQuery = relatedQuery.eq('is_short', true);
        } else if (data.isMusic) {
          relatedQuery = relatedQuery.eq('is_music', true);
        } else if (data.isPhoto || data.type === 'photo') {
          relatedQuery = relatedQuery.eq('is_photo', true);
        } else {
          relatedQuery = relatedQuery
            .eq('category', data.category)
            .eq('is_short', false)
            .eq('is_music', false);
        }
        
        const { data: relatedDataRaw } = await relatedQuery.limit(20);
        let relatedData = (relatedDataRaw || [])
          .map(d => databaseService.mapVideo(d))
          .filter(v => v.id !== id);
          
        if (relatedData.length < 5 && !data.isShort && !data.isMusic && !data.isPhoto && data.type !== 'photo') {
          const { data: generalDataRaw } = await supabase
            .from('videos')
            .select('*')
            .eq('is_short', false)
            .eq('is_music', false)
            .limit(20);
            
          const generalData = (generalDataRaw || [])
            .map(d => databaseService.mapVideo(d))
            .filter(v => v.id !== id && !relatedData.find(rv => rv.id === v.id));
          
          relatedData = [...relatedData, ...generalData].slice(0, 15);
        }

        setRelatedVideos(relatedData as any);

        // Fetch comments
        const { data: commentsDataRaw } = await supabase
          .from('comments')
          .select('*')
          .eq('video_id', id)
          .order('created_at', { ascending: false });
          
        setComments((commentsDataRaw || []).map(c => ({
          ...c,
          videoId: c.video_id,
          authorId: c.author_id,
          authorName: c.author_name,
          authorPhotoUrl: c.author_photo_url,
          createdAt: c.created_at
        })) as any);

      } catch (error) {
        console.error("Error fetching video:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideoData();
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
        // Add to History - Upsert in Supabase
        const historyId = `${activeChannel?.id || user.uid}_${id}`;
        await supabase.from('history').upsert({
          id: historyId,
          user_id: activeChannel?.id || user.uid,
          video_id: id,
          watched_at: new Date().toISOString()
        });

        // Check like/dislike
        const { data: likeData } = await supabase
          .from('video_likes')
          .select('type')
          .eq('user_id', user.uid)
          .eq('video_id', id)
          .maybeSingle();
          
        if (likeData) {
          setIsLiked(likeData.type === 'like');
          setIsDisliked(likeData.type === 'dislike');
        } else {
          setIsLiked(false);
          setIsDisliked(false);
        }

        // Check ice
        const { data: iceData } = await supabase
          .from('video_ices')
          .select('*')
          .eq('user_id', user.uid)
          .eq('video_id', id)
          .maybeSingle();
        setIsIced(!!iceData);

        // Check favorite
        const { data: favData } = await supabase
          .from('favorites')
          .select('*')
          .eq('user_id', user.uid)
          .eq('video_id', id)
          .maybeSingle();
        setIsFavorited(!!favData);

        // Check watch later
        const { data: wlData } = await supabase
          .from('watch_later')
          .select('*')
          .eq('user_id', user.uid)
          .eq('video_id', id)
          .maybeSingle();
        setIsWatchLater(!!wlData);

        // Check subscription
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.uid)
          .eq('channel_id', video.authorId)
          .maybeSingle();
        setIsSubscribed(!!subData);
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
        let mq = supabase.from('videos').select('*').limit(10);
        
        if (video.soundName) {
          mq = mq.eq('sound_name', video.soundName);
        } else if (video.musicMetadata?.author) {
          mq = mq.eq('music_metadata->author', video.musicMetadata.author);
        } else {
          return;
        }

        const { data, error } = await mq;
        if (error) throw error;
        
        const musicData = (data || [])
          .map(d => databaseService.mapVideo(d))
          .filter(v => v.id !== video.id);
        setMusicVideos(musicData as any);
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

    if (!activeChannel?.isPrimary) {
      toast.error('Взаимодействовать с контентом можно только с основного канала');
      return;
    }
    
    try {
      const currentType = isLiked ? 'like' : isDisliked ? 'dislike' : null;

      if (currentType === type) {
        // Remove interaction
        await supabase
          .from('video_likes')
          .delete()
          .eq('user_id', user.uid)
          .eq('video_id', video.id);
          
        const updateObj = { [type === 'like' ? 'likes' : 'dislikes']: Math.max(0, (video[type === 'like' ? 'likes' : 'dislikes'] || 0) - 1) };
        await supabase.from('videos').update(updateObj).eq('id', video.id);
        
        setVideo({ ...video, ...updateObj });
        if (type === 'like') setIsLiked(false);
        else setIsDisliked(false);
      } else if (currentType) {
        // Switch interaction
        await supabase
          .from('video_likes')
          .update({ type })
          .eq('user_id', user.uid)
          .eq('video_id', video.id);
          
        const updateObj = { 
          [type === 'like' ? 'likes' : 'dislikes']: (video[type === 'like' ? 'likes' : 'dislikes'] || 0) + 1,
          [currentType === 'like' ? 'likes' : 'dislikes']: Math.max(0, (video[currentType === 'like' ? 'likes' : 'dislikes'] || 0) - 1)
        };
        await supabase.from('videos').update(updateObj).eq('id', video.id);
        
        setVideo({ ...video, ...updateObj });
        setIsLiked(type === 'like');
        setIsDisliked(type === 'dislike');
      } else {
        // New interaction
        await supabase
          .from('video_likes')
          .insert({ user_id: user.uid, video_id: video.id, type });
          
        const updateObj = { [type === 'like' ? 'likes' : 'dislikes']: (video[type === 'like' ? 'likes' : 'dislikes'] || 0) + 1 };
        await supabase.from('videos').update(updateObj).eq('id', video.id);
        
        if (type === 'like' && video.authorId !== user.uid) {
          await supabase.from('notifications').insert({
            user_id: video.authorId,
            type: 'like',
            video_id: video.id,
            video_title: video.title,
            from_user_id: user.uid,
            from_user_name: user.displayName,
            from_user_avatar: user.photoURL,
            read: false
          });
        }

        setVideo({ ...video, ...updateObj });
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

    try {
      if (isIced) {
        await supabase.from('video_ices').delete().eq('user_id', user.uid).eq('video_id', video.id);
        const newIces = Math.max(0, (video.ices || 0) - 1);
        await supabase.from('videos').update({ ices: newIces }).eq('id', video.id);
        
        setVideo({ ...video, ices: newIces });
        setIsIced(false);
      } else {
        await supabase.from('video_ices').insert({ user_id: user.uid, video_id: video.id });
        const newIces = (video.ices || 0) + 1;
        await supabase.from('videos').update({ ices: newIces }).eq('id', video.id);
        
        setVideo({ ...video, ices: newIces });
        setIsIced(true);
      }
    } catch (error) {
      console.error("Error toggling ice:", error);
      toast.error('Не удалось обновить снежинку');
    }
  };

  const toggleFavorite = async () => {
    if (!user || !id) return toast.error('Войдите, чтобы добавить в избранное');
    try {
      if (isFavorited) {
        await supabase.from('favorites').delete().eq('user_id', user.uid).eq('video_id', id);
        setIsFavorited(false);
        toast.success('Удалено из избранного');
      } else {
        await supabase.from('favorites').insert({ user_id: user.uid, video_id: id });
        setIsFavorited(true);
        toast.success('Добавлено в избранное');
      }
    } catch (error) { toast.error('Ошибка'); }
  };

  const toggleWatchLater = async () => {
    if (!user || !id) return toast.error('Войдите, чтобы посмотреть позже');
    try {
      if (isWatchLater) {
        await supabase.from('watch_later').delete().eq('user_id', user.uid).eq('video_id', id);
        setIsWatchLater(false);
        toast.success('Удалено из "Смотреть позже"');
      } else {
        await supabase.from('watch_later').insert({ user_id: user.uid, video_id: id });
        setIsWatchLater(true);
        toast.success('Добавлено в "Смотреть позже"');
      }
    } catch (error) { toast.error('Ошибка'); }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('video_ids')
        .eq('id', playlistId)
        .single();
      
      if (error) throw error;
      
      const videoIds = data.video_ids || [];
      if (videoIds.includes(id)) {
        toast.info('Уже в плейлисте');
        return;
      }
      
      await supabase.from('playlists').update({ video_ids: [...videoIds, id] }).eq('id', playlistId);
      toast.success('Добавлено в плейлист');
      setShowPlaylistModal(false);
    } catch (error) { toast.error('Ошибка'); }
  };

  const createPlaylist = async () => {
    if (!user || !activeChannel || !newPlaylistTitle.trim() || !id || !video) return;
    try {
      await supabase.from('playlists').insert({
        title: newPlaylistTitle,
        author_id: activeChannel.id,
        video_ids: [id],
        visibility: playlistVisibility,
        type: video.type || 'video'
      });
      toast.success('Плейлист создан');
      setNewPlaylistTitle('');
      setShowPlaylistModal(false);
    } catch (error) { toast.error('Ошибка'); }
  };

  const fetchUserPlaylists = async () => {
    if (!user || !activeChannel) return;
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('author_id', activeChannel.id);
    
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

  const handleSubscribe = async () => {
    if (!user || !video || !authorData) {
      toast.error('Пожалуйста, войдите, чтобы подписаться');
      return;
    }

    if (!activeChannel?.isPrimary) {
      toast.error('Подписываться можно только с основного канала');
      return;
    }

    if (user.uid === authorData.ownerId || user.uid === video.authorId) {
      toast.error("Вы не можете подписаться на свои каналы");
      return;
    }

    try {
      if (isSubscribed) {
        const { error: delError } = await supabase.from('subscriptions').delete().eq('user_id', user.uid).eq('channel_id', video.authorId);
        if (delError) throw delError;

        const newSubscribersCount = Math.max(0, (authorData.subscribers || 0) - 1);
        await supabase.from('channels').update({ subscribers: newSubscribersCount }).eq('id', video.authorId);
        
        setAuthorData({ ...authorData, subscribers: newSubscribersCount });
        setIsSubscribed(false);
        toast.success('Вы отписались');
      } else {
        const { error: insError } = await supabase.from('subscriptions').insert({ user_id: user.uid, channel_id: video.authorId });
        if (insError) throw insError;

        const newSubscribersCount = (authorData.subscribers || 0) + 1;
        await supabase.from('channels').update({ subscribers: newSubscribersCount }).eq('id', video.authorId);
        
        try {
          await supabase.from('notifications').insert({
            user_id: video.authorId,
            type: 'subscribe',
            from_user_id: user.uid,
            from_user_name: user.displayName,
            from_user_avatar: user.photoURL,
            read: false
          });
        } catch (e) { console.error(e); }

        setAuthorData({ ...authorData, subscribers: newSubscribersCount });
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
        const { data: userData } = await supabase.from('users').select('display_name, photo_url').eq('id', user.uid).single();
        authorName = userData?.display_name || user.displayName || 'User';
        authorPhotoUrl = userData?.photo_url || user.photoURL || '';
        authorId = user.uid;
      }

      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .insert({
          video_id: video.id,
          video_author_id: video.authorId,
          author_id: authorId,
          author_name: authorName,
          author_photo_url: authorPhotoUrl,
          text: newComment.trim(),
          likes: 0,
          dislikes: 0
        })
        .select()
        .single();
      
      if (commentError) throw commentError;
      
      if (user && video.authorId !== user.uid) {
        await supabase.from('notifications').insert({
          user_id: video.authorId,
          type: 'comment',
          video_id: video.id,
          video_title: video.title,
          from_user_id: user.uid,
          from_user_name: authorName,
          from_user_avatar: authorPhotoUrl,
          comment_text: newComment.trim(),
          read: false
        });
      }

      const mappedComment = {
        ...commentData,
        videoId: commentData.video_id,
        authorId: commentData.author_id,
        authorName: commentData.author_name,
        authorPhotoUrl: commentData.author_photo_url,
        createdAt: commentData.created_at
      } as Comment;
      
      setComments([mappedComment, ...comments]);
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
      const { error } = await supabase
        .from('comments')
        .update({
          text: editCommentText.trim(),
          is_edited: true
        })
        .eq('id', commentId);
      
      if (error) throw error;
      
      setComments(comments.map(c => c.id === commentId ? { ...c, text: editCommentText.trim(), isEdited: true } : c));
      setEditingCommentId(null);
      setEditCommentText('');
      toast.success('Комментарий обновлен');
    } catch (error) {
      console.error("Error editing comment:", error);
      toast.error('Не удалось обновить комментарий');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот комментарий?')) return;
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
      
      if (error) throw error;
      
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
        const { data: userData } = await supabase.from('users').select('display_name, photo_url').eq('id', user.uid).single();
        authorName = userData?.display_name || user.displayName || 'User';
        authorPhotoUrl = userData?.photo_url || user.photoURL || '';
        authorId = user.uid;
      }

      const { data: commentData, error: commentError } = await supabase
        .from('comments')
        .insert({
          video_id: video.id,
          video_author_id: video.authorId,
          author_id: authorId,
          author_name: authorName,
          author_photo_url: authorPhotoUrl,
          text: replyCommentText.trim(),
          parent_id: parentId,
          likes: 0,
          dislikes: 0
        })
        .select()
        .single();
      
      if (commentError) throw commentError;

      const mappedComment = {
        ...commentData,
        videoId: commentData.video_id,
        authorId: commentData.author_id,
        authorName: commentData.author_name,
        authorPhotoUrl: commentData.author_photo_url,
        createdAt: commentData.created_at,
        parentId: commentData.parent_id
      } as Comment;
      
      setComments([mappedComment, ...comments]);
      setReplyingCommentId(null);
      setReplyCommentText('');
      toast.success('Ответ опубликован');
    } catch (error) {
      console.error("Error replying to comment:", error);
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
      if (action === 'heart') {
        if (user?.uid !== video?.authorId) return;
        const newHearted = !comment.authorHearted;
        
        const { error } = await supabase
          .from('comments')
          .update({ author_hearted: newHearted })
          .eq('id', commentId);
          
        if (error) throw error;
        
        setComments(comments.map(c => c.id === commentId ? { ...c, authorHearted: newHearted } : c));
        return;
      }

      // Handle Like/Dislike with persistence
      const { data: actionData } = await supabase
        .from('comment_actions')
        .select('type')
        .eq('user_id', user.uid)
        .eq('comment_id', commentId)
        .maybeSingle();
        
      const currentAction = actionData?.type;

      if (currentAction === action) {
        // Remove action
        await supabase
          .from('comment_actions')
          .delete()
          .eq('user_id', user.uid)
          .eq('comment_id', commentId);
          
        const updateObj = { [action === 'like' ? 'likes' : 'dislikes']: Math.max(0, (comment[action === 'like' ? 'likes' : 'dislikes'] || 0) - 1) };
        await supabase.from('comments').update(updateObj).eq('id', commentId);
        
        setComments(comments.map(c => c.id === commentId ? { ...c, ...updateObj } : c));
      } else if (currentAction) {
        // Switch action
        await supabase
          .from('comment_actions')
          .update({ type: action })
          .eq('user_id', user.uid)
          .eq('comment_id', commentId);
          
        const updateObj = {
          [action === 'like' ? 'likes' : 'dislikes']: (comment[action === 'like' ? 'likes' : 'dislikes'] || 0) + 1,
          [action === 'like' ? 'dislikes' : 'likes']: Math.max(0, (comment[action === 'like' ? 'dislikes' : 'likes'] || 0) - 1)
        };
        await supabase.from('comments').update(updateObj).eq('id', commentId);
        
        setComments(comments.map(c => c.id === commentId ? { ...c, ...updateObj } : c));
      } else {
        // New action
        await supabase
          .from('comment_actions')
          .insert({
            user_id: user.uid,
            comment_id: commentId,
            type: action
          });
          
        const updateObj = { [action === 'like' ? 'likes' : 'dislikes']: (comment[action === 'like' ? 'likes' : 'dislikes'] || 0) + 1 };
        await supabase.from('comments').update(updateObj).eq('id', commentId);
        
        setComments(comments.map(c => c.id === commentId ? { ...c, ...updateObj } : c));
      }
    } catch (error) {
      console.error("Error toggling comment action:", error);
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
                
                {/* Volume Slider for Music */}
                <div className="w-full max-w-md flex items-center gap-3 bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                  <button onClick={toggleMute} className="text-white hover:text-blue-400 transition-colors">
                    {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="flex-1 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                  />
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

          {video.musicMetadata && (
            <div className="mt-4 pt-4 border-t border-[var(--studio-border)]">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#1db954] mb-3 flex items-center gap-2">
                <MusicIcon className="w-4 h-4" /> Метаданные трека
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                {video.musicMetadata.author && (
                   <div className="space-y-1">
                     <p className="font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Автор</p>
                     <p className="text-[var(--text-primary)] font-medium">{video.musicMetadata.author}</p>
                   </div>
                )}
                {video.musicMetadata.composer && (
                   <div className="space-y-1">
                     <p className="font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Композитор</p>
                     <p className="text-[var(--text-primary)] font-medium">{video.musicMetadata.composer}</p>
                   </div>
                )}
                {video.musicMetadata.performer && (
                   <div className="space-y-1">
                     <p className="font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Исполнитель</p>
                     <p className="text-[var(--text-primary)] font-medium">{video.musicMetadata.performer}</p>
                   </div>
                )}
                {video.musicMetadata.album && (
                   <div className="space-y-1">
                     <p className="font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Альбом</p>
                     <p className="text-[var(--text-primary)] font-medium">{video.musicMetadata.album}</p>
                   </div>
                )}
                {video.musicMetadata.releaseYear && (
                   <div className="space-y-1">
                     <p className="font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Год выпуска</p>
                     <p className="text-[var(--text-primary)] font-medium">{video.musicMetadata.releaseYear}</p>
                   </div>
                )}
                {video.musicMetadata.otherParticipants && (
                   <div className="col-span-full space-y-1">
                     <p className="font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Другие участники</p>
                     <p className="text-[var(--text-primary)] font-medium">{video.musicMetadata.otherParticipants}</p>
                   </div>
                )}
              </div>
            </div>
          )}

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
