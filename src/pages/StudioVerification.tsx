import React, { useState, useEffect } from 'react';
import { Snowflake, Users, Play, Heart, CheckCircle2, ShieldCheck, Info } from 'lucide-react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { VideoType } from '../types';
import { toast } from 'sonner';

export default function StudioVerification() {
  const { activeChannel } = useAuth();
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!activeChannel) return;
    const fetchVideos = async () => {
      try {
        const q = query(collection(db, 'videos'), where('authorId', '==', activeChannel.id));
        const snapshot = await getDocs(q);
        setVideos(snapshot.docs.map(doc => doc.data() as VideoType));
      } catch (error) {
        console.error("Error fetching videos for verification:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, [activeChannel]);

  const subscribers = activeChannel?.subscribers || 0;
  const subTarget = 1000000;
  const subProgress = Math.min(100, (subscribers / subTarget) * 100);

  const totalViews = videos.reduce((acc, v) => acc + (v.views || 0), 0);
  const viewsTarget = 10000000;
  const viewsProgress = Math.min(100, (totalViews / viewsTarget) * 100);

  const totalLikes = videos.reduce((acc, v) => acc + (v.likes || 0), 0);
  const likesTarget = 1000000;
  const likesProgress = Math.min(100, (totalLikes / likesTarget) * 100);

  const isEligible = subscribers >= subTarget && totalViews >= viewsTarget && totalLikes >= likesTarget;

  const handleApply = async () => {
    if (!isEligible || !activeChannel) return;
    
    try {
      const channelRef = doc(db, 'channels', activeChannel.id);
      await updateDoc(channelRef, { isVerified: true });
      toast.success('Поздравляем! Ваш канал верифицирован. Статус «Ледяной куб» получен!');
      window.location.reload();
    } catch (error) {
      console.error("Error applying for verification:", error);
      toast.error('Ошибка при подаче заявки');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 bg-blue-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-blue-600/30 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Snowflake className="w-10 h-10 text-white relative z-10 animate-pulse" />
        </div>
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-[var(--text-primary)]">Верификация</h1>
          <p className="text-sm font-bold text-blue-600 uppercase tracking-[0.2em] mt-1">Получите статус «Ледяной куб»</p>
        </div>
      </div>

      <div className="bg-blue-600/5 border border-blue-600/10 rounded-[2rem] p-8 flex items-start gap-6">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-black text-[var(--text-primary)] uppercase tracking-tight">Зачем нужна верификация?</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Статус верифицированного канала подтверждает подлинность автора и открывает доступ к эксклюзивным функциям IceTube. 
            Ваш канал получит значок в виде кубика льда <Snowflake className="w-3 h-3 inline text-blue-600" />, который будет отображаться рядом с вашим именем везде.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Subscribers Requirement */}
        <RequirementCard 
          title="Подписчики" 
          description="Наберите 1 000 000 подписчиков" 
          icon={Users} 
          current={subscribers} 
          target={subTarget} 
          progress={subProgress}
          unit="подписчиков"
        />

        {/* Views Requirement */}
        <RequirementCard 
          title="Просмотры" 
          description="10 000 000 просмотров суммарно (Видео, Shorts, Музыка, Фото)" 
          icon={Play} 
          current={totalViews} 
          target={viewsTarget} 
          progress={viewsProgress}
          unit="просмотров"
        />

        {/* Likes Requirement */}
        <RequirementCard 
          title="Лайки" 
          description="1 000 000 лайков суммарно по всему контенту" 
          icon={Heart} 
          current={totalLikes} 
          target={likesTarget} 
          progress={likesProgress}
          unit="лайков"
        />
      </div>

      <div className="pt-8 flex flex-col items-center gap-4">
        <button 
          disabled={!isEligible || activeChannel?.isVerified}
          onClick={handleApply}
          className={`px-12 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] transition-all shadow-2xl ${
            activeChannel?.isVerified
              ? 'bg-green-500 text-white cursor-default shadow-green-500/30'
              : isEligible 
                ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 shadow-blue-600/30' 
                : 'bg-[var(--hover)] text-[var(--text-secondary)] cursor-not-allowed grayscale'
          }`}
        >
          {activeChannel?.isVerified ? 'Верифицировано' : 'Подать заявку'}
        </button>
        {!isEligible && (
          <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">
            <Info className="w-3 h-3" />
            <span>Выполните все условия, чтобы подать заявку</span>
          </div>
        )}
      </div>
    </div>
  );
}

function RequirementCard({ title, description, icon: Icon, current, target, progress, unit }: any) {
  const isCompleted = current >= target;

  return (
    <div className={`bg-[var(--surface)] border rounded-[2rem] p-8 transition-all hover:border-blue-600/30 group ${isCompleted ? 'border-green-500/30' : 'border-[var(--border)]'}`}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-5">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${isCompleted ? 'bg-green-500/10 text-green-600' : 'bg-blue-600/10 text-blue-600'}`}>
            <Icon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight">{title}</h3>
              {isCompleted && <CheckCircle2 className="w-5 h-5 text-green-500" />}
            </div>
            <p className="text-sm font-medium text-[var(--text-secondary)] mt-1">{description}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-[var(--text-primary)] font-mono">
            {isCompleted ? '0' : Math.max(0, target - current).toLocaleString()}
          </p>
          <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mt-1">осталось {unit}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="w-full h-3 bg-[var(--hover)] rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ease-out ${isCompleted ? 'bg-green-500' : 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]'}`} 
            style={{ width: `${progress}%` }} 
          />
        </div>
        <div className="flex justify-between items-center">
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isCompleted ? 'text-green-600' : 'text-blue-600'}`}>
            {isCompleted ? 'Условие выполнено' : `${Math.round(progress)}% завершено`}
          </p>
          <p className="text-xs font-bold text-[var(--text-secondary)]">
            {current.toLocaleString()} / {target.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
