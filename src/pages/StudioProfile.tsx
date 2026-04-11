import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, User, Camera, MessageSquare, Globe, Smartphone, Instagram, Save } from 'lucide-react';

export default function StudioProfile() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [pseudonym, setPseudonym] = useState('');
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
          setPseudonym(data.pseudonym || '');
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
        pseudonym,
        photoURL,
        bio,
        socialLinks
      });
      toast.success('Профиль обновлен');
    } catch (error) {
      toast.error('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[var(--studio-muted)]">
        <h2 className="text-2xl font-bold">Войдите, чтобы изменить профиль</h2>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8 pb-24">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600">
          <User className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--studio-text)]">Настройка канала</h1>
          <p className="text-sm text-[var(--studio-muted)]">Персонализируйте свой канал для зрителей</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-[var(--studio-sidebar)] rounded-3xl border border-[var(--studio-border)] p-6 md:p-8 space-y-8 shadow-sm">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="relative group shrink-0">
            <img 
              src={photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
              className="w-32 h-32 rounded-full border-4 border-blue-600 shadow-xl object-cover" 
              alt="Profile" 
            />
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <div className="flex-1 w-full space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--studio-muted)] uppercase tracking-widest flex items-center gap-2">
                <User className="w-3.5 h-3.5" /> Имя канала
              </label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Введите название канала"
                className="w-full bg-[var(--studio-hover)] border border-[var(--studio-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600 transition-all text-[var(--studio-text)] font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--studio-muted)] uppercase tracking-widest flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" /> Псевдоним (@handle)
              </label>
              <input 
                type="text" 
                value={pseudonym}
                onChange={(e) => setPseudonym(e.target.value)}
                placeholder="@mychannel"
                className="w-full bg-[var(--studio-hover)] border border-[var(--studio-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600 transition-all text-[var(--studio-text)] font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--studio-muted)] uppercase tracking-widest flex items-center gap-2">
                <Camera className="w-3.5 h-3.5" /> URL аватара
              </label>
              <input 
                type="text" 
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full bg-[var(--studio-hover)] border border-[var(--studio-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600 transition-all text-[var(--studio-text)] text-sm"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-[var(--studio-muted)] uppercase tracking-widest flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5" /> Описание канала
          </label>
          <textarea 
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Расскажите зрителям о своем канале, о чем ваши видео..."
            className="w-full bg-[var(--studio-hover)] border border-[var(--studio-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-blue-600 transition-all text-[var(--studio-text)] min-h-[150px] resize-none leading-relaxed"
          />
        </div>

        <div className="pt-6 border-t border-[var(--studio-border)] space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--studio-muted)]">Ссылки на социальные сети</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--studio-muted)] uppercase flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Веб-сайт
              </label>
              <input 
                type="text" 
                value={socialLinks.website}
                onChange={(e) => setSocialLinks({...socialLinks, website: e.target.value})}
                placeholder="https://your-site.com"
                className="w-full bg-[var(--studio-hover)] border border-[var(--studio-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600 text-[var(--studio-text)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--studio-muted)] uppercase flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" /> Telegram
              </label>
              <input 
                type="text" 
                value={socialLinks.telegram}
                onChange={(e) => setSocialLinks({...socialLinks, telegram: e.target.value})}
                placeholder="@username"
                className="w-full bg-[var(--studio-hover)] border border-[var(--studio-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600 text-[var(--studio-text)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--studio-muted)] uppercase flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> VK
              </label>
              <input 
                type="text" 
                value={socialLinks.vk}
                onChange={(e) => setSocialLinks({...socialLinks, vk: e.target.value})}
                placeholder="vk.com/username"
                className="w-full bg-[var(--studio-hover)] border border-[var(--studio-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600 text-[var(--studio-text)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--studio-muted)] uppercase flex items-center gap-1.5">
                <Instagram className="w-3.5 h-3.5" /> Instagram
              </label>
              <input 
                type="text" 
                value={socialLinks.instagram}
                onChange={(e) => setSocialLinks({...socialLinks, instagram: e.target.value})}
                placeholder="@username"
                className="w-full bg-[var(--studio-hover)] border border-[var(--studio-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600 text-[var(--studio-text)]"
              />
            </div>
          </div>
        </div>

        <div className="pt-8">
          <button 
            type="submit" 
            disabled={saving}
            className="w-full md:w-auto px-10 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-blue-600/20 uppercase tracking-widest text-xs"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Опубликовать изменения
          </button>
        </div>
      </form>
    </div>
  );
}
