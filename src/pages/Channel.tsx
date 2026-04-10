import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../App';
import VideoCard from '../components/VideoCard';
import { VideoType } from '../types';
import { Loader2, Snowflake } from 'lucide-react';

export default function Channel() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorInfo, setAuthorInfo] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    
    const fetchVideos = async () => {
      try {
        const res = await fetch(`/api/videos?authorId=${id}`);
        const data = await res.json();
        
        setVideos(data || []);
        if (data && data.length > 0) {
          setAuthorInfo({
            name: data[0].authorName,
            photoUrl: data[0].authorPhotoUrl
          });
        } else if (user && user.uid === id) {
          setAuthorInfo({
            name: user.displayName,
            photoUrl: user.photoURL
          });
        }
      } catch (error) {
        console.error("Error fetching channel videos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [id, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-ice-accent" />
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Channel Banner */}
      <div className="h-48 md:h-64 bg-gradient-to-r from-ice-bg via-ice-accent/20 to-ice-bg relative overflow-hidden border-b border-ice-border">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Snowflake className="w-32 h-32 text-ice-accent opacity-10 animate-spin-slow" />
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8">
        {/* Channel Info */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-12 md:-mt-16 mb-8 relative z-10">
          <img
            src={authorInfo?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`}
            alt="Channel avatar"
            className="w-32 h-32 rounded-full border-4 border-ice-bg shadow-[0_0_20px_rgba(0,242,255,0.3)] bg-ice-bg"
          />
          <div className="flex-1 text-center md:text-left mb-2">
            <h1 className="text-3xl font-bold ice-text-glow mb-1">{authorInfo?.name || 'Ice Creator'}</h1>
            <p className="text-ice-muted">@user-{id?.substring(0, 8)} • 1.2M subscribers • {videos.length} videos</p>
          </div>
          <div className="mb-2">
            {user?.uid === id ? (
              <button className="bg-white/10 hover:bg-white/20 border border-ice-border px-6 py-2 rounded-full font-bold transition-colors">
                Customize Channel
              </button>
            ) : (
              <button className="bg-ice-text text-ice-bg px-8 py-2 rounded-full font-bold hover:bg-white/90 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                Subscribe
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-8 border-b border-ice-border mb-8">
          <button className="pb-4 border-b-2 border-ice-accent font-medium text-ice-accent">Videos</button>
          <button className="pb-4 font-medium text-ice-muted hover:text-ice-text transition-colors">Playlists</button>
          <button className="pb-4 font-medium text-ice-muted hover:text-ice-text transition-colors">Community</button>
          <button className="pb-4 font-medium text-ice-muted hover:text-ice-text transition-colors">About</button>
        </div>

        {/* Videos Grid */}
        {videos.length === 0 ? (
          <div className="text-center py-20 text-ice-muted">
            <p className="text-xl">This channel hasn't uploaded any videos yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video as any} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
