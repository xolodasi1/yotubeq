import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Video, UserProfile } from '../types';
import VideoCard from '../components/VideoCard';
import { Loader2, Snowflake, User, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';

export default function Channel() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'videos' | 'about'>('videos');

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', id));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        }

        const q = query(collection(db, 'videos'), where('authorId', '==', id), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setVideos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Video)));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, `users/${id}/videos`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-ice-accent animate-spin" />
        <p className="text-ice-muted font-medium">Loading channel data...</p>
      </div>
    );
  }

  if (!profile) return <div className="text-center py-20 text-ice-muted">Channel not found.</div>;

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      <div className="h-48 md:h-64 rounded-3xl overflow-hidden glass border border-ice-border relative">
        <div className="absolute inset-0 bg-gradient-to-br from-ice-accent/20 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <Snowflake className="w-64 h-64 text-ice-accent" />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:items-end -mt-16 md:-mt-20 px-4 md:px-8">
        <img
          src={profile.photoURL}
          alt={profile.displayName}
          className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-ice-bg shadow-2xl relative z-10"
          referrerPolicy="no-referrer"
        />
        <div className="flex-1 flex flex-col gap-2 mb-2">
          <h1 className="text-3xl md:text-4xl font-bold ice-text-glow">{profile.displayName}</h1>
          <div className="flex items-center gap-4 text-sm text-ice-muted font-medium">
            <span className="flex items-center gap-1"><User className="w-4 h-4" /> @{profile.displayName.replace(/\s+/g, '').toLowerCase()}</span>
            <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {profile.subscribers.toLocaleString()} subscribers</span>
            <span className="flex items-center gap-1"><Snowflake className="w-4 h-4" /> {videos.length} videos</span>
          </div>
          <button className="bg-ice-accent text-ice-bg px-8 py-2 rounded-full font-bold hover:shadow-[0_0_20px_rgba(0,242,255,0.5)] transition-all w-fit mt-2">
            Subscribe
          </button>
        </div>
      </div>

      <div className="flex border-b border-ice-border px-4 md:px-8">
        {['videos', 'about'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-4 text-sm font-bold uppercase tracking-widest transition-all relative ${
              activeTab === tab ? 'text-ice-accent' : 'text-ice-muted hover:text-ice-text'
            }`}
          >
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-ice-accent shadow-[0_0_10px_rgba(0,242,255,0.8)]" />}
          </button>
        ))}
      </div>

      <div className="px-4 md:px-8 pb-12">
        {activeTab === 'videos' ? (
          videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-ice-muted italic">No videos uploaded yet.</div>
          )
        ) : (
          <div className="max-w-3xl flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <h3 className="text-xl font-bold">Description</h3>
              <p className="text-ice-text/80 leading-relaxed whitespace-pre-wrap">
                {profile.bio || 'No description provided for this channel.'}
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <h3 className="text-xl font-bold">Stats</h3>
              <div className="flex flex-col gap-3 text-sm text-ice-muted">
                <div className="flex items-center gap-2 border-b border-ice-border/30 pb-2">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {profile.joinedAt?.toDate ? format(profile.joinedAt.toDate(), 'MMM d, yyyy') : 'Recently'}</span>
                </div>
                <div className="flex items-center gap-2 border-b border-ice-border/30 pb-2">
                  <Snowflake className="w-4 h-4" />
                  <span>{videos.reduce((acc, v) => acc + v.views, 0).toLocaleString()} total views</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
