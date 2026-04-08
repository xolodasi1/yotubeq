import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../App';
import { Video as VideoType } from '../types';
import { Upload, BarChart3, Play, Trash2, Edit, Loader2, Snowflake, TrendingUp, Users, Eye, ThumbsUp } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { getProxiedUrl } from '../lib/proxy';

export default function Studio() {
  const { user, profile } = useAuth();
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchVideos = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'videos'), where('authorId', '==', user.uid), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setVideos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoType)));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'videos');
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [user]);

  const uploadFile = async (file: File, folder: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', user!.uid);
    formData.append('folder', folder);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    const data = await response.json();
    return data.url;
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !videoFile || !thumbnailFile || uploading) return;

    setUploading(true);
    setUploadProgress(10);
    try {
      // Upload video
      const videoUrl = await uploadFile(videoFile, 'videos');
      setUploadProgress(50);

      // Upload thumbnail
      const thumbnailUrl = await uploadFile(thumbnailFile, 'thumbnails');
      setUploadProgress(80);

      // Create firestore doc
      const newVideo = {
        title,
        description,
        category,
        videoUrl,
        thumbnailUrl,
        authorId: user.uid,
        authorName: user.displayName || 'IceUser',
        authorPhotoUrl: user.photoURL || '',
        views: 0,
        likes: 0,
        createdAt: serverTimestamp(),
        duration: '10:00', // Mock duration
      };

      const docRef = await addDoc(collection(db, 'videos'), newVideo);
      setVideos([{ id: docRef.id, ...newVideo, createdAt: { toDate: () => new Date() } } as any, ...videos]);
      
      // Reset form
      setTitle('');
      setDescription('');
      setVideoFile(null);
      setThumbnailFile(null);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 2000);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || 'Error uploading video');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this video? It will be frozen forever.')) return;
    try {
      await deleteDoc(doc(db, 'videos', id));
      setVideos(videos.filter(v => v.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `videos/${id}`);
    }
  };

  // Mock analytics data
  const analyticsData = [
    { name: 'Mon', views: 400, subs: 24 },
    { name: 'Tue', views: 300, subs: 13 },
    { name: 'Wed', views: 200, subs: 98 },
    { name: 'Thu', views: 278, subs: 39 },
    { name: 'Fri', views: 189, subs: 48 },
    { name: 'Sat', views: 239, subs: 38 },
    { name: 'Sun', views: 349, subs: 43 },
  ];

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-ice-accent animate-spin" />
        <p className="text-ice-muted font-medium">Entering the studio...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold ice-text-glow">IceTube Studio</h1>
          <p className="text-ice-muted">Manage your content and track your growth in the frost.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass px-4 py-2 rounded-2xl border border-ice-border flex items-center gap-3">
            <Users className="w-5 h-5 text-ice-accent" />
            <div className="flex flex-col">
              <span className="text-xs text-ice-muted uppercase font-bold tracking-tighter">Subscribers</span>
              <span className="text-lg font-bold">{profile?.subscribers.toLocaleString() || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Analytics Section */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="glass p-6 rounded-3xl border border-ice-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-ice-accent" />
                Channel Analytics
              </h3>
              <div className="flex items-center gap-2 text-xs font-bold text-ice-accent bg-ice-accent/10 px-3 py-1 rounded-full">
                <TrendingUp className="w-3 h-3" />
                +12% vs last week
              </div>
            </div>
            
            <div className="w-full relative h-[300px]">
              <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0}>
                <AreaChart data={analyticsData}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00f2ff" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00f2ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2f45" vertical={false} />
                  <XAxis dataKey="name" stroke="#8ba8b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#8ba8b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#050b14', border: '1px solid rgba(0, 242, 255, 0.2)', borderRadius: '12px' }}
                    itemStyle={{ color: '#00f2ff' }}
                  />
                  <Area type="monotone" dataKey="views" stroke="#00f2ff" fillOpacity={1} fill="url(#colorViews)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass p-6 rounded-3xl border border-ice-border">
            <h3 className="text-xl font-bold mb-6">Your Content</h3>
            <div className="flex flex-col gap-4">
              {videos.map((v) => (
                <div key={v.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-colors group">
                  <div className="w-32 aspect-video rounded-lg overflow-hidden shrink-0 border border-ice-border">
                    <img src={getProxiedUrl(v.thumbnailUrl)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold truncate group-hover:text-ice-accent transition-colors">{v.title}</h4>
                    <div className="flex items-center gap-4 text-xs text-ice-muted mt-1">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {v.views}</span>
                      <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {v.likes}</span>
                      <span>{v.createdAt?.toDate ? format(v.createdAt.toDate(), 'MMM d, yyyy') : 'Recently'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-ice-accent/20 rounded-full text-ice-muted hover:text-ice-accent transition-colors">
                      <Edit className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(v.id)} className="p-2 hover:bg-red-500/20 rounded-full text-ice-muted hover:text-red-400 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
              {videos.length === 0 && <p className="text-center py-8 text-ice-muted italic">No videos yet. Start uploading!</p>}
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="flex flex-col gap-6">
          <div className="glass p-6 rounded-3xl border border-ice-border sticky top-24">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Upload className="w-5 h-5 text-ice-accent" />
              Upload Video
            </h3>
            
            <form onSubmit={handleUpload} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-ice-muted uppercase tracking-widest ml-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Catchy title..."
                  className="bg-black/40 border border-ice-border rounded-xl py-2 px-4 focus:outline-none focus:border-ice-accent transition-all text-sm"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-ice-muted uppercase tracking-widest ml-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Tell your viewers more..."
                  className="bg-black/40 border border-ice-border rounded-xl py-2 px-4 focus:outline-none focus:border-ice-accent transition-all text-sm resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-ice-muted uppercase tracking-widest ml-1">Video File</label>
                <div className="relative group">
                  <input
                    type="file"
                    accept="video/*"
                    required
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="bg-black/40 border border-dashed border-ice-border rounded-xl py-4 px-4 flex flex-center justify-center gap-2 group-hover:border-ice-accent transition-all text-sm text-ice-muted">
                    <Play className="w-4 h-4" />
                    <span>{videoFile ? videoFile.name : 'Select Video'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-ice-muted uppercase tracking-widest ml-1">Thumbnail</label>
                <div className="relative group">
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="bg-black/40 border border-dashed border-ice-border rounded-xl py-4 px-4 flex flex-center justify-center gap-2 group-hover:border-ice-accent transition-all text-sm text-ice-muted">
                    <Upload className="w-4 h-4" />
                    <span>{thumbnailFile ? thumbnailFile.name : 'Select Thumbnail'}</span>
                  </div>
                </div>
              </div>

              {uploading && (
                <div className="flex flex-col gap-2 mt-2">
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-ice-accent transition-all duration-500 shadow-[0_0_10px_rgba(0,242,255,0.8)]" 
                      style={{ width: `${uploadProgress}%` }} 
                    />
                  </div>
                  <p className="text-[10px] text-center text-ice-accent font-bold animate-pulse">FREEZING ASSETS... {uploadProgress}%</p>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || !videoFile || !thumbnailFile}
                className="mt-4 bg-ice-accent text-ice-bg py-3 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(0,242,255,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Snowflake className="w-5 h-5" />}
                {uploading ? 'Uploading...' : 'Publish Video'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
