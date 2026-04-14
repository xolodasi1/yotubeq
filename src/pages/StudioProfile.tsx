import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc, query, collection, where, getDocs, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, User, Camera, MessageSquare, Globe, Smartphone, Instagram, Save, Plus, CheckCircle2, Trash2, Layout, ArrowUp, ArrowDown, Search, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StudioProfile() {
  const { user, channels, activeChannel, setActiveChannel } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [pseudonym, setPseudonym] = useState('');
  const [searchAliases, setSearchAliases] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [bio, setBio] = useState('');
  const [socialLinks, setSocialLinks] = useState({
    website: '',
    telegram: '',
    telegramGroup: '',
    rutube: '',
    youtube: '',
    vk: '',
    instagram: ''
  });
  const [homeLayout, setHomeLayout] = useState<string[]>(['videos', 'shorts', 'music', 'photos']);
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'layout'>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');

  useEffect(() => {
    if (!activeChannel) return;
    const fetchChannel = async () => {
      try {
        const snap = await getDoc(doc(db, 'channels', activeChannel.id));
        if (snap.exists()) {
          const data = snap.data();
          setDisplayName(data.displayName || '');
          setPseudonym(data.pseudonym || '');
          setSearchAliases(data.searchAliases?.join(', ') || '');
          setPhotoURL(data.photoURL || '');
          setBannerUrl(data.bannerUrl || data.bannerURL || '');
          setBio(data.bio || '');
          if (data.homeLayout) {
            setHomeLayout(data.homeLayout);
          } else {
            setHomeLayout(['videos', 'shorts', 'music', 'photos']);
          }
          if (data.socialLinks) {
            setSocialLinks({
              website: data.socialLinks.website || '',
              telegram: data.socialLinks.telegram || '',
              telegramGroup: data.socialLinks.telegramGroup || '',
              rutube: data.socialLinks.rutube || '',
              youtube: data.socialLinks.youtube || '',
              vk: data.socialLinks.vk || '',
              instagram: data.socialLinks.instagram || ''
            });
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetchChannel();
  }, [activeChannel]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeChannel) return;
    setSaving(true);
    try {
      const aliasesArray = searchAliases.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      
      // Update channel document
      await updateDoc(doc(db, 'channels', activeChannel.id), {
        displayName,
        pseudonym,
        searchAliases: aliasesArray,
        photoURL,
        bannerUrl,
        bio,
        socialLinks,
        homeLayout
      });

      // If it's the primary channel, also update the user document for legacy support
      if (activeChannel.isPrimary) {
        await updateDoc(doc(db, 'users', user.uid), {
          displayName,
          pseudonym,
          searchAliases: aliasesArray,
          photoURL,
          bannerUrl,
          bio,
          socialLinks,
          homeLayout
        });
      }

      // Propagate changes to all channel's videos
      const q = query(collection(db, 'videos'), where('authorId', '==', activeChannel.id));
      const snapshot = await getDocs(q);
      
      const updatePromises = snapshot.docs.map(videoDoc => 
        updateDoc(doc(db, 'videos', videoDoc.id), {
          authorName: displayName,
          authorPhotoUrl: photoURL
        })
      );

      // Propagate to comments (comments are still linked to userId for interactions, but authorId for display)
      // Actually, comments should probably use channelId now too.
      const commentsQ = query(collection(db, 'comments'), where('authorId', '==', activeChannel.id));
      const commentsSnapshot = await getDocs(commentsQ);
      const commentUpdatePromises = commentsSnapshot.docs.map(commentDoc =>
        updateDoc(doc(db, 'comments', commentDoc.id), {
          authorName: displayName,
          authorPhotoUrl: photoURL
        })
      );
      
      await Promise.all([...updatePromises, ...commentUpdatePromises]);

      toast.success('Настройки канала обновлены');
      window.location.reload(); // Refresh to update context
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!user) return;
    if (channels.length >= 5) {
      toast.error('Вы не можете создать более 5 каналов');
      return;
    }
    if (!newChannelName.trim()) {
      toast.error('Введите название канала');
      return;
    }

    setCreatingChannel(true);
    try {
      const channelId = crypto.randomUUID();
      const newChannel = {
        id: channelId,
        ownerId: user.uid,
        displayName: newChannelName,
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${channelId}`,
        isPrimary: false,
        subscribers: 0,
        createdAt: serverTimestamp(),
        bio: '',
        socialLinks: {}
      };
      await setDoc(doc(db, 'channels', channelId), newChannel);
      toast.success('Новый канал создан!');
      setNewChannelName('');
      window.location.reload();
    } catch (error) {
      toast.error('Ошибка при создании канала');
    } finally {
      setCreatingChannel(false);
    }
  };

  const handleDeleteChannel = async (channelId: string, isPrimary: boolean) => {
    if (!user) return;
    if (isPrimary) {
      toast.error('Нельзя удалить основной канал');
      return;
    }
    if (!window.confirm('Вы уверены, что хотите удалить этот канал? Все видео и данные этого канала будут утеряны.')) {
      return;
    }

    try {
      setLoading(true);
      // Delete channel document
      await deleteDoc(doc(db, 'channels', channelId));

      // Delete channel's videos
      const videosQ = query(collection(db, 'videos'), where('authorId', '==', channelId));
      const videosSnap = await getDocs(videosQ);
      const deleteVideoPromises = videosSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deleteVideoPromises);

      // Delete channel's playlists
      const playlistsQ = query(collection(db, 'playlists'), where('authorId', '==', channelId));
      const playlistsSnap = await getDocs(playlistsQ);
      const deletePlaylistPromises = playlistsSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePlaylistPromises);

      toast.success('Канал удален');
      window.location.reload();
    } catch (error) {
      console.error("Error deleting channel:", error);
      toast.error('Ошибка при удалении канала');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!window.confirm('ВНИМАНИЕ: Это действие удалит ваш аккаунт и ВСЕ ваши каналы, видео, комментарии и плейлисты безвозвратно. Вы уверены?')) {
      return;
    }

    try {
      setLoading(true);
      
      // Delete all channels
      const channelsQ = query(collection(db, 'channels'), where('ownerId', '==', user.uid));
      const channelsSnap = await getDocs(channelsQ);
      const deleteChannelPromises = channelsSnap.docs.map(async (chDoc) => {
        const channelId = chDoc.id;
        
        // Delete channel's videos
        const videosQ = query(collection(db, 'videos'), where('authorId', '==', channelId));
        const videosSnap = await getDocs(videosQ);
        const deleteVideoPromises = videosSnap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deleteVideoPromises);

        // Delete channel's playlists
        const playlistsQ = query(collection(db, 'playlists'), where('authorId', '==', channelId));
        const playlistsSnap = await getDocs(playlistsQ);
        const deletePlaylistPromises = playlistsSnap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePlaylistPromises);

        return deleteDoc(chDoc.ref);
      });
      await Promise.all(deleteChannelPromises);

      // Delete user document
      await deleteDoc(doc(db, 'users', user.uid));

      toast.success('Аккаунт успешно удален');
      await auth.signOut();
      navigate('/');
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error('Ошибка при удалении аккаунта');
    } finally {
      setLoading(false);
    }
  };

  const moveLayoutItem = (index: number, direction: 'up' | 'down') => {
    const newLayout = [...homeLayout];
    if (direction === 'up' && index > 0) {
      [newLayout[index], newLayout[index - 1]] = [newLayout[index - 1], newLayout[index]];
    } else if (direction === 'down' && index < newLayout.length - 1) {
      [newLayout[index], newLayout[index + 1]] = [newLayout[index + 1], newLayout[index]];
    }
    setHomeLayout(newLayout);
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Файл слишком большой (макс. 2МБ)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        toast.error('Файл слишком большой (макс. 1МБ)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoURL(reader.result as string);
      };
      reader.readAsDataURL(file);
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
    <div className="p-4 md:p-8 max-w-[1000px] mx-auto space-y-10 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-primary)]">Настройка канала</h1>
          <p className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-widest">Персонализация и управление структурой контента</p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-8 border-b border-[var(--border)]">
        <button 
          onClick={() => setActiveSubTab('profile')}
          className={`pb-4 px-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all border-b-2 relative ${
            activeSubTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Профиль
          {activeSubTab === 'profile' && <div className="absolute -bottom-[2px] left-0 right-0 h-0.5 bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]" />}
        </button>
        <button 
          onClick={() => setActiveSubTab('layout')}
          className={`pb-4 px-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all border-b-2 relative ${
            activeSubTab === 'layout' ? 'border-blue-600 text-blue-600' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Главная страница
          {activeSubTab === 'layout' && <div className="absolute -bottom-[2px] left-0 right-0 h-0.5 bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]" />}
        </button>
      </div>

      {activeSubTab === 'profile' ? (
        <form onSubmit={handleSave} className="space-y-10">
          <div className="bg-[var(--surface)] rounded-[2.5rem] border border-[var(--border)] p-8 md:p-12 shadow-sm space-y-12">
            <div className="flex flex-col md:flex-row gap-12 items-start">
              <div className="relative group shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-[2.5rem] opacity-20 group-hover:opacity-40 transition-opacity blur-sm" />
                <img 
                  src={photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                  className="w-40 h-40 rounded-[2rem] border-4 border-[var(--surface)] shadow-2xl object-cover relative z-10" 
                  alt="Profile" 
                  referrerPolicy="no-referrer"
                />
                <div className="flex flex-col gap-2">
                  <label className="absolute inset-0 bg-black/60 rounded-[2rem] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-20 backdrop-blur-sm scale-95 group-hover:scale-100">
                    <Camera className="w-8 h-8 text-white mb-2" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Изменить</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                  {photoURL && (
                    <button 
                      type="button"
                      onClick={() => setPhotoURL('')}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full shadow-lg z-30 hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex-1 w-full grid grid-cols-1 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-blue-600" /> Имя канала
                  </label>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Введите название канала"
                    className="w-full bg-[var(--hover)] border border-[var(--border)] rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-[var(--text-primary)] font-black uppercase tracking-tight"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-blue-600" /> Псевдоним (@handle)
                  </label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-black">@</span>
                    <input 
                      type="text" 
                      value={pseudonym.replace('@', '')}
                      onChange={(e) => setPseudonym('@' + e.target.value)}
                      placeholder="mychannel"
                      className="w-full bg-[var(--hover)] border border-[var(--border)] rounded-2xl pl-10 pr-6 py-4 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-[var(--text-primary)] font-black uppercase tracking-tight"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-blue-600" /> Теги для поиска (через запятую)
                </label>
                <input 
                  type="text" 
                  value={searchAliases}
                  onChange={(e) => setSearchAliases(e.target.value)}
                  placeholder="напр. my channel, мой канал, май ченел"
                  className="w-full bg-[var(--hover)] border border-[var(--border)] rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500 transition-all text-[var(--text-primary)] font-medium"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] flex items-center gap-2">
                  <Layout className="w-3.5 h-3.5 text-blue-600" /> Шапка канала
                </label>
                <div className="relative group">
                  <div className="h-32 md:h-48 bg-[var(--hover)] rounded-2xl border-2 border-dashed border-[var(--border)] overflow-hidden relative">
                    {bannerUrl ? (
                      <img src={bannerUrl} className="w-full h-full object-cover" alt="Banner Preview" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)] opacity-40">
                        <Camera className="w-10 h-10 mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Загрузить шапку</span>
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-sm">
                      <Camera className="w-8 h-8 text-white mb-2" />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Изменить шапку</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                    </label>
                    {bannerUrl && (
                      <button 
                        type="button"
                        onClick={() => setBannerUrl('')}
                        className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-xl shadow-lg z-30 hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[9px] text-[var(--text-secondary)] mt-2 uppercase font-bold tracking-wider">Рекомендуемый размер: 2560 x 1440 (макс. 2МБ)</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5 text-blue-600" /> URL аватара (или загрузите выше)
                </label>
                <input 
                  type="text" 
                  value={photoURL}
                  onChange={(e) => setPhotoURL(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full bg-[var(--hover)] border border-[var(--border)] rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500 transition-all text-[var(--text-primary)] text-sm font-mono"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] flex items-center gap-2">
                  <Layout className="w-3.5 h-3.5 text-blue-600" /> URL шапки канала (или загрузите выше)
                </label>
                <input 
                  type="text" 
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                  className="w-full bg-[var(--hover)] border border-[var(--border)] rounded-2xl px-6 py-4 focus:outline-none focus:border-blue-500 transition-all text-[var(--text-primary)] text-sm font-mono"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" /> Описание канала
                </label>
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Расскажите зрителям о своем канале, о чем ваши видео..."
                  className="w-full bg-[var(--hover)] border border-[var(--border)] rounded-2xl px-6 py-5 focus:outline-none focus:border-blue-500 transition-all text-[var(--text-primary)] min-h-[180px] resize-none leading-relaxed font-medium"
                />
              </div>
            </div>

            <div className="pt-12 border-t border-[var(--border)] space-y-8">
              <div className="flex items-center gap-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-secondary)]">Социальные сети</h3>
                <div className="h-px bg-[var(--border)] flex-1" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {[
                  { id: 'telegramGroup', label: 'Telegram Group', icon: Smartphone, placeholder: 't.me/...' },
                  { id: 'rutube', label: 'Rutube', icon: Globe, placeholder: 'rutube.ru/...' },
                  { id: 'youtube', label: 'YouTube', icon: Globe, placeholder: 'youtube.com/...' },
                  { id: 'website', label: 'Веб-сайт', icon: Globe, placeholder: 'https://...' },
                  { id: 'telegram', label: 'Telegram', icon: Smartphone, placeholder: '@username' },
                  { id: 'vk', label: 'VK', icon: Globe, placeholder: 'vk.com/...' },
                  { id: 'instagram', label: 'Instagram', icon: Instagram, placeholder: '@username' }
                ].map((social) => (
                  <div key={social.id} className="space-y-3">
                    <label className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                      <social.icon className="w-3.5 h-3.5 text-blue-600" /> {social.label}
                    </label>
                    <input 
                      type="text" 
                      value={(socialLinks as any)[social.id]}
                      onChange={(e) => setSocialLinks({...socialLinks, [social.id]: e.target.value})}
                      placeholder={social.placeholder}
                      className="w-full bg-[var(--hover)] border border-[var(--border)] rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-blue-500 text-[var(--text-primary)] font-medium"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6">
            <button 
              type="submit" 
              disabled={saving}
              className="flex-1 bg-blue-600 text-white font-black py-5 rounded-[2rem] hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-blue-600/20 uppercase tracking-[0.2em] text-[11px] active:scale-95"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Сохранить изменения
            </button>
            <button 
              type="button"
              onClick={() => navigate(`/channel/${activeChannel?.id}`)}
              className="flex-1 bg-[var(--surface)] text-[var(--text-primary)] font-black py-5 rounded-[2rem] border border-[var(--border)] hover:bg-[var(--hover)] transition-all uppercase tracking-[0.2em] text-[11px] active:scale-95"
            >
              Просмотр канала
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-[var(--surface)] rounded-[2.5rem] border border-[var(--border)] p-8 md:p-12 shadow-sm space-y-10">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600">
              <Layout className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight">Структура главной страницы</h2>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Настройте порядок отображения контента во вкладке "Общая"</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {homeLayout.map((item, index) => (
              <div 
                key={item}
                className="flex items-center justify-between p-6 bg-[var(--hover)]/50 border border-[var(--border)] rounded-3xl group hover:border-blue-500/30 transition-all"
              >
                <div className="flex items-center gap-6">
                  <div className="w-10 h-10 bg-[var(--surface)] border border-[var(--border)] rounded-xl flex items-center justify-center text-blue-600 font-black text-xs shadow-sm">
                    {index + 1}
                  </div>
                  <span className="font-black text-sm text-[var(--text-primary)] uppercase tracking-widest">
                    {item === 'videos' ? 'Видео' : 
                     item === 'shorts' ? 'Shorts' : 
                     item === 'music' ? 'Музыка' : 'Фото'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => moveLayoutItem(index, 'up')}
                    disabled={index === 0}
                    className="p-3 hover:bg-blue-500/10 rounded-xl text-blue-600 disabled:opacity-20 transition-all border border-transparent hover:border-blue-500/20"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => moveLayoutItem(index, 'down')}
                    disabled={index === homeLayout.length - 1}
                    className="p-3 hover:bg-blue-500/10 rounded-xl text-blue-600 disabled:opacity-20 transition-all border border-transparent hover:border-blue-500/20"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-[var(--border)]">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-blue-600 text-white font-black py-5 rounded-[2rem] hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-blue-600/20 uppercase tracking-[0.2em] text-[11px] active:scale-95"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Сохранить структуру
            </button>
          </div>
        </div>
      )}

      {/* Manage Channels Section */}
      <div className="bg-[var(--surface)] rounded-[2.5rem] border border-[var(--border)] p-8 md:p-12 shadow-sm space-y-10">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight">Управление каналами</h2>
            <p className="text-sm font-medium text-[var(--text-secondary)]">До 5 независимых каналов на одну учетную запись</p>
          </div>
          <div className="hidden sm:block text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg uppercase tracking-widest">
            {channels.length} / 5
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {channels.map(channel => (
            <div 
              key={channel.id}
              className={`p-6 rounded-[2rem] border-2 flex items-center justify-between transition-all relative overflow-hidden group ${
                activeChannel?.id === channel.id 
                  ? 'border-blue-600 bg-blue-50/30' 
                  : 'border-[var(--border)] bg-[var(--hover)]/30'
              }`}
            >
              <div className="flex items-center gap-4 relative z-10">
                <img src={channel.photoURL} className="w-14 h-14 rounded-2xl object-cover border-2 border-[var(--surface)] shadow-sm" alt="" referrerPolicy="no-referrer" />
                <div>
                  <p className="font-black text-sm text-[var(--text-primary)] uppercase tracking-tight line-clamp-1">{channel.displayName}</p>
                  {channel.isPrimary ? (
                    <span className="text-[9px] text-blue-600 font-black uppercase tracking-widest bg-blue-100 px-2 py-0.5 rounded-md">Основной</span>
                  ) : (
                    <span className="text-[9px] text-[var(--text-secondary)] font-black uppercase tracking-widest">Дополнительный</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 relative z-10">
                {activeChannel?.id === channel.id ? (
                  <CheckCircle2 className="w-6 h-6 text-blue-600" />
                ) : (
                  <button 
                    onClick={() => setActiveChannel(channel)}
                    className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline px-3 py-2"
                  >
                    Выбрать
                  </button>
                )}
                {!channel.isPrimary && (
                  <button 
                    onClick={() => handleDeleteChannel(channel.id, channel.isPrimary)}
                    className="p-3 hover:bg-red-500/10 rounded-xl text-red-500 transition-all border border-transparent hover:border-red-500/20"
                    title="Удалить канал"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {channels.length < 5 && (
            <div className="p-6 rounded-[2rem] border-2 border-dashed border-[var(--border)] flex flex-col gap-4 bg-[var(--hover)]/10 hover:bg-[var(--hover)]/20 transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600/10 rounded-lg flex items-center justify-center text-blue-600">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest">Новый канал</span>
              </div>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="Название..."
                  className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-blue-600"
                />
                <button 
                  onClick={handleCreateChannel}
                  disabled={creatingChannel || !newChannelName.trim()}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-600/10"
                >
                  {creatingChannel ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Создать'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/5 rounded-[2.5rem] border border-red-500/20 p-8 md:p-12 space-y-8">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-red-600 uppercase tracking-tight">Опасная зона</h2>
            <p className="text-sm font-medium text-red-600/60 uppercase tracking-widest">Критические действия с аккаунтом</p>
          </div>
        </div>
        
        <div className="p-8 bg-[var(--surface)] rounded-[2rem] border border-red-500/20 flex flex-col sm:flex-row items-center justify-between gap-8 shadow-sm">
          <div className="space-y-2">
            <p className="font-black text-sm text-red-600 uppercase tracking-tight">Удалить аккаунт и все данные</p>
            <p className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-widest leading-relaxed">
              Это действие безвозвратно удалит все ваши каналы, видео, комментарии и настройки.
            </p>
          </div>
          <button 
            onClick={handleDeleteAccount}
            className="w-full sm:w-auto px-10 py-4 bg-red-600 text-white text-[11px] font-black rounded-2xl hover:bg-red-700 transition-all uppercase tracking-[0.2em] shadow-xl shadow-red-600/20 active:scale-95"
          >
            Удалить всё
          </button>
        </div>
      </div>
    </div>
  );
}
