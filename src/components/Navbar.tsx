import { Search, Menu, Video, Bell, LogIn, LogOut, X, Plus, HelpCircle, PlaySquare } from 'lucide-react';
import { useAuth } from '../App';
import { Link, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';

export default function Navbar() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowAuthModal(false);
      toast.success('Добро пожаловать в Студию!');
    } catch (error: any) {
      toast.error(error.message || 'Ошибка аутентификации');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.info('До скорой встречи в Студии!');
      navigate('/');
    } catch (error: any) {
      toast.error('Не удалось выйти из системы');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/studio/content?q=${searchQuery}`);
    }
  };

  return (
    <>
      <nav className="h-16 bg-white sticky top-0 z-50 flex items-center justify-between px-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors lg:hidden">
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <Link to="/" className="flex items-center gap-1">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
              <PlaySquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight hidden xs:block">Studio</span>
          </Link>
        </div>

        <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-8 hidden md:flex">
          <div className="relative w-full">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Поиск по каналу"
              className="w-full bg-gray-50 border border-gray-200 rounded-md py-1.5 pl-10 pr-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>

        <div className="flex items-center gap-2 md:gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors md:hidden">
            <Search className="w-6 h-6 text-gray-600" />
          </button>
          
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors hidden sm:block">
            <HelpCircle className="w-6 h-6 text-gray-600" />
          </button>

          {user ? (
            <>
              <button 
                onClick={() => navigate('/studio/upload')}
                className="flex items-center gap-2 border border-gray-200 px-3 py-1.5 rounded-sm hover:bg-gray-50 transition-all font-semibold text-sm uppercase tracking-wide"
              >
                <Plus className="w-5 h-5 text-red-600" />
                <span className="hidden sm:inline">Создать</span>
              </button>
              
              <div className="flex items-center gap-3 ml-2">
                <Link to={`/channel/${user.uid}`}>
                  <img
                    src={user.photoURL || ''}
                    alt="Profile"
                    className="w-8 h-8 rounded-full border border-gray-200"
                  />
                </Link>
                <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-full transition-colors hidden sm:block">
                  <LogOut className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-sm hover:bg-blue-700 transition-all font-bold text-sm uppercase"
            >
              <LogIn className="w-4 h-4" />
              <span>Войти</span>
            </button>
          )}
        </div>
      </nav>

      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-sm relative flex flex-col gap-6">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Вход в Студию</h2>
              <p className="text-sm text-gray-500">Управляйте своим контентом</p>
            </div>
            
            <button 
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-3 w-full border border-gray-300 font-bold py-3 px-4 rounded hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Войти через Google
            </button>
          </div>
        </div>
      )}
    </>
  );
}
