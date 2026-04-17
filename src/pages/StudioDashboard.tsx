import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { supabase } from '../lib/supabase';
import { databaseService } from '../lib/databaseService';
import { VideoType } from '../types';
import { Eye, ThumbsUp, MessageSquare, Users, TrendingUp, Play, Plus, ChevronRight, Snowflake, Search, X, UserPlus, RefreshCw, ChevronDown, Trophy } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { safeFormatDistanceToNow } from '../lib/dateUtils';
import { toast } from 'sonner';

import { APP_LOGO_URL } from '../constants';

export default function StudioDashboard() {
  const { user, channels, activeChannel, setActiveChannel } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalLikes: 0,
    totalIces: 0,
    subscribers: 0
  });

  const [competitorsData, setCompetitorsData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSubscribers, setRecentSubscribers] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !activeChannel) {
      if (!user) {
        navigate('/');
      } else if (!activeChannel) {
        setLoading(false);
      }
      return;
    }

    const fetchStudioData = async () => {
      try {
        // Fetch last 5 videos
        const { data: lastVideos, error: vError } = await supabase
          .from('videos')
          .select('*')
          .eq('author_id', activeChannel.id)
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (vError) throw vError;
        setVideos((lastVideos || []).map(d => databaseService.mapVideo(d)));

        // Fetch all videos for stats
        const { data: allVideos, error: allVError } = await supabase
          .from('videos')
          .select('views, likes, ices')
          .eq('author_id', activeChannel.id);
        
        if (allVError) throw allVError;
        
        let views = 0;
        let likes = 0;
        let ices = 0;
        (allVideos || []).forEach(d => {
          views += d.views || 0;
          likes += d.likes || 0;
          ices += d.ices || 0;
        });

        setStats({
          totalViews: views,
          totalLikes: likes,
          totalIces: ices,
          subscribers: activeChannel.subscribers || 0
        });

        // Fetch competitors data
        if (activeChannel.competitors && activeChannel.competitors.length > 0) {
          const { data: compData, error: compError } = await supabase
            .from('channels')
            .select('*')
            .in('id', activeChannel.competitors);
          
          if (!compError && compData) {
            setCompetitorsData(compData.map(d => databaseService.mapChannel(d)));
          }
        } else {
          setCompetitorsData([]);
        }

        // Fetch recent subscribers
        const { data: subsData, error: subsError } = await supabase
          .from('subscriptions')
          .select('*, users(*)')
          .eq('channel_id', activeChannel.id)
          .order('created_at', { ascending: false })
          .limit(30);
        
        if (!subsError && subsData) {
          const publicSubs = subsData
            .filter(item => item.users?.is_subscription_public !== false)
            .map(item => ({
               id: item.users?.id,
               displayName: item.users?.display_name,
               photoURL: item.users?.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.users?.id}`,
               subscribers: item.users?.subscribers || 0
            }))
            .slice(0, 10);
          setRecentSubscribers(publicSubs);
        }

      } catch (error) {
        console.error("Error fetching studio data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudioData();
  }, [user, activeChannel]);

  const handleSearchCompetitors = async () => {
    if (!searchQuery.trim()) return;
    if (!activeChannel) {
      toast.error('Активный канал не найден');
      return;
    }
    
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .ilike('display_name', `%${searchQuery}%`)
        .limit(20);
      
      if (error) throw error;
      
      const results = (data || [])
        .map(c => databaseService.mapChannel(c))
        .filter(c => c.id !== activeChannel.id && !(activeChannel.competitors || []).includes(c.id));
        
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Ошибка при поиске');
    } finally {
      setIsSearching(false);
    }
  };

  const addCompetitor = async (channelId: string) => {
    if (!activeChannel) return;
    try {
      const updatedCompetitors = [...(activeChannel.competitors || []), channelId];
      const { error } = await supabase
        .from('channels')
        .update({ competitors: updatedCompetitors })
        .eq('id', activeChannel.id);
      
      if (error) throw error;

      toast.success('Конкурент добавлен');
      setSearchQuery('');
      setSearchResults([]);
      setActiveChannel({ ...activeChannel, competitors: updatedCompetitors });
    } catch (error) {
      toast.error('Не удалось добавить конкурента');
    }
  };

  const removeCompetitor = async (channelId: string) => {
    if (!activeChannel) return;
    try {
      const updatedCompetitors = (activeChannel.competitors || []).filter(id => id !== channelId);
      const { error } = await supabase
        .from('channels')
        .update({ competitors: updatedCompetitors })
        .eq('id', activeChannel.id);
      
      if (error) throw error;

      toast.success('Конкурент удален');
      setActiveChannel({ ...activeChannel, competitors: updatedCompetitors });
    } catch (error) {
      toast.error('Не удалось удалить конкурента');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="relative">
          <img 
            src={APP_LOGO_URL} 
            alt="IceStudio Logo" 
            className="w-20 h-20 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.3)] animate-pulse object-contain"
            crossOrigin="anonymous"
          />
          <div className="absolute -inset-3 border-4 border-blue-600/20 border-t-blue-600 rounded-[1.75rem] animate-spin"></div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <h2 className="text-xl font-black tracking-tighter text-blue-600">IceStudio</h2>
          <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-primary)]">Панель управления</h1>
          <p className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-widest">Обзор канала и статистика</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {channels.length > 1 && (
            <div className="relative group">
              <button className="flex items-center gap-3 bg-[var(--surface)] border border-[var(--border)] px-4 py-3 rounded-xl hover:bg-[var(--hover)] transition-all">
                <img src={activeChannel?.photoURL} className="w-6 h-6 rounded-full object-cover" alt="" />
                <span className="text-xs font-bold text-[var(--text-primary)]">{activeChannel?.displayName}</span>
                <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
              <div className="absolute right-0 mt-2 w-64 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="p-2">
                  <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest px-3 py-2">Сменить канал</p>
                  {channels.map(channel => (
                    <button
                      key={channel.id}
                      onClick={() => setActiveChannel(channel)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${activeChannel?.id === channel.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-[var(--hover)]'}`}
                    >
                      <img src={channel.photoURL} className="w-8 h-8 rounded-full object-cover" alt="" />
                      <div className="text-left">
                        <p className="text-xs font-bold truncate">{channel.displayName}</p>
                        {channel.isPrimary && <span className="text-[9px] uppercase tracking-tighter opacity-60">Основной</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <button 
            onClick={() => navigate('/studio/upload')}
            className="flex-1 md:flex-none bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Создать контент
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Latest Video Performance */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col group hover:border-blue-500/50 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-sm uppercase tracking-widest text-[var(--text-secondary)]">Эффективность видео</h2>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          
          {videos.length > 0 ? (
            <div className="space-y-6 flex-1 flex flex-col">
              <div className="relative aspect-video rounded-xl overflow-hidden border border-[var(--border)] cursor-pointer" onClick={() => navigate(`/video/${videos[0].id}`)}>
                <img src={videos[0].thumbnailUrl} alt={videos[0].title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                  {videos[0].duration}
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-bold text-base line-clamp-2 hover:text-blue-600 cursor-pointer text-[var(--text-primary)] transition-colors" onClick={() => navigate(`/video/${videos[0].id}`)}>
                  {videos[0].title}
                </h3>
                <p className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">
                  {videos[0].createdAt ? safeFormatDistanceToNow(videos[0].createdAt) : 'Неизвестно'}
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-[var(--border)]">
                <div className="flex justify-between items-center group/item">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Eye className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Просмотры</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{videos[0].views?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center group/item">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Лайки</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{videos[0].likes?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center group/item">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Snowflake className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold uppercase tracking-wider">Снежинки</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{videos[0].ices?.toLocaleString() || 0}</span>
                </div>
              </div>

              <div className="mt-auto pt-6">
                <Link to="/studio/content" className="flex items-center justify-center gap-2 w-full bg-[var(--hover)] text-[var(--text-primary)] text-[10px] font-bold py-3 rounded-xl transition-all uppercase tracking-widest hover:bg-blue-600 hover:text-white">
                  Подробная аналитика
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-[var(--text-secondary)]">
              <div className="w-16 h-16 bg-[var(--hover)] rounded-full flex items-center justify-center mb-4 border border-[var(--border)]">
                <Play className="w-8 h-8 opacity-20" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest">Нет контента</p>
              <p className="text-[10px] mt-2">Загрузите видео, чтобы увидеть статистику</p>
            </div>
          )}
        </div>

        {/* Channel Analytics */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col hover:border-blue-500/50 transition-colors">
          <h2 className="font-bold text-sm uppercase tracking-widest text-[var(--text-secondary)] mb-8">Аналитика канала</h2>
          
          <div className="space-y-10 flex-1">
            <div className="relative">
              <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mb-1">Всего подписчиков</p>
              <p className="text-5xl font-black text-[var(--text-primary)] tracking-tighter font-mono">
                {stats.subscribers.toLocaleString()}
              </p>
              <div className="flex items-center gap-1.5 text-green-500 text-[10px] mt-2 font-bold uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+0 за 28 дней</span>
              </div>
            </div>
            
            <div className="pt-8 border-t border-[var(--border)] space-y-6">
              <h3 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Сводка (все время)</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between p-4 bg-[var(--hover)] rounded-xl border border-[var(--border)] group hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <Eye className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Просмотры</span>
                  </div>
                  <p className="text-xl font-bold text-[var(--text-primary)] font-mono">{stats.totalViews.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between p-4 bg-[var(--hover)] rounded-xl border border-[var(--border)] group hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                      <ThumbsUp className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Лайки</span>
                  </div>
                  <p className="text-xl font-bold text-[var(--text-primary)] font-mono">{stats.totalLikes.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between p-4 bg-[var(--hover)] rounded-xl border border-[var(--border)] group hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-400/10 flex items-center justify-center text-blue-400">
                      <Snowflake className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">Снежинки</span>
                  </div>
                  <p className="text-xl font-bold text-[var(--text-primary)] font-mono">{stats.totalIces.toLocaleString()}</p>
                </div>
              </div>

              {/* Pinned Achievements in Dashboard */}
              {activeChannel?.pinnedAchievements && activeChannel.pinnedAchievements.length > 0 && (
                <div className="pt-6 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Закреплено на канале</h3>
                    <Trophy className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div className="space-y-2">
                    {activeChannel.pinnedAchievements.map(id => {
                      const titles: Record<string, string> = {
                        'subscribers_10': '10 Подписчиков',
                        'long_views_1000': '1000 Просмотров',
                        'shorts_views_1000': '1000 Shorts'
                      };
                      return (
                        <div key={id} className="flex items-center gap-3 p-3 bg-[var(--hover)]/50 rounded-xl border border-[var(--border)]">
                          <Trophy className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-wider">{titles[id]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-auto pt-6">
            <Link to="/studio/analytics" className="flex items-center justify-center gap-2 w-full bg-[var(--hover)] text-[var(--text-primary)] text-[10px] font-bold py-3 rounded-xl transition-all uppercase tracking-widest hover:bg-blue-600 hover:text-white">
              Аналитика канала
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Recent Content List */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col hover:border-blue-500/50 transition-colors">
          <h2 className="font-bold text-sm uppercase tracking-widest text-[var(--text-secondary)] mb-6">Последние публикации</h2>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {videos.slice(1).map(video => (
              <div key={video.id} className="flex gap-4 items-center group cursor-pointer p-3 hover:bg-[var(--hover)] rounded-xl transition-all border border-transparent hover:border-[var(--border)]" onClick={() => navigate(`/video/${video.id}`)}>
                <div className="relative w-24 aspect-video rounded-lg overflow-hidden border border-[var(--border)] flex-shrink-0 shadow-sm">
                  <img src={video.thumbnailUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="" />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-[var(--text-primary)] line-clamp-1 group-hover:text-blue-600 transition-colors">{video.title}</h4>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-[var(--text-secondary)] uppercase">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {video.views}</span>
                    <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {video.likes}</span>
                  </div>
                </div>
              </div>
            ))}
            {videos.length > 1 ? (
              <div className="mt-auto pt-6">
                <Link to="/studio/content" className="flex items-center justify-center gap-2 w-full bg-[var(--hover)] text-[var(--text-primary)] text-[10px] font-bold py-3 rounded-xl transition-all uppercase tracking-widest hover:bg-blue-600 hover:text-white">
                  Весь контент
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ) : videos.length === 1 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-[var(--text-secondary)]">
                <div className="w-12 h-12 bg-[var(--hover)] rounded-full flex items-center justify-center mb-3 opacity-20">
                  <Play className="w-6 h-6" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest italic">Больше ничего нет</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Grid for New Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Subscribers Section */}
        {recentSubscribers && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex flex-col hover:border-blue-500/50 transition-colors">
            <h2 className="font-bold text-sm uppercase tracking-widest text-[var(--text-secondary)] mb-6 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-green-500" /> Последние подписчики
            </h2>
            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
              {recentSubscribers.length > 0 ? (
                recentSubscribers.map((subscriber, idx) => (
                  <Link key={idx} to={`/channel/${subscriber.id}`} className="flex items-center gap-4 p-3 hover:bg-[var(--hover)] rounded-xl transition-all border border-transparent hover:border-[var(--border)]">
                    <img src={subscriber.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${subscriber.id}`} alt="" className="w-10 h-10 rounded-full" />
                    <div>
                      <h4 className="text-sm font-bold text-[var(--text-primary)] hover:text-blue-600 transition-colors">{subscriber.displayName}</h4>
                      <p className="text-[10px] text-[var(--text-secondary)] font-mono uppercase tracking-widest">{subscriber.subscribers || 0} подп.</p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-[var(--text-secondary)]">
                  <div className="w-12 h-12 bg-[var(--hover)] rounded-full flex items-center justify-center mb-3 opacity-20">
                    <Users className="w-6 h-6" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest italic">Новых подписчиков пока нет</p>
                </div>
              )}
            </div>
            {recentSubscribers.length > 0 && (
              <div className="pt-4 border-t border-[var(--border)] mt-4 flex justify-between items-center text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest">
                <span>Отображаются только публичные</span>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Competitors Section */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Конкуренты</h2>
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Следите за успехами других каналов</p>
          </div>
          
          <div className="relative w-full md:w-96">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchCompetitors()}
                  placeholder="Найти канал..."
                  className="w-full bg-[var(--hover)] border border-[var(--border)] rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <button 
                onClick={handleSearchCompetitors}
                disabled={isSearching}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Поиск'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto">
                <div className="p-2 border-b border-[var(--border)] flex justify-between items-center bg-[var(--hover)]/50">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] px-2">Результаты поиска</span>
                  <button onClick={() => setSearchResults([])} className="p-1 hover:bg-[var(--border)] rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {searchResults.map(channel => (
                  <div key={channel.id} className="flex items-center justify-between p-4 hover:bg-[var(--hover)] transition-colors border-b border-[var(--border)] last:border-0">
                    <div className="flex items-center gap-3">
                      <img src={channel.photoURL} alt="" className="w-10 h-10 rounded-full object-cover border border-[var(--border)]" />
                      <div>
                        <p className="text-sm font-bold text-[var(--text-primary)]">{channel.displayName}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] font-medium">{channel.subscribers || 0} подписчиков</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => addCompetitor(channel.id)}
                      className="p-2 bg-blue-600/10 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                      title="Добавить в конкуренты"
                    >
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {competitorsData.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {competitorsData.map(comp => (
              <div key={comp.id} className="bg-[var(--hover)] border border-[var(--border)] rounded-2xl p-6 relative group hover:border-blue-500/30 transition-all">
                <button 
                  onClick={() => removeCompetitor(comp.id)}
                  className="absolute top-4 right-4 p-2 text-[var(--text-secondary)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  title="Удалить"
                >
                  <X className="w-4 h-4" />
                </button>
                
                <div className="flex flex-col items-center text-center space-y-4">
                  <Link to={`/channel/${comp.id}`}>
                    <img src={comp.photoURL} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-[var(--surface)] shadow-lg group-hover:scale-105 transition-transform" />
                  </Link>
                  <div>
                    <Link to={`/channel/${comp.id}`} className="text-base font-black text-[var(--text-primary)] hover:text-blue-600 transition-colors line-clamp-1">{comp.displayName}</Link>
                    <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">Канал-конкурент</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-8 pt-6 border-t border-[var(--border)]/50">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Подписчики</p>
                    <p className="text-lg font-black text-[var(--text-primary)] font-mono">{comp.subscribers?.toLocaleString() || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1">Снежинки</p>
                    <div className="flex items-center justify-center gap-1 text-blue-400">
                      <Snowflake className="w-3.5 h-3.5" />
                      <p className="text-lg font-black text-[var(--text-primary)] font-mono">{comp.ices?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </div>
                
                <Link to={`/channel/${comp.id}`} className="mt-6 flex items-center justify-center gap-2 w-full bg-[var(--surface)] text-[var(--text-primary)] text-[10px] font-bold py-3 rounded-xl transition-all uppercase tracking-widest hover:bg-blue-600 hover:text-white">
                  Перейти на канал
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center bg-[var(--hover)]/30 rounded-3xl border border-dashed border-[var(--border)]">
            <div className="w-16 h-16 bg-[var(--surface)] rounded-full flex items-center justify-center mb-4 shadow-sm">
              <Users className="w-8 h-8 text-[var(--text-secondary)] opacity-20" />
            </div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">Список конкурентов пуст</h3>
            <p className="text-[10px] text-[var(--text-secondary)] mt-2 max-w-xs mx-auto">Добавьте каналы, за которыми хотите следить, используя поиск выше</p>
          </div>
        )}
      </div>
    </div>
  );
}
