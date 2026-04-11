import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Loader2, Settings as SettingsIcon, User, Camera, Save, Moon, Sun, Globe, Smartphone, MessageSquare, Instagram } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export default function Settings() {
  const { user, theme, toggleTheme } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [bio, setBio] = useState('');
  const [socialLinks, setSocialLinks] = useState({
    website: '',
    telegram: '',
    vk: '',
    instagram: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchUser = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setDisplayName(data.displayName || '');
          setPhotoURL(data.photoURL || '');
          setBio(data.bio || '');
          if (data.socialLinks) {
            setSocialLinks({
              website: data.socialLinks.website || '',
              telegram: data.socialLinks.telegram || '',
              vk: data.socialLinks.vk || '',
              instagram: data.socialLinks.instagram || ''
            });
          }
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
        photoURL,
        bio,
        socialLinks
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
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-[var(--studio-muted)]">
        <h2 className="text-2xl font-bold">Войдите, чтобы изменить настройки</h2>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--studio-text)]">Настройки профиля</h1>
      </div>

      <form onSubmit={handleSave} className="bg-[var(--studio-sidebar)] rounded-3xl border border-[var(--studio-border)] p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            <img 
              src={photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
              className="w-24 h-24 rounded-full border-4 border-blue-600 shadow-lg object-cover" 
              alt="Profile" 
            />
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-xs text-[var(--studio-muted)] mt-2">Ваш аватар (используйте URL)</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--studio-muted)] flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold">
            <User className="w-4 h-4" /> Имя пользователя
          </label>
          <input 
            type="text" 
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Введите ваше имя"
            className="w-full bg-[var(--studio-hover)] border border-[var(--studio-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600 transition-all text-[var(--studio-text)]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--studio-muted)] flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold">
            <Camera className="w-4 h-4" /> URL аватара
          </label>
          <input 
            type="text" 
            value={photoURL}
            onChange={(e) => setPhotoURL(e.target.value)}
            placeholder="https://example.com/photo.jpg"
            className="w-full bg-[var(--studio-hover)] border border-[var(--studio-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600 transition-all text-[var(--studio-text)]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--studio-muted)] flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold">
            <MessageSquare className="w-4 h-4" /> О себе
          </label>
          <textarea 
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Расскажите о своем канале..."
            className="w-full bg-[var(--studio-hover)] border border-[var(--studio-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600 transition-all text-[var(--studio-text)] min-h-[100px] resize-none"
          />
        </div>

        <div className="pt-6 border-t border-[var(--studio-border)] space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--studio-muted)]">Социальные сети</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--studio-muted)] uppercase flex items-center gap-1.5">
                <Globe className="w-3 h-3" /> Веб-сайт
              </label>
              <input 
                type="text" 
                value={socialLinks.website}
                onChange={(e) => setSocialLinks({...socialLinks, website: e.target.value})}
                placeholder="https://..."
                className="w-full bg-[var(--studio-hover)] border border-[var(--studio-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-600 text-[var(--studio-text)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--studio-muted)] uppercase flex items-center gap-1.5">
                <Smartphone className="w-3 h-3" /> Telegram
              </label>
              <input 
                type="text" 
                value={socialLinks.telegram}
                onChange={(e) => setSocialLinks({...socialLinks, telegram: e.target.value})}
                placeholder="@username"
                className="w-full bg-[var(--studio-hover)] border border-[var(--studio-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-600 text-[var(--studio-text)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--studio-muted)] uppercase flex items-center gap-1.5">
                <Globe className="w-3 h-3" /> VK
              </label>
              <input 
                type="text" 
                value={socialLinks.vk}
                onChange={(e) => setSocialLinks({...socialLinks, vk: e.target.value})}
                placeholder="vk.com/..."
                className="w-full bg-[var(--studio-hover)] border border-[var(--studio-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-600 text-[var(--studio-text)]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[var(--studio-muted)] uppercase flex items-center gap-1.5">
                <Instagram className="w-3 h-3" /> Instagram
              </label>
              <input 
                type="text" 
                value={socialLinks.instagram}
                onChange={(e) => setSocialLinks({...socialLinks, instagram: e.target.value})}
                placeholder="@username"
                className="w-full bg-[var(--studio-hover)] border border-[var(--studio-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-600 text-[var(--studio-text)]"
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-[var(--studio-border)]">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--studio-muted)] mb-4">Внешний вид</h3>
          <div className="flex items-center justify-between p-4 bg-[var(--studio-hover)] rounded-2xl border border-[var(--studio-border)]">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="w-5 h-5 text-blue-400" /> : <Sun className="w-5 h-5 text-yellow-500" />}
              <div>
                <p className="font-bold text-[var(--studio-text)] text-sm">Темная тема</p>
                <p className="text-[10px] text-[var(--studio-muted)] font-bold uppercase tracking-widest">Переключить режим</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={toggleTheme}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${theme === 'dark' ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={saving}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-100/20"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Сохранить изменения
        </button>
      </form>
    </div>
  );
}
