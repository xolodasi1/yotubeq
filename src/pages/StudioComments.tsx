import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import { Comment, VideoType } from '../types';
import { MessageSquare, Trash2, Heart, Reply, ExternalLink, Search, MoreVertical } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';

interface CommentWithVideo extends Comment {
  videoTitle?: string;
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
          where('videoId', 'in', videoIds.slice(0, 10)),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const cSnapshot = await getDocs(cq);
        const cData = cSnapshot.docs.map(doc => {
          const commentData = doc.data();
          return {
            id: doc.id,
            ...commentData,
            createdAt: commentData.createdAt?.toDate?.()?.toISOString() || commentData.createdAt,
            videoTitle: videoTitlesMap[commentData.videoId]
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
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Комментарии к видео</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по комментариям"
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* List */}
        <div className="divide-y divide-gray-50">
          {filteredComments.map((comment) => (
            <div key={comment.id} className="p-6 hover:bg-gray-50 transition-colors group flex gap-5">
              <img src={comment.authorPhotoUrl} className="w-10 h-10 rounded-full border border-gray-100 shrink-0 shadow-sm" alt="" />
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900">{comment.authorName}</span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ru }) : 'недавно'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => navigate(`/video/${comment.videoId}`)}
                      className="p-2 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
                      title="Перейти к видео"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(comment.id)}
                      className="p-2 hover:bg-red-50 rounded-full text-red-600 transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed">{comment.text}</p>
                <div className="flex items-center gap-6 pt-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                    <Heart className={`w-3.5 h-3.5 ${comment.authorHearted ? 'fill-red-500 text-red-500' : 'text-gray-300'}`} />
                    <span className={comment.authorHearted ? 'text-red-600' : 'text-gray-400'}>
                      {comment.authorHearted ? 'Отмечено автором' : 'Без отметки'}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    Видео: <span className="hover:underline cursor-pointer">{comment.videoTitle}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredComments.length === 0 && (
            <div className="py-32 text-center">
              <div className="flex flex-col items-center justify-center text-gray-400">
                <MessageSquare className="w-12 h-12 mb-4 opacity-10" />
                <p className="text-sm italic">Комментарии не найдены</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
