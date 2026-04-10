import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../App';
import VideoCard from '../components/VideoCard';
import ShortCard from '../components/ShortCard';
import { VideoType, CommunityPost, Playlist } from '../types';
import { Loader2, Snowflake, Smartphone, MessageSquare, ThumbsUp, Plus, BarChart2, PlaySquare } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc, setDoc, deleteDoc, updateDoc, increment, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

type TabType = 'videos' | 'playlists' | 'community' | 'about';

export default function Channel() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorInfo, setAuthorInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('videos');
  
  const [isSubscribed, setIsSubscribed] = useState(false);
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
    
    const fetchChannelData = async () => {
      try {
        setLoading(true);

        // Fetch videos
        const q = query(
          collection(db, 'videos'),
          where('authorId', '==', id),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()?.toISOString()
        })) as VideoType[];
        
        setVideos(data || []);

        // Fetch user info
        const userDoc = await getDoc(doc(db, 'users', id));
        let channelName = 'Ice Creator';
        let channelPhoto = `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`;
        let channelBanner = null;
        let channelBio = '';
        let subscribers = 0;
        let joinedAt = new Date();

        if (userDoc.exists()) {
          const userData = userDoc.data();
          channelName = userData.displayName || channelName;
          channelPhoto = userData.photoURL || channelPhoto;
          channelBanner = userData.bannerUrl || null;
          channelBio = userData.bio || '';
          subscribers = userData.subscribers || 0;
          joinedAt = userData.createdAt?.toDate() || joinedAt;
        }

        setAuthorInfo({
          name: channelName,
          photoUrl: channelPhoto,
          bannerUrl: channelBanner,
          bio: channelBio,
          subscribers,
          joinedAt
        });

        setSubCount(subscribers);

        // Check subscription
        if (user) {
          const subId = `${user.uid}_${id}`;
          const subSnap = await getDoc(doc(db, 'subscriptions', subId));
          if (subSnap.exists()) {
            setIsSubscribed(true);
          }
        }

      } catch (error) {
        console.error("Error fetching channel data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChannelData();
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
      const posts = snapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()?.toISOString()
      })) as CommunityPost[];
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

  const handleSubscribe = async () => {
    if (!user || !id) {
      toast.error('Пожалуйста, войдите, чтобы подписаться');
      return;
    }
    if (user.uid === id) {
      toast.error("Вы не можете подписаться на самого себя");
      return;
    }

    const subId = `${user.uid}_${id}`;
    const subRef = doc(db, 'subscriptions', subId);
    const channelRef = doc(db, 'users', id);

    try {
      if (isSubscribed) {
        await deleteDoc(subRef);
        await updateDoc(channelRef, { subscribers: increment(-1) }).catch(() => {});
        setIsSubscribed(false);
        setSubCount(Math.max(0, subCount - 1));
        toast.success('Вы отписались');
      } else {
        await setDoc(subRef, {
          id: subId,
          subscriberId: user.uid,
          channelId: id,
          createdAt: new Date()
        });
        await updateDoc(channelRef, { subscribers: increment(1) }).catch(() => {});
        setIsSubscribed(true);
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
    if (!user || !newPostText.trim() || isPosting) return;

    setIsPosting(true);
    try {
      const postId = crypto.randomUUID();
      const postData: CommunityPost = {
        id: postId,
        authorId: user.uid,
        authorName: user.displayName,
        authorPhotoUrl: user.photoURL,
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
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-ice-accent" />
      </div>
    );
  }

  const regularVideos = videos.filter(v => !v.isShort);
  const shortsVideos = videos.filter(v => v.isShort);
  const canPostCommunity = subCount >= 10;

  return (
    <div className="pb-24 md:pb-8">
      {/* Channel Banner */}
      <div className="h-32 md:h-64 bg-gradient-to-r from-ice-bg via-ice-accent/20 to-ice-bg relative overflow-hidden border-b border-ice-border">
        {authorInfo?.bannerUrl ? (
          <img src={authorInfo.bannerUrl} alt="Баннер канала" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Snowflake className="w-20 md:w-32 h-20 md:h-32 text-ice-accent opacity-10 animate-spin-slow" />
            </div>
          </>
        )}
      </div>

      <div className="max-w-[1600px] mx-auto px-3 md:px-6 lg:px-8">
        {/* Channel Info */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 -mt-10 md:-mt-16 mb-6 md:mb-8 relative z-10">
          <img
            src={authorInfo?.photoUrl}
            alt="Аватар канала"
            className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-ice-bg shadow-[0_0_20px_rgba(0,242,255,0.3)] bg-ice-bg object-cover"
          />
          <div className="flex-1 text-center md:text-left mb-1 md:mb-2">
            <h1 className="text-2xl md:text-3xl font-bold ice-text-glow mb-1">{authorInfo?.name}</h1>
            <p className="text-xs md:text-sm text-ice-muted mb-2">@user-{id?.substring(0, 8)} • {subCount} подписчиков • {videos.length} видео</p>
            {authorInfo?.bio && (
              <p className="text-xs md:text-sm text-ice-text/80 max-w-2xl whitespace-pre-wrap line-clamp-3 md:line-clamp-none">{authorInfo.bio}</p>
            )}
          </div>
          <div className="mb-1 md:mb-2 w-full md:w-auto px-4 md:px-0">
            {user?.uid === id ? (
              <Link to="/studio" className="w-full md:w-auto text-center bg-white/10 hover:bg-white/20 border border-ice-border px-6 py-2 rounded-full font-bold transition-colors inline-block text-sm md:text-base">
                Настроить канал
              </Link>
            ) : (
              <button 
                onClick={handleSubscribe}
                className={`w-full md:w-auto px-8 py-2 rounded-full font-bold transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)] text-sm md:text-base ${
                  isSubscribed 
                    ? 'bg-white/10 text-ice-text hover:bg-white/20' 
                    : 'bg-ice-text text-ice-bg hover:bg-white/90'
                }`}
              >
                {isSubscribed ? 'Вы подписаны' : 'Подписаться'}
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 md:gap-8 border-b border-ice-border mb-6 md:mb-8 overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => setActiveTab('videos')}
            className={`pb-3 md:pb-4 border-b-2 font-medium transition-colors whitespace-nowrap text-sm md:text-base ${activeTab === 'videos' ? 'border-ice-accent text-ice-accent' : 'border-transparent text-ice-muted hover:text-ice-text'}`}
          >
            Видео
          </button>
          <button 
            onClick={() => setActiveTab('playlists')}
            className={`pb-3 md:pb-4 border-b-2 font-medium transition-colors whitespace-nowrap text-sm md:text-base ${activeTab === 'playlists' ? 'border-ice-accent text-ice-accent' : 'border-transparent text-ice-muted hover:text-ice-text'}`}
          >
            Плейлисты
          </button>
          <button 
            onClick={() => setActiveTab('community')}
            className={`pb-3 md:pb-4 border-b-2 font-medium transition-colors whitespace-nowrap text-sm md:text-base ${activeTab === 'community' ? 'border-ice-accent text-ice-accent' : 'border-transparent text-ice-muted hover:text-ice-text'}`}
          >
            Сообщество
          </button>
          <button 
            onClick={() => setActiveTab('about')}
            className={`pb-3 md:pb-4 border-b-2 font-medium transition-colors whitespace-nowrap text-sm md:text-base ${activeTab === 'about' ? 'border-ice-accent text-ice-accent' : 'border-transparent text-ice-muted hover:text-ice-text'}`}
          >
            О канале
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'videos' && (
          videos.length === 0 ? (
            <div className="text-center py-20 text-ice-muted">
              <p className="text-lg md:text-xl">Этот канал еще не загрузил ни одного видео.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8 md:gap-10">
              {shortsVideos.length > 0 && (
                <div>
                  <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center gap-2">
                    <Smartphone className="w-5 h-5 md:w-6 md:h-6 text-ice-accent" />
                    Shorts
                  </h2>
                  <div className="flex gap-3 md:gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x">
                    {shortsVideos.map((video) => (
                      <div key={video.id} className="snap-start">
                        <ShortCard video={video as any} />
                      </div>
                    ))}
                  </div>
                  <div className="w-full h-px bg-ice-border mt-2 md:mt-4"></div>
                </div>
              )}
              {regularVideos.length > 0 && (
                <div>
                  <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Видео</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-6 md:gap-x-6 md:gap-y-10">
                    {regularVideos.map((video) => (
                      <VideoCard key={video.id} video={video as any} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {activeTab === 'playlists' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {playlists.length === 0 ? (
              <div className="col-span-full text-center py-20 text-ice-muted">
                <p className="text-lg md:text-xl">Плейлисты не найдены.</p>
              </div>
            ) : (
              playlists.map(playlist => (
                <div key={playlist.id} className="glass rounded-2xl overflow-hidden border border-ice-border group cursor-pointer">
                  <div className="aspect-video bg-ice-accent/10 flex items-center justify-center relative">
                    <PlaySquare className="w-12 h-12 text-ice-accent opacity-50" />
                    <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs">
                      {playlist.videoIds.length} видео
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold group-hover:text-ice-accent transition-colors">{playlist.title}</h3>
                    <p className="text-xs text-ice-muted mt-1">Обновлено недавно</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'community' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {!canPostCommunity && (
              <div className="glass p-6 rounded-2xl border border-ice-border text-center text-ice-muted">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Вкладка "Сообщество" доступна авторам с 10+ подписчиками.</p>
              </div>
            )}

            {canPostCommunity && user?.uid === id && (
              <div className="glass p-6 rounded-2xl border border-ice-border">
                <form onSubmit={handleCreatePost}>
                  <textarea
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    placeholder="Поделитесь чем-нибудь с вашим сообществом..."
                    className="w-full bg-transparent border-b border-ice-border pb-2 focus:outline-none focus:border-ice-accent transition-colors resize-none h-24"
                  />
                  
                  {postType === 'poll' && (
                    <div className="mt-4 space-y-2">
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
                            className="flex-1 bg-white/5 border border-ice-border rounded-lg px-3 py-2 focus:outline-none focus:border-ice-accent"
                          />
                        </div>
                      ))}
                      <button 
                        type="button" 
                        onClick={() => setPollOptions([...pollOptions, ''])}
                        className="text-xs text-ice-accent hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Добавить вариант
                      </button>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-4">
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => setPostType('text')}
                        className={`p-2 rounded-lg transition-colors ${postType === 'text' ? 'bg-ice-accent/20 text-ice-accent' : 'hover:bg-white/5 text-ice-muted'}`}
                      >
                        <MessageSquare className="w-5 h-5" />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setPostType('poll')}
                        className={`p-2 rounded-lg transition-colors ${postType === 'poll' ? 'bg-ice-accent/20 text-ice-accent' : 'hover:bg-white/5 text-ice-muted'}`}
                      >
                        <BarChart2 className="w-5 h-5" />
                      </button>
                    </div>
                    <button 
                      type="submit"
                      disabled={!newPostText.trim() || isPosting}
                      className="bg-ice-accent text-ice-bg px-6 py-2 rounded-full font-bold hover:bg-ice-accent/90 transition-colors disabled:opacity-50"
                    >
                      Опубликовать
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-4">
              {communityPosts.map(post => (
                <div key={post.id} className="glass p-6 rounded-2xl border border-ice-border">
                  <div className="flex items-center gap-3 mb-4">
                    <img src={post.authorPhotoUrl} className="w-10 h-10 rounded-full border border-ice-accent" alt={post.authorName} />
                    <div>
                      <h4 className="font-bold">{post.authorName}</h4>
                      <p className="text-xs text-ice-muted">
                        {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ru }) : 'только что'}
                      </p>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap mb-4">{post.text}</p>
                  
                  {post.type === 'poll' && post.pollOptions && (
                    <div className="space-y-3 mb-4">
                      {post.pollOptions.map((opt, idx) => {
                        const totalVotes = post.pollOptions?.reduce((acc, o) => acc + o.votes, 0) || 1;
                        const percentage = Math.round((opt.votes / totalVotes) * 100);
                        const hasVoted = post.pollOptions?.some(o => o.voters.includes(user?.uid || ''));
                        
                        return (
                          <button 
                            key={idx}
                            onClick={() => handleVote(post.id, idx)}
                            disabled={!user || hasVoted}
                            className="w-full relative h-10 rounded-lg border border-ice-border overflow-hidden text-left group"
                          >
                            <div 
                              className="absolute inset-0 bg-ice-accent/20 transition-all duration-500" 
                              style={{ width: hasVoted ? `${percentage}%` : '0%' }}
                            />
                            <div className="absolute inset-0 flex items-center justify-between px-4">
                              <span className="font-medium text-sm">{opt.text}</span>
                              {hasVoted && <span className="text-xs font-bold">{percentage}%</span>}
                            </div>
                          </button>
                        );
                      })}
                      <p className="text-xs text-ice-muted">
                        {post.pollOptions.reduce((acc, o) => acc + o.votes, 0)} голосов
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-ice-muted">
                    <button className="flex items-center gap-1 hover:text-ice-accent transition-colors">
                      <ThumbsUp className="w-4 h-4" />
                      <span className="text-xs">{post.likes}</span>
                    </button>
                    <button className="flex items-center gap-1 hover:text-ice-accent transition-colors">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-xs">0</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <div>
                <h3 className="text-xl font-bold mb-4">Описание</h3>
                <p className="text-ice-text/80 whitespace-pre-wrap">
                  {authorInfo?.bio || 'Описание канала отсутствует.'}
                </p>
              </div>
              <div className="h-px bg-ice-border" />
              <div>
                <h3 className="text-xl font-bold mb-4">Подробности</h3>
                <div className="flex items-center gap-2 text-ice-muted">
                  <MessageSquare className="w-5 h-5" />
                  <span>Для коммерческих запросов: {authorInfo?.email || 'не указано'}</span>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <h3 className="text-xl font-bold mb-4">Статистика</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between border-b border-ice-border pb-2">
                  <span className="text-ice-muted">Дата регистрации:</span>
                  <span>{authorInfo?.joinedAt ? new Date(authorInfo.joinedAt).toLocaleDateString('ru-RU') : '-'}</span>
                </div>
                <div className="flex justify-between border-b border-ice-border pb-2">
                  <span className="text-ice-muted">Просмотры:</span>
                  <span>{videos.reduce((acc, v) => acc + v.views, 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
