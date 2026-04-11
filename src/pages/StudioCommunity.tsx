import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { CommunityPost } from '../types';
import { MessageSquare, Send, Trash2, Heart, BarChart2, Loader2, AlertCircle, Lock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';

export default function StudioCommunity() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostText, setNewPostText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isEligible = (user?.subscribers || 0) >= 10;

  useEffect(() => {
    if (!user || !isEligible) {
      setLoading(false);
      return;
    }

    const fetchPosts = async () => {
      try {
        const q = query(
          collection(db, 'community_posts'),
          where('authorId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
        })) as CommunityPost[];
        setPosts(data);
      } catch (error) {
        console.error("Error fetching community posts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [user, isEligible]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPostText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const postData = {
        authorId: user.uid,
        authorName: user.displayName,
        authorPhotoUrl: user.photoURL,
        text: newPostText,
        type: 'text',
        createdAt: serverTimestamp(),
        likes: 0
      };

      const docRef = await addDoc(collection(db, 'community_posts'), postData);
      const newPost = { id: docRef.id, ...postData, createdAt: new Date().toISOString() } as CommunityPost;
      setPosts([newPost, ...posts]);
      setNewPostText('');
      toast.success('Запись опубликована!');
    } catch (error) {
      toast.error('Ошибка при публикации');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Удалить эту запись?')) return;
    try {
      await deleteDoc(doc(db, 'community_posts', postId));
      setPosts(posts.filter(p => p.id !== postId));
      toast.success('Запись удалена');
    } catch (error) {
      toast.error('Ошибка при удалении');
    }
  };

  if (!isEligible) {
    return (
      <div className="p-12 max-w-2xl mx-auto text-center space-y-6">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
          <Lock className="w-12 h-12" />
        </div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Вкладка «Сообщество»</h1>
        <p className="text-[var(--text-secondary)] leading-relaxed">
          Вкладка «Сообщество» позволяет вам общаться со своими зрителями с помощью текстовых постов и опросов.
        </p>
        <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl text-blue-700 text-sm font-medium">
          <p>Для активации этой функции вам необходимо набрать минимум <span className="font-bold text-lg">10 подписчиков</span>.</p>
          <p className="mt-2 opacity-80">У вас сейчас: <span className="font-bold">{user?.subscribers || 0}</span></p>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-600 transition-all duration-1000" 
            style={{ width: `${Math.min(((user?.subscribers || 0) / 10) * 100, 100)}%` }} 
          />
        </div>
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
    <div className="p-8 max-w-4xl mx-auto space-y-10">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600">
          <MessageSquare className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Сообщество</h1>
          <p className="text-sm text-[var(--text-secondary)]">Общайтесь со своей аудиторией</p>
        </div>
      </div>

      {/* Create Post */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleCreatePost} className="space-y-4">
          <div className="flex gap-4">
            <img src={user?.photoURL} alt="" className="w-10 h-10 rounded-full shrink-0" />
            <textarea
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              placeholder="Что нового?"
              className="w-full bg-transparent border-none focus:ring-0 text-[var(--text-primary)] resize-none min-h-[100px] text-lg"
            />
          </div>
          <div className="flex justify-end pt-4 border-t border-[var(--border)]">
            <button
              type="submit"
              disabled={!newPostText.trim() || submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Опубликовать
            </button>
          </div>
        </form>
      </div>

      {/* Posts List */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-[var(--text-primary)] px-2">Ваши записи</h2>
        {posts.map((post) => (
          <div key={post.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <img src={post.authorPhotoUrl} alt="" className="w-10 h-10 rounded-full" />
                <div>
                  <p className="font-bold text-[var(--text-primary)]">{post.authorName}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ru }) : ''}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => handleDeletePost(post.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed mb-6">{post.text}</p>
            <div className="flex items-center gap-6 pt-4 border-t border-[var(--border)]">
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <Heart className="w-5 h-5" />
                <span className="text-sm font-bold">{post.likes}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <MessageSquare className="w-5 h-5" />
                <span className="text-sm font-bold">0</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <BarChart2 className="w-5 h-5" />
                <span className="text-sm font-bold">Статистика</span>
              </div>
            </div>
          </div>
        ))}
        {posts.length === 0 && (
          <div className="text-center py-20 bg-[var(--surface)] rounded-2xl border border-[var(--border)] border-dashed">
            <MessageSquare className="w-12 h-12 text-[var(--text-secondary)] opacity-10 mx-auto mb-4" />
            <p className="text-[var(--text-secondary)]">Вы еще ничего не опубликовали</p>
          </div>
        )}
      </div>
    </div>
  );
}
