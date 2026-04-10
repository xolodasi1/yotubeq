import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { VideoType } from '../types';
import { ThumbsUp, ThumbsDown, Share2, MoreHorizontal, Send, Loader2, Snowflake } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import VideoCard from '../components/VideoCard';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, limit, getDocs } from 'firebase/firestore';

export default function VideoPlayer() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [video, setVideo] = useState<VideoType | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!id) return;
    
    const fetchVideo = async () => {
      try {
        setLoading(true);
        const videoRef = doc(db, 'videos', id);
        const videoSnap = await getDoc(videoRef);
        
        if (!videoSnap.exists()) {
          throw new Error('Video not found');
        }
        
        const data = {
          ...videoSnap.data(),
          createdAt: videoSnap.data().createdAt?.toDate()?.toISOString()
        } as VideoType;
        
        setVideo(data);

        // Increment views
        await updateDoc(videoRef, {
          views: data.views + 1
        });

        // Fetch related videos
        const relatedQ = query(collection(db, 'videos'), limit(10));
        const relatedSnap = await getDocs(relatedQ);
        const relatedData = relatedSnap.docs
          .map(doc => ({
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate()?.toISOString()
          }))
          .filter((v: any) => v.id !== id) as VideoType[];
          
        setRelatedVideos(relatedData);
      } catch (error) {
        console.error("Error fetching video:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
    window.scrollTo(0, 0);
  }, [id]);

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
                src={video.authorPhotoUrl || ''}
                alt={video.authorName}
                className="w-12 h-12 rounded-full border-2 border-ice-accent shadow-[0_0_10px_rgba(0,242,255,0.3)] group-hover:scale-105 transition-transform"
              />
              <div>
                <h3 className="font-bold text-lg group-hover:text-ice-accent transition-colors">{video.authorName}</h3>
                <p className="text-sm text-ice-muted">1.2M subscribers</p>
              </div>
            </Link>
            <button className="bg-ice-text text-ice-bg px-6 py-2 rounded-full font-bold hover:bg-white/90 transition-colors ml-2">
              Subscribe
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
            <div className="flex items-center bg-white/5 rounded-full border border-ice-border">
              <button 
                onClick={() => setIsLiked(!isLiked)}
                className={`flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-l-full transition-colors ${isLiked ? 'text-ice-accent' : ''}`}
              >
                <ThumbsUp className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                <span className="font-medium">{video.likes + (isLiked ? 1 : 0)}</span>
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
            <button className="p-2 bg-white/5 hover:bg-white/10 border border-ice-border rounded-full transition-colors">
              <MoreHorizontal className="w-5 h-5" />
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
          <h3 className="text-xl font-bold mb-6">124 Comments</h3>
          
          <div className="flex gap-4 mb-8">
            <img
              src={user?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest'}
              alt="Current user"
              className="w-10 h-10 rounded-full border border-ice-accent"
            />
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Add a cool comment..."
                className="w-full bg-transparent border-b border-ice-border pb-2 focus:outline-none focus:border-ice-accent transition-colors peer"
              />
              <div className="absolute right-0 bottom-2 opacity-0 peer-focus:opacity-100 transition-opacity flex gap-2">
                <button className="text-sm font-medium hover:text-ice-accent transition-colors">Cancel</button>
                <button className="bg-ice-accent text-ice-bg px-4 py-1 rounded-full text-sm font-bold hover:bg-ice-accent/90 transition-colors">Comment</button>
              </div>
            </div>
          </div>

          {/* Mock Comments */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 mb-6">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`}
                alt="User"
                className="w-10 h-10 rounded-full"
              />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm">@cooluser{i}</span>
                  <span className="text-xs text-ice-muted">2 days ago</span>
                </div>
                <p className="text-sm mb-2">This video is absolutely freezing! 🥶 Keep up the great work.</p>
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-1 text-ice-muted hover:text-ice-text transition-colors">
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-xs">24</span>
                  </button>
                  <button className="text-ice-muted hover:text-ice-text transition-colors">
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                  <button className="text-xs font-medium text-ice-muted hover:text-ice-text transition-colors">
                    Reply
                  </button>
                </div>
              </div>
            </div>
          ))}
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
