import { Search, Menu, Video, Bell, LogIn, LogOut, X, Plus, HelpCircle, PlaySquare, Settings } from 'lucide-react';
import { useAuth } from '../App';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { auth, db } from '../lib/firebase';
import { MeltingAvatar } from './MeltingAvatar';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, getDoc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

import { APP_LOGO_URL } from '../constants';

export default function Navbar() {
  const { user, channels, activeChannel, setActiveChannel, toggleSidebar } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isStudio = location.pathname.startsWith('/studio');

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      const promises = unreadNotifications.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true }));
      await Promise.all(promises);
      toast.success('Все уведомления прочитаны');
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast.error('Ошибка при обновлении уведомлений');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowAuthModal(false);
      toast.success(isStudio ? 'Добро пожаловать в Студию!' : 'Добро пожаловать!');
    } catch (error: any) {
      toast.error(error.message || 'Ошибка аутентификации');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.info(isStudio ? 'До скорой встречи в Студии!' : 'До скорой встречи!');
      navigate('/');
    } catch (error: any) {
      toast.error('Не удалось выйти из системы');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (isStudio) {
        navigate(`/studio/content?q=${searchQuery}`);
      } else {
        navigate(`/?q=${searchQuery}`);
      }
    }
  };

  return (
    <>
      <nav className="h-16 bg-[var(--surface)] sticky top-0 z-50 flex items-center justify-between px-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-4">
          <button onClick={toggleSidebar} className="p-2 hover:bg-[var(--hover)] rounded-full transition-colors">
            <Menu className="w-6 h-6 text-[var(--text-secondary)]" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <img 
              src={APP_LOGO_URL} 
              alt="IceTube Logo" 
              className="w-10 h-10 rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.4)] object-scale-down p-1"
              crossOrigin="anonymous"
            />
            <span className="text-xl font-bold tracking-tight hidden xs:block text-[var(--text-primary)]">
              {isStudio ? 'IceStudio' : 'IceTube'}
            </span>
          </Link>
        </div>

        <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-8 hidden md:flex">
          <div className="relative w-full">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder={isStudio ? "Поиск по каналу" : "Введите запрос"}
              className="w-full bg-[var(--hover)] border border-[var(--border)] rounded-md py-1.5 pl-10 pr-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm text-[var(--text-primary)]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>

        <div className="flex items-center gap-2 md:gap-4">
          <button className="p-2 hover:bg-[var(--hover)] rounded-full transition-colors md:hidden">
            <Search className="w-6 h-6 text-[var(--text-secondary)]" />
          </button>
          
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-[var(--hover)] rounded-full transition-colors hidden sm:block"
          >
            <Settings className="w-6 h-6 text-[var(--text-secondary)]" />
          </button>
          
          <button className="p-2 hover:bg-[var(--hover)] rounded-full transition-colors hidden sm:block">
            <HelpCircle className="w-6 h-6 text-[var(--text-secondary)]" />
          </button>

          {user ? (
            <>
              {isStudio ? (
                <button 
                  onClick={() => navigate('/studio/upload')}
                  className="flex items-center gap-2 border border-blue-200 px-3 py-1.5 rounded-sm hover:bg-blue-50 transition-all font-semibold text-sm uppercase tracking-wide text-blue-700"
                >
                  <Plus className="w-5 h-5 text-blue-600" />
                  <span className="hidden sm:inline">Создать</span>
                </button>
              ) : (
                <button 
                  onClick={() => navigate('/studio')}
                  className="flex items-center gap-2 border border-blue-200 px-3 py-1.5 rounded-sm hover:bg-blue-50 transition-all font-semibold text-sm uppercase tracking-wide text-blue-700"
                >
                  <Video className="w-5 h-5 text-blue-600" />
                  <span className="hidden sm:inline">Студия</span>
                </button>
              )}
              
              <div className="flex items-center gap-3 ml-2">
                <div className="relative" ref={notificationsRef}>
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 hover:bg-[var(--hover)] rounded-full transition-colors relative"
                  >
                    <Bell className="w-6 h-6 text-[var(--text-secondary)]" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden z-50">
                      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]">
                        <h3 className="font-bold text-[var(--text-primary)]">Уведомления</h3>
                        {unreadCount > 0 && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              markAllAsRead();
                            }}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider"
                          >
                            Прочитать все
                          </button>
                        )}
                      </div>
                      <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-[var(--text-secondary)]">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Нет новых уведомлений</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-[var(--border)]">
                            {notifications.map((notif) => (
                              <div 
                                key={notif.id} 
                                className={`p-4 hover:bg-[var(--hover)] transition-colors cursor-pointer ${!notif.read ? 'bg-blue-500/5' : ''}`}
                                onClick={() => {
                                  markAsRead(notif.id);
                                  if ((notif.type === 'comment' || notif.type === 'like' || notif.type === 'new_content') && notif.videoId) {
                                    navigate(`/video/${notif.videoId}`);
                                  } else if (notif.type === 'subscribe' && notif.fromUserId) {
                                    navigate(`/channel/${notif.fromUserId}`);
                                  }
                                  setShowNotifications(false);
                                }}
                              >
                                <div className="flex gap-3">
                                  <img src={notif.fromUserAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${notif.fromUserId}`} alt="" className="w-10 h-10 rounded-full" />
                                  <div>
                                    <p className="text-sm text-[var(--text-primary)]">
                                      <span className="font-bold">{notif.fromUserName}</span>
                                      {notif.type === 'subscribe' ? ' подписался на ваш канал' : 
                                       notif.type === 'like' ? ` оценил ваше видео "${notif.videoTitle}"` : 
                                       notif.type === 'new_content' ? ` опубликовал новый контент: "${notif.videoTitle}"` :
                                       ` оставил комментарий: "${notif.commentText}"`}
                                    </p>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                                      {notif.createdAt?.toDate ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true, locale: ru }) : 'только что'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative" ref={userMenuRef}>
                  <button 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center"
                  >
                    <MeltingAvatar
                      photoURL={activeChannel?.photoURL || user.photoURL || ''}
                      lastPostAt={activeChannel?.lastPostAt}
                      size="sm"
                    />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden z-50">
                      <div className="p-4 border-b border-[var(--border)] bg-[var(--hover)]/30">
                        <div className="flex items-center gap-3 mb-3">
                          <img src={activeChannel?.photoURL || user.photoURL} className="w-10 h-10 rounded-full object-cover" alt="" />
                          <div className="overflow-hidden">
                            <p className="font-bold text-sm text-[var(--text-primary)] truncate">{activeChannel?.displayName || user.displayName}</p>
                            <p className="text-xs text-[var(--text-secondary)] truncate">{user.email}</p>
                          </div>
                        </div>
                        <Link 
                          to={`/channel/${activeChannel?.id || user.uid}`}
                          className="text-xs font-bold text-blue-600 hover:underline"
                          onClick={() => setShowUserMenu(false)}
                        >
                          Мой канал
                        </Link>
                      </div>

                      {channels.length > 1 && (
                        <div className="p-2 border-b border-[var(--border)]">
                          <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest px-2 mb-2">Сменить канал</p>
                          <div className="space-y-1">
                            {channels.map(channel => (
                              <button
                                key={channel.id}
                                onClick={() => {
                                  setActiveChannel(channel);
                                  setShowUserMenu(false);
                                  toast.success(`Переключено на ${channel.displayName}`);
                                }}
                                className={`w-full flex items-center gap-3 p-2 rounded-md transition-colors ${activeChannel?.id === channel.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-[var(--hover)]'}`}
                              >
                                <img src={channel.photoURL} className="w-6 h-6 rounded-full object-cover" alt="" />
                                <span className="text-xs font-medium truncate">{channel.displayName}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="p-1">
                        <button 
                          onClick={() => {
                            navigate('/studio/profile');
                            setShowUserMenu(false);
                          }}
                          className="w-full flex items-center gap-3 p-2 hover:bg-[var(--hover)] rounded-md transition-colors text-sm text-[var(--text-primary)]"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Настройки канала</span>
                        </button>
                        <button 
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 p-2 hover:bg-[var(--hover)] rounded-md transition-colors text-sm text-red-500"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Выйти</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
          <div className="bg-[var(--surface)] rounded-lg shadow-xl p-8 w-full max-w-sm relative flex flex-col gap-6">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-[var(--hover)] rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-secondary)]" />
            </button>
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">Вход в Студию</h2>
              <p className="text-sm text-[var(--text-secondary)]">Управляйте своим контентом</p>
            </div>
            
            <button 
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-3 w-full border border-[var(--border)] font-bold py-3 px-4 rounded hover:bg-[var(--hover)] transition-colors text-[var(--text-primary)]"
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
