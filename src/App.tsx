import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import VideoPlayer from './pages/VideoPlayer';
import Channel from './pages/Channel';
import Studio from './pages/Studio';
import { supabase } from './lib/supabase';

interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          uid: session.user.id,
          email: session.user.email || '',
          displayName: session.user.user_metadata?.displayName || session.user.email?.split('@')[0] || 'User',
          photoURL: session.user.user_metadata?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}`,
        });
      }
      setLoading(false);
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          uid: session.user.id,
          email: session.user.email || '',
          displayName: session.user.user_metadata?.displayName || session.user.email?.split('@')[0] || 'User',
          photoURL: session.user.user_metadata?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.id}`,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-ice-bg flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-ice-accent border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,242,255,0.5)]"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      <Router>
        <div className="min-h-screen bg-ice-bg text-ice-text flex flex-col">
          <Navbar />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/video/:id" element={<VideoPlayer />} />
                <Route path="/channel/:id" element={<Channel />} />
                <Route path="/studio" element={<Studio />} />
              </Routes>
            </main>
          </div>
        </div>
        <Toaster theme="dark" position="bottom-right" />
      </Router>
    </AuthContext.Provider>
  );
}
