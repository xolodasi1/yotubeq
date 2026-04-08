import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, increment, collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Video, Comment } from '../types';
import { useAuth } from '../App';
import { ThumbsUp, ThumbsDown, Share2, MoreHorizontal, Send, Loader2, Snowflake } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import VideoCard from '../components/VideoCard';

export default function VideoPlayer() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [video, setVideo] = useState<Video | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      console.log('Fetching video data for id:', id);
      setLoading(true);
      try {
        const videoDoc = await getDoc(doc(db, 'videos', id));
        if (videoDoc.exists()) {
          console.log('Video found');
          const videoData = { id: videoDoc.id, ...videoDoc.data() } as Video;
          setVideo(videoData);
          
          // Increment views
          await updateDoc(doc(db, 'videos', id), { views: increment(1) });

          // Fetch comments
          const commentsQuery = query(collection(db, 'comments'), where('videoId', '==', id), orderBy('createdAt', 'desc'));
          const commentsSnap = await getDocs(commentsQuery);
          setComments(commentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));

          // Fetch related
          const relatedQuery = query(collection(db, 'videos'), where('category', '==', videoData.category || 'All'), orderBy('createdAt', 'desc'));
          const relatedSnap = await getDocs(relatedQuery);
          setRelatedVideos(relatedSnap.docs.filter(d => d.id !== id).map(doc => ({ id: doc.id, ...doc.data() } as Video)));
        } else {
          console.log('Video not found');
        }
      } catch (error) {
        console.error('Error in fetchData:', error);
        handleFirestoreError(error, OperationType.GET, `videos/${id}`);
      } finally {
        console.log('Fetch complete, setting loading to false');
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newComment = {
        videoId: id,
        authorId: user.uid,
        authorName: user.displayName || 'IceUser',
        authorPhotoUrl: user.photoURL || '',
        text: commentText,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, 'comments'), newComment);
      setComments([{ id: docRef.id, ...newComment, createdAt: { toDate: () => new Date() } } as any, ...comments]);
      setCommentText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'comments');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-ice-accent animate-spin" />
        <p className="text-ice-muted font-medium">Chilling the stream...</p>
      </div>
    );
  }

  if (!video) return <div className="text-center py-20 text-ice-muted">Video not found in the frost.</div>;

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-[1600px] mx-auto">
      <div className="flex-1 flex flex-col gap-4">
        <div className="aspect-video rounded-3xl overflow-hidden glass border border-ice-border shadow-2xl relative group">
          <video
            ref={videoRef}
            src={video.videoUrl}
            controls
            autoPlay
            className="w-full h-full object-contain"
          />
        </div>

        <div className="flex flex-col gap-4">
          <h1 className="text-xl md:text-2xl font-bold ice-text-glow leading-tight">{video.title}</h1>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to={`/channel/${video.authorId}`} className="shrink-0">
                <img
                  src={video.authorPhotoUrl}
                  alt={video.authorName}
                  className="w-12 h-12 rounded-full border-2 border-ice-accent shadow-[0_0_10px_rgba(0,242,255,0.3)]"
                  referrerPolicy="no-referrer"
                />
              </Link>
              <div className="flex flex-col">
                <Link to={`/channel/${video.authorId}`} className="font-bold text-ice-text hover:text-ice-accent transition-colors">
                  {video.authorName}
                </Link>
                <span className="text-xs text-ice-muted">1.2M subscribers</span>
              </div>
              <button className="ml-4 bg-ice-text text-ice-bg px-6 py-2 rounded-full font-bold hover:bg-ice-accent transition-all">
                Subscribe
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center glass rounded-full overflow-hidden border border-ice-border">
                <button className="flex items-center gap-2 px-4 py-2 hover:bg-white/10 transition-colors border-r border-ice-border">
                  <ThumbsUp className="w-5 h-5" />
                  <span className="text-sm font-bold">{video.likes.toLocaleString()}</span>
                </button>
                <button className="px-4 py-2 hover:bg-white/10 transition-colors">
                  <ThumbsDown className="w-5 h-5" />
                </button>
              </div>
              <button className="flex items-center gap-2 glass px-4 py-2 rounded-full hover:bg-white/10 border border-ice-border transition-colors">
                <Share2 className="w-5 h-5" />
                <span className="text-sm font-bold">Share</span>
              </button>
              <button className="p-2 glass rounded-full hover:bg-white/10 border border-ice-border transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="glass p-4 rounded-2xl border border-ice-border bg-white/5">
            <div className="flex gap-3 text-sm font-bold mb-1">
              <span>{video.views.toLocaleString()} views</span>
              <span>{video.createdAt?.toDate ? formatDistanceToNow(video.createdAt.toDate(), { addSuffix: true }) : 'recently'}</span>
            </div>
            <p className="text-sm text-ice-text/90 whitespace-pre-wrap leading-relaxed">
              {video.description || 'No description provided.'}
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-6">
            <h3 className="text-xl font-bold">{comments.length} Comments</h3>
            
            {user ? (
              <form onSubmit={handleComment} className="flex gap-4">
                <img src={user.photoURL || ''} className="w-10 h-10 rounded-full border border-ice-border" referrerPolicy="no-referrer" />
                <div className="flex-1 flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    className="bg-transparent border-b border-ice-border py-2 focus:outline-none focus:border-ice-accent transition-colors text-sm"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setCommentText('')} className="px-4 py-1.5 rounded-full text-sm font-bold hover:bg-white/5">Cancel</button>
                    <button
                      disabled={!commentText.trim() || isSubmitting}
                      className="bg-ice-accent text-ice-bg px-4 py-1.5 rounded-full text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(0,242,255,0.5)] transition-all"
                    >
                      {isSubmitting ? 'Posting...' : 'Comment'}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="p-4 glass rounded-xl border border-ice-border text-center text-ice-muted text-sm italic">
                Login to join the conversation.
              </div>
            )}

            <div className="flex flex-col gap-6">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-4">
                  <img src={comment.authorPhotoUrl} className="w-10 h-10 rounded-full border border-ice-border" referrerPolicy="no-referrer" />
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">@{comment.authorName.replace(/\s+/g, '').toLowerCase()}</span>
                      <span className="text-xs text-ice-muted">
                        {comment.createdAt?.toDate ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                      </span>
                    </div>
                    <p className="text-sm text-ice-text/90">{comment.text}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <button className="flex items-center gap-1 text-xs text-ice-muted hover:text-ice-accent"><ThumbsUp className="w-3 h-3" /> 0</button>
                      <button className="text-xs text-ice-muted hover:text-ice-accent">Reply</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:w-[400px] flex flex-col gap-4">
        <h3 className="text-lg font-bold ice-text-glow flex items-center gap-2">
          <Snowflake className="w-5 h-5 text-ice-accent" />
          More to watch
        </h3>
        <div className="flex flex-col gap-4">
          {relatedVideos.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
          {relatedVideos.length === 0 && <p className="text-ice-muted text-sm italic">No other videos in this drift.</p>}
        </div>
      </div>
    </div>
  );
}
