import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc, query, collection, where, getDocs, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Loader2, User, Camera, MessageSquare, Globe, Smartphone, Instagram, Save, Plus, CheckCircle2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StudioProfile() {
  const { user, channels, activeChannel, setActiveChannel } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [pseudonym, setPseudonym] = useState('');
  const [searchAliases, setSearchAliases] = useState('');
  const [photoURL, setPhotoURL] = useState('');
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
          setBio(data.bio || '');
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
        bio,
        socialLinks
      });

      // If it's the primary channel, also update the user document for legacy support
      if (activeChannel.isPrimary) {
        await updateDoc(doc(db, 'users', user.uid), {
          displayName,
          pseudonym,
          searchAliases: aliasesArray,
          photoURL,
          bio,
          socialLinks
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
                <Globe className="w-3.5 h-3.5" /> Альтернативные имена для поиска (через запятую)
              </label>
              <input 
                type="text" 
                value={searchAliases}
                onChange={(e) => setSearchAliases(e.target.value)}
                placeholder="напр. my channel, мой канал, май ченел"
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
                <Smartphone className="w-3.5 h-3.5" /> Telegram Group
              </label>
              <input 
                type="text" 
                value={socialLinks.telegramGroup}
                onChange={(e) => setSocialLinks({...socialLinks, telegramGroup: e.target.value})}
                placeholder="t.me/..."
                className="w-full bg-[var(--studio-hover)] border border-[var(--studio-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600 text-[var(--studio-text)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--studio-muted)] uppercase flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Rutube
              </label>
              <input 
                type="text" 
                value={socialLinks.rutube}
                onChange={(e) => setSocialLinks({...socialLinks, rutube: e.target.value})}
                placeholder="rutube.ru/..."
                className="w-full bg-[var(--studio-hover)] border border-[var(--studio-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600 text-[var(--studio-text)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--studio-muted)] uppercase flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> YouTube
              </label>
              <input 
                type="text" 
                value={socialLinks.youtube}
                onChange={(e) => setSocialLinks({...socialLinks, youtube: e.target.value})}
                placeholder="youtube.com/..."
                className="w-full bg-[var(--studio-hover)] border border-[var(--studio-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-600 text-[var(--studio-text)]"
              />
            </div>
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

        <div className="pt-8 flex flex-col gap-4">
          <button 
            type="submit" 
            disabled={saving}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-blue-600/20 uppercase tracking-widest text-xs"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Сохранить настройки канала
          </button>
          
          <div className="flex gap-4">
            <button 
              type="button"
              onClick={() => window.location.reload()}
              className="flex-1 bg-[var(--studio-hover)] text-[var(--studio-text)] font-bold py-4 rounded-2xl hover:bg-[var(--studio-border)] transition-all"
            >
              Отменить
            </button>
            <button 
              type="button"
              onClick={() => navigate(`/channel/${activeChannel?.id}`)}
              className="flex-1 bg-[var(--studio-hover)] text-[var(--studio-text)] font-bold py-4 rounded-2xl hover:bg-[var(--studio-border)] transition-all"
            >
              Перейти на канал
            </button>
          </div>
        </div>
      </form>

      {/* Manage Channels Section */}
      <div className="bg-[var(--studio-sidebar)] rounded-3xl border border-[var(--studio-border)] p-6 md:p-8 space-y-8 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[var(--studio-text)]">Ваши каналы</h2>
          <p className="text-sm text-[var(--studio-muted)]">Вы можете создать до 5 каналов на один аккаунт</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {channels.map(channel => (
            <div 
              key={channel.id}
              className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                activeChannel?.id === channel.id 
                  ? 'border-blue-600 bg-blue-50/50' 
                  : 'border-[var(--studio-border)] bg-[var(--studio-hover)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <img src={channel.photoURL} className="w-10 h-10 rounded-full object-cover" alt="" />
                <div>
                  <p className="font-bold text-sm text-[var(--studio-text)] line-clamp-1">{channel.displayName}</p>
                  {channel.isPrimary && <span className="text-[10px] text-blue-500 font-bold uppercase">Основной</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeChannel?.id === channel.id ? (
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                ) : (
                  <button 
                    onClick={() => setActiveChannel(channel)}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Выбрать
                  </button>
                )}
                {!channel.isPrimary && (
                  <button 
                    onClick={() => handleDeleteChannel(channel.id, channel.isPrimary)}
                    className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors"
                    title="Удалить канал"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {channels.length < 5 && (
            <div className="p-4 rounded-2xl border-2 border-dashed border-[var(--studio-border)] flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-[var(--studio-text)]">Новый канал</span>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="Название..."
                  className="flex-1 bg-[var(--studio-hover)] border border-[var(--studio-border)] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-600"
                />
                <button 
                  onClick={handleCreateChannel}
                  disabled={creatingChannel || !newChannelName.trim()}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {creatingChannel ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Создать'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 rounded-3xl border border-red-100 p-6 md:p-8 space-y-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-red-600">Опасная зона</h2>
          <p className="text-sm text-red-500/70">Эти действия необратимы. Будьте осторожны.</p>
        </div>
        
        <div className="p-4 bg-white rounded-2xl border border-red-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-red-600">Удалить аккаунт</p>
            <p className="text-xs text-red-400">Удаляет все ваши каналы, видео и данные профиля</p>
          </div>
          <button 
            onClick={handleDeleteAccount}
            className="px-6 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-all uppercase tracking-widest"
          >
            Удалить всё
          </button>
        </div>
      </div>
    </div>
  );
}
