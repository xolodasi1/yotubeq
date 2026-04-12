import React, { useState, useEffect } from 'react';
import { Home, Layout, BarChart2, MessageSquare, Settings, HelpCircle, User, PlaySquare, Youtube, Clock, Heart, ListMusic, Users, Download, Smartphone, Camera, Lock, Bell, Ban } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App';

const studioItems = [
  { icon: Home, label: 'Главная', path: '/studio' },
  { icon: Layout, label: 'Контент', path: '/studio/content' },
  { icon: BarChart2, label: 'Аналитика', path: '/studio/analytics' },
  { icon: MessageSquare, label: 'Комментарии', path: '/studio/comments' },
  { icon: Users, label: 'Сообщество', path: '/studio/community' },
  { icon: User, label: 'Редактор канала', path: '/studio/profile' },
  { icon: Ban, label: 'Скрытые каналы', path: '/studio/hidden' },
];

const mainItems = [
  { icon: Youtube, label: 'На главную', path: '/' },
  { icon: Bell, label: 'Подписки', path: '/subscriptions' },
  { icon: Smartphone, label: 'Shorts', path: '/shorts' },
  { icon: ListMusic, label: 'Музыка', path: '/music' },
  { icon: Camera, label: 'Фото', path: '/photos' },
  { icon: Users, label: 'Топ каналов', path: '/top-channels' },
  { icon: Clock, label: 'История', path: '/history' },
  { icon: Heart, label: 'Понравившиеся', path: '/favorites' },
  { icon: ListMusic, label: 'Смотреть позже', path: '/watch-later' },
  { icon: ListMusic, label: 'Плейлисты', path: '/playlists' },
];

const SidebarItem = ({ icon: Icon, label, path, isActive, locked }: { icon: any, label: string, path: string, isActive: boolean, locked?: boolean, key?: string }) => {
  if (locked) {
    return (
      <div className="flex items-center justify-between px-6 py-3 text-[var(--text-secondary)] opacity-50 cursor-not-allowed">
        <div className="flex items-center gap-4">
          <Icon className="w-5 h-5" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <Lock className="w-3 h-3" />
      </div>
    );
  }
  return (
    <Link
      to={path}
      className={`flex items-center gap-4 px-6 py-3 transition-all ${
        isActive 
          ? 'bg-[var(--hover)] text-blue-600 border-r-4 border-blue-600' 
          : 'hover:bg-[var(--hover)] text-[var(--text-secondary)] hover:text-blue-600'
      }`}
    >
      <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : ''}`} />
      <span className={`text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
    </Link>
  );
};

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const isStudio = location.pathname.startsWith('/studio');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstall(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <>
      <aside className="w-64 bg-[var(--surface)] border-r border-[var(--border)] hidden lg:flex flex-col py-6">
        {user && isStudio && (
          <div className="px-6 mb-8 flex flex-col items-center text-center">
            <div className="relative group cursor-pointer" onClick={() => window.location.href = `/channel/${user.uid}`}>
              <img
                src={user.photoURL || ''}
                alt="Channel"
                className="w-28 h-28 rounded-full border-2 border-[var(--border)] mb-4 group-hover:opacity-80 transition-opacity"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Settings className="w-8 h-8 text-white drop-shadow-md" />
              </div>
            </div>
            <h3 className="font-bold text-sm truncate w-full text-[var(--text-primary)]">Ваш канал</h3>
            <p className="text-xs text-[var(--text-secondary)] truncate w-full mt-1">{user.displayName}</p>
          </div>
        )}

        <div className="flex flex-col">
          {isStudio ? (
            <>
              <div className="px-6 mb-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Студия</div>
              {studioItems.map((item) => (
                <SidebarItem 
                  key={item.path} 
                  icon={item.icon} 
                  label={item.label} 
                  path={item.path} 
                  isActive={location.pathname === item.path}
                  locked={item.path === '/studio/community' && (user?.subscribers || 0) < 10}
                />
              ))}
            </>
          ) : (
            <>
              <div className="px-6 mb-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Навигация</div>
              {mainItems.map((item) => (
                <SidebarItem key={item.path} icon={item.icon} label={item.label} path={item.path} isActive={location.pathname === item.path} />
              ))}
            </>
          )}
        </div>

        <div className="mt-auto flex flex-col border-t border-[var(--border)] pt-4">
          {showInstall && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-4 px-6 py-3 transition-all hover:bg-blue-50 text-blue-600 font-bold"
            >
              <Download className="w-5 h-5" />
              <span className="text-sm">Установить приложение</span>
            </button>
          )}
          <SidebarItem icon={HelpCircle} label="Справка" path="/help" isActive={location.pathname === '/help'} />
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--border)] z-50 pb-safe">
        <div className="flex items-center justify-around p-1 overflow-x-auto scrollbar-hide">
          {(isStudio ? studioItems : mainItems).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isLocked = item.path === '/studio/community' && (user?.subscribers || 0) < 10;
            
            if (isLocked) {
              return (
                <div key={item.label} className="flex flex-col items-center gap-1 p-2 min-w-[60px] opacity-30 shrink-0">
                  <Icon className="w-5 h-5" />
                  <span className="text-[9px] font-medium whitespace-nowrap">{item.label}</span>
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex flex-col items-center gap-1 p-2 min-w-[60px] rounded-lg transition-colors shrink-0 ${
                  isActive ? 'text-blue-600' : 'text-[var(--text-secondary)] hover:text-blue-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-medium whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
