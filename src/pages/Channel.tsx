import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../App';
import VideoCard from '../components/VideoCard';
import ShortCard from '../components/ShortCard';
import { VideoType } from '../types';
import { Loader2, Snowflake, Smartphone } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc, setDoc, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import { toast } from 'sonner';

export default function Channel() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorInfo, setAuthorInfo] = useState<any>(null);
  
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subCount, setSubCount] = useState(0);

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

        // Fetch user info from users collection to get updated name
        const userDoc = await getDoc(doc(db, 'users', id));
        let channelName = 'Ice Creator';
        let channelPhoto = `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`;
        let channelBanner = null;
        let channelBio = '';

        if (userDoc.exists()) {
          channelName = userDoc.data().displayName || channelName;
          channelPhoto = userDoc.data().photoURL || channelPhoto;
          channelBanner = userDoc.data().bannerUrl || null;
          channelBio = userDoc.data().bio || '';
        } else if (data && data.length > 0) {
          channelName = data[0].authorName;
          channelPhoto = data[0].authorPhotoUrl;
        }

        setAuthorInfo({
          name: channelName,
          photoUrl: channelPhoto,
          bannerUrl: channelBanner,
          bio: channelBio
        });

        // Fetch sub count
        const subsQ = query(collection(db, 'subscriptions'), where('channelId', '==', id));
        const subsSnap = await getDocs(subsQ);
        setSubCount(subsSnap.size);

        // Check if current user is subscribed
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-ice-accent" />
      </div>
    );
  }

  const regularVideos = videos.filter(v => !v.isShort);
  const shortsVideos = videos.filter(v => v.isShort);

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
          <button className="pb-3 md:pb-4 border-b-2 border-ice-accent font-medium text-ice-accent whitespace-nowrap text-sm md:text-base">Видео</button>
          <button className="pb-3 md:pb-4 font-medium text-ice-muted hover:text-ice-text transition-colors whitespace-nowrap text-sm md:text-base">Плейлисты</button>
          <button className="pb-3 md:pb-4 font-medium text-ice-muted hover:text-ice-text transition-colors whitespace-nowrap text-sm md:text-base">Сообщество</button>
          <button className="pb-3 md:pb-4 font-medium text-ice-muted hover:text-ice-text transition-colors whitespace-nowrap text-sm md:text-base">О канале</button>
        </div>

        {/* Videos Grid */}
        {videos.length === 0 ? (
          <div className="text-center py-20 text-ice-muted">
            <p className="text-lg md:text-xl">Этот канал еще не загрузил ни одного видео.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8 md:gap-10">
            {/* Shorts Section */}
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

            {/* Regular Videos Section */}
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
        )}
      </div>
    </div>
  );
}
