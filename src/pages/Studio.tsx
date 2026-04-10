import React, { useState } from 'react';
import { useAuth } from '../App';
import { Upload, Video as VideoIcon, Image as ImageIcon, Loader2, Smartphone, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../lib/firebase';
import { setDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const MAX_VIDEO_SIZE_MB = 50;
const CLOUDINARY_CLOUD_NAME = 'du6zw4m8g';
const CLOUDINARY_UPLOAD_PRESET = 'icetube_uploads';

export default function Studio() {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      toast.error(`Видео превышает лимит ${MAX_VIDEO_SIZE_MB}МБ.`);
      e.target.value = '';
      return;
    }

    const videoElement = document.createElement('video');
    videoElement.preload = 'metadata';
    videoElement.onloadedmetadata = () => {
      window.URL.revokeObjectURL(videoElement.src);
      const minutes = Math.floor(videoElement.duration / 60);
      const seconds = Math.floor(videoElement.duration % 60);
      setVideoDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      
      if (videoElement.duration <= 60 && videoElement.videoHeight > videoElement.videoWidth) {
        setIsShort(true);
      }
    };
    videoElement.src = URL.createObjectURL(file);
    setVideoFile(file);
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
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
          reject(new Error('Загрузка не удалась'));
        }
      };

      xhr.onerror = () => reject(new Error('Загрузка не удалась из-за сетевой ошибки'));
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
        createdAt: new Date().toISOString(),
        duration: videoDuration,
        isShort: isShort
      };

      await setDoc(doc(db, 'videos', videoId), newVideoData);
      toast.success('Видео успешно опубликовано!');
      navigate('/studio/content');
    } catch (error: any) {
      toast.error(error.message || 'Ошибка при загрузке видео');
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-gray-300" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Творческая студия</h2>
        <p className="text-gray-500 mb-8">Пожалуйста, войдите, чтобы загрузить видео и управлять своим контентом.</p>
        <button onClick={() => navigate('/')} className="studio-button-primary w-full">На главную</button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
          <h1 className="text-xl font-bold text-gray-900">Загрузка видео</h1>
          <button onClick={() => navigate('/studio')} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleUpload} className="p-8 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-8">
              {/* Video Upload Area */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Файл видео</label>
                <div className="relative group border-2 border-dashed border-gray-200 rounded-xl p-10 hover:border-blue-500 hover:bg-blue-50/30 transition-all text-center cursor-pointer bg-gray-50/50">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    required
                  />
                  {videoFile ? (
                    <div className="flex flex-col items-center text-blue-600">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <VideoIcon className="w-8 h-8" />
                      </div>
                      <span className="text-sm font-bold truncate max-w-full text-gray-900">{videoFile.name}</span>
                      <span className="text-xs text-gray-500 mt-2 font-medium">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB • {videoDuration}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                        <Upload className="w-8 h-8" />
                      </div>
                      <span className="text-sm font-bold text-gray-600">Выберите файл для загрузки</span>
                      <span className="text-xs mt-2 font-medium">MP4, WebM или MOV (макс. {MAX_VIDEO_SIZE_MB}MB)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Thumbnail Upload */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Значок (превью)</label>
                <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:bg-blue-50/30 transition-all text-center cursor-pointer bg-gray-50/50">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  {thumbnailFile ? (
                    <div className="flex items-center justify-center gap-3 text-blue-600">
                      <ImageIcon className="w-6 h-6" />
                      <span className="text-sm font-bold text-gray-900 truncate">{thumbnailFile.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <ImageIcon className="w-6 h-6 mb-2" />
                      <span className="text-xs font-bold text-gray-600">Загрузить значок</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Shorts Toggle */}
              <div className="flex items-center justify-between p-5 bg-blue-50/50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-blue-900">Загрузить как Short</h4>
                    <p className="text-[10px] text-blue-700 font-medium uppercase tracking-wider mt-0.5">Вертикальное видео до 60 секунд</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={isShort} onChange={(e) => setIsShort(e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Название (обязательно)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all"
                  placeholder="Добавьте название, которое отражает суть видео"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Описание</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium h-48 resize-none transition-all"
                  placeholder="Расскажите зрителям о своем видео"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Категория</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-bold text-gray-700 transition-all appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%221.67%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-[right_1rem_center] bg-no-repeat"
                >
                  <option value="Gaming">Игры</option>
                  <option value="Music">Музыка</option>
                  <option value="Education">Образование</option>
                  <option value="Entertainment">Развлечения</option>
                  <option value="Tech">Технологии</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-100 flex items-center justify-between">
            <div className="flex-1 max-w-xs">
              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                    <span>Загрузка...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={uploading || !videoFile || !title}
              className="bg-blue-600 text-white font-bold py-3 px-10 rounded-sm hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 uppercase text-xs tracking-widest shadow-md hover:shadow-lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Публикация...
                </>
              ) : (
                'Опубликовать'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
