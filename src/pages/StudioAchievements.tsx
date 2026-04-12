import React, { useState, useEffect } from 'react';
import { Trophy, Users, ArrowRight, Play, Smartphone } from 'lucide-react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { VideoType } from '../types';

export default function StudioAchievements() {
  const { activeChannel } = useAuth();
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
        title="Первые 10 подписчиков" 
        description="Наберите 10 подписчиков на своем канале" 
        icon={Users} 
        progress={subProgress}
        current={subscribers}
        target={subTarget}
      />

      {/* Long Video Achievement */}
      <AchievementCard 
        title="1000 просмотров на длинном видео" 
        description="Наберите 1000 просмотров на одном из ваших длинных видео" 
        icon={Play} 
        progress={longProgress}
        current={maxLongViews}
        target={longTarget}
      />

      {/* Shorts Achievement */}
      <AchievementCard 
        title="1000 просмотров на Shorts" 
        description="Наберите 1000 просмотров на одном из ваших Shorts" 
        icon={Smartphone} 
        progress={shortProgress}
        current={maxShortViews}
        target={shortTarget}
      />
    </div>
  );
}

function AchievementCard({ title, description, icon: Icon, progress, current, target }: any) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>
            <p className="text-sm text-[var(--text-secondary)]">{description}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-[var(--text-primary)] font-mono">{Math.max(0, target - current)}</p>
          <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">осталось</p>
        </div>
      </div>

      <div className="w-full h-4 bg-[var(--hover)] rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-600 transition-all duration-500 ease-out" 
          style={{ width: `${progress}%` }} 
        />
      </div>
      <p className="text-xs font-bold text-[var(--text-secondary)] mt-3 text-right">
        {current} из {target}
      </p>
    </div>
  );
}
