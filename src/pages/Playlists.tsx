import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Playlist, VideoType } from '../types';
import { Loader2, PlaySquare, Trash2, ExternalLink, Music, Smartphone, Camera, Video } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function Playlists() {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'video' | 'music' | 'short' | 'photo'>('video');

  useEffect(() => {
    if (!user) return;

    const fetchPlaylists = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'playlists'), where('authorId', '==', user.uid), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setPlaylists(snap.docs.map(d => d.data() as Playlist));
      } catch (error) {
        console.error("Error fetching playlists:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylists();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот плейлист?')) return;
    try {
      await deleteDoc(doc(db, 'playlists', id));
      setPlaylists(playlists.filter(p => p.id !== id));
      toast.success('Плейлист удален');
    } catch (error) {
      toast.error('Ошибка при удалении');
    }
  };

  const filteredPlaylists = playlists.filter(p => {
    if (activeTab === 'video') return !p.type || p.type === 'video';
    return p.type === activeTab;
  });

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-ice-muted">
        <h2 className="text-2xl font-bold mb-4">Войдите, чтобы видеть свои плейлисты</h2>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-ice-accent" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <PlaySquare className="w-6 h-6 text-ice-accent" />
        <h1 className="text-2xl md:text-3xl font-bold">Ваши плейлисты</h1>
      </div>

      <div className="flex gap-4 border-b border-[var(--border)] mb-8 overflow-x-auto scrollbar-hide">
        {[
          { id: 'video', label: 'Видео', icon: Video },
          { id: 'music', label: 'Музыка', icon: Music },
          { id: 'short', label: 'Shorts', icon: Smartphone },
          { id: 'photo', label: 'Фото', icon: Camera },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 pb-4 border-b-2 font-bold text-sm uppercase tracking-widest transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {filteredPlaylists.length === 0 ? (
        <div className="text-center py-20 text-ice-muted">
          <p className="text-lg">У вас пока нет плейлистов в этой категории.</p>
          <Link to="/" className="text-ice-accent hover:underline mt-2 inline-block">Найти контент для добавления</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPlaylists.map((playlist) => (
            <div key={playlist.id} className="glass rounded-2xl border border-ice-border overflow-hidden group">
              <div className="aspect-video bg-white/5 flex items-center justify-center relative">
                <PlaySquare className="w-12 h-12 text-ice-muted group-hover:text-ice-accent transition-colors" />
                <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-bold">
                  {playlist.videoIds.length} видео
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg mb-4 line-clamp-1">{playlist.title}</h3>
                <div className="flex justify-between items-center">
                  <Link 
                    to={`/playlist/${playlist.id}`} 
                    className="flex items-center gap-2 text-sm font-bold text-ice-accent hover:underline"
                  >
                    Смотреть все <ExternalLink className="w-3 h-3" />
                  </Link>
                  <button 
                    onClick={() => handleDelete(playlist.id)}
                    className="p-2 text-ice-muted hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
