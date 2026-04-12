import React from 'react';
import { Trophy, Users, ArrowRight } from 'lucide-react';
import { useAuth } from '../App';

export default function StudioAchievements() {
  const { activeChannel } = useAuth();
  
  const subscribers = activeChannel?.subscribers || 0;
  const target = 10;
  const remaining = Math.max(0, target - subscribers);
  const progress = Math.min(100, (subscribers / target) * 100);

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

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Первые 10 подписчиков</h2>
              <p className="text-sm text-[var(--text-secondary)]">Наберите 10 подписчиков на своем канале</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-[var(--text-primary)] font-mono">{remaining}</p>
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
          {subscribers} из {target} подписчиков
        </p>
      </div>
    </div>
  );
}
