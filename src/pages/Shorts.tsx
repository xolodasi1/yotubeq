import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { VideoType } from '../types';
import { Loader2, Smartphone, Heart, MessageSquare, Share2, Music as MusicIcon, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Shorts() {
  const [shorts, setShorts] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
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
          id: doc.id
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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollPos = e.currentTarget.scrollTop;
    const height = e.currentTarget.clientHeight;
    const index = Math.round(scrollPos / height);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest">Загрузка Shorts...</p>
      </div>
    );
  }

  if (shorts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] text-[var(--text-secondary)]">
        <Smartphone className="w-16 h-16 opacity-20 mb-4" />
        <p className="text-lg font-bold text-[var(--text-primary)]">Shorts пока нет</p>
        <p className="text-sm mt-2">Будьте первым, кто загрузит короткое видео!</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="h-[calc(100vh-64px)] overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-black"
    >
      {shorts.map((short, index) => (
        <div 
          key={short.id} 
          className="h-full w-full snap-start relative flex items-center justify-center"
        >
          <video
            src={short.videoUrl}
            className="h-full w-full object-contain"
            loop
            autoPlay={index === currentIndex}
            muted={index !== currentIndex}
          />
          
          {/* Overlay Info */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20">
                <img src={short.authorPhotoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${short.authorId}`} alt={short.authorName} />
              </div>
              <div>
                <h3 className="font-bold text-sm">@{short.authorName}</h3>
                <button className="text-[10px] font-bold uppercase tracking-wider bg-white text-black px-3 py-1 rounded-full mt-1">Подписаться</button>
              </div>
            </div>
            <p className="text-sm font-medium line-clamp-2 mb-4">{short.title}</p>
            <div className="flex items-center gap-2 text-xs opacity-80">
              <MusicIcon className="w-3 h-3" />
              <span>Оригинальный звук - {short.authorName}</span>
            </div>
          </div>

          {/* Side Actions */}
          <div className="absolute right-4 bottom-24 flex flex-col gap-6 items-center text-white">
            <button className="flex flex-col items-center gap-1 group">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center group-hover:bg-white/20 transition-all">
                <Heart className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold">{short.likes || 0}</span>
            </button>
            <button className="flex flex-col items-center gap-1 group">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center group-hover:bg-white/20 transition-all">
                <MessageSquare className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold">0</span>
            </button>
            <button className="flex flex-col items-center gap-1 group">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center group-hover:bg-white/20 transition-all">
                <Share2 className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold">Поделиться</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
