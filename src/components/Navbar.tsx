import { Search, Menu, Video, Bell, LogIn, LogOut, X } from 'lucide-react';
import { useAuth } from '../App';
import { Link, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import { toast } from 'sonner';

export default function Navbar() {
  const { user, login, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin ? { email, password } : { email, password, displayName };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      
      login(data.token, data.user);
      setShowAuthModal(false);
      toast.success(isLogin ? 'Welcome back to the frost!' : 'Account created successfully!');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleLogout = () => {
    logout();
    toast.info('Stay cool! See you soon.');
    navigate('/');
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
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-2 bg-ice-accent/10 border border-ice-accent px-4 py-1.5 rounded-full text-ice-accent hover:bg-ice-accent hover:text-ice-bg transition-all font-medium"
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </button>
          )}
        </div>
      </nav>

      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass border border-ice-border rounded-2xl p-6 w-full max-w-md relative">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold mb-6 text-center ice-text-glow">
              {isLogin ? 'Welcome Back' : 'Join the Frost'}
            </h2>
            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm text-ice-muted mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-black/40 border border-ice-border rounded-lg py-2 px-4 focus:outline-none focus:border-ice-accent"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm text-ice-muted mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-ice-border rounded-lg py-2 px-4 focus:outline-none focus:border-ice-accent"
                />
              </div>
              <div>
                <label className="block text-sm text-ice-muted mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-ice-border rounded-lg py-2 px-4 focus:outline-none focus:border-ice-accent"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-ice-accent text-ice-bg font-bold py-2 rounded-lg mt-2 hover:bg-ice-accent/90 transition-colors shadow-[0_0_15px_rgba(0,242,255,0.3)]"
              >
                {isLogin ? 'Login' : 'Sign Up'}
              </button>
            </form>
            <p className="text-center mt-4 text-sm text-ice-muted">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="text-ice-accent hover:underline"
              >
                {isLogin ? 'Sign up' : 'Login'}
              </button>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
