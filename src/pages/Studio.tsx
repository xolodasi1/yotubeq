import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Upload, Video as VideoIcon, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { VideoType } from '../types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';

export default function Studio() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Gaming');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchVideos = async () => {
      try {
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .eq('authorId', user.uid)
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
  }, [user]);

  const uploadFile = async (file: File, bucket: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${user?.uid}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrl;
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

      // Create video record
      const { data, error } = await supabase
        .from('videos')
        .insert([
          {
            title,
            description,
            category,
            videoUrl,
            thumbnailUrl,
            authorId: user.uid,
            authorName: user.displayName,
            authorPhotoUrl: user.photoURL,
            duration: '10:00',
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setVideos([data, ...videos]);
      
      // Reset form
      setTitle('');
      setDescription('');
      setVideoFile(null);
      setThumbnailFile(null);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 2000);
      toast.success('Video uploaded successfully!');
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || 'Error uploading video');
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Creator Studio</h2>
        <p className="text-ice-muted">Please login to access the studio.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold ice-text-glow">Creator Studio</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Form */}
        <div className="lg:col-span-1">
          <div className="glass rounded-2xl p-6 border border-ice-border sticky top-24">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Upload className="w-5 h-5 text-ice-accent" />
              Upload Video
            </h2>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ice-muted mb-1">Video File</label>
                <div className="relative border-2 border-dashed border-ice-border rounded-xl p-4 hover:border-ice-accent transition-colors text-center cursor-pointer bg-black/20">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required
                  />
                  {videoFile ? (
                    <div className="flex items-center justify-center gap-2 text-ice-accent">
                      <VideoIcon className="w-5 h-5" />
                      <span className="truncate max-w-[200px]">{videoFile.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-ice-muted">
                      <Upload className="w-6 h-6 mb-2" />
                      <span className="text-sm">Click or drag video here</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ice-muted mb-1">Thumbnail</label>
                <div className="relative border-2 border-dashed border-ice-border rounded-xl p-4 hover:border-ice-accent transition-colors text-center cursor-pointer bg-black/20">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required
                  />
                  {thumbnailFile ? (
                    <div className="flex items-center justify-center gap-2 text-ice-accent">
                      <ImageIcon className="w-5 h-5" />
                      <span className="truncate max-w-[200px]">{thumbnailFile.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-ice-muted">
                      <ImageIcon className="w-6 h-6 mb-2" />
                      <span className="text-sm">Click or drag thumbnail here</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ice-muted mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black/40 border border-ice-border rounded-lg py-2 px-4 focus:outline-none focus:border-ice-accent text-ice-text"
                  required
                  placeholder="Catchy title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ice-muted mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-black/40 border border-ice-border rounded-lg py-2 px-4 focus:outline-none focus:border-ice-accent text-ice-text h-24 resize-none"
                  required
                  placeholder="Tell viewers about your video..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ice-muted mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-black/40 border border-ice-border rounded-lg py-2 px-4 focus:outline-none focus:border-ice-accent text-ice-text [&>option]:bg-gray-900"
                >
                  <option>Gaming</option>
                  <option>Music</option>
                  <option>Education</option>
                  <option>Entertainment</option>
                  <option>Tech</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={uploading || !videoFile || !thumbnailFile || !title}
                className="w-full bg-ice-accent text-ice-bg font-bold py-3 rounded-xl hover:bg-ice-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,242,255,0.3)]"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading... {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Publish Video
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Video List */}
        <div className="lg:col-span-2">
          <div className="glass rounded-2xl p-6 border border-ice-border min-h-[600px]">
            <h2 className="text-xl font-bold mb-6">Your Content</h2>
            
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-ice-accent" />
              </div>
            ) : videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-ice-muted">
                <VideoIcon className="w-16 h-16 mb-4 opacity-20" />
                <p>No videos uploaded yet.</p>
                <p className="text-sm mt-2">Upload your first video to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {videos.map((v) => (
                  <div key={v.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-colors group">
                    <div className="w-32 aspect-video rounded-lg overflow-hidden shrink-0 border border-ice-border">
                      <img src={v.thumbnailUrl} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold truncate group-hover:text-ice-accent transition-colors">{v.title}</h4>
                      <p className="text-sm text-ice-muted truncate">{v.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-ice-muted">
                        <span>{v.views} views</span>
                        <span>{v.likes} likes</span>
                        <span>{v.createdAt ? format(new Date(v.createdAt), 'MMM d, yyyy') : 'Just now'}</span>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-all text-red-400 hover:text-red-300">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
