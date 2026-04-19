import React, { useState, useEffect } from 'react';
import { databaseService } from '../lib/databaseService';
import { Loader2, Trophy, Users, Music, Play, TrendingUp, Camera, Heart, Snowflake } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MeltingAvatar } from '../components/MeltingAvatar';
import { VideoType } from '../types';

interface TopChannel {
  uid: string;
  displayName: string;
  pseudonym?: string;
  photoURL: string;
  bio?: string;
  subscribers: number;
  lastPostAt?: any;
  totalMusicViews: number;
  musicCount: number;
  totalViews: number;
  totalLikes: number;
  totalPhotoLikes: number;
  photoCount: number;
  totalIces: number;
}

export default function TopChannels() {
  const [channels, setChannels] = useState<TopChannel[]>([]);
  const [topTracks, setTopTracks] = useState<VideoType[]>([]);
  const [topPhotos, setTopPhotos] = useState<VideoType[]>([]);
  const [topVideos, setTopVideos] = useState<VideoType[]>([]);
  const [topShorts, setTopShorts] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [topType, setTopType] = useState<'authors' | 'tracks' | 'photos' | 'videos' | 'shorts'>('authors');
  const [sortBy, setSortBy] = useState<'subscribers' | 'music' | 'views' | 'photos' | 'ices' | 'likes'>('subscribers');

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const allVideos = await databaseService.getVideos({ limit: 500 });
        
        // Set top tracks (music only)
        const musicTracks = allVideos
          .filter(v => v.isMusic)
          .sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0))
          .slice(0, 10);
        setTopTracks(musicTracks);

        // Set top photos (by likes)
        const popularPhotos = allVideos
          .filter(v => v.isPhoto || v.type === 'photo')
          .sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0))
          .slice(0, 10);
        setTopPhotos(popularPhotos);

        // Set top videos (regular videos)
        const popularVideos = allVideos
          .filter(v => !v.isShort && !v.isMusic && !v.isPhoto && v.type !== 'photo')
          .sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0))
          .slice(0, 10);
        setTopVideos(popularVideos);

        // Set top shorts
        const popularShorts = allVideos
          .filter(v => v.isShort || v.type === 'short')
          .sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0))
          .slice(0, 10);
        setTopShorts(popularShorts);

        // Aggregate stats per user
        const stats: Record<string, { totalViews: number, musicViews: number, musicCount: number, likes: number, photoLikes: number, photoCount: number, totalIces: number }> = {};
        allVideos.forEach(video => {
          const authorId = video.authorId;
          if (!stats[authorId]) {
            stats[authorId] = { totalViews: 0, musicViews: 0, musicCount: 0, likes: 0, photoLikes: 0, photoCount: 0, totalIces: 0 };
          }
          const v = Number(video.views) || 0;
          const l = Number(video.likes) || 0;
          const i = Number(video.ices) || 0;
          stats[authorId].totalViews += v;
          stats[authorId].totalIces += i;
          if (!video.isMusic && !video.isPhoto && video.type !== 'photo') {
            stats[authorId].likes += l;
          }
          if (video.isMusic) {
            stats[authorId].musicViews += v;
            stats[authorId].musicCount += 1;
          }
          if (video.isPhoto || video.type === 'photo') {
            stats[authorId].photoLikes += l;
            stats[authorId].photoCount += 1;
          }
        });

        // Fetch channels
        const { data: channelsData, error: channelsError } = await supabase
          .from('channels')
          .select('*');
        
        if (channelsError) throw channelsError;

        const combinedData: TopChannel[] = (channelsData || []).map(channel => ({
          uid: channel.id,
          displayName: channel.display_name || 'User',
          pseudonym: channel.pseudonym || '',
          photoURL: channel.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${channel.id}`,
          bio: channel.bio || '',
          subscribers: Number(channel.subscribers) || 0,
          lastPostAt: channel.last_post_at,
          totalMusicViews: stats[channel.id]?.musicViews || 0,
          musicCount: stats[channel.id]?.musicCount || 0,
          totalViews: stats[channel.id]?.totalViews || 0,
          totalLikes: stats[channel.id]?.likes || 0,
          totalPhotoLikes: stats[channel.id]?.photoLikes || 0,
          photoCount: stats[channel.id]?.photoCount || 0,
          totalIces: stats[channel.id]?.totalIces || 0
        }));

        setChannels(combinedData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching videos for TopChannels:", error);
        setLoading(false);
      }
    };

    fetchVideos();

    // Add Realtime subscription for subscriber counts and other channel updates
    const channelsSub = supabase
      .channel('top_channels_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channels' }, (payload) => {
        if (payload.event === 'UPDATE') {
          const updatedChannel = payload.new as any;
          setChannels(prev => prev.map(c => 
            c.uid === updatedChannel.id 
              ? { 
                  ...c, 
                  subscribers: Number(updatedChannel.subscribers) || 0,
                  displayName: updatedChannel.display_name || c.displayName,
                  photoURL: updatedChannel.photo_url || c.photoURL,
                  ices: updatedChannel.ices || c.ices
                } 
              : c
          ));
        } else if (payload.event === 'INSERT' || payload.event === 'DELETE') {
          fetchVideos(); // Refresh everything for new/deleted authors
        }
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setTimeout(() => channelsSub.subscribe(), 5000);
        }
      });

    // Also listen for video updates (views, likes) to keep top tracks/videos fresh
    const videosSub = supabase
      .channel('top_videos_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos' }, () => {
        fetchVideos(); // Refresh aggregated stats on video changes
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setTimeout(() => videosSub.subscribe(), 6000);
        }
      });

    return () => {
      supabase.removeChannel(channelsSub);
      supabase.removeChannel(videosSub);
    };
  }, []);

  const sortedChannels = React.useMemo(() => {
    return [...channels].sort((a, b) => {
      if (sortBy === 'subscribers') return (b.subscribers || 0) - (a.subscribers || 0);
      if (sortBy === 'music') return (b.totalMusicViews || 0) - (a.totalMusicViews || 0);
      if (sortBy === 'photos') return (b.totalPhotoLikes || 0) - (a.totalPhotoLikes || 0);
      if (sortBy === 'ices') return (b.totalIces || 0) - (a.totalIces || 0);
      if (sortBy === 'likes') return (b.totalLikes || 0) - (a.totalLikes || 0);
      return (b.totalViews || 0) - (a.totalViews || 0);
    }).slice(0, 10);
  }, [channels, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--studio-text)] tracking-tight">Чарты IceTube</h1>
            <p className="text-sm text-[var(--studio-muted)]">Самый популярный контент и авторы</p>
          </div>
        </div>

        <div className="flex bg-[var(--studio-sidebar)] p-1 rounded-2xl border border-[var(--studio-border)] shadow-sm self-start md:self-center">
          <button 
            onClick={() => setTopType('authors')}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${topType === 'authors' ? 'bg-blue-600 text-white shadow-md' : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'}`}
          >
            Авторы
          </button>
          <button 
            onClick={() => setTopType('tracks')}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${topType === 'tracks' ? 'bg-blue-600 text-white shadow-md' : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'}`}
          >
            Треки
          </button>
          <button 
            onClick={() => setTopType('videos')}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${topType === 'videos' ? 'bg-blue-600 text-white shadow-md' : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'}`}
          >
            Видео
          </button>
          <button 
            onClick={() => setTopType('shorts')}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${topType === 'shorts' ? 'bg-blue-600 text-white shadow-md' : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'}`}
          >
            Shorts
          </button>
          <button 
            onClick={() => setTopType('photos')}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider ${topType === 'photos' ? 'bg-blue-600 text-white shadow-md' : 'text-[var(--studio-muted)] hover:text-[var(--studio-text)]'}`}
          >
            Фото
          </button>
        </div>
      </div>

      {topType === 'authors' ? (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <button 
              onClick={() => setSortBy('subscribers')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold transition-all uppercase tracking-wider border ${sortBy === 'subscribers' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'}`}
            >
              <Users className="w-3.5 h-3.5" />
              По подписчикам
            </button>
            <button 
              onClick={() => setSortBy('likes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold transition-all uppercase tracking-wider border ${sortBy === 'likes' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'}`}
            >
              <Heart className="w-3.5 h-3.5" />
              По лайкам (Видео + Shorts)
            </button>
            <button 
              onClick={() => setSortBy('views')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold transition-all uppercase tracking-wider border ${sortBy === 'views' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'}`}
            >
              <Play className="w-3.5 h-3.5" />
              По всем просмотрам
            </button>
            <button 
              onClick={() => setSortBy('ices')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold transition-all uppercase tracking-wider border ${sortBy === 'ices' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'}`}
            >
              <Snowflake className="w-3.5 h-3.5" />
              По снежинкам
            </button>
            <button 
              onClick={() => setSortBy('music')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold transition-all uppercase tracking-wider border ${sortBy === 'music' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'}`}
            >
              <Music className="w-3.5 h-3.5" />
              По прослушиваниям
            </button>
            <button 
              onClick={() => setSortBy('photos')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold transition-all uppercase tracking-wider border ${sortBy === 'photos' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'}`}
            >
              <Camera className="w-3.5 h-3.5" />
              По лайкам фото
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedChannels.map((channel, index) => (
              <Link 
                key={channel.uid} 
                to={`/channel/${channel.uid}`}
                className="bg-[var(--studio-sidebar)] rounded-3xl p-6 border border-[var(--studio-border)] hover:border-blue-300 hover:shadow-xl hover:shadow-blue-50/50 transition-all group relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-16 h-16 flex items-start justify-end p-3 rounded-bl-3xl ${
                  index === 0 ? 'bg-yellow-500/10 text-yellow-600' :
                  index === 1 ? 'bg-gray-400/10 text-gray-500' :
                  index === 2 ? 'bg-amber-700/10 text-amber-800' :
                  'bg-[var(--studio-hover)] text-[var(--studio-muted)]'
                }`}>
                  <span className="font-black text-xl italic">#{index + 1}</span>
                </div>

                <div className="flex items-center gap-5 mb-4">
                  <div className="relative">
                    <MeltingAvatar 
                      photoURL={channel.photoURL} 
                      lastPostAt={channel.lastPostAt}
                      size="lg"
                      className="rounded-2xl border-2 border-white shadow-md group-hover:scale-105 transition-transform"
                    />
                    {index < 3 && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100">
                        <Trophy className={`w-3 h-3 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : 'text-amber-700'}`} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 pr-8">
                    <h2 className="text-xl font-bold group-hover:text-blue-600 transition-colors line-clamp-1 text-[var(--studio-text)]">{channel.displayName}</h2>
                    {channel.pseudonym && (
                      <p className="text-sm font-medium text-[var(--studio-muted)] mb-1">{channel.pseudonym}</p>
                    )}
                    <div className="flex flex-col gap-1 mt-1">
                      <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${sortBy === 'subscribers' ? 'text-blue-600' : 'text-[var(--studio-muted)]'}`}>
                        <Users className="w-3.5 h-3.5" />
                        <span>{channel.subscribers.toLocaleString()}</span>
                      </div>
                      <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${sortBy === 'views' ? 'text-blue-600' : 'text-[var(--studio-muted)]'}`}>
                        <Play className="w-3.5 h-3.5" />
                        <span>{channel.totalViews.toLocaleString()}</span>
                      </div>
                      {channel.musicCount > 0 && (
                        <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${sortBy === 'music' ? 'text-blue-600' : 'text-[var(--studio-muted)]'}`}>
                          <Music className="w-3.5 h-3.5" />
                          <span>{channel.totalMusicViews.toLocaleString()}</span>
                        </div>
                      )}
                      <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${sortBy === 'likes' ? 'text-blue-600' : 'text-[var(--studio-muted)]'}`}>
                        <Heart className="w-3.5 h-3.5" />
                        <span>{channel.totalLikes.toLocaleString()}</span>
                      </div>
                      {channel.photoCount > 0 && (
                        <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${sortBy === 'photos' ? 'text-blue-600' : 'text-[var(--studio-muted)]'}`}>
                          <Camera className="w-3.5 h-3.5" />
                          <span>{channel.totalPhotoLikes.toLocaleString()}</span>
                        </div>
                      )}
                      {channel.totalIces > 0 && (
                        <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${sortBy === 'ices' ? 'text-blue-600' : 'text-[var(--studio-muted)]'}`}>
                          <Snowflake className="w-3.5 h-3.5" />
                          <span>{channel.totalIces.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {channel.bio && (
                  <p className="text-sm text-[var(--studio-text)]/70 line-clamp-2 mt-2 font-medium leading-relaxed">
                    {channel.bio}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </>
      ) : topType === 'tracks' ? (
        <div className="space-y-4">
          {topTracks.map((track, index) => (
            <Link 
              key={track.id} 
              to={`/video/${track.id}`}
              className="flex items-center gap-4 bg-[var(--studio-sidebar)] p-4 rounded-2xl border border-[var(--studio-border)] hover:border-blue-300 hover:shadow-lg transition-all group"
            >
              <div className="w-12 text-center font-black text-2xl italic text-[var(--studio-muted)] group-hover:text-blue-600 transition-colors">
                {index + 1}
              </div>
              <div className="relative w-24 md:w-32 aspect-video rounded-xl overflow-hidden shadow-sm">
                <img src={track.thumbnailUrl} alt={track.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-8 h-8 text-white fill-current" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-[var(--studio-text)] group-hover:text-blue-600 transition-colors line-clamp-1">{track.title}</h3>
                <p className="text-sm text-[var(--studio-muted)] font-medium">{track.authorName}</p>
              </div>
              <div className="text-right hidden sm:block">
                <div className="flex items-center justify-end gap-2 text-blue-600 font-black text-lg">
                  <Play className="w-4 h-4" />
                  {track.views.toLocaleString()}
                </div>
                <p className="text-[10px] font-bold text-[var(--studio-muted)] uppercase tracking-widest">Прослушиваний</p>
              </div>
            </Link>
          ))}
        </div>
      ) : topType === 'videos' ? (
        <div className="space-y-4">
          {topVideos.map((video, index) => (
            <Link 
              key={video.id} 
              to={`/video/${video.id}`}
              className="flex items-center gap-4 bg-[var(--studio-sidebar)] p-4 rounded-2xl border border-[var(--studio-border)] hover:border-blue-300 hover:shadow-lg transition-all group"
            >
              <div className="w-12 text-center font-black text-2xl italic text-[var(--studio-muted)] group-hover:text-blue-600 transition-colors">
                {index + 1}
              </div>
              <div className="relative w-24 md:w-32 aspect-video rounded-xl overflow-hidden shadow-sm">
                <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-8 h-8 text-white fill-current" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-[var(--studio-text)] group-hover:text-blue-600 transition-colors line-clamp-1">{video.title}</h3>
                <p className="text-sm text-[var(--studio-muted)] font-medium">{video.authorName}</p>
              </div>
              <div className="text-right hidden sm:block">
                <div className="flex items-center justify-end gap-2 text-blue-600 font-black text-lg">
                  <Play className="w-4 h-4" />
                  {video.views.toLocaleString()}
                </div>
                <p className="text-[10px] font-bold text-[var(--studio-muted)] uppercase tracking-widest">Просмотров</p>
              </div>
            </Link>
          ))}
        </div>
      ) : topType === 'shorts' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {topShorts.map((short, index) => (
            <Link 
              key={short.id} 
              to={`/video/${short.id}`}
              className="bg-[var(--studio-sidebar)] rounded-2xl overflow-hidden border border-[var(--studio-border)] hover:border-blue-300 hover:shadow-xl transition-all group relative"
            >
              <div className="aspect-[9/16] overflow-hidden">
                <img src={short.thumbnailUrl} alt={short.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              </div>
              <div className="absolute top-2 left-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-lg flex items-center justify-center text-white text-sm font-black italic">
                #{index + 1}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="text-white text-xs font-bold line-clamp-2">{short.title}</h3>
                <div className="flex items-center gap-1 mt-1 text-blue-400 font-bold text-[10px]">
                  <Play className="w-3 h-3" />
                  {short.views.toLocaleString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {topPhotos.map((photo, index) => (
            <Link 
              key={photo.id} 
              to="/photos"
              className="bg-[var(--studio-sidebar)] rounded-3xl overflow-hidden border border-[var(--studio-border)] hover:border-pink-300 hover:shadow-xl hover:shadow-pink-50/50 transition-all group relative"
            >
              <div className="aspect-square overflow-hidden">
                <img src={photo.videoUrl} alt={photo.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              </div>
              <div className="absolute top-4 left-4 w-10 h-10 bg-black/50 backdrop-blur-md rounded-xl flex items-center justify-center text-white font-black italic">
                #{index + 1}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-[var(--studio-text)] line-clamp-1 group-hover:text-pink-500 transition-colors">{photo.title}</h3>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-[var(--studio-muted)]">{photo.authorName}</p>
                  <div className="flex items-center gap-1.5 text-pink-500 font-bold">
                    <Heart className="w-3.5 h-3.5 fill-current" />
                    <span className="text-xs">{photo.likes.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {((topType === 'authors' && channels.length === 0) || 
        (topType === 'tracks' && topTracks.length === 0) || 
        (topType === 'videos' && topVideos.length === 0) || 
        (topType === 'shorts' && topShorts.length === 0) || 
        (topType === 'photos' && topPhotos.length === 0)) && (
        <div className="text-center py-20 text-[var(--studio-muted)]">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-10" />
          <h2 className="text-2xl font-bold">Чарты пока пусты</h2>
          <p className="mt-2">Станьте первым, кто попадет в топ!</p>
        </div>
      )}
    </div>
  );
}
