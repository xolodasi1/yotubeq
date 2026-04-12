import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../App';
import VideoCard from '../components/VideoCard';
import ShortCard from '../components/ShortCard';
import { MeltingAvatar } from '../components/MeltingAvatar';
import { VideoType, CommunityPost, Playlist } from '../types';
import { Loader2, Snowflake, Smartphone, MessageSquare, ThumbsUp, Plus, BarChart2, PlaySquare, Info, Calendar, Mail, Globe, Instagram, Bell, BellOff, Camera } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc, setDoc, deleteDoc, updateDoc, increment, onSnapshot, addDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

type TabType = 'videos' | 'shorts' | 'music' | 'photos' | 'playlists' | 'community' | 'about';

export default function Channel() {
  const { id } = useParams<{ id: string }>();
  const { user, activeChannel } = useAuth();
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorInfo, setAuthorInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('videos');
  
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
    
    // Real-time channel info
    const unsubscribeChannel = onSnapshot(doc(db, 'channels', id), (channelDoc) => {
      if (channelDoc.exists()) {
        const channelData = channelDoc.data();
        setAuthorInfo({
          id: channelDoc.id,
          ownerId: channelData.ownerId,
          name: channelData.displayName || 'Ice Creator',
          pseudonym: channelData.pseudonym || channelData.pseudonim || '',
          photoUrl: channelData.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
          bannerUrl: channelData.bannerUrl || null,
          bio: channelData.bio || '',
          socialLinks: channelData.socialLinks || {},
          subscribers: channelData.subscribers || 0,
          joinedAt: channelData.createdAt?.toDate() || new Date(),
          lastPostAt: channelData.lastPostAt
        });
        setSubCount(channelData.subscribers || 0);
      }
    });

    const fetchChannelVideos = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'videos'),
          where('authorId', '==', id),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => {
          const videoData = doc.data();
          return {
            ...videoData,
            createdAt: videoData.createdAt?.toDate?.()?.toISOString() || videoData.createdAt
          };
        }) as VideoType[];
        setVideos(data || []);

        if (user) {
          const subId = `${user.uid}_${id}`;
          const subSnap = await getDoc(doc(db, 'subscriptions', subId));
          if (subSnap.exists()) {
            setIsSubscribed(true);
            setNotificationsEnabled(subSnap.data().notificationsEnabled || false);
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
    return () => unsubscribeChannel();
  }, [id, user]);

  // Real-time Community Posts
  useEffect(() => {
    if (!id || activeTab !== 'community') return;

    const q = query(
      collection(db, 'community_posts'),
      where('authorId', '==', id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => {
        const postData = doc.data();
        return {
          ...postData,
          createdAt: postData.createdAt?.toDate?.()?.toISOString() || postData.createdAt
        };
      }) as CommunityPost[];
      setCommunityPosts(posts);
    });

    return () => unsubscribe();
  }, [id, activeTab]);

  // Fetch Playlists
  useEffect(() => {
    if (!id || activeTab !== 'playlists') return;

    const fetchPlaylists = async () => {
      const q = query(
        collection(db, 'playlists'),
        where('authorId', '==', id),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setPlaylists(snap.docs.map(doc => doc.data() as Playlist));
    };

    fetchPlaylists();
  }, [id, activeTab]);

  const handleToggleNotifications = async () => {
    if (!user || !id || !isSubscribed) return;
    const subId = `${user.uid}_${id}`;
    const subRef = doc(db, 'subscriptions', subId);
    try {
      const newState = !notificationsEnabled;
      await updateDoc(subRef, { notificationsEnabled: newState });
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

    // Restriction: Only primary channel can interact
    if (!activeChannel?.isPrimary) {
      toast.error('Подписываться можно только с основного канала');
      return;
    }

    // Restriction: Cannot subscribe to own channels
    if (user.uid === authorInfo.ownerId || user.uid === id) {
      toast.error("Вы не можете подписаться на свои каналы");
      return;
    }

    const subId = `${user.uid}_${id}`;
    const subRef = doc(db, 'subscriptions', subId);
    const channelRef = doc(db, 'channels', id);

    try {
      if (isSubscribed) {
        await deleteDoc(subRef);
        await updateDoc(channelRef, { subscribers: increment(-1) }).catch(() => {});
        setIsSubscribed(false);
        setNotificationsEnabled(false);
        setSubCount(Math.max(0, subCount - 1));
        toast.success('Вы отписались');
      } else {
        await Promise.all([
          setDoc(subRef, {
            id: subId,
            subscriberId: user.uid,
            channelId: id,
            createdAt: new Date(),
            notificationsEnabled: false
          }),
          updateDoc(channelRef, { subscribers: increment(1) }).catch(() => {})
        ]);
        
        // Add notification
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: id,
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
        setNotificationsEnabled(false);
        setSubCount(subCount + 1);
        toast.success('Вы подписались!');
      }
    } catch (error) {
      console.error("Error toggling subscription:", error);
      toast.error('Не удалось обновить подписку');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeChannel || !newPostText.trim() || isPosting) return;

    // Restriction: Community posts are per-channel, but user said interactions are primary only.
    // However, posting on your own channel should be allowed from that channel.
    if (activeChannel.id !== id) {
      toast.error('Вы можете публиковать посты только от имени этого канала');
      return;
    }

    setIsPosting(true);
    try {
      const postId = crypto.randomUUID();
      const postData: CommunityPost = {
        id: postId,
        authorId: activeChannel.id,
        authorName: activeChannel.displayName,
        authorPhotoUrl: activeChannel.photoURL,
        text: newPostText,
        type: postType,
        createdAt: new Date(),
        likes: 0
      };

      if (postType === 'poll') {
        postData.pollOptions = pollOptions
          .filter(opt => opt.trim() !== '')
          .map(opt => ({ text: opt, votes: 0, voters: [] }));
      }

      await setDoc(doc(db, 'community_posts', postId), postData);
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

    const postRef = doc(db, 'community_posts', postId);
    const post = communityPosts.find(p => p.id === postId);
    if (!post || !post.pollOptions) return;

    // Check if already voted
    const alreadyVoted = post.pollOptions.some(opt => opt.voters.includes(user.uid));
    if (alreadyVoted) {
      toast.info('Вы уже проголосовали');
      return;
    }

    const newOptions = [...post.pollOptions];
    newOptions[optionIndex].votes += 1;
    newOptions[optionIndex].voters.push(user.uid);

    try {
      await updateDoc(postRef, { pollOptions: newOptions });
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

  const regularVideos = videos.filter(v => v.type === 'video' || (!v.type && !v.isShort && !v.isMusic && !v.isPhoto));
  const shortsVideos = videos.filter(v => v.type === 'short' || v.isShort);
  const musicVideos = videos.filter(v => v.type === 'music' || v.isMusic);
  const photosVideos = videos.filter(v => v.type === 'photo' || v.isPhoto);
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
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10 -mt-12 md:-mt-20 mb-10 relative z-10">
          <MeltingAvatar 
            photoURL={authorInfo?.photoUrl}
            lastPostAt={authorInfo?.lastPostAt}
            size="xl"
            className="border-4 border-[var(--surface)] shadow-xl bg-[var(--surface)]"
          />
          <div className="flex-1 space-y-3">
            <h1 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] tracking-tight">{authorInfo?.name}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest">
              <span>{authorInfo?.pseudonym || authorInfo?.pseudonim || `@user-${id?.substring(0, 8)}`}</span>
              <span className="w-1 h-1 bg-[var(--border)] rounded-full" />
              <span>{subCount} подписчиков</span>
              <span className="w-1 h-1 bg-[var(--border)] rounded-full" />
              <span>{videos.length} видео</span>
            </div>
            {authorInfo?.bio && (
              <p className="text-sm text-[var(--text-secondary)] max-w-3xl line-clamp-2 leading-relaxed font-medium">{authorInfo.bio}</p>
            )}
            
            {/* Social Links in Header */}
            {authorInfo?.socialLinks && Object.values(authorInfo.socialLinks).some(link => link) && (
              <div className="flex flex-wrap gap-3 pt-2">
                {authorInfo.socialLinks.website && <a href={authorInfo.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-blue-600"><Globe className="w-5 h-5" /></a>}
                {authorInfo.socialLinks.telegram && <a href={`https://t.me/${authorInfo.socialLinks.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-blue-400"><Smartphone className="w-5 h-5" /></a>}
                {authorInfo.socialLinks.telegramGroup && <a href={authorInfo.socialLinks.telegramGroup.startsWith('http') ? authorInfo.socialLinks.telegramGroup : `https://${authorInfo.socialLinks.telegramGroup}`} target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-blue-400"><Smartphone className="w-5 h-5" /></a>}
                {authorInfo.socialLinks.rutube && <a href={authorInfo.socialLinks.rutube.startsWith('http') ? authorInfo.socialLinks.rutube : `https://${authorInfo.socialLinks.rutube}`} target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-blue-600"><Globe className="w-5 h-5" /></a>}
                {authorInfo.socialLinks.youtube && <a href={authorInfo.socialLinks.youtube.startsWith('http') ? authorInfo.socialLinks.youtube : `https://${authorInfo.socialLinks.youtube}`} target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-red-600"><PlaySquare className="w-5 h-5" /></a>}
                {authorInfo.socialLinks.vk && <a href={authorInfo.socialLinks.vk.startsWith('http') ? authorInfo.socialLinks.vk : `https://vk.com/${authorInfo.socialLinks.vk}`} target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-blue-500"><Globe className="w-5 h-5" /></a>}
                {authorInfo.socialLinks.instagram && <a href={`https://instagram.com/${authorInfo.socialLinks.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-pink-500"><Instagram className="w-5 h-5" /></a>}
              </div>
            )}

            <div className="pt-2 flex flex-wrap gap-3 items-center">
              {user?.uid === authorInfo?.ownerId ? (
                <Link to="/studio/profile" className="bg-blue-600 text-white px-8 py-2.5 rounded-full font-bold text-sm transition-all hover:bg-blue-700 shadow-lg shadow-blue-100/20">
                  Настроить канал
                </Link>
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
          {(['videos', 'shorts', 'music', 'photos', 'playlists', 'community', 'about'] as TabType[]).map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 border-b-2 font-bold text-sm uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab === 'videos' ? 'Видео' : 
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
                          {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ru }) : 'только что'}
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
