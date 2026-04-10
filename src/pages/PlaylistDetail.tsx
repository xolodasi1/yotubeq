import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../App';
import VideoCard from '../components/VideoCard';
import { VideoType, Playlist } from '../types';
import { Loader2, PlaySquare, ChevronRight } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchPlaylist = async () => {
      try {
        setLoading(true);
        const snap = await getDoc(doc(db, 'playlists', id));
        if (snap.exists()) {
          const data = snap.data() as Playlist;
          setPlaylist(data);

          const videoPromises = data.videoIds.map(vid => getDoc(doc(db, 'videos', vid)));
          const videoSnaps = await Promise.all(videoPromises);
          setVideos(videoSnaps.filter(s => s.exists()).map(s => ({
            ...s.data(),
            createdAt: s.data().createdAt?.toDate()?.toISOString()
          })) as VideoType[]);
        }
      } catch (error) {
        console.error("Error fetching playlist detail:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylist();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-ice-accent" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-ice-muted">
        <h2 className="text-2xl font-bold">Плейлист не найден</h2>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-2 text-sm text-ice-muted mb-4">
        <Link to="/playlists" className="hover:text-ice-accent transition-colors">Плейлисты</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-ice-text font-medium">{playlist.title}</span>
      </div>

      <div className="flex flex-col md:flex-row gap-8 mb-12">
        <div className="md:w-80 shrink-0">
          <div className="glass rounded-3xl border border-ice-border overflow-hidden p-6 aspect-video md:aspect-square flex flex-col items-center justify-center gap-4 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-ice-accent/20 to-transparent pointer-events-none"></div>
            <PlaySquare className="w-16 h-16 text-ice-accent" />
            <div className="text-center z-10">
              <h1 className="text-2xl font-bold mb-2">{playlist.title}</h1>
              <p className="text-ice-muted text-sm">{videos.length} видео</p>
            </div>
          </div>
        </div>

        <div className="flex-1">
          {videos.length === 0 ? (
            <p className="text-ice-muted">В этом плейлисте пока нет видео.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
