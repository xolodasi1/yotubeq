import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Loader2, Settings as SettingsIcon, User, Camera, Save } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export default function Settings() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchUser = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          setDisplayName(snap.data().displayName || '');
          setPhotoURL(snap.data().photoURL || '');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        photoURL
      });
      toast.success('Настройки сохранены');
    } catch (error) {
      toast.error('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-ice-muted">
        <h2 className="text-2xl font-bold">Войдите, чтобы изменить настройки</h2>
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
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="w-6 h-6 text-ice-accent" />
        <h1 className="text-2xl md:text-3xl font-bold">Настройки профиля</h1>
      </div>

      <form onSubmit={handleSave} className="glass rounded-3xl border border-ice-border p-6 md:p-8 space-y-6">
        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            <img 
              src={photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
              className="w-24 h-24 rounded-full border-4 border-ice-accent shadow-lg" 
              alt="Profile" 
            />
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-xs text-ice-muted mt-2">Ваш аватар (используйте URL)</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-ice-muted flex items-center gap-2">
            <User className="w-4 h-4" /> Имя пользователя
          </label>
          <input 
            type="text" 
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Введите ваше имя"
            className="w-full bg-white/5 border border-ice-border rounded-xl px-4 py-3 focus:outline-none focus:border-ice-accent transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-ice-muted flex items-center gap-2">
            <Camera className="w-4 h-4" /> URL аватара
          </label>
          <input 
            type="text" 
            value={photoURL}
            onChange={(e) => setPhotoURL(e.target.value)}
            placeholder="https://example.com/photo.jpg"
            className="w-full bg-white/5 border border-ice-border rounded-xl px-4 py-3 focus:outline-none focus:border-ice-accent transition-all"
          />
        </div>

        <button 
          type="submit" 
          disabled={saving}
          className="w-full bg-ice-accent text-ice-bg font-bold py-3 rounded-xl hover:bg-ice-accent/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Сохранить изменения
        </button>
      </form>
    </div>
  );
}
