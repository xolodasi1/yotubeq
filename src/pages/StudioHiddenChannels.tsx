import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { databaseService } from '../lib/databaseService';
import { Ban, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface HiddenChannel {
  id: string;
  channelId: string;
  displayName: string;
  photoURL: string;
  addedAt: string;
}

export default function StudioHiddenChannels() {
  const { user } = useAuth();
  const [hiddenChannels, setHiddenChannels] = useState<HiddenChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchHiddenChannels = async () => {
      try {
        const data = await databaseService.getHiddenChannels(user.uid);
        setHiddenChannels(data as any[]);
      } catch (error) {
        console.error("Error fetching hidden channels:", error);
        toast.error('Не удалось загрузить список скрытых каналов');
      } finally {
        setLoading(false);
      }
    };

    fetchHiddenChannels();
  }, [user]);

  const handleRestore = async (id: string, displayName: string) => {
    try {
      await databaseService.unhideChannel(user.uid, id);
      setHiddenChannels(hiddenChannels.filter(c => c.id !== id));
      toast.success(`Канал "${displayName}" снова будет рекомендоваться`);
    } catch (error) {
      console.error("Error restoring channel:", error);
      toast.error('Не удалось восстановить канал');
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[var(--studio-muted)]">
        <h2 className="text-2xl font-bold">Войдите, чтобы управлять скрытыми каналами</h2>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1000px] mx-auto space-y-10 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-primary)]">Скрытые каналы</h1>
          <p className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-widest">Управление списком исключений из рекомендаций</p>
        </div>
      </div>

      {hiddenChannels.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-[2.5rem] border border-[var(--border)] p-20 text-center shadow-sm">
          <div className="w-24 h-24 bg-[var(--hover)] rounded-[2rem] flex items-center justify-center mb-8 mx-auto shadow-sm">
            <Ban className="w-10 h-10 text-[var(--text-secondary)] opacity-10" />
          </div>
          <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-[0.2em] mb-3">Список пуст</h3>
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-widest">Вы еще не скрывали каналы из рекомендаций</p>
        </div>
      ) : (
        <div className="bg-[var(--surface)] rounded-[2.5rem] border border-[var(--border)] overflow-hidden shadow-sm">
          <div className="divide-y divide-[var(--border)]">
            {hiddenChannels.map((channel) => (
              <div key={channel.id} className="p-6 md:p-8 flex items-center justify-between gap-6 hover:bg-[var(--hover)]/50 transition-all group">
                <div className="flex items-center gap-6 min-w-0">
                  <div className="relative">
                    <img 
                      src={channel.photoURL} 
                      alt={channel.displayName} 
                      className="w-14 h-14 rounded-2xl border-2 border-[var(--border)] object-cover shadow-sm group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-600 rounded-lg border-2 border-[var(--surface)] flex items-center justify-center">
                      <Ban className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-sm text-[var(--text-primary)] uppercase tracking-tight truncate">{channel.displayName}</h3>
                    <p className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest mt-1">Скрыт из рекомендаций</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRestore(channel.id, channel.displayName)}
                  className="flex items-center gap-3 px-6 py-3 bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-600/20 hover:border-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shrink-0 active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Восстановить</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
