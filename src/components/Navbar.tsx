import { Search, Menu, Video, Bell, LogIn, LogOut, X } from 'lucide-react';
import { useAuth } from '../App';
import { Link, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';

export default function Navbar() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Welcome to the frost!');
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.info('Stay cool! See you soon.');
      navigate('/');
    } catch (error: any) {
      toast.error('Failed to log out');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${searchQuery}`);
    }
  };

  return (
    <>
      <nav className="h-16 glass sticky top-0 z-50 flex items-center justify-between px-4 md:px-6 border-b border-ice-border">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <Menu className="w-6 h-6 text-ice-accent" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-ice-accent rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,242,255,0.5)]">
              <Video className="w-5 h-5 text-ice-bg" />
            </div>
            <span className="text-xl font-bold tracking-tighter ice-text-glow hidden sm:block">ICETUBE</span>
          </Link>
        </div>

        <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-4 hidden md:flex">
          <div className="relative w-full group">
            <input
              type="text"
              placeholder="Search through the frost..."
              className="w-full bg-black/40 border border-ice-border rounded-full py-2 px-5 focus:outline-none focus:border-ice-accent focus:ring-1 focus:ring-ice-accent transition-all text-ice-text placeholder:text-ice-muted"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:text-ice-accent transition-colors">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </form>

        <div className="flex items-center gap-2 md:gap-4">
          {user ? (
            <>
              <Link to="/studio" className="p-2 hover:bg-white/10 rounded-full transition-colors hidden sm:block" title="Studio">
                <Video className="w-6 h-6 text-ice-muted hover:text-ice-accent" />
              </Link>
              <button className="p-2 hover:bg-white/10 rounded-full transition-colors hidden sm:block">
                <Bell className="w-6 h-6 text-ice-muted" />
              </button>
              <div className="flex items-center gap-3 ml-2">
                <Link to={`/channel/${user.uid}`}>
                  <img
                    src={user.photoURL || ''}
                    alt="Profile"
                    className="w-8 h-8 rounded-full border border-ice-accent shadow-[0_0_10px_rgba(0,242,255,0.3)]"
                  />
                </Link>
                <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Logout">
                  <LogOut className="w-5 h-5 text-ice-muted hover:text-red-400" />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={handleLogin}
              className="flex items-center gap-2 bg-ice-accent/10 border border-ice-accent px-4 py-1.5 rounded-full text-ice-accent hover:bg-ice-accent hover:text-ice-bg transition-all font-medium"
            >
              <LogIn className="w-4 h-4" />
              <span>Login with Google</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
