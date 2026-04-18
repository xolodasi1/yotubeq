import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import VideoPlayer from './pages/VideoPlayer';
import Channel from './pages/Channel';
import StudioDashboard from './pages/StudioDashboard';
import StudioContent from './pages/StudioContent';
import StudioAnalytics from './pages/StudioAnalytics';
import StudioComments from './pages/StudioComments';
import StudioCommunity from './pages/StudioCommunity';
import StudioProfile from './pages/StudioProfile';
import StudioAchievements from './pages/StudioAchievements';
import StudioVerification from './pages/StudioVerification';
import StudioHiddenChannels from './pages/StudioHiddenChannels';
import Shorts from './pages/Shorts';
import Music from './pages/Music';
import TopChannels from './pages/TopChannels';
import AdminDashboard from './pages/AdminDashboard';
import History from './pages/History';
import WatchLater from './pages/WatchLater';
import Favorites from './pages/Favorites';
import Subscriptions from './pages/Subscriptions';
import Playlists from './pages/Playlists';
import PlaylistDetail from './pages/PlaylistDetail';
import Settings from './pages/Settings';
import Studio from './pages/Studio';
import Photos from './pages/Photos';
import { supabase, isSupabaseConfigured } from './lib/supabase';

import { APP_LOGO_URL } from './constants';

interface User {
  uid: string;
  email: string;
  displayName: string;
  pseudonym?: string;
  photoURL: string;
  bannerUrl?: string;
  subscribers: number;
  ices: number;
  primaryChannelId?: string;
}

interface ChannelType {
  id: string;
  ownerId: string;
  displayName: string;
  photoURL: string;
  bannerUrl?: string;
  isPrimary: boolean;
  subscribers: number;
  ices: number;
  competitors: string[];
  pinnedAchievements?: string[];
  isBanned?: boolean;
}

interface AuthContextType {
  user: User | null;
  channels: ChannelType[];
  activeChannel: ChannelType | null;
  setActiveChannel: (channel: ChannelType) => void;
  loading: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  channels: [],
  activeChannel: null,
  setActiveChannel: () => {},
  loading: true,
  theme: 'light',
  toggleTheme: () => {},
  isSidebarOpen: true,
  toggleSidebar: () => {},
});

export const useAuth = () => useContext(AuthContext);

import Videos from './pages/Videos';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [channels, setChannels] = useState<ChannelType[]>([]);
  const [activeChannel, setActiveChannel] = useState<ChannelType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSetActiveChannel = (channel: ChannelType) => {
    setActiveChannel(channel);
    setChannels(prev => prev.map(c => c.id === channel.id ? channel : c));
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    console.log("Current user state:", user?.uid);
  }, [user]);

  const userRef = React.useRef<User | null>(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Supabase Auth state changed:", event, session?.user?.id);
      
      const supabaseUser = session?.user;
      
      if (!supabaseUser) {
        console.log("No supabase user, clearing state");
        setUser(null);
        setChannels([]);
        setActiveChannel(null);
        setLoading(false);
        return;
      }

      // Optimization: if we already have a user and this is just a token refresh, do NOTHING.
      // This prevents the "infinite loading" when switching tabs as TOKEN_REFRESHED fires on wake-up.
      if (event === 'TOKEN_REFRESHED' && userRef.current?.uid === supabaseUser.id) {
        console.log("Token refreshed on active session - silent update.");
        return;
      }

      // If it's a regular refresh or signd in, proceed with fetching data.
      setLoading(true);
      
      let isCompleted = false;
      const loadingTimeout = setTimeout(() => {
        if (!isCompleted) {
          console.warn("Connection timeout during auth initialization");
          setLoading(false);
          // Only show toast if we are actually stuck
          toast.error("Слабое соединение. Приложение может работать нестабильно.");
        }
      }, 7000); 
      
      try {
        // Fetch User from Supabase
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', supabaseUser.id)
          .single();

        let finalUserData: any = userData;

        if (userError || !userData) {
          console.log("Supabase user document missing, initiating creation...");
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .upsert({
              id: supabaseUser.id,
              uid: supabaseUser.id,
              email: supabaseUser.email || '',
              display_name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
              photo_url: supabaseUser.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${supabaseUser.id}`,
              subscribers: 0,
              ices: 0,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (createError) throw createError;
          finalUserData = newUser;
        }

        const mappedUser: User = {
          uid: supabaseUser.id,
          email: finalUserData.email,
          displayName: finalUserData.display_name,
          photoURL: finalUserData.photo_url,
          bannerUrl: finalUserData.banner_url,
          subscribers: finalUserData.subscribers || 0,
          ices: finalUserData.ices || 0,
          primaryChannelId: finalUserData.primary_channel_id
        };

        setUser(mappedUser);

        const { data: userChannelsData, error: channelsError } = await supabase
          .from('channels')
          .select('*')
          .eq('owner_id', supabaseUser.id);

        if (channelsError) throw channelsError;

        let userChannels: ChannelType[] = (userChannelsData || []).map(c => ({
          id: c.id,
          ownerId: c.owner_id,
          displayName: c.display_name,
          photoURL: c.photo_url,
          bannerUrl: c.banner_url,
          isPrimary: c.is_primary,
          subscribers: c.subscribers || 0,
          ices: c.ices || 0,
          competitors: c.competitors || [],
          pinnedAchievements: c.pinned_achievements || [],
          isBanned: c.is_banned
        }));

        if (userChannels.length === 0) {
          const { data: newChannel, error: channelCreateError } = await supabase
            .from('channels')
            .insert({
              id: supabaseUser.id,
              owner_id: supabaseUser.id,
              display_name: mappedUser.displayName,
              photo_url: mappedUser.photoURL,
              is_primary: true,
              subscribers: 0,
              ices: 0,
              bio: '',
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (channelCreateError) throw channelCreateError;
          
          const mappedChannel: ChannelType = {
            id: newChannel.id,
            ownerId: newChannel.owner_id,
            displayName: newChannel.display_name,
            photoURL: newChannel.photo_url,
            isPrimary: newChannel.is_primary,
            subscribers: newChannel.subscribers,
            ices: newChannel.ices,
            competitors: [],
            pinnedAchievements: []
          };
          userChannels.push(mappedChannel);
        }

        setChannels(userChannels);
        const primary = userChannels.find(c => c.isPrimary) || userChannels[0];
        setActiveChannel(primary);

      } catch (error: any) {
        console.error("Auth init error:", error);
      } finally {
        isCompleted = true;
        clearTimeout(loadingTimeout);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, channels, activeChannel, setActiveChannel: handleSetActiveChannel, loading, theme, toggleTheme, isSidebarOpen, toggleSidebar }}>
      <Router>
        {!isSupabaseConfigured ? (
          <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[var(--card)] border border-blue-500/20 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center gap-6">
              <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center">
                <img 
                  src={APP_LOGO_URL} 
                  alt="Logo" 
                  className="w-12 h-12 rounded-xl"
                  crossOrigin="anonymous"
                />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-[var(--text)] mb-2">Setup Required</h1>
                <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                  IceTube is now powered by Supabase. To get started, you need to connect your own database.
                </p>
              </div>
              <div className="w-full space-y-4 text-left">
                <div className="p-4 bg-blue-600/5 rounded-xl border border-blue-600/10">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">How to connect:</h3>
                  <ol className="text-sm list-decimal list-inside space-y-2 text-[var(--text)]">
                    <li>Go to the <span className="font-bold">Settings</span> menu in this editor</li>
                    <li>Open the <span className="font-bold">Secrets/Environment Variables</span> tab</li>
                    <li>Add <code className="bg-blue-600/10 px-1 rounded text-blue-600 font-mono">VITE_SUPABASE_URL</code></li>
                    <li>Add <code className="bg-blue-600/10 px-1 rounded text-blue-600 font-mono">VITE_SUPABASE_ANON_KEY</code></li>
                  </ol>
                </div>
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                >
                  I've added the secrets
                </button>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center gap-6">
            <div className="relative">
              <img 
                src={APP_LOGO_URL} 
                alt="IceTube Logo" 
                className="w-24 h-24 rounded-3xl shadow-[0_0_30px_rgba(37,99,235,0.4)] animate-pulse object-contain"
                crossOrigin="anonymous"
              />
              <div className="absolute -inset-4 border-4 border-blue-600/20 border-t-blue-600 rounded-[2.5rem] animate-spin"></div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <h2 className="text-2xl font-black tracking-tighter text-blue-600">IceTube</h2>
              {process.env.icceeeee && (
                <p className="text-xs font-bold text-blue-400/80 animate-pulse uppercase tracking-widest">
                  {process.env.icceeeee}
                </p>
              )}
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        ) : activeChannel?.isBanned ? (
          <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
            <div className="bg-red-600/10 border-2 border-red-600/50 p-8 rounded-[2rem] max-w-lg w-full text-center shadow-2xl shadow-red-900/50">
              <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🛑</span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight leading-tight mb-4">Канал заблокирован</h1>
              <p className="text-red-200 font-medium mb-8">
                Доступ к вашему аккаунту ограничен администрацией за нарушение правил платформы IceTube.
                Пожалуйста, свяжитесь с поддержкой, если считаете это ошибкой.
              </p>
              <button onClick={() => supabase.auth.signOut()} className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest rounded-2xl w-full transition-colors opacity-90">
                Выйти из аккаунта
              </button>
            </div>
          </div>
        ) : (
          <div className={`min-h-screen bg-[var(--bg)] text-[var(--text-primary)] flex flex-col transition-colors duration-300`}>
            <Navbar />
            <div className="flex flex-1 overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-y-auto">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/videos" element={<Videos />} />
                  <Route path="/shorts" element={<Shorts />} />
                  <Route path="/music" element={<Music />} />
                  <Route path="/top-channels" element={<TopChannels />} />
                  <Route path="/photos" element={<Photos />} />
                  <Route path="/video/:id" element={<VideoPlayer />} />
                  <Route path="/channel/:id" element={<Channel />} />
                  <Route path="/studio" element={<StudioDashboard />} />
                  <Route path="/studio/content" element={<StudioContent />} />
                  <Route path="/studio/analytics" element={<StudioAnalytics />} />
                  <Route path="/studio/comments" element={<StudioComments />} />
                  <Route path="/studio/community" element={<StudioCommunity />} />
                  <Route path="/studio/profile" element={<StudioProfile />} />
                  <Route path="/studio/achievements" element={<StudioAchievements />} />
                  <Route path="/studio/verification" element={<StudioVerification />} />
                  <Route path="/studio/hidden" element={<StudioHiddenChannels />} />
                  <Route path="/studio/upload" element={<Studio />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/watch-later" element={<WatchLater />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/subscriptions" element={<Subscriptions />} />
                  <Route path="/playlists" element={<Playlists />} />
                  <Route path="/playlist/:id" element={<PlaylistDetail />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/admin/*" element={<AdminDashboard />} />
                </Routes>
              </main>
            </div>
          </div>
        )}
        <Toaster theme={theme} position="bottom-right" />
      </Router>
    </AuthContext.Provider>
  );
}
