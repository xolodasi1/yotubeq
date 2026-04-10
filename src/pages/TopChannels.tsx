import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { Loader2, Trophy, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TopChannel {
  uid: string;
  displayName: string;
  photoURL: string;
  bio?: string;
  subscribers: number;
}

export default function TopChannels() {
  const [channels, setChannels] = useState<TopChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopChannels = async () => {
      try {
        const q = query(
          collection(db, 'users'),
          orderBy('subscribers', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data(),
          subscribers: doc.data().subscribers || 0
        })) as TopChannel[];
        
        setChannels(data);
      } catch (error) {
        console.error("Error fetching top channels:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopChannels();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-ice-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-ice-accent/20 flex items-center justify-center">
          <Trophy className="w-6 h-6 text-ice-accent" />
        </div>
        <div>
          <h1 className="text-3xl font-bold ice-text-glow">Top Creators</h1>
          <p className="text-ice-muted">Discover the most popular channels</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {channels.map((channel, index) => (
          <Link 
            key={channel.uid} 
            to={`/channel/${channel.uid}`}
            className="glass rounded-2xl p-6 border border-ice-border hover:border-ice-accent/50 transition-all group relative overflow-hidden"
          >
            {/* Rank Badge */}
            <div className={`absolute top-0 right-0 w-16 h-16 flex items-start justify-end p-3 rounded-bl-3xl ${
              index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
              index === 1 ? 'bg-gray-400/20 text-gray-400' :
              index === 2 ? 'bg-amber-700/20 text-amber-700' :
              'bg-white/5 text-ice-muted'
            }`}>
              <span className="font-bold text-lg">#{index + 1}</span>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <img 
                src={channel.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${channel.uid}`} 
                alt={channel.displayName} 
                className="w-16 h-16 rounded-full border-2 border-ice-accent/30 group-hover:border-ice-accent transition-colors"
              />
              <div>
                <h2 className="text-xl font-bold group-hover:text-ice-accent transition-colors line-clamp-1">{channel.displayName}</h2>
                <div className="flex items-center gap-1 text-ice-muted">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">{channel.subscribers.toLocaleString()} subscribers</span>
                </div>
              </div>
            </div>

            {channel.bio && (
              <p className="text-sm text-ice-text/80 line-clamp-2 mt-2">
                {channel.bio}
              </p>
            )}
          </Link>
        ))}

        {channels.length === 0 && (
          <div className="col-span-full text-center py-20 text-ice-muted">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <h2 className="text-2xl font-bold">No creators found</h2>
            <p className="mt-2">Be the first to create a channel!</p>
          </div>
        )}
      </div>
    </div>
  );
}
