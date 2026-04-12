import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { Comment, VideoType } from '../types';
import { MessageSquare, Trash2, Heart, Reply, ExternalLink, Search, MoreVertical } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';

interface CommentWithVideo extends Comment {
  videoTitle?: string;
  parentComment?: Comment;
}

export default function StudioComments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState<CommentWithVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchComments = async () => {
      try {
        const vq = query(collection(db, 'videos'), where('authorId', '==', user.uid));
        const vSnapshot = await getDocs(vq);
        const videoIds = vSnapshot.docs.map(doc => doc.id);
        const videoTitlesMap = vSnapshot.docs.reduce((acc, doc) => {
          acc[doc.id] = doc.data().title;
          return acc;
        }, {} as Record<string, string>);

        if (videoIds.length === 0) {
          setLoading(false);
          return;
        }

        const cq = query(
          collection(db, 'comments'),
          where('videoId', 'in', videoIds.slice(0, 30)),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        const cSnapshot = await getDocs(cq);
        const rawComments = cSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Comment[];

        // Fetch parent comments for replies
        const parentIds = rawComments.filter(c => c.parentId).map(c => c.parentId!);
        const parentCommentsMap: Record<string, Comment> = {};
        
        if (parentIds.length > 0) {
          // Firestore 'in' query limit is 10, but we might have more. 
          // For now let's just fetch the first 10 or do multiple batches if needed.
          // Or just fetch them individually if it's easier for now.
          const parentPromises = parentIds.map(pid => getDoc(doc(db, 'comments', pid)));
          const parentSnaps = await Promise.all(parentPromises);
          parentSnaps.forEach(snap => {
            if (snap.exists()) {
              parentCommentsMap[snap.id] = { id: snap.id, ...snap.data() } as Comment;
            }
          });
        }

        const cData = rawComments.map(commentData => {
          return {
            ...commentData,
            createdAt: commentData.createdAt?.toDate?.()?.toISOString() || commentData.createdAt,
            videoTitle: videoTitlesMap[commentData.videoId],
            parentComment: commentData.parentId ? parentCommentsMap[commentData.parentId] : undefined
          } as CommentWithVideo;
        });

        setComments(cData);
      } catch (error) {
        console.error("Error fetching studio comments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [user]);

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Удалить этот комментарий?')) return;

    try {
      await deleteDoc(doc(db, 'comments', commentId));
      setComments(comments.filter(c => c.id !== commentId));
      toast.success('Комментарий удален');
    } catch (error) {
      toast.error('Ошибка при удалении');
    }
  };

  const filteredComments = comments.filter(c => 
    c.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.authorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-primary)]">Комментарии</h1>
          <p className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-widest">Управление обратной связью от зрителей</p>
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[2rem] shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-6 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600" />
            <input
              type="text"
              placeholder="Поиск по комментариям или авторам..."
              className="w-full pl-12 pr-6 py-3.5 bg-[var(--hover)] border border-[var(--border)] rounded-2xl text-sm font-black focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-[var(--text-primary)] uppercase tracking-tight"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="divide-y divide-[var(--border)]">
          {filteredComments.map((comment) => (
            <div key={comment.id} className="p-8 hover:bg-[var(--hover)]/50 transition-all group flex gap-8">
              <div className="relative shrink-0">
                <img src={comment.authorPhotoUrl} className="w-14 h-14 rounded-2xl border-2 border-[var(--border)] object-cover shadow-sm group-hover:scale-105 transition-transform" alt="" referrerPolicy="no-referrer" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-600 rounded-lg border-2 border-[var(--surface)] flex items-center justify-center">
                  <MessageSquare className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="font-black text-sm text-[var(--text-primary)] uppercase tracking-tight">{comment.authorName}</span>
                    <span className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest bg-[var(--hover)] px-2 py-1 rounded-lg">
                      {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ru }) : 'недавно'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                    <button 
                      onClick={() => navigate(`/video/${comment.videoId}`)}
                      className="p-3 hover:bg-blue-500/10 rounded-xl text-blue-600 transition-all border border-transparent hover:border-blue-500/20"
                      title="Перейти к видео"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(comment.id)}
                      className="p-3 hover:bg-red-500/10 rounded-xl text-red-600 transition-all border border-transparent hover:border-red-500/20"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="bg-[var(--hover)]/30 p-5 rounded-2xl border border-[var(--border)] group-hover:border-blue-500/20 transition-colors space-y-4">
                  {comment.parentComment && (
                    <div className="p-4 bg-[var(--surface)] rounded-xl border-l-4 border-blue-500 text-[11px] space-y-2 shadow-sm">
                      <div className="flex items-center gap-2 font-black uppercase tracking-widest text-blue-600">
                        <Reply className="w-3 h-3" />
                        В ответ пользователю @{comment.parentComment.authorName.replace(/\s+/g, '').toLowerCase()}
                      </div>
                      <p className="text-[var(--text-secondary)] italic line-clamp-2 leading-relaxed">
                        "{comment.parentComment.text}"
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed font-medium">{comment.text}</p>
                </div>
                <div className="flex flex-wrap items-center gap-8 pt-2">
                  <div className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-[0.15em]">
                    <Heart className={`w-4 h-4 ${comment.authorHearted ? 'fill-red-500 text-red-500' : 'text-[var(--text-secondary)]/30'}`} />
                    <span className={comment.authorHearted ? 'text-red-600' : 'text-[var(--text-secondary)]'}>
                      {comment.authorHearted ? 'Отмечено автором' : 'Без отметки'}
                    </span>
                  </div>
                  <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.15em] flex items-center gap-2">
                    <div className="w-1 h-1 bg-blue-600 rounded-full" />
                    Видео: <span onClick={() => navigate(`/video/${comment.videoId}`)} className="hover:underline cursor-pointer text-[var(--text-primary)]">{comment.videoTitle}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredComments.length === 0 && (
            <div className="py-40 text-center bg-[var(--hover)]/10">
              <div className="flex flex-col items-center justify-center text-[var(--text-secondary)]">
                <div className="w-24 h-24 bg-[var(--surface)] rounded-[2rem] flex items-center justify-center mb-8 shadow-sm border border-[var(--border)]">
                  <MessageSquare className="w-10 h-10 opacity-10" />
                </div>
                <p className="text-sm font-black uppercase tracking-[0.2em]">Комментарии не найдены</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
