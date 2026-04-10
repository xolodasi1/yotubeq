import { Search, Menu, Video, Bell, LogIn, LogOut, X, Phone, Twitch } from 'lucide-react';
import { useAuth } from '../App';
import { Link, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, OAuthProvider, signOut } from 'firebase/auth';

export default function Navbar() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowAuthModal(false);
      toast.success('Добро пожаловать в морозный мир!');
    } catch (error: any) {
      toast.error(error.message || 'Ошибка аутентификации');
    }
  };

  const handleTwitchLogin = async () => {
    try {
      const provider = new OAuthProvider('twitch.com');
      await signInWithPopup(auth, provider);
      setShowAuthModal(false);
      toast.success('Добро пожаловать через Twitch!');
    } catch (error: any) {
      console.error(error);
      toast.error('Ошибка входа через Twitch. Убедитесь, что Twitch OAuth настроен в Firebase Console.');
    }
  };

  const handlePhoneLogin = () => {
    toast.info('Вход по номеру телефона требует настройки reCAPTCHA в Firebase Console. Пожалуйста, используйте Google.');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.info('Оставайтесь в прохладе! До скорой встречи.');
      navigate('/');
    } catch (error: any) {
      toast.error('Не удалось выйти из системы');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${searchQuery}`);
      setShowMobileSearch(false);
    }
  };

  return (
    <>
      <nav className="h-14 md:h-16 glass sticky top-0 z-50 flex items-center justify-between px-3 md:px-6 border-b border-ice-border">
        {showMobileSearch ? (
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 w-full animate-in fade-in slide-in-from-top-2">
            <button type="button" onClick={() => setShowMobileSearch(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5 text-ice-muted" />
            </button>
            <div className="relative flex-1">
              <input
                type="text"
                autoFocus
                placeholder="Поиск..."
                className="w-full bg-black/40 border border-ice-border rounded-full py-1.5 px-4 focus:outline-none focus:border-ice-accent focus:ring-1 focus:ring-ice-accent transition-all text-ice-text placeholder:text-ice-muted text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:text-ice-accent transition-colors">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-center gap-2 md:gap-4">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-7 h-7 md:w-8 md:h-8 bg-ice-accent rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,242,255,0.5)]">
                  <Video className="w-4 h-4 md:w-5 md:h-5 text-ice-bg" />
                </div>
                <span className="text-lg md:text-xl font-bold tracking-tighter ice-text-glow hidden xs:block">ICETUBE</span>
              </Link>
            </div>

            <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-4 hidden md:flex">
              <div className="relative w-full group">
                <input
                  type="text"
                  placeholder="Поиск сквозь мороз..."
                  className="w-full bg-black/40 border border-ice-border rounded-full py-2 px-5 focus:outline-none focus:border-ice-accent focus:ring-1 focus:ring-ice-accent transition-all text-ice-text placeholder:text-ice-muted"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:text-ice-accent transition-colors">
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </form>

            <div className="flex items-center gap-1 md:gap-4">
              <button 
                onClick={() => setShowMobileSearch(true)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors md:hidden"
              >
                <Search className="w-5 h-5 text-ice-muted" />
              </button>

              {user ? (
                <>
                  <Link to="/studio" className="p-2 hover:bg-white/10 rounded-full transition-colors hidden sm:block" title="Студия">
                    <Video className="w-6 h-6 text-ice-muted hover:text-ice-accent" />
                  </Link>
                  <button className="p-2 hover:bg-white/10 rounded-full transition-colors hidden sm:block">
                    <Bell className="w-6 h-6 text-ice-muted" />
                  </button>
                  <div className="flex items-center gap-2 md:gap-3 ml-1 md:ml-2">
                    <Link to={`/channel/${user.uid}`}>
                      <img
                        src={user.photoURL || ''}
                        alt="Профиль"
                        className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-ice-accent shadow-[0_0_10px_rgba(0,242,255,0.3)]"
                      />
                    </Link>
                    <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-full transition-colors hidden sm:block" title="Выйти">
                      <LogOut className="w-5 h-5 text-ice-muted hover:text-red-400" />
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-1.5 bg-ice-accent/10 border border-ice-accent px-2.5 py-1.5 md:px-4 rounded-full text-ice-accent hover:bg-ice-accent hover:text-ice-bg transition-all font-medium text-xs md:text-base"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Войти</span>
                </button>
              )}
            </div>
          </>
        )}
      </nav>

      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass border border-ice-border rounded-2xl p-6 w-full max-w-sm relative flex flex-col gap-4">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold mb-2 text-center ice-text-glow">
              Присоединяйтесь
            </h2>
            <p className="text-sm text-ice-muted text-center mb-4">Выберите способ входа</p>
            
            <button 
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-3 w-full bg-white text-black font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Войти через Google
            </button>

            <button 
              onClick={handleTwitchLogin}
              className="flex items-center justify-center gap-3 w-full bg-[#9146FF] text-white font-bold py-3 px-4 rounded-xl hover:bg-[#772CE8] transition-colors"
            >
              <Twitch className="w-5 h-5" />
              Войти через Twitch
            </button>

            <button 
              onClick={handlePhoneLogin}
              className="flex items-center justify-center gap-3 w-full bg-ice-accent/10 border border-ice-accent text-ice-accent font-bold py-3 px-4 rounded-xl hover:bg-ice-accent hover:text-ice-bg transition-colors"
            >
              <Phone className="w-5 h-5" />
              Войти по телефону
            </button>
          </div>
        </div>
      )}
    </>
  );
}
