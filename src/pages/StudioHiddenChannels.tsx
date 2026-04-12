import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
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
        const q = query(
          collection(db, 'hidden_channels'),
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        
        const channelsData: HiddenChannel[] = [];
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          
          // Fetch channel details
          let displayName = 'Неизвестный канал';
          let photoURL = `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.channelId}`;
          
          try {
            const channelDoc = await getDoc(doc(db, 'users', data.channelId));
            if (channelDoc.exists()) {
              const channelData = channelDoc.data();
              displayName = channelData.displayName || displayName;
              photoURL = channelData.photoURL || photoURL;
            }
          } catch (err) {
            console.error("Error fetching channel details:", err);
          }

          channelsData.push({
            id: docSnap.id,
            channelId: data.channelId,
            displayName,
            photoURL,
            addedAt: data.addedAt?.toDate?.()?.toISOString() || new Date().toISOString()
          });
        }
        
        setHiddenChannels(channelsData);
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
      await deleteDoc(doc(db, 'hidden_channels', id));
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
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 pb-24">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-red-600/10 rounded-2xl flex items-center justify-center text-red-600">
          <Ban className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--studio-text)]">Скрытые каналы</h1>
          <p className="text-sm text-[var(--studio-muted)]">Каналы, которые вы попросили не рекомендовать</p>
        </div>
      </div>

      {hiddenChannels.length === 0 ? (
        <div className="bg-[var(--studio-sidebar)] rounded-3xl border border-[var(--studio-border)] p-12 text-center shadow-sm">
          <Ban className="w-16 h-16 mx-auto mb-4 text-[var(--studio-muted)] opacity-20" />
          <h3 className="text-xl font-bold text-[var(--studio-text)] mb-2">Список пуст</h3>
          <p className="text-[var(--studio-muted)]">Вы еще не скрывали каналы из рекомендаций.</p>
        </div>
      ) : (
        <div className="bg-[var(--studio-sidebar)] rounded-3xl border border-[var(--studio-border)] overflow-hidden shadow-sm">
          <div className="divide-y divide-[var(--studio-border)]">
            {hiddenChannels.map((channel) => (
              <div key={channel.id} className="p-4 md:p-6 flex items-center justify-between gap-4 hover:bg-[var(--studio-hover)] transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <img 
                    src={channel.photoURL} 
                    alt={channel.displayName} 
                    className="w-12 h-12 rounded-full border border-[var(--studio-border)] object-cover"
                  />
                  <div className="min-w-0">
                    <h3 className="font-bold text-[var(--studio-text)] truncate">{channel.displayName}</h3>
                    <p className="text-xs text-[var(--studio-muted)] truncate">Скрыт из рекомендаций</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRestore(channel.id, channel.displayName)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl font-bold text-sm transition-all shrink-0"
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
