import React, { useState } from 'react';
import { useAuth } from '../App';
import { Upload, Video as VideoIcon, Image as ImageIcon, Loader2, Smartphone, X, AlertCircle, Sparkles, ListMusic, Music as MusicIcon, Camera, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../lib/firebase';
import { setDoc, doc, collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { generateVideoTitle, generateVideoDescription, generateVideoTags, generateImage } from '../services/geminiService';
import { generateMusic } from '../services/musicGenerationService';

const MAX_VIDEO_SIZE_MB = 50;
const CLOUDINARY_CLOUD_NAME = 'du6zw4m8g';
const CLOUDINARY_UPLOAD_PRESET = 'icetube_uploads';

export default function Studio() {
  const { user, channels, activeChannel, setActiveChannel } = useAuth();
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
  const [timestamps, setTimestamps] = useState<{ time: string; label: string }[]>([]);
  const [audience, setAudience] = useState<'kids' | 'not-kids'>('not-kids');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
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
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);
  const [userCategories, setUserCategories] = useState<string[]>([]);
  
  const [activeTab, setActiveTab] = useState<'upload' | 'ai-music'>('upload');
  const [musicPrompt, setMusicPrompt] = useState('');
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [musicGenerationType, setMusicGenerationType] = useState<'clip' | 'pro'>('clip');
  const [thumbnailPrompt, setThumbnailPrompt] = useState('');
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);

  React.useEffect(() => {
    if (!activeChannel) return;
    const fetchUserCategories = async () => {
      try {
        const q = query(collection(db, 'videos'), where('authorId', '==', activeChannel.id));
        const snap = await getDocs(q);
        const cats = new Set<string>();
        snap.docs.forEach(doc => {
          if (doc.data().category) cats.add(doc.data().category);
        });
        setUserCategories(Array.from(cats));
      } catch (error) {
        console.error("Error fetching user categories:", error);
      }
    };
    fetchUserCategories();
  }, [activeChannel]);

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

  const handleGenerateMusic = async () => {
    if (!musicPrompt.trim()) {
      toast.error('Введите описание музыки для генерации');
      return;
    }

    // Check for API key selection in AI Studio
    if (window.aistudio) {
      try {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await window.aistudio.openSelectKey();
          // Proceed after selection (assuming success as per skill)
        }
      } catch (err) {
        console.error("Error checking/selecting API key:", err);
      }
    }

    setIsGeneratingMusic(true);
    try {
      const result = await generateMusic(musicPrompt, musicGenerationType === 'pro');
      
      // Create a File object from the Blob
      const fileName = `generated_music_${Date.now()}.wav`;
      const file = new File([result.blob], fileName, { type: result.mimeType });
      
      setVideoFile(file);
      setContentType('music');
      setTitle(musicPrompt.slice(0, 50));
      setDescription(`Сгенерировано ИИ: ${musicPrompt}\n\n${result.lyrics || ''}`);
      setCategory('Музыка');
      
      // Get duration
      const audio = new Audio();
      audio.src = URL.createObjectURL(result.blob);
      audio.onloadedmetadata = () => {
        const minutes = Math.floor(audio.duration / 60);
        const seconds = Math.floor(audio.duration % 60);
        setVideoDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      };

      toast.success('Музыка успешно сгенерирована!');
    } catch (error) {
      toast.error('Ошибка при генерации музыки. Проверьте API ключ.');
    } finally {
      setIsGeneratingMusic(false);
    }
  };

  const handleGenerateThumbnail = async () => {
    const prompt = thumbnailPrompt || title || "Music album cover art, high quality, artistic, vibrant colors";
    setGeneratingThumbnail(true);
    setIsGeneratingAvatar(true);
    try {
      const imageUrl = await generateImage(prompt);
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const file = new File([blob], `generated_thumb_${Date.now()}.png`, { type: "image/png" });
      setThumbnailFile(file);
      toast.success('Обложка сгенерирована!');
    } catch (error) {
      toast.error('Ошибка при генерации обложки');
    } finally {
      setGeneratingThumbnail(false);
      setIsGeneratingAvatar(false);
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

  const uploadFile = async (file: File, folder: string, onProgress?: (progress: number) => void): Promise<string> => {
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const resourceType = (isVideo || isAudio) ? 'video' : 'image';
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', `icetube/${folder}`);

    try {
      // For progress tracking, we still need XHR or a specialized library, 
      // but let's try a clean fetch first to see if it resolves the CORS issue.
      // If CORS persists with fetch, it's definitely a Cloudinary config issue.
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Загрузка не удалась');
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error: any) {
      console.error("Cloudinary upload error:", error);
      throw new Error(error.message || 'Ошибка при загрузке на сервер хранения');
    }
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
        authorId: activeChannel?.id || user.uid,
        authorName: activeChannel?.displayName || user.displayName,
        authorPhotoUrl: activeChannel?.photoURL || user.photoURL,
        views: 0,
        likes: 0,
        dislikes: 0,
        createdAt: new Date().toISOString(),
        duration: videoDuration,
        type: contentType,
        isShort: contentType === 'short',
        isMusic: contentType === 'music',
        isPhoto: contentType === 'photo',
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
        soundName: contentType === 'short' ? soundName : '',
        hashtags: contentType === 'short' ? hashtags.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : [],
        musicMetadata: contentType === 'music' ? musicMetadata : undefined,
        timestamps: contentType === 'video' ? timestamps : [],
        audience,
        visibility
      };

      // Remove undefined fields to prevent Firestore errors
      Object.keys(newVideoData).forEach(key => {
        if ((newVideoData as any)[key] === undefined) {
          delete (newVideoData as any)[key];
        }
      });

      await setDoc(doc(db, 'videos', videoId), newVideoData);

      // Update lastPostAt in user profile and channel
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          lastPostAt: serverTimestamp()
        });
        if (activeChannel) {
          await updateDoc(doc(db, 'channels', activeChannel.id), {
            lastPostAt: serverTimestamp()
          });
        }
      } catch (err) {
        console.error("Error updating lastPostAt:", err);
      }

      // Send notifications to subscribers who have notifications enabled
      try {
        const targetId = activeChannel?.id || user.uid;
        const subsQuery = query(
          collection(db, 'subscriptions'),
          where('channelId', '==', targetId),
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
            fromUserId: targetId,
            fromUserName: activeChannel?.displayName || user.displayName,
            fromUserAvatar: activeChannel?.photoURL || user.photoURL,
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
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-primary)]">Создание контента</h1>
          <p className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-widest">Загрузка и настройка новых публикаций</p>
        </div>
        <button onClick={() => navigate('/studio')} className="p-3 hover:bg-[var(--hover)] rounded-xl text-[var(--text-secondary)] transition-all border border-transparent hover:border-[var(--border)]">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        <div className="flex border-b border-[var(--border)] bg-[var(--hover)]/30">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'upload' ? 'bg-[var(--surface)] border-b-2 border-blue-600 text-blue-600' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            Загрузка файлов
          </button>
          <button
            onClick={() => setActiveTab('ai-music')}
            className={`flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${activeTab === 'ai-music' ? 'bg-[var(--surface)] border-b-2 border-blue-600 text-blue-600' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            <Sparkles className="w-4 h-4" />
            Создать музыку с ИИ
          </button>
        </div>

        <form onSubmit={handleUpload} className="divide-y divide-[var(--border)]">
          {/* Channel Selection */}
          {channels.length > 1 && (
            <div className="p-8 bg-blue-500/5">
              <label className="block text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-6">Выберите канал для публикации</label>
              <div className="flex flex-wrap gap-4">
                {channels.map(channel => (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => setActiveChannel(channel)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                      activeChannel?.id === channel.id 
                        ? 'border-blue-600 bg-[var(--surface)] shadow-lg shadow-blue-600/10' 
                        : 'border-transparent bg-[var(--hover)] hover:bg-[var(--surface)]'
                    }`}
                  >
                    <img src={channel.photoURL} alt={channel.displayName} className="w-10 h-10 rounded-full object-cover border-2 border-[var(--border)]" />
                    <div className="text-left">
                      <p className="text-sm font-black text-[var(--text-primary)] line-clamp-1">{channel.displayName}</p>
                      {channel.isPrimary && <span className="text-[9px] text-blue-500 font-black uppercase tracking-widest">Основной</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Left Column: Media Upload */}
            <div className="lg:col-span-5 p-8 lg:border-r border-[var(--border)] space-y-10">
              {activeTab === 'ai-music' ? (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <MusicIcon className="w-5 h-5 text-blue-600" />
                      <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Генерация трека</label>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex gap-2 p-1 bg-[var(--hover)] rounded-xl border border-[var(--border)]">
                        <button
                          type="button"
                          onClick={() => setMusicGenerationType('clip')}
                          className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${musicGenerationType === 'clip' ? 'bg-blue-600 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        >
                          Клип (30с)
                        </button>
                        <button
                          type="button"
                          onClick={() => setMusicGenerationType('pro')}
                          className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${musicGenerationType === 'pro' ? 'bg-blue-600 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        >
                          Полный трек
                        </button>
                      </div>

                      <div className="relative">
                        <textarea
                          value={musicPrompt}
                          onChange={(e) => setMusicPrompt(e.target.value)}
                          placeholder="Опишите музыку (например: Энергичный рок с мощными барабанами)..."
                          className="w-full bg-[var(--hover)] border border-[var(--border)] rounded-2xl py-4 px-6 focus:outline-none focus:border-blue-500 text-sm font-medium h-32 resize-none transition-all text-[var(--text-primary)]"
                        />
                        <button
                          type="button"
                          onClick={handleGenerateMusic}
                          disabled={isGeneratingMusic || !musicPrompt.trim()}
                          className="absolute bottom-3 right-3 bg-blue-600 text-white p-4 rounded-2xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20"
                        >
                          {isGeneratingMusic ? <Loader2 className="w-6 h-6 animate-spin" /> : <MusicIcon className="w-6 h-6" />}
                        </button>
                      </div>
                      <p className="text-[9px] text-[var(--text-secondary)] font-medium text-center uppercase tracking-widest leading-relaxed">
                        ИИ создаст уникальную композицию и текст на основе вашего описания
                      </p>
                    </div>
                  </div>

                  {videoFile && contentType === 'music' && (
                    <div className="p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10 animate-fade-in">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                          <MusicIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-[var(--text-primary)] uppercase tracking-tight">Трек готов</p>
                          <p className="text-[10px] text-[var(--text-secondary)] font-mono">{videoDuration}</p>
                        </div>
                      </div>
                      <audio src={URL.createObjectURL(videoFile)} controls className="w-full h-8" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-10">
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Файл контента</label>
                    <div className="relative group border-2 border-dashed border-[var(--border)] rounded-3xl p-12 hover:border-blue-500 hover:bg-blue-500/5 transition-all text-center cursor-pointer bg-[var(--hover)]/30">
                      <input
                        type="file"
                        accept="video/*,audio/*,image/*"
                        onChange={handleVideoSelect}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        required={!videoFile}
                      />
                      {videoFile ? (
                        <div className="flex flex-col items-center">
                          <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mb-6 text-blue-600">
                            {videoFile.type.startsWith('audio/') ? <MusicIcon className="w-10 h-10" /> : 
                             videoFile.type.startsWith('image/') ? <ImageIcon className="w-10 h-10" /> : 
                             <VideoIcon className="w-10 h-10" />}
                          </div>
                          <span className="text-sm font-black text-[var(--text-primary)] truncate max-w-full px-4">{videoFile.name}</span>
                          <div className="flex items-center gap-2 mt-3">
                            <span className="text-[10px] font-mono font-bold text-[var(--text-secondary)] uppercase bg-[var(--hover)] px-2 py-1 rounded">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                            {contentType !== 'photo' && <span className="text-[10px] font-mono font-bold text-[var(--text-secondary)] uppercase bg-[var(--hover)] px-2 py-1 rounded">{videoDuration}</span>}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-[var(--text-secondary)]">
                          <div className="w-20 h-20 bg-[var(--surface)] rounded-3xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform border border-[var(--border)]">
                            <Upload className="w-10 h-10" />
                          </div>
                          <span className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">Перетащите файл сюда</span>
                          <p className="text-[10px] mt-3 font-medium leading-relaxed max-w-[200px] mx-auto">MP4, WebM, MP3 или JPG/PNG (макс. {MAX_VIDEO_SIZE_MB}MB)</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Тип контента</label>
                    <div className="grid grid-cols-2 gap-3">
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
                          className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                            contentType === type.id 
                              ? 'border-blue-600 bg-blue-500/5 text-blue-600' 
                              : 'border-[var(--border)] bg-[var(--hover)]/50 text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--hover)]'
                          }`}
                        >
                          <type.icon className="w-5 h-5" />
                          <span className="text-[11px] font-black uppercase tracking-widest">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Details */}
            <div className="lg:col-span-7 p-8 space-y-10">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">
                      Обложка (Превью) {contentType === 'music' && <span className="text-red-500">*</span>}
                    </label>
                    <button 
                      type="button"
                      onClick={handleGenerateThumbnail}
                      disabled={generatingThumbnail}
                      className="flex items-center gap-2 text-[9px] font-black text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-[0.15em] bg-blue-500/5 px-3 py-1.5 rounded-lg border border-blue-500/10"
                    >
                      {generatingThumbnail ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Сгенерировать ИИ
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`relative border-2 border-dashed rounded-2xl aspect-video flex flex-col items-center justify-center transition-all cursor-pointer bg-[var(--hover)]/30 overflow-hidden ${contentType === 'music' && !thumbnailFile ? 'border-red-500/30 hover:border-red-500' : 'border-[var(--border)] hover:border-blue-500 hover:bg-blue-500/5'}`}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      {thumbnailFile ? (
                        <img src={URL.createObjectURL(thumbnailFile)} alt="Thumbnail" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center text-[var(--text-secondary)] p-4">
                          <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                          <span className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest">Загрузить</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Промпт для ИИ Обложки</p>
                      <textarea
                        value={thumbnailPrompt}
                        onChange={(e) => setThumbnailPrompt(e.target.value)}
                        placeholder="Опишите желаемую обложку (например: Абстрактный космос, неоновые цвета)..."
                        className="w-full bg-[var(--hover)] border border-[var(--border)] rounded-xl py-3 px-4 text-xs font-medium h-24 resize-none focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Название</label>
                    <button 
                      type="button"
                      onClick={handleGenerateTitle}
                      disabled={generatingTitle}
                      className="flex items-center gap-2 text-[9px] font-black text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-[0.15em] bg-blue-500/5 px-3 py-1.5 rounded-lg border border-blue-500/10"
                    >
                      {generatingTitle ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      ИИ Генерация
                    </button>
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[var(--hover)] border border-[var(--border)] rounded-2xl py-4 px-6 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm font-black transition-all text-[var(--text-primary)]"
                    placeholder="Введите броское название..."
                    required
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Описание</label>
                    <button 
                      type="button"
                      onClick={handleGenerateDesc}
                      disabled={generatingDesc}
                      className="flex items-center gap-2 text-[9px] font-black text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-[0.15em] bg-blue-500/5 px-3 py-1.5 rounded-lg border border-blue-500/10"
                    >
                      {generatingDesc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      ИИ Генерация
                    </button>
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[var(--hover)] border border-[var(--border)] rounded-2xl py-4 px-6 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm font-medium h-40 resize-none transition-all text-[var(--text-primary)] leading-relaxed"
                    placeholder="Расскажите зрителям о чем ваш контент..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Категория</label>
                    <input
                      type="text"
                      list="category-options"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[var(--hover)] border border-[var(--border)] rounded-2xl py-4 px-6 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-xs font-black text-[var(--text-primary)] transition-all uppercase tracking-widest"
                      placeholder="Выберите или введите свою..."
                    />
                    <datalist id="category-options">
                      {['Игры', 'Музыка', 'Образование', 'Развлечения', 'Технологии', 'Спорт', 'Влоги', 'Юмор', 'Путешествия', 'Авто'].map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                      {userCategories.filter(cat => !['Игры', 'Музыка', 'Образование', 'Развлечения', 'Технологии', 'Спорт', 'Влоги', 'Юмор', 'Путешествия', 'Авто'].includes(cat)).map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Теги</label>
                      <button 
                        type="button"
                        onClick={handleGenerateTags}
                        disabled={generatingTags}
                        className="flex items-center gap-2 text-[9px] font-black text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-[0.15em] bg-blue-500/5 px-3 py-1.5 rounded-lg border border-blue-500/10"
                      >
                        {generatingTags ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        ИИ Генерация
                      </button>
                    </div>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="w-full bg-[var(--hover)] border border-[var(--border)] rounded-2xl py-4 px-6 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-xs font-bold transition-all text-[var(--text-primary)]"
                      placeholder="Теги через запятую..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-[var(--border)]">
                  <div className="space-y-5">
                    <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Аудитория</label>
                    <div className="space-y-3">
                      <label className="flex items-center gap-4 cursor-pointer group p-3 rounded-xl hover:bg-[var(--hover)] transition-colors">
                        <input 
                          type="radio" 
                          name="audience" 
                          checked={audience === 'kids'} 
                          onChange={() => setAudience('kids')}
                          className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-[var(--border)]"
                        />
                        <div className="space-y-0.5">
                          <p className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">Для детей</p>
                          <p className="text-[10px] text-[var(--text-secondary)] font-medium">Контент безопасен для младшей аудитории</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-4 cursor-pointer group p-3 rounded-xl hover:bg-[var(--hover)] transition-colors">
                        <input 
                          type="radio" 
                          name="audience" 
                          checked={audience === 'not-kids'} 
                          onChange={() => setAudience('not-kids')}
                          className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-[var(--border)]"
                        />
                        <div className="space-y-0.5">
                          <p className="text-sm font-black text-[var(--text-primary)] uppercase tracking-tight">Не для детей</p>
                          <p className="text-[10px] text-[var(--text-secondary)] font-medium">Стандартный контент для всех возрастов</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Параметры доступа</label>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { id: 'private', label: 'Ограниченный доступ', desc: 'Только вы видите контент' },
                        { id: 'unlisted', label: 'Доступ по ссылке', desc: 'Видят те, у кого есть ссылка' },
                        { id: 'public', label: 'Открытый доступ', desc: 'Видят все пользователи' }
                      ].map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setVisibility(v.id as any)}
                          className={`p-4 rounded-2xl border-2 text-left transition-all ${
                            visibility === v.id 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20' 
                              : 'bg-[var(--hover)] text-[var(--text-secondary)] border-transparent hover:border-[var(--border)]'
                          }`}
                        >
                          <p className={`text-[11px] font-black uppercase tracking-widest ${visibility === v.id ? 'text-white' : 'text-[var(--text-primary)]'}`}>{v.label}</p>
                          <p className={`text-[9px] mt-1 font-medium ${visibility === v.id ? 'text-blue-100' : 'text-[var(--text-secondary)]'}`}>{v.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {contentType === 'music' && (
                  <div className="pt-8 border-t border-[var(--border)] space-y-6">
                    <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Метаданные трека</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {[
                        { id: 'author', label: 'Автор', placeholder: 'Имя автора' },
                        { id: 'composer', label: 'Композитор', placeholder: 'Имя композитора' },
                        { id: 'performer', label: 'Исполнитель', placeholder: 'Имя исполнителя' },
                        { id: 'album', label: 'Альбом', placeholder: 'Название альбома' },
                        { id: 'releaseYear', label: 'Год выпуска', placeholder: '2024' }
                      ].map(field => (
                        <div key={field.id} className="space-y-2">
                          <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">{field.label}</label>
                          <input 
                            type="text" 
                            value={(musicMetadata as any)[field.id]} 
                            onChange={(e) => setMusicMetadata({...musicMetadata, [field.id]: e.target.value})} 
                            className="w-full bg-[var(--hover)] border border-[var(--border)] rounded-xl py-3 px-5 text-xs font-bold text-[var(--text-primary)]" 
                            placeholder={field.placeholder} 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamps Section */}
                {contentType === 'video' && (
                  <div className="pt-8 border-t border-[var(--border)] space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Таймкоды (Эпизоды)</label>
                      <button 
                        type="button"
                        onClick={() => setTimestamps([...timestamps, { time: '', label: '' }])}
                        className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                      >
                        + Добавить
                      </button>
                    </div>
                    <div className="space-y-3">
                      {timestamps.map((ts, idx) => (
                        <div key={idx} className="flex gap-3 items-center">
                          <input
                            type="text"
                            value={ts.time}
                            onChange={(e) => {
                              const newTs = [...timestamps];
                              newTs[idx].time = e.target.value;
                              setTimestamps(newTs);
                            }}
                            placeholder="00:00"
                            className="w-24 bg-[var(--hover)] border border-[var(--border)] rounded-xl py-2 px-4 text-xs font-mono text-[var(--text-primary)]"
                          />
                          <input
                            type="text"
                            value={ts.label}
                            onChange={(e) => {
                              const newTs = [...timestamps];
                              newTs[idx].label = e.target.value;
                              setTimestamps(newTs);
                            }}
                            placeholder="Название эпизода..."
                            className="flex-1 bg-[var(--hover)] border border-[var(--border)] rounded-xl py-2 px-4 text-xs font-bold text-[var(--text-primary)]"
                          />
                          <button 
                            type="button"
                            onClick={() => setTimestamps(timestamps.filter((_, i) => i !== idx))}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {timestamps.length === 0 && (
                        <p className="text-[10px] text-[var(--text-secondary)] italic uppercase tracking-widest">Таймкоды не добавлены</p>
                      )}
                    </div>
                  </div>
                )}

                {contentType === 'short' && (
                  <div className="pt-8 border-t border-[var(--border)] space-y-6">
                    <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Настройки Shorts</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Название звука</label>
                        <input
                          type="text"
                          value={soundName}
                          onChange={(e) => setSoundName(e.target.value)}
                          className="w-full bg-[var(--hover)] border border-[var(--border)] rounded-xl py-3 px-5 text-xs font-bold text-[var(--text-primary)]"
                          placeholder="Оригинальный звук..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Хештеги</label>
                        <input
                          type="text"
                          value={hashtags}
                          onChange={(e) => setHashtags(e.target.value)}
                          className="w-full bg-[var(--hover)] border border-[var(--border)] rounded-xl py-3 px-5 text-xs font-bold text-[var(--text-primary)]"
                          placeholder="#shorts, #тренды..."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-8 bg-[var(--hover)]/30 flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="w-full sm:max-w-md">
              {uploading && (
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">
                    <span>Обработка данных</span>
                    <span className="font-mono">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(37,99,235,0.5)]" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => navigate('/studio/content')}
                className="flex-1 sm:flex-none px-8 py-4 text-[11px] font-black text-[var(--text-secondary)] hover:text-[var(--text-primary)] uppercase tracking-widest transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={uploading || !videoFile || !title}
                className="flex-1 sm:flex-none bg-blue-600 text-white font-black py-4 px-12 rounded-2xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-blue-600/20 active:scale-95"
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
          </div>
        </form>
      </div>
    </div>
  );
}
