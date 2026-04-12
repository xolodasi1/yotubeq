import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Loader2, Settings as SettingsIcon, User, Camera, Save, Moon, Sun, Globe, Smartphone, MessageSquare, Instagram, Trash2, AlertTriangle, X } from 'lucide-react';
import { db, auth as firebaseAuth } from '../lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { deleteUser } from 'firebase/auth';

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

  const handleDeleteChannel = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const batch = writeBatch(db);

      // 1. Delete all user's videos/photos/music
      const videosQuery = query(collection(db, 'videos'), where('authorId', '==', user.uid));
      const videosSnap = await getDocs(videosQuery);
      videosSnap.forEach((doc) => batch.delete(doc.ref));

      // 2. Delete all user's community posts
      const postsQuery = query(collection(db, 'community_posts'), where('authorId', '==', user.uid));
      const postsSnap = await getDocs(postsQuery);
      postsSnap.forEach((doc) => batch.delete(doc.ref));

      // 3. Delete user document
      batch.delete(doc(db, 'users', user.uid));

      await batch.commit();

      // 4. Delete auth user (optional, but good practice if possible)
      // Note: deleteUser might fail if the session is old. We'll try but at least the data is gone.
      if (firebaseAuth.currentUser) {
        await deleteUser(firebaseAuth.currentUser).catch(err => console.error("Auth delete failed:", err));
      }

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
      </div>
    </div>
  );
}
