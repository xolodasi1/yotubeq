import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Loader2, Settings as SettingsIcon, User, Camera, Save, Moon, Sun, Globe, Smartphone, MessageSquare, Instagram, Trash2, AlertTriangle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { databaseService } from '../lib/databaseService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const [isSubscriptionPublic, setIsSubscriptionPublic] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchUser = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.uid)
          .single();
        
        if (!error && data) {
          setDisplayName(data.display_name || '');
          setPhotoURL(data.photo_url || '');
          setBio(data.bio || '');
          if (data.is_subscription_public !== undefined) {
            setIsSubscriptionPublic(data.is_subscription_public);
          }
          // Assuming social_links is a JSON field or separate columns
          // The current code assumes it's an object in the document
          if (data.social_links) {
            setSocialLinks({
              website: data.social_links.website || '',
              telegram: data.social_links.telegram || '',
              vk: data.social_links.vk || '',
              instagram: data.social_links.instagram || ''
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
      const { error } = await supabase
        .from('users')
        .update({
          display_name: displayName,
          photo_url: photoURL,
          bio,
          social_links: socialLinks
        })
        .eq('id', user.uid);
      
      if (error) throw error;
      toast.success('Настройки сохранены');
    } catch (error) {
      toast.error('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChannel = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      // 1. Delete all user's videos/photos/music
      await supabase.from('videos').delete().eq('author_id', user.uid);

      // 2. Delete all user's community posts
      await supabase.from('community_posts').delete().eq('author_id', user.uid);

      // 3. Delete user document
      await supabase.from('users').delete().eq('id', user.uid);

      // 4. Sign out
      await supabase.auth.signOut();

      toast.success('Канал полностью удален');
      navigate('/');
      window.location.reload();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error('Ошибка при удалении канала');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
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
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--studio-text)]">Настройки</h1>
      </div>

      <div className="bg-[var(--studio-sidebar)] rounded-3xl border border-[var(--studio-border)] p-6 md:p-8 shadow-sm">
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

        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--studio-muted)] mb-4 mt-8">Приватность</h3>
        <div className="flex items-center justify-between p-4 bg-[var(--studio-hover)] rounded-2xl border border-[var(--studio-border)]">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-purple-400" />
            <div>
              <p className="font-bold text-[var(--studio-text)] text-sm">Показывать информацию о подписках</p>
              <p className="text-[10px] text-[var(--studio-muted)] font-bold uppercase tracking-widest mt-1">Отображать вас в списке новых подписчиков</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={async () => {
              try {
                if (!user) return;
                const newVal = !isSubscriptionPublic;
                setIsSubscriptionPublic(newVal);
                
                const { error } = await supabase
                  .from('users')
                  .update({ is_subscription_public: newVal })
                  .eq('id', user.uid);
                
                if (error) throw error;
                toast.success('Настройки приватности обновлены');
              } catch(e) {
                setIsSubscriptionPublic(isSubscriptionPublic);
                toast.error('Не удалось обновить настройки');
              }
            }}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isSubscriptionPublic ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${isSubscriptionPublic ? 'translate-x-6' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
