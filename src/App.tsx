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
import StudioHiddenChannels from './pages/StudioHiddenChannels';
import Shorts from './pages/Shorts';
import Music from './pages/Music';
import TopChannels from './pages/TopChannels';
import History from './pages/History';
import WatchLater from './pages/WatchLater';
import Favorites from './pages/Favorites';
import Subscriptions from './pages/Subscriptions';
import Playlists from './pages/Playlists';
import PlaylistDetail from './pages/PlaylistDetail';
import Settings from './pages/Settings';
import Studio from './pages/Studio';
import Photos from './pages/Photos';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

import { APP_LOGO_URL } from './constants';

interface User {
  uid: string;
  email: string;
  displayName: string;
  pseudonym?: string;
  photoURL: string;
  subscribers: number;
  primaryChannelId?: string;
}

interface ChannelType {
  id: string;
  ownerId: string;
  displayName: string;
  photoURL: string;
  isPrimary: boolean;
  subscribers: number;
}

interface AuthContextType {
  user: User | null;
  channels: ChannelType[];
  activeChannel: ChannelType | null;
  setActiveChannel: (channel: ChannelType) => void;
  loading: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  channels: [],
  activeChannel: null,
  setActiveChannel: () => {},
  loading: true,
  theme: 'light',
  toggleTheme: () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [channels, setChannels] = useState<ChannelType[]>([]);
  const [activeChannel, setActiveChannel] = useState<ChannelType | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          let userData: any;

          if (userSnap.exists()) {
            userData = userSnap.data();
          } else {
            userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              pseudonym: '',
              photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
              subscribers: 0,
              createdAt: new Date()
            };
            await setDoc(userRef, userData);
          }

          // Fetch or create channels
          const channelsRef = collection(db, 'channels');
          const q = query(channelsRef, where('ownerId', '==', firebaseUser.uid));
          const channelsSnap = await getDocs(q);
          let userChannels: ChannelType[] = channelsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ChannelType));

          if (userChannels.length === 0) {
            // Create primary channel
            const channelId = typeof crypto.randomUUID === 'function' 
              ? crypto.randomUUID() 
              : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            
            const primaryChannel: ChannelType = {
              id: channelId,
              ownerId: firebaseUser.uid,
              displayName: userData.displayName,
              photoURL: userData.photoURL,
              isPrimary: true,
              subscribers: 0
            };
            await setDoc(doc(db, 'channels', channelId), {
              ...primaryChannel,
              bio: '',
              createdAt: new Date()
            });
            await updateDoc(userRef, { primaryChannelId: channelId });
            userChannels = [primaryChannel];
            userData.primaryChannelId = channelId;
          }

          setChannels(userChannels);
          const primary = userChannels.find(c => c.isPrimary) || userChannels[0];
          setActiveChannel(primary);
          setUser({
            ...userData,
            uid: firebaseUser.uid
          });
        } catch (error) {
          console.error("Error fetching/saving user:", error);
          toast.error("Ошибка при инициализации профиля. Пожалуйста, обновите страницу.");
        }
      } else {
        setUser(null);
        setChannels([]);
        setActiveChannel(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
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
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, channels, activeChannel, setActiveChannel, loading, theme, toggleTheme }}>
      <Router>
        <div className={`min-h-screen bg-[var(--bg)] text-[var(--text-primary)] flex flex-col transition-colors duration-300`}>
          <Navbar />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Home />} />
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
                <Route path="/studio/hidden" element={<StudioHiddenChannels />} />
                <Route path="/studio/upload" element={<Studio />} />
                <Route path="/history" element={<History />} />
                <Route path="/watch-later" element={<WatchLater />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/subscriptions" element={<Subscriptions />} />
                <Route path="/playlists" element={<Playlists />} />
                <Route path="/playlist/:id" element={<PlaylistDetail />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </main>
          </div>
        </div>
        <Toaster theme={theme} position="bottom-right" />
      </Router>
    </AuthContext.Provider>
  );
}
