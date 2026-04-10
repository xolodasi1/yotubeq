import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { VideoType, Comment, SubscriptionType, VideoLikeType } from '../types';
import { ThumbsUp, ThumbsDown, Share2, MoreHorizontal, Send, Loader2, Snowflake } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, limit, getDocs, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';

export default function VideoPlayer() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [video, setVideo] = useState<VideoType | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Real interactions state
  const [isLiked, setIsLiked] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!id) return;
    
    const fetchVideoAndInteractions = async () => {
      try {
        setLoading(true);
        const videoDocRef = doc(db, 'videos', id);
        const videoSnap = await getDoc(videoDocRef);
        
        if (!videoSnap.exists()) {
          throw new Error('Video not found');
        }
        
        const data = {
          ...videoSnap.data(),
          createdAt: videoSnap.data().createdAt?.toDate()?.toISOString()
        } as VideoType;
        
        setVideo(data);

        // Increment views
        await updateDoc(videoDocRef, {
          views: data.views + 1
        });

        // Fetch related videos
        const relatedQ = query(collection(db, 'videos'), limit(10));
        const relatedSnap = await getDocs(relatedQ);
        const relatedData = relatedSnap.docs
          .map(d => ({
            ...d.data(),
            createdAt: d.data().createdAt?.toDate()?.toISOString()
          }))
          .filter((v: any) => v.id !== id) as VideoType[];
          
        setRelatedVideos(relatedData);

        // Fetch comments
        const commentsQ = query(collection(db, 'comments'), where('videoId', '==', id), orderBy('createdAt', 'desc'));
        const commentsSnap = await getDocs(commentsQ);
        setComments(commentsSnap.docs.map(d => ({
          ...d.data(),
          createdAt: d.data().createdAt?.toDate()?.toISOString()
        })) as Comment[]);

        // Fetch user interactions if logged in
        if (user) {
          // Check like
          const likeId = `${user.uid}_${id}`;
          const likeSnap = await getDoc(doc(db, 'video_likes', likeId));
          if (likeSnap.exists() && likeSnap.data().type === 'like') {
            setIsLiked(true);
          }

          // Check subscription
          const subId = `${user.uid}_${data.authorId}`;
          const subSnap = await getDoc(doc(db, 'subscriptions', subId));
          if (subSnap.exists()) {
            setIsSubscribed(true);
          }
        }

      } catch (error) {
        console.error("Error fetching video:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideoAndInteractions();
    window.scrollTo(0, 0);
  }, [id, user]);

  const handleLike = async () => {
    if (!user || !video) {
      toast.error('Please login to like videos');
      return;
    }

    const likeId = `${user.uid}_${video.id}`;
    const likeRef = doc(db, 'video_likes', likeId);
    const videoRef = doc(db, 'videos', video.id);

    try {
      if (isLiked) {
        await deleteDoc(likeRef);
        await updateDoc(videoRef, { likes: Math.max(0, video.likes - 1) });
        setVideo({ ...video, likes: Math.max(0, video.likes - 1) });
        setIsLiked(false);
      } else {
        await setDoc(likeRef, { id: likeId, userId: user.uid, videoId: video.id, type: 'like' });
        await updateDoc(videoRef, { likes: video.likes + 1 });
        setVideo({ ...video, likes: video.likes + 1 });
        setIsLiked(true);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast.error('Failed to update like');
    }
  };

  const handleSubscribe = async () => {
    if (!user || !video) {
      toast.error('Please login to subscribe');
      return;
    }
    if (user.uid === video.authorId) {
      toast.error("You can't subscribe to yourself");
      return;
    }

    const subId = `${user.uid}_${video.authorId}`;
    const subRef = doc(db, 'subscriptions', subId);

    try {
      if (isSubscribed) {
        await deleteDoc(subRef);
        setIsSubscribed(false);
        toast.success('Unsubscribed');
      } else {
        await setDoc(subRef, {
          id: subId,
          subscriberId: user.uid,
          channelId: video.authorId,
          createdAt: new Date()
        });
        setIsSubscribed(true);
        toast.success('Subscribed!');
      }
    } catch (error) {
      console.error("Error toggling subscription:", error);
      toast.error('Failed to update subscription');
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !video || !newComment.trim()) return;

    setSubmittingComment(true);
    try {
      // Fetch current user data to get the latest display name
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const authorName = userDoc.exists() && userDoc.data().displayName ? userDoc.data().displayName : (user.displayName || 'User');
      const authorPhotoUrl = userDoc.exists() && userDoc.data().photoURL ? userDoc.data().photoURL : (user.photoURL || '');

      const commentId = crypto.randomUUID();
      const commentData = {
        id: commentId,
        videoId: video.id,
        authorId: user.uid,
        authorName: authorName,
        authorPhotoUrl: authorPhotoUrl,
        text: newComment.trim(),
        createdAt: new Date()
      };

      await setDoc(doc(db, 'comments', commentId), commentData);
      
      setComments([{ ...commentData, createdAt: commentData.createdAt.toISOString() } as any, ...comments]);
      setNewComment('');
      toast.success('Comment posted');
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error('Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-ice-accent" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-ice-muted">
        <Snowflake className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-2xl font-bold">Video frozen or not found</h2>
      </div>
    );
  }

  const formattedDate = video.createdAt 
    ? formatDistanceToNow(new Date(video.createdAt), { addSuffix: true }) 
    : 'recently';

  return (
    <div className="max-w-[1800px] mx-auto p-4 md:p-6 flex flex-col xl:flex-row gap-6">
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="aspect-video rounded-3xl overflow-hidden glass border border-ice-border shadow-2xl relative group">
          <video
            ref={videoRef}
            src={video.videoUrl}
            controls
            autoPlay
            className="w-full h-full object-contain"
          />
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mt-6 mb-4 ice-text-glow">{video.title}</h1>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link to={`/channel/${video.authorId}`} className="flex items-center gap-3 group">
              <img
                src={video.authorPhotoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.authorId}`}
                alt={video.authorName}
                className="w-12 h-12 rounded-full border-2 border-ice-accent shadow-[0_0_10px_rgba(0,242,255,0.3)] group-hover:scale-105 transition-transform"
              />
              <div>
                <h3 className="font-bold text-lg group-hover:text-ice-accent transition-colors">{video.authorName}</h3>
                <p className="text-sm text-ice-muted">Channel</p>
              </div>
            </Link>
            <button 
              onClick={handleSubscribe}
              className={`px-6 py-2 rounded-full font-bold transition-colors ml-2 ${
                isSubscribed 
                  ? 'bg-white/10 text-ice-text hover:bg-white/20' 
                  : 'bg-ice-text text-ice-bg hover:bg-white/90'
              }`}
            >
              {isSubscribed ? 'Subscribed' : 'Subscribe'}
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
            <div className="flex items-center bg-white/5 rounded-full border border-ice-border">
              <button 
                onClick={handleLike}
                className={`flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-l-full transition-colors ${isLiked ? 'text-ice-accent' : ''}`}
              >
                <ThumbsUp className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                <span className="font-medium">{video.likes}</span>
              </button>
              <div className="w-px h-6 bg-ice-border"></div>
              <button className="px-4 py-2 hover:bg-white/10 rounded-r-full transition-colors">
                <ThumbsDown className="w-5 h-5" />
              </button>
            </div>
            <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-ice-border px-4 py-2 rounded-full transition-colors font-medium">
              <Share2 className="w-5 h-5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 border border-ice-border hover:bg-white/5 transition-colors cursor-pointer">
          <div className="flex items-center gap-4 text-sm font-medium mb-2">
            <span>{video.views.toLocaleString()} views</span>
            <span>{formattedDate}</span>
            <span className="text-ice-accent">#{video.category.replace(/\s+/g, '')}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{video.description}</p>
        </div>

        {/* Comments Section */}
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-6">{comments.length} Comments</h3>
          
          <div className="flex gap-4 mb-8">
            <img
              src={user?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest'}
              alt="Current user"
              className="w-10 h-10 rounded-full border border-ice-accent"
            />
            <form onSubmit={handlePostComment} className="flex-1 relative">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={user ? "Add a cool comment..." : "Login to comment..."}
                disabled={!user || submittingComment}
                className="w-full bg-transparent border-b border-ice-border pb-2 focus:outline-none focus:border-ice-accent transition-colors peer disabled:opacity-50"
              />
              {user && (
                <div className="absolute right-0 bottom-2 opacity-0 peer-focus:opacity-100 transition-opacity flex gap-2">
                  <button type="button" onClick={() => setNewComment('')} className="text-sm font-medium hover:text-ice-accent transition-colors">Cancel</button>
                  <button type="submit" disabled={!newComment.trim() || submittingComment} className="bg-ice-accent text-ice-bg px-4 py-1 rounded-full text-sm font-bold hover:bg-ice-accent/90 transition-colors disabled:opacity-50">
                    {submittingComment ? 'Posting...' : 'Comment'}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Real Comments */}
          {comments.length === 0 ? (
            <p className="text-ice-muted text-center py-8">No comments yet. Be the first to break the ice!</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-4 mb-6">
                <img
                  src={comment.authorPhotoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.authorId}`}
                  alt={comment.authorName}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm">@{comment.authorName.replace(/\s+/g, '').toLowerCase()}</span>
                    <span className="text-xs text-ice-muted">
                      {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : 'just now'}
                    </span>
                  </div>
                  <p className="text-sm mb-2">{comment.text}</p>
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-1 text-ice-muted hover:text-ice-text transition-colors">
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                    <button className="text-ice-muted hover:text-ice-text transition-colors">
                      <ThumbsDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Related Videos */}
      <div className="xl:w-[400px] shrink-0">
        <h3 className="text-lg font-bold mb-4">Related Videos</h3>
        <div className="flex flex-col gap-4">
          {relatedVideos.map((v) => (
            <Link key={v.id} to={`/video/${v.id}`} className="flex gap-3 group">
              <div className="w-40 aspect-video rounded-xl overflow-hidden shrink-0 border border-ice-border relative">
                <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-medium">
                  {v.duration}
                </div>
              </div>
              <div className="flex flex-col py-1">
                <h4 className="font-bold text-sm line-clamp-2 group-hover:text-ice-accent transition-colors leading-tight mb-1">
                  {v.title}
                </h4>
                <span className="text-xs text-ice-muted">{v.authorName}</span>
                <span className="text-xs text-ice-muted">{v.views} views • {v.createdAt ? formatDistanceToNow(new Date(v.createdAt)) : 'recently'}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
