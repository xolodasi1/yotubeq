import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { VideoType } from '../types';
import { Loader2, Snowflake, Smartphone, ThumbsUp, ThumbsDown, MessageSquare, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';

export default function Shorts() {
  const [shorts, setShorts] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchShorts = async () => {
      try {
        const q = query(
          collection(db, 'videos'),
          where('isShort', '==', true),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()?.toISOString()
        })) as VideoType[];
        
        setShorts(data);
      } catch (error) {
        console.error("Error fetching shorts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchShorts();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const { scrollTop, clientHeight } = containerRef.current;
      const index = Math.round(scrollTop / clientHeight);
      if (index !== activeVideoIndex) {
        setActiveVideoIndex(index);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [activeVideoIndex]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-ice-accent" />
      </div>
    );
  }

  if (shorts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-ice-muted">
        <Smartphone className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-2xl font-bold">No Shorts Found</h2>
        <p className="mt-2">Upload some vertical videos to see them here!</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-black pb-20 md:pb-0"
    >
      {shorts.map((short, index) => (
        <div key={short.id} className="h-full w-full snap-start flex items-center justify-center relative">
          <div className="relative h-full w-full max-w-[500px] bg-black flex items-center justify-center">
            <video
              src={short.videoUrl}
              className="w-full h-full object-cover md:rounded-2xl"
              autoPlay={index === activeVideoIndex}
              loop
              muted={false}
              playsInline
              controls={false}
              onClick={(e) => {
                const video = e.target as HTMLVideoElement;
                if (video.paused) video.play();
                else video.pause();
              }}
            />
            
            {/* Overlay UI */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none md:rounded-2xl"></div>
            
            <div className="absolute bottom-0 left-0 right-0 p-4 pb-20 md:pb-6 flex items-end justify-between pointer-events-none">
              <div className="flex-1 pr-12 pointer-events-auto">
                <Link to={`/channel/${short.authorId}`} className="flex items-center gap-2 mb-3 group w-fit">
                  <img src={short.authorPhotoUrl} alt={short.authorName} className="w-10 h-10 rounded-full border border-ice-accent" />
                  <span className="font-bold text-white group-hover:text-ice-accent transition-colors">{short.authorName}</span>
                  <button className="ml-2 bg-white text-black px-3 py-1 rounded-full text-xs font-bold hover:bg-gray-200">Subscribe</button>
                </Link>
                <h3 className="text-white font-medium mb-1 line-clamp-2">{short.title}</h3>
                {short.description && <p className="text-white/80 text-sm line-clamp-2">{short.description}</p>}
              </div>

              <div className="flex flex-col items-center gap-6 pointer-events-auto">
                <button className="flex flex-col items-center gap-1 group">
                  <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <ThumbsUp className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-white text-xs font-medium">{short.likes}</span>
                </button>
                <button className="flex flex-col items-center gap-1 group">
                  <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <ThumbsDown className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-white text-xs font-medium">Dislike</span>
                </button>
                <Link to={`/video/${short.id}`} className="flex flex-col items-center gap-1 group">
                  <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-white text-xs font-medium">Comments</span>
                </Link>
                <button className="flex flex-col items-center gap-1 group">
                  <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <Share2 className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-white text-xs font-medium">Share</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
