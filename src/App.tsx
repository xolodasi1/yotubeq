import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
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
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface User {
  uid: string;
  email: string;
  displayName: string;
  pseudonym?: string;
  photoURL: string;
  subscribers: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  theme: 'light',
  toggleTheme: () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
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
        let subscribers = 0;
        let pseudonym = '';
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            subscribers = data.subscribers || 0;
            pseudonym = data.pseudonym || '';
          } else {
            await setDoc(userRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              pseudonym: '',
              photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
              subscribers: 0,
              createdAt: new Date()
            });
          }
        } catch (error) {
          console.error("Error fetching/saving user:", error);
        }

        const userData: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          pseudonym: pseudonym,
          photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
          subscribers: subscribers
        };
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, theme, toggleTheme }}>
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
