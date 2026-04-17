import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { supabase } from '../lib/supabase';
import { databaseService } from '../lib/databaseService';
import { CommunityPost } from '../types';
import { MessageSquare, Send, Trash2, Heart, BarChart2, Loader2, AlertCircle, Lock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';

export default function StudioCommunity() {
  const { user, activeChannel } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostText, setNewPostText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isEligible = (activeChannel?.subscribers || 0) >= 10;

  useEffect(() => {
    if (!user || !activeChannel || !isEligible) {
      setLoading(false);
      return;
    }

    const fetchPosts = async () => {
      try {
        const { data, error } = await supabase
          .from('community_posts')
          .select('*')
          .eq('author_id', activeChannel.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setPosts((data || []).map(d => databaseService.mapCommunityPost(d)));
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
      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          author_id: activeChannel?.id || user.uid,
          author_name: activeChannel?.displayName || user.displayName,
          author_photo_url: activeChannel?.photoURL || user.photoURL,
          text: newPostText,
          type: 'text',
          likes: 0
        })
        .select()
        .single();

      if (error) throw error;
      
      const newPost = databaseService.mapCommunityPost(data);
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
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId);
        
      if (error) throw error;
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
    <div className="p-4 md:p-8 max-w-[1000px] mx-auto space-y-10 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-primary)]">Сообщество</h1>
          <p className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-widest">Прямое взаимодействие с вашей аудиторией</p>
        </div>
      </div>

      {/* Create Post */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2rem] p-8 shadow-sm group hover:border-blue-500/30 transition-all">
        <form onSubmit={handleCreatePost} className="space-y-6">
          <div className="flex gap-6">
            <img src={user?.photoURL} alt="" className="w-14 h-14 rounded-2xl border-2 border-[var(--border)] object-cover shrink-0 shadow-sm" referrerPolicy="no-referrer" />
            <textarea
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              placeholder="Поделитесь новостями, мыслями или планами..."
              className="w-full bg-transparent border-none focus:ring-0 text-[var(--text-primary)] resize-none min-h-[120px] text-lg font-medium leading-relaxed placeholder:text-[var(--text-secondary)]/50"
            />
          </div>
          <div className="flex items-center justify-between pt-6 border-t border-[var(--border)]">
            <div className="flex items-center gap-4">
              <button type="button" className="p-2.5 hover:bg-[var(--hover)] rounded-xl text-[var(--text-secondary)] transition-colors" title="Добавить фото">
                <BarChart2 className="w-5 h-5" />
              </button>
              <button type="button" className="p-2.5 hover:bg-[var(--hover)] rounded-xl text-[var(--text-secondary)] transition-colors" title="Создать опрос">
                <MessageSquare className="w-5 h-5" />
              </button>
            </div>
            <button
              type="submit"
              disabled={!newPostText.trim() || submitting}
              className="flex items-center gap-3 px-10 py-3.5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20 uppercase text-[11px] tracking-[0.2em] active:scale-95"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Опубликовать
            </button>
          </div>
        </form>
      </div>

      {/* Posts List */}
      <div className="space-y-8">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Ваши записи</h2>
          <div className="h-px bg-[var(--border)] flex-1 ml-6" />
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          {posts.map((post) => (
            <div key={post.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-[2rem] p-8 shadow-sm group hover:border-blue-500/20 transition-all">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <img src={post.authorPhotoUrl} alt="" className="w-12 h-12 rounded-2xl border-2 border-[var(--border)] object-cover shadow-sm" referrerPolicy="no-referrer" />
                  <div>
                    <p className="font-black text-sm text-[var(--text-primary)] uppercase tracking-tight">{post.authorName}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest mt-0.5">
                      {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ru }) : ''}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeletePost(post.id)}
                  className="p-3 text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-red-500/20"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-[var(--hover)]/30 p-6 rounded-2xl border border-[var(--border)] mb-8">
                <p className="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed font-medium">{post.text}</p>
              </div>
              <div className="flex items-center gap-10 pt-6 border-t border-[var(--border)]">
                <div className="flex items-center gap-2.5 text-[var(--text-secondary)] group/stat cursor-pointer">
                  <div className="p-2 bg-[var(--hover)] rounded-xl group-hover/stat:bg-red-500/10 group-hover/stat:text-red-600 transition-colors">
                    <Heart className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-black font-mono">{post.likes}</span>
                </div>
                <div className="flex items-center gap-2.5 text-[var(--text-secondary)] group/stat cursor-pointer">
                  <div className="p-2 bg-[var(--hover)] rounded-xl group-hover/stat:bg-blue-500/10 group-hover/stat:text-blue-600 transition-colors">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-black font-mono">0</span>
                </div>
                <div className="flex items-center gap-2.5 text-[var(--text-secondary)] group/stat cursor-pointer ml-auto">
                  <div className="p-2 bg-[var(--hover)] rounded-xl group-hover/stat:bg-purple-500/10 group-hover/stat:text-purple-600 transition-colors">
                    <BarChart2 className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Статистика</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-40 bg-[var(--surface)] rounded-[2.5rem] border-2 border-dashed border-[var(--border)]">
            <div className="w-24 h-24 bg-[var(--hover)] rounded-[2rem] flex items-center justify-center mb-8 mx-auto shadow-sm">
              <MessageSquare className="w-10 h-10 text-[var(--text-secondary)] opacity-10" />
            </div>
            <p className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Вы еще ничего не опубликовали</p>
          </div>
        )}
      </div>
    </div>
  );
}
