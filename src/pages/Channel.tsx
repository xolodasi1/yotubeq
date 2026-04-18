import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../App';
import VideoCard from '../components/VideoCard';
import ShortCard from '../components/ShortCard';
import { MeltingAvatar } from '../components/MeltingAvatar';
import { VideoType, CommunityPost, Playlist } from '../types';
import { Loader2, Snowflake, Smartphone, MessageSquare, ThumbsUp, Plus, BarChart2, PlaySquare, Info, Calendar, Mail, Globe, Instagram, Youtube, Bell, BellOff, Camera, Music as MusicIcon, Trophy, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { databaseService } from '../lib/databaseService';
// Supabase migration in progress
import { toast } from 'sonner';
import { safeFormatDistanceToNow } from '../lib/dateUtils';

type TabType = 'home' | 'videos' | 'shorts' | 'music' | 'photos' | 'playlists' | 'community' | 'about';

export default function Channel() {
  const { id } = useParams<{ id: string }>();
  const { user, activeChannel } = useAuth();
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorInfo, setAuthorInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [subCount, setSubCount] = useState(0);

  // Community State
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [postType, setPostType] = useState<'text' | 'poll'>('text');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [isPosting, setIsPosting] = useState(false);

  // Playlists State
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    if (!id) return;
    
    // Initial fetch for channel info
    const fetchChannelInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('channels')
          .select('*')
          .eq('id', id)
          .single();
        
        if (data) {
          setAuthorInfo({
            id: data.id,
            ownerId: data.owner_id,
            name: data.display_name,
            pseudonym: data.pseudonym || '',
            photoUrl: data.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
            bannerUrl: data.banner_url || null,
            bio: data.bio || '',
            ices: data.ices || 0,
            socialLinks: data.social_links || {},
            homeLayout: data.home_layout || ['videos', 'shorts', 'music', 'photos'],
            subscribers: data.subscribers || 0,
            joinedAt: new Date(data.created_at),
            lastPostAt: data.last_post_at,
            pinnedAchievements: data.pinned_achievements || [],
            isVerified: data.is_verified || false
          });
          setSubCount(data.subscribers || 0);
        }
      } catch (err) {
        console.error("Error fetching channel info:", err);
      }
    };

    fetchChannelInfo();

    // Subscribe to channel changes
    const channelSubscription = supabase
      .channel(`channel_${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'channels', filter: `id=eq.${id}` }, payload => {
        const data = payload.new as any;
        setAuthorInfo((prev: any) => ({
          ...prev,
          name: data.display_name,
          pseudonym: data.pseudonym,
          photoUrl: data.photo_url,
          bannerUrl: data.banner_url,
          bio: data.bio,
          ices: data.ices,
          socialLinks: data.social_links,
          homeLayout: data.home_layout,
          subscribers: data.subscribers,
          lastPostAt: data.last_post_at,
          pinnedAchievements: data.pinned_achievements,
          isVerified: data.is_verified
        }));
        setSubCount(data.subscribers);
      })
      .subscribe((status) => {
        console.log(`Channel ${id} subscription status:`, status);
        if (status === "CHANNEL_ERROR") {
          console.warn(`Channel ${id} subscription error. Reconnecting...`);
          setTimeout(() => channelSubscription.subscribe(), 2000);
        }
      });

    const fetchChannelVideos = async () => {
      try {
        setLoading(true);
        const { data: videosDataRaw, error: videosError } = await supabase
          .from('videos')
          .select('*')
          .eq('author_id', id)
          .order('created_at', { ascending: false });

        if (videosError) throw videosError;

        const mappedVideos = (videosDataRaw || []).map(v => databaseService.mapVideo(v));
        setVideos(mappedVideos as any);

        if (user) {
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.uid)
            .eq('channel_id', id)
            .maybeSingle();

          if (subData) {
            setIsSubscribed(true);
            setNotificationsEnabled(subData.notifications_enabled || false);
          } else {
            setIsSubscribed(false);
            setNotificationsEnabled(false);
          }
        } else {
          setIsSubscribed(false);
          setNotificationsEnabled(false);
        }
      } catch (error) {
        console.error("Error fetching channel videos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChannelVideos();
    return () => {
      supabase.removeChannel(channelSubscription);
    };
  }, [id, user]);

  // Real-time Community Posts
  useEffect(() => {
    if (!id || activeTab !== 'community') return;

    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .eq('author_id', id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching posts:", error);
        return;
      }

      setCommunityPosts((data || []).map(p => ({
        ...p,
        authorId: p.author_id,
        authorName: p.author_name,
        authorPhotoUrl: p.author_photo_url,
        createdAt: p.created_at,
        pollOptions: p.poll_options
      })) as any);
    };

    fetchPosts();

    const postsSubscription = supabase
      .channel(`community_posts_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts', filter: `author_id=eq.${id}` }, () => {
        fetchPosts();
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setTimeout(() => postsSubscription.subscribe(), 3000);
        }
      });

    return () => {
      supabase.removeChannel(postsSubscription);
    };
  }, [id, activeTab]);

  // Fetch Playlists
  useEffect(() => {
    if (!id || activeTab !== 'playlists') return;

    const fetchPlaylists = async () => {
      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('author_id', id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching playlists:", error);
        return;
      }

      setPlaylists((data || []).map(pl => ({
        ...pl,
        authorId: pl.author_id,
        createdAt: pl.created_at,
        videoIds: pl.video_ids
      })) as any);
    };

    fetchPlaylists();
  }, [id, activeTab]);

  const handleToggleNotifications = async () => {
    if (!user || !id || !isSubscribed) return;
    try {
      const newState = !notificationsEnabled;
      await supabase
        .from('subscriptions')
        .update({ notifications_enabled: newState })
        .eq('user_id', user.uid)
        .eq('channel_id', id);
        
      setNotificationsEnabled(newState);
      toast.success(newState ? 'Уведомления включены' : 'Уведомления выключены');
    } catch (error) {
      toast.error('Ошибка при изменении настроек уведомлений');
    }
  };

  const handleSubscribe = async () => {
    if (!user || !id || !authorInfo) {
      toast.error('Пожалуйста, войдите, чтобы подписаться');
      return;
    }

    if (!activeChannel?.isPrimary) {
      toast.error('Подписываться можно только с основного канала');
      return;
    }

    if (user.uid === authorInfo.ownerId || user.uid === id) {
      toast.error("Вы не можете подписаться на свои каналы");
      return;
    }

    try {
      if (isSubscribed) {
        const { error: deleteError } = await supabase
          .from('subscriptions')
          .delete()
          .eq('user_id', user.uid)
          .eq('channel_id', id);
          
        if (deleteError) throw deleteError;
          
        const { data: channelData } = await supabase.from('channels').select('subscribers').eq('id', id).single();
        if (channelData) {
           const newCount = Math.max(0, channelData.subscribers - 1);
           await supabase.from('channels').update({ subscribers: newCount }).eq('id', id);
           setSubCount(newCount);
        }

        setIsSubscribed(false);
        setNotificationsEnabled(false);
        toast.success('Вы отписались');
      } else {
        const { error: insertError } = await supabase.from('subscriptions').insert({
          user_id: user.uid,
          channel_id: id,
          created_at: new Date().toISOString(),
          notifications_enabled: false
        });
        
        if (insertError) throw insertError;
        
        const { data: channelData } = await supabase.from('channels').select('subscribers').eq('id', id).single();
        if (channelData) {
           const newCount = (channelData.subscribers || 0) + 1;
           await supabase.from('channels').update({ subscribers: newCount }).eq('id', id);
           setSubCount(newCount);
        }
        
        // Add notification
        try {
          await supabase.from('notifications').insert({
            user_id: id,
            type: 'subscribe',
            from_user_id: user.uid,
            from_user_name: user.displayName,
            from_user_avatar: user.photoURL,
            created_at: new Date().toISOString(),
            read: false
          });
        } catch (err) {
          console.error("Error adding notification:", err);
        }

        setIsSubscribed(true);
        setNotificationsEnabled(false);
        toast.success('Вы подписались!');
      }
    } catch (error) {
      console.error("Subscribe transaction error:", error);
      toast.error("Не удалось изменить подписку");
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeChannel || !newPostText.trim() || isPosting) return;

    if (activeChannel.id !== id) {
      toast.error('Вы можете публиковать посты только от имени этого канала');
      return;
    }

    setIsPosting(true);
    try {
      const postId = crypto.randomUUID();
      const postData = {
        id: postId,
        author_id: activeChannel.id,
        author_name: activeChannel.displayName,
        author_photo_url: activeChannel.photoURL,
        text: newPostText,
        type: postType,
        created_at: new Date().toISOString(),
        likes: 0
      } as any;

      if (postType === 'poll') {
        postData.poll_options = pollOptions
          .filter(opt => opt.trim() !== '')
          .map(opt => ({ text: opt, votes: 0, voters: [] }));
      }

      await supabase.from('community_posts').insert(postData);
      setNewPostText('');
      setPollOptions(['', '']);
      setPostType('text');
      toast.success('Пост опубликован!');
    } catch (error) {
      toast.error('Ошибка при публикации');
    } finally {
      setIsPosting(false);
    }
  };

  const handleVote = async (postId: string, optionIndex: number) => {
    if (!user) {
      toast.error('Войдите, чтобы проголосовать');
      return;
    }

    const post = communityPosts.find(p => p.id === postId);
    if (!post || !post.pollOptions) return;

    // Check if already voted
    const alreadyVoted = post.pollOptions.some(opt => opt.voters.includes(user.uid));
    if (alreadyVoted) {
      toast.info('Вы уже проголосовали');
      return;
    }

    const newOptions = JSON.parse(JSON.stringify(post.pollOptions));
    newOptions[optionIndex].votes += 1;
    newOptions[optionIndex].voters.push(user.uid);

    try {
      await supabase
        .from('community_posts')
        .update({ poll_options: newOptions })
        .eq('id', postId);
    } catch (error) {
      toast.error('Ошибка при голосовании');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const isOwner = user?.uid === authorInfo?.ownerId || activeChannel?.id === id;

  const regularVideos = videos.filter(v => (v.type === 'video' || (!v.type && !v.isShort && !v.isMusic && !v.isPhoto)) && (isOwner || v.visibility === 'public' || !v.visibility));
  const shortsVideos = videos.filter(v => (v.type === 'short' || v.isShort) && (isOwner || v.visibility === 'public' || !v.visibility));
  const musicVideos = videos.filter(v => (v.type === 'music' || v.isMusic) && (isOwner || v.visibility === 'public' || !v.visibility));
  const photosVideos = videos.filter(v => (v.type === 'photo' || v.isPhoto) && (isOwner || v.visibility === 'public' || !v.visibility));
  const canPostCommunity = subCount >= 10;

  return (
    <div className="pb-24 md:pb-12 bg-[var(--surface)] min-h-screen">
      {/* Channel Banner */}
      <div className="h-40 md:h-80 bg-[var(--hover)] relative overflow-hidden">
        {authorInfo?.bannerUrl ? (
          <img src={authorInfo.bannerUrl} alt="Баннер канала" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--hover)] to-[var(--border)] flex items-center justify-center">
            <Snowflake className="w-24 h-24 text-[var(--text-secondary)] opacity-20 animate-pulse" />
          </div>
        )}
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12">
        {/* Channel Header */}
        <div className="flex flex-col md:flex-row items-start gap-5 md:gap-8 mb-10 relative z-10">
          <div className="-mt-12 md:-mt-20 shrink-0">
            <MeltingAvatar 
              photoURL={authorInfo?.photoUrl}
              lastPostAt={authorInfo?.lastPostAt}
              size="xl"
              className="shadow-2xl bg-[var(--surface)] ring-4 ring-[var(--surface)] h-24 w-24 md:h-40 md:w-40"
            />
          </div>
          <div className="flex-1 space-y-4 pt-2 md:pt-4">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] tracking-tight">{authorInfo?.name}</h1>
              {authorInfo?.isVerified && (
                <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-600/20" title="Верифицированный канал">
                  <Snowflake className="w-5 h-5 text-white animate-pulse" />
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              <span className="text-[var(--text-primary)] bg-[var(--hover)] px-3 py-1.5 rounded-lg">{authorInfo?.pseudonym || authorInfo?.pseudonim || `@user-${id?.substring(0, 8)}`}</span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {subCount} {
                  subCount % 10 === 1 && subCount % 100 !== 11 ? 'подписчик' :
                  [2, 3, 4].includes(subCount % 10) && ![12, 13, 14].includes(subCount % 100) ? 'подписчика' :
                  'подписчиков'
                }
              </span>
              <div className="flex items-center gap-1.5 text-blue-600 bg-blue-600/10 px-3 py-1.5 rounded-lg">
                <Snowflake className="w-4 h-4" />
                <span>{authorInfo?.ices || 0} снежинок</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[var(--text-secondary)]">
              <div className="flex items-center gap-1.5 bg-[var(--hover)] px-3 py-1.5 rounded-lg">
                <PlaySquare className="w-4 h-4" /> <span>{regularVideos.length} видео</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[var(--hover)] px-3 py-1.5 rounded-lg">
                <Smartphone className="w-4 h-4" /> <span>{shortsVideos.length} shorts</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[var(--hover)] px-3 py-1.5 rounded-lg">
                <MusicIcon className="w-4 h-4" /> <span>{musicVideos.length} треков</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[var(--hover)] px-3 py-1.5 rounded-lg">
                <Camera className="w-4 h-4" /> <span>{photosVideos.length} фото</span>
              </div>
            </div>

            {/* Social Links in Header */}
            {authorInfo?.socialLinks && Object.values(authorInfo.socialLinks).some(link => link) && (
              <div className="flex flex-wrap gap-2 pt-1">
                {authorInfo.socialLinks.website && <a href={authorInfo.socialLinks.website} target="_blank" rel="noopener noreferrer" className="p-2 bg-[var(--hover)] rounded-full text-[var(--text-secondary)] hover:text-blue-600 hover:bg-blue-50 transition-colors"><Globe className="w-5 h-5" /></a>}
                {authorInfo.socialLinks.telegram && <a href={`https://t.me/${authorInfo.socialLinks.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-[var(--hover)] rounded-full text-[var(--text-secondary)] hover:text-blue-500 hover:bg-blue-50 transition-colors"><MessageSquare className="w-5 h-5" /></a>}
                {authorInfo.socialLinks.telegramGroup && <a href={authorInfo.socialLinks.telegramGroup.startsWith('http') ? authorInfo.socialLinks.telegramGroup : `https://${authorInfo.socialLinks.telegramGroup}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-[var(--hover)] rounded-full text-[var(--text-secondary)] hover:text-blue-500 hover:bg-blue-50 transition-colors"><Users className="w-5 h-5" /></a>}
                {authorInfo.socialLinks.rutube && <a href={authorInfo.socialLinks.rutube.startsWith('http') ? authorInfo.socialLinks.rutube : `https://${authorInfo.socialLinks.rutube}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-[var(--hover)] rounded-full text-[var(--text-secondary)] hover:text-blue-400 hover:bg-blue-50 transition-colors"><PlaySquare className="w-5 h-5" /></a>}
                {authorInfo.socialLinks.youtube && <a href={authorInfo.socialLinks.youtube.startsWith('http') ? authorInfo.socialLinks.youtube : `https://${authorInfo.socialLinks.youtube}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-[var(--hover)] rounded-full text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 transition-colors"><Youtube className="w-5 h-5" /></a>}
                {authorInfo.socialLinks.vk && <a href={authorInfo.socialLinks.vk.startsWith('http') ? authorInfo.socialLinks.vk : `https://vk.com/${authorInfo.socialLinks.vk}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-[var(--hover)] rounded-full text-[var(--text-secondary)] hover:text-blue-600 hover:bg-blue-50 transition-colors"><Globe className="w-5 h-5" /></a>}
                {authorInfo.socialLinks.instagram && <a href={`https://instagram.com/${authorInfo.socialLinks.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-[var(--hover)] rounded-full text-[var(--text-secondary)] hover:text-pink-600 hover:bg-pink-50 transition-colors"><Instagram className="w-5 h-5" /></a>}
              </div>
            )}

            {/* Pinned Achievements */}
            {authorInfo?.pinnedAchievements && authorInfo.pinnedAchievements.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {authorInfo.pinnedAchievements.map(achievementId => {
                  const achievements: Record<string, { title: string, icon: any, color: string }> = {
                    'subscribers_10': { title: '10 Подписчиков', icon: Users, color: 'text-blue-600 bg-blue-50 border-blue-600/20' },
                    'long_views_1000': { title: '1000 Просмотров', icon: PlaySquare, color: 'text-green-600 bg-green-50 border-green-600/20' },
                    'shorts_views_1000': { title: '1000 Shorts', icon: Smartphone, color: 'text-red-600 bg-red-50 border-red-600/20' }
                  };
                  const achievement = achievements[achievementId];
                  if (!achievement) return null;
                  const Icon = achievement.icon;
                  return (
                    <div key={achievementId} className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${achievement.color} transition-all hover:scale-105 cursor-default shadow-sm`}>
                      <Trophy className="w-4 h-4" />
                      <span className="text-[11px] font-black uppercase tracking-wider">{achievement.title}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-4 flex flex-wrap gap-3 items-center">
              {user?.uid === authorInfo?.ownerId ? (
                <>
                  <Link to="/studio/profile" className="bg-[var(--text-primary)] text-[var(--surface)] px-8 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90 active:scale-95">
                    Настроить вид канала
                  </Link>
                  <Link to="/studio/content" className="bg-[var(--hover)] text-[var(--text-primary)] px-8 py-3 rounded-xl font-bold text-sm transition-all hover:bg-gray-200 active:scale-95">
                    Управление контентом
                  </Link>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleSubscribe}
                    className={`px-10 py-2.5 rounded-full font-bold text-sm transition-all shadow-lg ${
                      isSubscribed 
                        ? 'bg-[var(--hover)] text-[var(--text-primary)] hover:bg-gray-200 shadow-none' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100/20'
                    }`}
                  >
                    {isSubscribed ? 'Вы подписаны' : 'Подписаться'}
                  </button>
                  {isSubscribed && (
                    <button
                      onClick={handleToggleNotifications}
                      className={`p-2.5 rounded-full transition-all ${
                        notificationsEnabled 
                          ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' 
                          : 'bg-[var(--hover)] text-[var(--text-secondary)] hover:bg-gray-200'
                      }`}
                      title={notificationsEnabled ? "Выключить уведомления" : "Включить уведомления"}
                    >
                      {notificationsEnabled ? <Bell className="w-5 h-5 fill-current" /> : <BellOff className="w-5 h-5" />}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-8 border-b border-[var(--border)] mb-10 overflow-x-auto scrollbar-hide bg-[var(--surface)]/50 backdrop-blur-sm sticky top-14 z-20 px-4 -mx-4 md:px-0 md:mx-0">
          {(['home', 'videos', 'shorts', 'music', 'photos', 'playlists', 'community', 'about'] as TabType[]).filter(tab => {
            if (tab === 'videos') return regularVideos.length > 0;
            if (tab === 'shorts') return shortsVideos.length > 0;
            if (tab === 'music') return musicVideos.length > 0;
            if (tab === 'photos') return photosVideos.length > 0;
            if (tab === 'playlists') return playlists.length > 0;
            return true;
          }).map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 border-b-2 font-bold text-sm uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab === 'home' ? 'Общая' :
               tab === 'videos' ? 'Видео' : 
               tab === 'shorts' ? 'Shorts' :
               tab === 'music' ? 'Музыка' :
               tab === 'photos' ? 'Фото' :
               tab === 'playlists' ? 'Плейлисты' : 
               tab === 'community' ? 'Сообщество' : 'О канале'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[40vh]">
          {activeTab === 'home' && (
            <div className="space-y-16">
              {authorInfo?.homeLayout?.map((section: string) => {
                if (section === 'videos' && regularVideos.length > 0) {
                  return (
                    <section key="videos">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
                          <PlaySquare className="w-5 h-5 text-blue-600" /> Видео
                        </h2>
                        <button onClick={() => setActiveTab('videos')} className="text-xs font-bold text-blue-600 uppercase tracking-widest hover:underline">Все видео</button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-12">
                        {regularVideos.slice(0, 5).map((video) => (
                          <VideoCard key={video.id} video={video as any} />
                        ))}
                      </div>
                    </section>
                  );
                }
                if (section === 'shorts' && shortsVideos.length > 0) {
                  return (
                    <section key="shorts">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
                          <Smartphone className="w-5 h-5 text-red-600" /> Shorts
                        </h2>
                        <button onClick={() => setActiveTab('shorts')} className="text-xs font-bold text-blue-600 uppercase tracking-widest hover:underline">Все Shorts</button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {shortsVideos.slice(0, 6).map((video) => (
                          <ShortCard key={video.id} video={video as any} />
                        ))}
                      </div>
                    </section>
                  );
                }
                if (section === 'music' && musicVideos.length > 0) {
                  return (
                    <section key="music">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
                          <Snowflake className="w-5 h-5 text-blue-400" /> Музыка
                        </h2>
                        <button onClick={() => setActiveTab('music')} className="text-xs font-bold text-blue-600 uppercase tracking-widest hover:underline">Вся музыка</button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-12">
                        {musicVideos.slice(0, 5).map((video) => (
                          <VideoCard key={video.id} video={video as any} />
                        ))}
                      </div>
                    </section>
                  );
                }
                if (section === 'photos' && photosVideos.length > 0) {
                  return (
                    <section key="photos">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
                          <Camera className="w-5 h-5 text-pink-500" /> Фото
                        </h2>
                        <button onClick={() => setActiveTab('photos')} className="text-xs font-bold text-blue-600 uppercase tracking-widest hover:underline">Все фото</button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-12">
                        {photosVideos.slice(0, 5).map((video) => (
                          <VideoCard key={video.id} video={video as any} />
                        ))}
                      </div>
                    </section>
                  );
                }
                return null;
              })}

              {videos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 text-[var(--text-secondary)]">
                  <PlaySquare className="w-16 h-16 mb-4 opacity-10" />
                  <p className="text-lg font-bold">На канале пока нет контента</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'videos' && (
            regularVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-[var(--text-secondary)]">
                <PlaySquare className="w-16 h-16 mb-4 opacity-10" />
                <p className="text-lg font-bold">На канале пока нет видео</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-12">
                {regularVideos.map((video) => (
                  <VideoCard key={video.id} video={video as any} />
                ))}
              </div>
            )
          )}

          {activeTab === 'shorts' && (
            shortsVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-[var(--text-secondary)]">
                <Smartphone className="w-16 h-16 mb-4 opacity-10" />
                <p className="text-lg font-bold">На канале пока нет Shorts</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {shortsVideos.map((video) => (
                  <ShortCard key={video.id} video={video as any} />
                ))}
              </div>
            )
          )}

          {activeTab === 'music' && (
            musicVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-[var(--text-secondary)]">
                <Snowflake className="w-16 h-16 mb-4 opacity-10" />
                <p className="text-lg font-bold">На канале пока нет музыки</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-12">
                {musicVideos.map((video) => (
                  <VideoCard key={video.id} video={video as any} />
                ))}
              </div>
            )
          )}

          {activeTab === 'photos' && (
            photosVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-[var(--text-secondary)]">
                <Camera className="w-16 h-16 mb-4 opacity-10" />
                <p className="text-lg font-bold">На канале пока нет фото</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-12">
                {photosVideos.map((video) => (
                  <VideoCard key={video.id} video={video as any} />
                ))}
              </div>
            )
          )}

          {activeTab === 'playlists' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
              {playlists.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-32 text-[var(--studio-muted)]">
                  <PlaySquare className="w-16 h-16 mb-4 opacity-10" />
                  <p className="text-lg font-bold">Плейлисты не созданы</p>
                </div>
              ) : (
                playlists.map(playlist => (
                  <div key={playlist.id} className="bg-[var(--studio-sidebar)] rounded-xl overflow-hidden border border-[var(--studio-border)] group cursor-pointer shadow-sm hover:shadow-md transition-all">
                    <div className="aspect-video bg-[var(--hover)] flex items-center justify-center relative">
                      <PlaySquare className="w-12 h-12 text-[var(--text-secondary)] group-hover:text-blue-600 transition-colors" />
                      <div className="absolute bottom-3 right-3 bg-black/80 px-2 py-1 rounded text-[10px] font-bold text-white uppercase tracking-wider">
                        {playlist.videoIds.length} видео
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-[var(--text-primary)] group-hover:text-blue-600 transition-colors line-clamp-1">{playlist.title}</h3>
                      <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-2">Обновлено недавно</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'community' && (
            <div className="max-w-3xl mx-auto space-y-8">
              {!canPostCommunity && (
                <div className="bg-[var(--surface)] p-10 rounded-2xl border border-[var(--border)] text-center shadow-sm">
                  <div className="w-16 h-16 bg-[var(--hover)] rounded-full flex items-center justify-center mx-auto mb-6">
                    <MessageSquare className="w-8 h-8 text-[var(--text-secondary)]" />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Сообщество пока недоступно</h3>
                  <p className="text-sm text-[var(--text-secondary)]">Вкладка "Сообщество" открывается авторам, набравшим более 10 подписчиков.</p>
                </div>
              )}

              {canPostCommunity && user?.uid === authorInfo?.ownerId && activeChannel?.id === id && (
                <div className="bg-[var(--studio-sidebar)] p-8 rounded-2xl border border-[var(--studio-border)] shadow-sm">
                  <form onSubmit={handleCreatePost} className="space-y-6">
                    <div className="flex gap-4">
                      <img src={activeChannel?.photoURL || ''} className="w-10 h-10 rounded-full shrink-0" alt="" />
                      <textarea
                        value={newPostText}
                        onChange={(e) => setNewPostText(e.target.value)}
                        placeholder="Поделитесь новостью с вашими подписчиками..."
                        className="w-full bg-transparent border-b border-[var(--border)] pb-4 focus:outline-none focus:border-blue-600 transition-all resize-none h-28 text-sm font-medium text-[var(--text-primary)]"
                      />
                    </div>
                    
                    {postType === 'poll' && (
                      <div className="ml-14 space-y-3">
                        {pollOptions.map((opt, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...pollOptions];
                                newOpts[idx] = e.target.value;
                                setPollOptions(newOpts);
                              }}
                              placeholder={`Вариант ${idx + 1}`}
                              className="flex-1 bg-[var(--hover)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all text-[var(--text-primary)]"
                            />
                          </div>
                        ))}
                        <button 
                          type="button" 
                          onClick={() => setPollOptions([...pollOptions, ''])}
                          className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1.5"
                        >
                          <Plus className="w-3 h-3" /> Добавить вариант
                        </button>
                      </div>
                    )}

                    <div className="flex justify-between items-center ml-14">
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => setPostType('text')}
                          className={`p-2.5 rounded-xl transition-all ${postType === 'text' ? 'bg-blue-50 text-blue-600' : 'hover:bg-[var(--hover)] text-[var(--text-secondary)]'}`}
                        >
                          <MessageSquare className="w-5 h-5" />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setPostType('poll')}
                          className={`p-2.5 rounded-xl transition-all ${postType === 'poll' ? 'bg-blue-50 text-blue-600' : 'hover:bg-[var(--hover)] text-[var(--text-secondary)]'}`}
                        >
                          <BarChart2 className="w-5 h-5" />
                        </button>
                      </div>
                      <button 
                        type="submit"
                        disabled={!newPostText.trim() || isPosting}
                        className="bg-blue-600 text-white px-8 py-2 rounded-full font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-100/20"
                      >
                        Опубликовать
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-6">
                {communityPosts.map(post => (
                  <div key={post.id} className="bg-[var(--surface)] p-8 rounded-2xl border border-[var(--border)] shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4 mb-6">
                      <img src={post.authorPhotoUrl} className="w-10 h-10 rounded-full border border-[var(--border)]" alt={post.authorName} />
                      <div>
                        <h4 className="font-bold text-[var(--text-primary)] text-sm">{post.authorName}</h4>
                        <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-0.5">
                          {safeFormatDistanceToNow(post.createdAt)}
                        </p>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap mb-6 text-[var(--text-primary)] leading-relaxed text-sm font-medium">{post.text}</p>
                    
                    {post.type === 'poll' && post.pollOptions && (
                      <div className="space-y-3 mb-8">
                        {post.pollOptions.map((opt, idx) => {
                          const totalVotes = post.pollOptions?.reduce((acc, o) => acc + o.votes, 0) || 1;
                          const percentage = Math.round((opt.votes / totalVotes) * 100);
                          const hasVoted = post.pollOptions?.some(o => o.voters.includes(user?.uid || ''));
                          
                          return (
                            <button 
                              key={idx}
                              onClick={() => handleVote(post.id, idx)}
                              disabled={!user || hasVoted}
                              className="w-full relative h-12 rounded-xl border border-[var(--border)] overflow-hidden text-left group transition-all hover:border-blue-200"
                            >
                              <div 
                                className="absolute inset-0 bg-blue-50 transition-all duration-700" 
                                style={{ width: hasVoted ? `${percentage}%` : '0%' }}
                              />
                              <div className="absolute inset-0 flex items-center justify-between px-5">
                                <span className="font-bold text-sm text-[var(--text-primary)]">{opt.text}</span>
                                {hasVoted && <span className="text-xs font-black text-blue-600">{percentage}%</span>}
                              </div>
                            </button>
                          );
                        })}
                        <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest pl-1">
                          {post.pollOptions.reduce((acc, o) => acc + o.votes, 0)} голосов
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-6 text-[var(--text-secondary)] border-t border-[var(--border)] pt-6">
                      <button className="flex items-center gap-2 hover:text-blue-600 transition-colors group">
                        <ThumbsUp className="w-4 h-4 group-hover:fill-blue-600" />
                        <span className="text-xs font-bold">{post.likes}</span>
                      </button>
                      <button className="flex items-center gap-2 hover:text-blue-600 transition-colors group">
                        <MessageSquare className="w-4 h-4 group-hover:fill-blue-600" />
                        <span className="text-xs font-bold">0</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-10">
                <section>
                  <h3 className="text-xl font-bold text-[var(--studio-text)] mb-6 flex items-center gap-2">
                    <Info className="w-5 h-5 text-blue-600" />
                    Описание
                  </h3>
                  <p className="text-[var(--text-primary)]/80 whitespace-pre-wrap leading-relaxed font-medium">
                    {authorInfo?.bio || 'Описание канала отсутствует.'}
                  </p>
                </section>
                <div className="h-px bg-[var(--studio-border)]" />
                {authorInfo?.socialLinks && (Object.values(authorInfo.socialLinks).some(link => link)) && (
                  <section>
                    <h3 className="text-xl font-bold text-[var(--studio-text)] mb-6 flex items-center gap-2">
                      <Globe className="w-5 h-5 text-blue-600" />
                      Ссылки
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {authorInfo.socialLinks.website && (
                        <a href={authorInfo.socialLinks.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-[var(--hover)] rounded-xl border border-[var(--border)] hover:border-blue-600 transition-all group">
                          <Globe className="w-5 h-5 text-blue-600" />
                          <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-blue-600">Веб-сайт</span>
                        </a>
                      )}
                      {authorInfo.socialLinks.telegram && (
                        <a href={`https://t.me/${authorInfo.socialLinks.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-[var(--hover)] rounded-xl border border-[var(--border)] hover:border-blue-600 transition-all group">
                          <Smartphone className="w-5 h-5 text-blue-400" />
                          <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-blue-600">Telegram</span>
                        </a>
                      )}
                      {authorInfo.socialLinks.telegramGroup && (
                        <a href={authorInfo.socialLinks.telegramGroup.startsWith('http') ? authorInfo.socialLinks.telegramGroup : `https://${authorInfo.socialLinks.telegramGroup}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-[var(--hover)] rounded-xl border border-[var(--border)] hover:border-blue-600 transition-all group">
                          <Smartphone className="w-5 h-5 text-blue-400" />
                          <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-blue-600">Telegram Group</span>
                        </a>
                      )}
                      {authorInfo.socialLinks.rutube && (
                        <a href={authorInfo.socialLinks.rutube.startsWith('http') ? authorInfo.socialLinks.rutube : `https://${authorInfo.socialLinks.rutube}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-[var(--hover)] rounded-xl border border-[var(--border)] hover:border-blue-600 transition-all group">
                          <Globe className="w-5 h-5 text-blue-600" />
                          <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-blue-600">Rutube</span>
                        </a>
                      )}
                      {authorInfo.socialLinks.youtube && (
                        <a href={authorInfo.socialLinks.youtube.startsWith('http') ? authorInfo.socialLinks.youtube : `https://${authorInfo.socialLinks.youtube}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-[var(--hover)] rounded-xl border border-[var(--border)] hover:border-blue-600 transition-all group">
                          <PlaySquare className="w-5 h-5 text-red-600" />
                          <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-blue-600">YouTube</span>
                        </a>
                      )}
                      {authorInfo.socialLinks.vk && (
                        <a href={authorInfo.socialLinks.vk.startsWith('http') ? authorInfo.socialLinks.vk : `https://vk.com/${authorInfo.socialLinks.vk}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-[var(--hover)] rounded-xl border border-[var(--border)] hover:border-blue-600 transition-all group">
                          <Globe className="w-5 h-5 text-blue-500" />
                          <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-blue-600">VK</span>
                        </a>
                      )}
                      {authorInfo.socialLinks.instagram && (
                        <a href={`https://instagram.com/${authorInfo.socialLinks.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-[var(--hover)] rounded-xl border border-[var(--border)] hover:border-blue-600 transition-all group">
                          <Instagram className="w-5 h-5 text-pink-500" />
                          <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-blue-600">Instagram</span>
                        </a>
                      )}
                    </div>
                  </section>
                )}
                <div className="h-px bg-[var(--studio-border)]" />
                <section>
                  <h3 className="text-xl font-bold text-[var(--studio-text)] mb-6 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-600" />
                    Контакты
                  </h3>
                  <div className="flex items-center gap-3 text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                    <Globe className="w-4 h-4" />
                    <span>Для коммерческих запросов: {authorInfo?.email || 'не указано'}</span>
                  </div>
                </section>
              </div>
              <aside className="space-y-8">
                <div className="bg-[var(--studio-sidebar)] p-8 rounded-2xl border border-[var(--studio-border)] shadow-sm">
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 uppercase tracking-widest text-xs">Статистика</h3>
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-[var(--studio-border)] pb-4">
                      <div className="flex items-center gap-2 text-[var(--studio-muted)]">
                        <Calendar className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Регистрация</span>
                      </div>
                      <span className="text-sm font-bold text-[var(--text-primary)]">{authorInfo?.joinedAt ? new Date(authorInfo.joinedAt).toLocaleDateString('ru-RU') : '-'}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-[var(--studio-border)] pb-4">
                      <div className="flex items-center gap-2 text-[var(--studio-muted)]">
                        <BarChart2 className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Просмотры</span>
                      </div>
                      <span className="text-sm font-bold text-[var(--text-primary)]">{videos.reduce((acc, v) => acc + v.views, 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
