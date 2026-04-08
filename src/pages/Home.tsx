import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, limit, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Video } from '../types';
import VideoCard from '../components/VideoCard';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Snowflake } from 'lucide-react';

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get('q');

  useEffect(() => {
    const fetchVideos = async () => {
      console.log('Fetching videos...', queryParam);
      setLoading(true);
      try {
        let q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(24));
        
        const querySnapshot = await getDocs(q);
        console.log('Fetched videos count:', querySnapshot.size);
        const fetchedVideos = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Video));
        
        if (queryParam) {
          const filtered = fetchedVideos.filter(v => 
            v.title.toLowerCase().includes(queryParam.toLowerCase()) || 
            v.description.toLowerCase().includes(queryParam.toLowerCase())
          );
          setVideos(filtered);
        } else {
          setVideos(fetchedVideos);
        }
      } catch (error) {
        console.error('Error in fetchVideos:', error);
        handleFirestoreError(error, OperationType.LIST, 'videos');
      } finally {
        console.log('Fetch complete, setting loading to false');
        setLoading(false);
      }
    };

    fetchVideos();
  }, [queryParam]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-ice-accent animate-spin" />
          <Snowflake className="w-6 h-6 text-ice-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <p className="text-ice-muted font-medium animate-pulse">Freezing the feed...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {['All', 'Music', 'Gaming', 'Live', 'Ice Sculpting', 'Arctic Tech', 'Winter Sports', 'Coding', 'Chill'].map((cat) => (
          <button
            key={cat}
            className="px-4 py-1.5 rounded-full glass border border-ice-border hover:border-ice-accent hover:text-ice-accent transition-all text-sm font-medium whitespace-nowrap"
          >
            {cat}
          </button>
        ))}
      </div>

      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-20 h-20 bg-ice-accent/10 rounded-full flex items-center justify-center border border-ice-accent/30">
            <Snowflake className="w-10 h-10 text-ice-accent" />
          </div>
          <div>
            <h2 className="text-2xl font-bold ice-text-glow">The tundra is empty</h2>
            <p className="text-ice-muted mt-2">No videos found. Be the first to break the ice!</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}
