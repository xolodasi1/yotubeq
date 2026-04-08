import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import VideoCard from '../components/VideoCard';
import { VideoType } from '../types';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const CATEGORIES = ['All', 'Gaming', 'Music', 'Education', 'Entertainment', 'Tech', 'Winter Sports', 'Arctic Tech', 'Chill'];

export default function Home() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const [activeCategory, setActiveCategory] = useState('All');
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .order('createdAt', { ascending: false });
        
        if (error) throw error;
        setVideos(data || []);
      } catch (error) {
        console.error("Error fetching videos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.authorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || video.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Categories */}
      <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-4 py-1.5 rounded-full whitespace-nowrap transition-all duration-300 ${
              activeCategory === category
                ? 'bg-ice-accent text-ice-bg font-medium shadow-[0_0_15px_rgba(0,242,255,0.4)]'
                : 'bg-white/5 hover:bg-white/10 text-ice-text border border-ice-border'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {searchQuery && (
        <h2 className="text-xl font-bold mb-6">
          Search results for: <span className="text-ice-accent">"{searchQuery}"</span>
        </h2>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-ice-accent" />
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-20 text-ice-muted">
          <p className="text-xl">No videos found in the frost.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
          {filteredVideos.map((video) => (
            <VideoCard key={video.id} video={video as any} />
          ))}
        </div>
      )}
    </div>
  );
}
