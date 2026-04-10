import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Upload, Video as VideoIcon, Image as ImageIcon, X, Loader2, BarChart3, Settings as SettingsIcon, Edit3, Trash2, Smartphone } from 'lucide-react';
import { VideoType } from '../types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { db, auth } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, setDoc, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';

const MAX_VIDEO_SIZE_MB = 50; // 50MB limit for test
const CLOUDINARY_CLOUD_NAME = 'du6zw4m8g';
const CLOUDINARY_UPLOAD_PRESET = 'icetube_uploads';

export default function Studio() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'content' | 'analytics' | 'customization'>('content');
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
  const [videoDuration, setVideoDuration] = useState('00:00');
  const [isShort, setIsShort] = useState(false);

  // Channel Customization
  const [channelName, setChannelName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [bannerPreview, setBannerPreview] = useState('');
  const [savingChannel, setSavingChannel] = useState(false);

  useEffect(() => {
    if (user) {
      setChannelName(user.displayName || '');
      setAvatarPreview(user.photoURL || '');
      
      // Fetch extra user details (bio, banner)
      const fetchUserDetails = async () => {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setBio(data.bio || '');
          if (data.bannerUrl) setBannerPreview(data.bannerUrl);
          if (data.photoURL) setAvatarPreview(data.photoURL);
        }
      };
      fetchUserDetails();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchVideos = async () => {
      try {
        const q = query(
          collection(db, 'videos'),
          where('authorId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()?.toISOString()
        })) as VideoType[];
        setVideos(data);
      } catch (error) {
        console.error("Error fetching videos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, [user]);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      toast.error(`Video exceeds ${MAX_VIDEO_SIZE_MB}MB limit.`);
      e.target.value = '';
      return;
    }

    // Get duration
    const videoElement = document.createElement('video');
    videoElement.preload = 'metadata';
    videoElement.onloadedmetadata = () => {
      window.URL.revokeObjectURL(videoElement.src);
      const minutes = Math.floor(videoElement.duration / 60);
      const seconds = Math.floor(videoElement.duration % 60);
      setVideoDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      
      // Auto-detect short if duration < 60s and vertical aspect ratio
      if (videoElement.duration <= 60 && videoElement.videoHeight > videoElement.videoWidth) {
        setIsShort(true);
      }
    };
    videoElement.src = URL.createObjectURL(file);

    setVideoFile(file);
  };

  const uploadFile = (file: File, folder: string, onProgress?: (progress: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
      const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', `icetube/${folder}`);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = (e.loaded / e.total) * 100;
          onProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve(response.secure_url);
        } else {
          console.error('Cloudinary upload error:', xhr.responseText);
          reject(new Error('Upload failed'));
        }
      };

      xhr.onerror = () => reject(new Error('Upload failed due to network error'));

      xhr.send(formData);
    });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !videoFile || uploading) return;

    setUploading(true);
    setUploadProgress(0);
    try {
      const videoUrl = await uploadFile(videoFile, 'videos', (progress) => {
        setUploadProgress(Math.round(progress * 0.8));
      });

      let thumbnailUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop';
      if (thumbnailFile) {
        thumbnailUrl = await uploadFile(thumbnailFile, 'thumbnails', (progress) => {
          setUploadProgress(80 + Math.round(progress * 0.1));
        });
      }

      setUploadProgress(95);

      const videoId = crypto.randomUUID();
      const newVideoData = {
        id: videoId,
        title,
        description: description || '',
        category,
        videoUrl,
        thumbnailUrl,
        authorId: user.uid,
        authorName: user.displayName,
        authorPhotoUrl: user.photoURL,
        views: 0,
        likes: 0,
        createdAt: new Date(),
        duration: videoDuration,
        isShort: isShort
      };

      await setDoc(doc(db, 'videos', videoId), newVideoData);

      setVideos([{...newVideoData, createdAt: newVideoData.createdAt.toISOString()} as any, ...videos]);
      
      setTitle('');
      setDescription('');
      setVideoFile(null);
      setThumbnailFile(null);
      setIsShort(false);
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

  const handleDeleteVideo = async (videoId: string, videoUrl: string, thumbnailUrl: string) => {
    if (!window.confirm('Are you sure you want to delete this video? This action cannot be undone.')) return;

    try {
      await deleteDoc(doc(db, 'videos', videoId));
      setVideos(videos.filter(v => v.id !== videoId));
      toast.success('Video deleted');
    } catch (error) {
      console.error("Error deleting video:", error);
      toast.error('Failed to delete video');
    }
  };

  const handleSaveChannel = async () => {
    if (!user || !channelName.trim()) return;
    setSavingChannel(true);
    try {
      let newAvatarUrl = avatarPreview;
      let newBannerUrl = bannerPreview;

      if (avatarFile) {
        newAvatarUrl = await uploadFile(avatarFile, 'avatars');
      }
      if (bannerFile) {
        newBannerUrl = await uploadFile(bannerFile, 'banners');
      }

      // Update Firestore user document
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: channelName,
        bio: bio,
        photoURL: newAvatarUrl,
        bannerUrl: newBannerUrl
      });

      // Update Auth Profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: channelName,
          photoURL: newAvatarUrl
        });
      }

      toast.success('Channel updated! (Refresh to see changes globally)');
      setAvatarFile(null);
      setBannerFile(null);
    } catch (error: any) {
      toast.error('Failed to update channel');
    } finally {
      setSavingChannel(false);
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

  const totalViews = videos.reduce((acc, v) => acc + v.views, 0);
  const totalLikes = videos.reduce((acc, v) => acc + v.likes, 0);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-black/50 pb-20 md:pb-0">
      {/* Studio Header */}
      <div className="glass border-b border-ice-border px-4 md:px-8 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src={user.photoURL || ''} alt="Channel" className="w-12 h-12 rounded-full border border-ice-accent" />
            <div>
              <h1 className="text-xl font-bold ice-text-glow">Studio</h1>
              <p className="text-sm text-ice-muted">{user.displayName}</p>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button 
              onClick={() => setActiveTab('content')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${activeTab === 'content' ? 'bg-ice-accent text-ice-bg' : 'hover:bg-white/10'}`}
            >
              <VideoIcon className="w-4 h-4 inline-block mr-2" /> Content
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${activeTab === 'analytics' ? 'bg-ice-accent text-ice-bg' : 'hover:bg-white/10'}`}
            >
              <BarChart3 className="w-4 h-4 inline-block mr-2" /> Analytics
            </button>
            <button 
              onClick={() => setActiveTab('customization')}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${activeTab === 'customization' ? 'bg-ice-accent text-ice-bg' : 'hover:bg-white/10'}`}
            >
              <Edit3 className="w-4 h-4 inline-block mr-2" /> Customization
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {activeTab === 'content' && (
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
                    <label className="block text-sm font-medium text-ice-muted mb-1">Video File (Max {MAX_VIDEO_SIZE_MB}MB)</label>
                    <div className="relative border-2 border-dashed border-ice-border rounded-xl p-4 hover:border-ice-accent transition-colors text-center cursor-pointer bg-black/20">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoSelect}
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
                    <label className="block text-sm font-medium text-ice-muted mb-1">Thumbnail (Optional)</label>
                    <div className="relative border-2 border-dashed border-ice-border rounded-xl p-4 hover:border-ice-accent transition-colors text-center cursor-pointer bg-black/20">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
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

                  <div className="flex items-center gap-3 p-3 bg-black/40 border border-ice-border rounded-xl">
                    <div className={`p-2 rounded-lg ${isShort ? 'bg-ice-accent text-ice-bg' : 'bg-white/5 text-ice-muted'}`}>
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">Upload as Short</h4>
                      <p className="text-xs text-ice-muted">Vertical video under 60s</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={isShort} onChange={(e) => setIsShort(e.target.checked)} />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ice-accent"></div>
                    </label>
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
                    <label className="block text-sm font-medium text-ice-muted mb-1">Description (Optional)</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-black/40 border border-ice-border rounded-lg py-2 px-4 focus:outline-none focus:border-ice-accent text-ice-text h-24 resize-none"
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
                    disabled={uploading || !videoFile || !title}
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
                        <div className={`aspect-video rounded-lg overflow-hidden shrink-0 border border-ice-border relative ${v.isShort ? 'w-20 aspect-[9/16]' : 'w-32'}`}>
                          <img src={v.thumbnailUrl} className="w-full h-full object-cover" />
                          <div className="absolute bottom-1 right-1 bg-black/80 px-1 rounded text-[10px]">{v.duration}</div>
                          {v.isShort && (
                            <div className="absolute top-1 left-1 bg-ice-accent text-ice-bg px-1 rounded text-[10px] font-bold">
                              SHORT
                            </div>
                          )}
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
                        <button 
                          onClick={() => handleDeleteVideo(v.id, v.videoUrl, v.thumbnailUrl)}
                          className="p-2 hover:bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-all text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass p-6 rounded-2xl border border-ice-border">
                <h3 className="text-ice-muted font-medium mb-2">Total Views</h3>
                <p className="text-4xl font-bold ice-text-glow">{totalViews.toLocaleString()}</p>
              </div>
              <div className="glass p-6 rounded-2xl border border-ice-border">
                <h3 className="text-ice-muted font-medium mb-2">Total Likes</h3>
                <p className="text-4xl font-bold ice-text-glow">{totalLikes.toLocaleString()}</p>
              </div>
              <div className="glass p-6 rounded-2xl border border-ice-border">
                <h3 className="text-ice-muted font-medium mb-2">Videos</h3>
                <p className="text-4xl font-bold ice-text-glow">{videos.length}</p>
              </div>
            </div>
            <div className="glass p-6 rounded-2xl border border-ice-border h-64 flex items-center justify-center text-ice-muted">
              <BarChart3 className="w-8 h-8 mr-2 opacity-50" />
              More detailed analytics coming soon!
            </div>
          </div>
        )}

        {activeTab === 'customization' && (
          <div className="glass p-6 rounded-2xl border border-ice-border max-w-2xl">
            <h2 className="text-xl font-bold mb-6">Channel Customization</h2>
            <div className="space-y-6">
              
              {/* Avatar Upload */}
              <div>
                <label className="block text-sm font-medium text-ice-muted mb-2">Profile Picture</label>
                <div className="flex items-center gap-4">
                  <img 
                    src={avatarPreview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                    alt="Avatar Preview" 
                    className="w-20 h-20 rounded-full border-2 border-ice-accent object-cover"
                  />
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAvatarFile(file);
                          setAvatarPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="block w-full text-sm text-ice-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-ice-accent/10 file:text-ice-accent hover:file:bg-ice-accent/20 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Banner Upload */}
              <div>
                <label className="block text-sm font-medium text-ice-muted mb-2">Channel Banner</label>
                <div className="space-y-3">
                  {bannerPreview && (
                    <div className="w-full h-32 rounded-xl overflow-hidden border border-ice-border relative">
                      <img src={bannerPreview} alt="Banner Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setBannerFile(file);
                        setBannerPreview(URL.createObjectURL(file));
                      }
                    }}
                    className="block w-full text-sm text-ice-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-ice-accent/10 file:text-ice-accent hover:file:bg-ice-accent/20 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ice-muted mb-2">Channel Name</label>
                <input
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  className="w-full bg-black/40 border border-ice-border rounded-lg py-3 px-4 focus:outline-none focus:border-ice-accent text-ice-text"
                />
                <p className="text-xs text-ice-muted mt-2">Choose a name that represents you and your content.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-ice-muted mb-2">Description (Bio)</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-black/40 border border-ice-border rounded-lg py-3 px-4 focus:outline-none focus:border-ice-accent text-ice-text h-24 resize-none"
                  placeholder="Tell viewers about your channel..."
                />
              </div>

              <button
                onClick={handleSaveChannel}
                disabled={savingChannel || !channelName.trim()}
                className="bg-ice-accent text-ice-bg font-bold py-2 px-6 rounded-xl hover:bg-ice-accent/90 transition-all disabled:opacity-50"
              >
                {savingChannel ? 'Saving...' : 'Publish Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
