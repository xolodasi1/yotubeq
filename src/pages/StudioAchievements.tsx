import React, { useState, useEffect } from 'react';
import { Trophy, Users, ArrowRight, Play, Smartphone, Pin, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { VideoType } from '../types';
import { toast } from 'sonner';

export default function StudioAchievements() {
  const { activeChannel, setActiveChannel } = useAuth();
  const [videos, setVideos] = useState<VideoType[]>([]);
  
  useEffect(() => {
    if (!activeChannel) return;
    const fetchVideos = async () => {
      const q = query(collection(db, 'videos'), where('authorId', '==', activeChannel.id));
      const snapshot = await getDocs(q);
      setVideos(snapshot.docs.map(doc => doc.data() as VideoType));
    };
    fetchVideos();
  }, [activeChannel]);

  const handleTogglePin = async (achievementId: string) => {
    if (!activeChannel) return;

    const isPinned = activeChannel.pinnedAchievements?.includes(achievementId);
    const channelRef = doc(db, 'channels', activeChannel.id);

    try {
      if (isPinned) {
        await updateDoc(channelRef, {
          pinnedAchievements: arrayRemove(achievementId)
        });
        setActiveChannel({
          ...activeChannel,
          pinnedAchievements: activeChannel.pinnedAchievements?.filter(id => id !== achievementId)
        });
        toast.success('Достижение убрано с канала');
      } else {
        if ((activeChannel.pinnedAchievements?.length || 0) >= 3) {
          toast.error('Можно закрепить не более 3 достижений');
          return;
        }
        await updateDoc(channelRef, {
          pinnedAchievements: arrayUnion(achievementId)
        });
        setActiveChannel({
          ...activeChannel,
          pinnedAchievements: [...(activeChannel.pinnedAchievements || []), achievementId]
        });
        toast.success('Достижение закреплено на канале');
      }
    } catch (error) {
      toast.error('Ошибка при обновлении достижений');
    }
  };

  const subscribers = activeChannel?.subscribers || 0;
  const subTarget = 10;
  const subProgress = Math.min(100, (subscribers / subTarget) * 100);

  const longVideos = videos.filter(v => !v.isShort && !v.isMusic && !v.isPhoto && v.type !== 'photo');
  const maxLongViews = Math.max(0, ...longVideos.map(v => v.views || 0));
  const longTarget = 1000;
  const longProgress = Math.min(100, (maxLongViews / longTarget) * 100);

  const shorts = videos.filter(v => v.isShort || v.type === 'short');
  const maxShortViews = Math.max(0, ...shorts.map(v => v.views || 0));
  const shortTarget = 1000;
  const shortProgress = Math.min(100, (maxShortViews / shortTarget) * 100);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-600/20">
          <Trophy className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">Достижения</h1>
          <p className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-widest">Ваш прогресс на пути к успеху</p>
        </div>
      </div>

      {/* Subscribers Achievement */}
      <AchievementCard 
        id="subscribers_10"
        title="Первые 10 подписчиков" 
        description="Наберите 10 подписчиков на своем канале" 
        icon={Users} 
        progress={subProgress}
        current={subscribers}
        target={subTarget}
        isPinned={activeChannel?.pinnedAchievements?.includes('subscribers_10')}
        onTogglePin={() => handleTogglePin('subscribers_10')}
      />

      {/* Long Video Achievement */}
      <AchievementCard 
        id="long_views_1000"
        title="1000 просмотров на длинном видео" 
        description="Наберите 1000 просмотров на одном из ваших длинных видео" 
        icon={Play} 
        progress={longProgress}
        current={maxLongViews}
        target={longTarget}
        isPinned={activeChannel?.pinnedAchievements?.includes('long_views_1000')}
        onTogglePin={() => handleTogglePin('long_views_1000')}
      />

      {/* Shorts Achievement */}
      <AchievementCard 
        id="shorts_views_1000"
        title="1000 просмотров на Shorts" 
        description="Наберите 1000 просмотров на одном из ваших Shorts" 
        icon={Smartphone} 
        progress={shortProgress}
        current={maxShortViews}
        target={shortTarget}
        isPinned={activeChannel?.pinnedAchievements?.includes('shorts_views_1000')}
        onTogglePin={() => handleTogglePin('shorts_views_1000')}
      />
    </div>
  );
}

function AchievementCard({ id, title, description, icon: Icon, progress, current, target, isPinned, onTogglePin }: any) {
  const isCompleted = current >= target;

  return (
    <div className={`bg-[var(--surface)] border rounded-3xl p-8 shadow-sm transition-all ${isPinned ? 'border-blue-600 ring-4 ring-blue-600/5' : 'border-[var(--border)]'}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isCompleted ? 'bg-green-500/10 text-green-600' : 'bg-blue-500/10 text-blue-600'}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>
              {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500" />}
            </div>
            <p className="text-sm text-[var(--text-secondary)]">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={onTogglePin}
            className={`p-3 rounded-xl transition-all ${isPinned ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-[var(--hover)] text-[var(--text-secondary)] hover:text-blue-600'}`}
            title={isPinned ? "Убрать с канала" : "Закрепить на канале"}
          >
            <Pin className={`w-5 h-5 ${isPinned ? 'fill-current' : ''}`} />
          </button>
          <div className="text-right min-w-[80px]">
            <p className="text-3xl font-black text-[var(--text-primary)] font-mono">{Math.max(0, target - current)}</p>
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">осталось</p>
          </div>
        </div>
      </div>

      <div className="w-full h-4 bg-[var(--hover)] rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ease-out ${isCompleted ? 'bg-green-500' : 'bg-blue-600'}`} 
          style={{ width: `${progress}%` }} 
        />
      </div>
      <div className="flex items-center justify-between mt-3">
        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
          {isCompleted ? 'Достигнуто!' : `${Math.round(progress)}% прогресса`}
        </p>
        <p className="text-xs font-bold text-[var(--text-secondary)]">
          {current.toLocaleString()} из {target.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
