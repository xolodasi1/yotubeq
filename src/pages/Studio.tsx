import React, { useState } from 'react';
import { useAuth } from '../App';
import { Upload, Video as VideoIcon, Image as ImageIcon, Loader2, Smartphone, X, AlertCircle, Sparkles, ListMusic, Music as MusicIcon, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../lib/firebase';
import { setDoc, doc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { generateVideoTitle, generateVideoDescription, generateVideoTags } from '../services/geminiService';

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
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('Gaming');
  const [soundName, setSoundName] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [musicMetadata, setMusicMetadata] = useState({
    author: '',
    composer: '',
    performer: '',
    otherParticipants: '',
    album: '',
    releaseYear: ''
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState('00:00');
  const [contentType, setContentType] = useState<'video' | 'short' | 'music' | 'photo'>('video');
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [generatingTags, setGeneratingTags] = useState(false);

  const handleGenerateTitle = async () => {
    if (!description && !category) {
      toast.error('Добавьте описание или выберите категорию для генерации');
      return;
    }
    setGeneratingTitle(true);
    try {
      const aiTitle = await generateVideoTitle(description, category);
      setTitle(aiTitle);
      toast.success('Название сгенерировано');
    } catch (error) {
      toast.error('Ошибка при генерации названия');
    } finally {
      setGeneratingTitle(false);
    }
  };

  const handleGenerateDesc = async () => {
    if (!title) {
      toast.error('Сначала введите название видео');
      return;
    }
    setGeneratingDesc(true);
    try {
      const aiDesc = await generateVideoDescription(title, category);
      setDescription(aiDesc);
      toast.success('Описание сгенерировано');
    } catch (error) {
      toast.error('Ошибка при генерации описания');
    } finally {
      setGeneratingDesc(false);
    }
  };

  const handleGenerateTags = async () => {
    if (!title) {
      toast.error('Сначала введите название видео');
      return;
    }
    setGeneratingTags(true);
    try {
      const aiTags = await generateVideoTags(title, description, category);
      setTags(aiTags);
      toast.success('Теги сгенерированы');
    } catch (error) {
      toast.error('Ошибка при генерации тегов');
    } finally {
      setGeneratingTags(false);
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      toast.error(`Видео превышает лимит ${MAX_VIDEO_SIZE_MB}МБ.`);
      e.target.value = '';
      return;
    }

    const isAudio = file.type.startsWith('audio/');
    const isImage = file.type.startsWith('image/');
    
    if (isImage) {
      setContentType('photo');
      setVideoDuration('00:00');
      setVideoFile(file);
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
      return;
    }

    const mediaElement = document.createElement(isAudio ? 'audio' : 'video');
    mediaElement.preload = 'metadata';
    mediaElement.onloadedmetadata = () => {
      window.URL.revokeObjectURL(mediaElement.src);
      const minutes = Math.floor(mediaElement.duration / 60);
      const seconds = Math.floor(mediaElement.duration % 60);
      setVideoDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      
      if (!isAudio && (mediaElement as HTMLVideoElement).duration <= 60 && (mediaElement as HTMLVideoElement).videoHeight > (mediaElement as HTMLVideoElement).videoWidth) {
        setContentType('short');
      } else if (isAudio) {
        setContentType('music');
      }
    };
    mediaElement.src = URL.createObjectURL(file);
    setVideoFile(file);
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
  };

  const uploadFile = (file: File, folder: string, onProgress?: (progress: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      const isImage = file.type.startsWith('image/');
      const resourceType = (isVideo || isAudio) ? 'video' : 'image';
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

    if (contentType === 'music' && !thumbnailFile) {
      toast.error('Для музыкальных треков обязательно нужно загрузить обложку (превью)');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      const videoUrl = await uploadFile(videoFile, contentType === 'photo' ? 'photos' : 'videos', (progress) => {
        setUploadProgress(Math.round(progress * 0.8));
      });

      let thumbnailUrl = contentType === 'photo' ? videoUrl : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop';
      
      if (thumbnailFile && contentType !== 'photo') {
        thumbnailUrl = await uploadFile(thumbnailFile, 'thumbnails', (progress) => {
          setUploadProgress(80 + Math.round(progress * 0.1));
        });
      } else if (!thumbnailFile && (contentType === 'video' || contentType === 'short')) {
        // Generate automatic thumbnail from video for Cloudinary
        // By replacing extension with .jpg and adding so_auto transformation
        thumbnailUrl = videoUrl.replace('/upload/', '/upload/so_auto/').replace(/\.[^/.]+$/, ".jpg");
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
        type: contentType,
        isShort: contentType === 'short',
        isMusic: contentType === 'music',
        isPhoto: contentType === 'photo',
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
        soundName: contentType === 'short' ? soundName : '',
        hashtags: contentType === 'short' ? hashtags.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : [],
        musicMetadata: contentType === 'music' ? musicMetadata : undefined
      };

      await setDoc(doc(db, 'videos', videoId), newVideoData);

      // Send notifications to subscribers who have notifications enabled
      try {
        const subsQuery = query(
          collection(db, 'subscriptions'),
          where('channelId', '==', user.uid),
          where('notificationsEnabled', '==', true)
        );
        const subsSnap = await getDocs(subsQuery);
        
        const notificationPromises = subsSnap.docs.map(subDoc => {
          const subData = subDoc.data();
          return addDoc(collection(db, 'notifications'), {
            userId: subData.subscriberId,
            type: 'new_content',
            contentType: contentType,
            videoId: videoId,
            videoTitle: title,
            fromUserId: user.uid,
            fromUserName: user.displayName,
            fromUserAvatar: user.photoURL,
            createdAt: new Date(),
            read: false
          });
        });
        
        await Promise.all(notificationPromises);
      } catch (err) {
        console.error("Error sending subscriber notifications:", err);
      }

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
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Загрузка видео</h1>
          <button onClick={() => navigate('/studio')} className="p-2 hover:bg-[var(--hover)] rounded-full text-[var(--text-secondary)] transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleUpload} className="p-8 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-8">
              {/* Video Upload Area */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-3">Файл видео</label>
                <div className="relative group border-2 border-dashed border-[var(--border)] rounded-xl p-10 hover:border-blue-500 hover:bg-blue-50/30 transition-all text-center cursor-pointer bg-[var(--hover)]/50">
                  <input
                    type="file"
                    accept="video/*,audio/*,image/*"
                    onChange={handleVideoSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    required
                  />
                  {videoFile ? (
                    <div className="flex flex-col items-center text-blue-600">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        {videoFile.type.startsWith('audio/') ? <MusicIcon className="w-8 h-8" /> : 
                         videoFile.type.startsWith('image/') ? <ImageIcon className="w-8 h-8" /> : 
                         <VideoIcon className="w-8 h-8" />}
                      </div>
                      <span className="text-sm font-bold truncate max-w-full text-[var(--text-primary)]">{videoFile.name}</span>
                      <span className="text-xs text-[var(--text-secondary)] mt-2 font-medium">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB {contentType !== 'photo' && `• ${videoDuration}`}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-[var(--text-secondary)]">
                      <div className="w-16 h-16 bg-[var(--surface)] rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                        <Upload className="w-8 h-8" />
                      </div>
                      <span className="text-sm font-bold text-[var(--text-primary)]">Выберите файл для загрузки</span>
                      <span className="text-xs mt-2 font-medium">MP4, WebM, MP3 или JPG/PNG (макс. {MAX_VIDEO_SIZE_MB}MB)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Thumbnail Upload */}
              {contentType !== 'photo' && (
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-3">
                    Значок (превью) {contentType === 'music' && <span className="text-red-500">*обязательно</span>}
                  </label>
                  <div className={`relative border-2 border-dashed rounded-xl p-6 transition-all text-center cursor-pointer bg-[var(--hover)]/50 ${contentType === 'music' && !thumbnailFile ? 'border-red-200 hover:border-red-400' : 'border-[var(--border)] hover:border-blue-500 hover:bg-blue-50/30'}`}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    {thumbnailFile ? (
                      <div className="flex items-center justify-center gap-3 text-blue-600">
                        <ImageIcon className="w-6 h-6" />
                        <span className="text-sm font-bold text-[var(--text-primary)] truncate">{thumbnailFile.name}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-[var(--text-secondary)]">
                        <ImageIcon className="w-6 h-6 mb-2" />
                        <span className="text-xs font-bold text-[var(--text-primary)]">Загрузить значок</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Content Type Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Тип контента</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'video', label: 'Видео', icon: VideoIcon },
                    { id: 'short', label: 'Shorts', icon: Smartphone },
                    { id: 'music', label: 'Музыка', icon: ListMusic },
                    { id: 'photo', label: 'Фото', icon: Camera }
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setContentType(type.id as any)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        contentType === type.id 
                          ? 'border-blue-600 bg-blue-50 text-blue-600' 
                          : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      <type.icon className="w-5 h-5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Название (обязательно)</label>
                  <button 
                    type="button"
                    onClick={handleGenerateTitle}
                    disabled={generatingTitle}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider"
                  >
                    {generatingTitle ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Сгенерировать ИИ
                  </button>
                </div>
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
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Описание</label>
                  <button 
                    type="button"
                    onClick={handleGenerateDesc}
                    disabled={generatingDesc}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider"
                  >
                    {generatingDesc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Сгенерировать ИИ
                  </button>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium h-48 resize-none transition-all"
                  placeholder="Расскажите зрителям о своем видео"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Теги (необязательно)</label>
                  <button 
                    type="button"
                    onClick={handleGenerateTags}
                    disabled={generatingTags}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider"
                  >
                    {generatingTags ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Сгенерировать ИИ
                  </button>
                </div>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all"
                  placeholder="Теги через запятую"
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

              {contentType === 'music' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Автор</label>
                    <input type="text" value={musicMetadata.author} onChange={(e) => setMusicMetadata({...musicMetadata, author: e.target.value})} className="w-full border border-gray-200 rounded-lg py-3 px-4 text-sm font-medium" placeholder="Автор" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Композитор</label>
                    <input type="text" value={musicMetadata.composer} onChange={(e) => setMusicMetadata({...musicMetadata, composer: e.target.value})} className="w-full border border-gray-200 rounded-lg py-3 px-4 text-sm font-medium" placeholder="Композитор" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Исполнитель</label>
                    <input type="text" value={musicMetadata.performer} onChange={(e) => setMusicMetadata({...musicMetadata, performer: e.target.value})} className="w-full border border-gray-200 rounded-lg py-3 px-4 text-sm font-medium" placeholder="Исполнитель" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Другие участники</label>
                    <input type="text" value={musicMetadata.otherParticipants} onChange={(e) => setMusicMetadata({...musicMetadata, otherParticipants: e.target.value})} className="w-full border border-gray-200 rounded-lg py-3 px-4 text-sm font-medium" placeholder="Другие участники" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Альбом</label>
                    <input type="text" value={musicMetadata.album} onChange={(e) => setMusicMetadata({...musicMetadata, album: e.target.value})} className="w-full border border-gray-200 rounded-lg py-3 px-4 text-sm font-medium" placeholder="Альбом" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Год выпуска</label>
                    <input type="text" value={musicMetadata.releaseYear} onChange={(e) => setMusicMetadata({...musicMetadata, releaseYear: e.target.value})} className="w-full border border-gray-200 rounded-lg py-3 px-4 text-sm font-medium" placeholder="Год выпуска" />
                  </div>
                </div>
              )}

              {contentType === 'short' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Название звука</label>
                    <input
                      type="text"
                      value={soundName}
                      onChange={(e) => setSoundName(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all"
                      placeholder="Оригинальный звук (или название трека)"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Хештеги</label>
                    <input
                      type="text"
                      value={hashtags}
                      onChange={(e) => setHashtags(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all"
                      placeholder="#shorts, #тренды (через запятую)"
                    />
                  </div>
                </>
              )}
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
