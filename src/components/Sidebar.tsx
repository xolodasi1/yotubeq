import React, { useState, useEffect } from 'react';
import { Home, Layout, BarChart2, MessageSquare, Settings, HelpCircle, User, PlaySquare, Youtube, Clock, Heart, ListMusic, Users, Download, Smartphone, Camera, Lock, Bell, Ban, Trophy } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App';

const studioItems = [
  { icon: Home, label: 'Главная', path: '/studio' },
  { icon: Layout, label: 'Контент', path: '/studio/content' },
  { icon: BarChart2, label: 'Аналитика', path: '/studio/analytics' },
  { icon: MessageSquare, label: 'Комментарии', path: '/studio/comments' },
  { icon: Users, label: 'Сообщество', path: '/studio/community' },
  { icon: User, label: 'Редактор канала', path: '/studio/profile' },
  { icon: Trophy, label: 'Достижения', path: '/studio/achievements' },
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
      <div className="flex items-center justify-between px-6 py-3.5 text-[var(--text-secondary)] opacity-30 cursor-not-allowed">
        <div className="flex items-center gap-4">
          <Icon className="w-4 h-4" />
          <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <Lock className="w-3 h-3" />
      </div>
    );
  }
  return (
    <Link
      to={path}
      className={`flex items-center gap-4 px-6 py-3.5 transition-all relative group ${
        isActive 
          ? 'text-blue-600' 
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
      )}
      <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-blue-600' : ''}`} />
      <span className={`text-[11px] uppercase tracking-[0.15em] ${isActive ? 'font-black' : 'font-black opacity-70 group-hover:opacity-100'}`}>{label}</span>
    </Link>
  );
};

export default function Sidebar() {
  const location = useLocation();
  const { user, activeChannel, isSidebarOpen } = useAuth();
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

  if (!isSidebarOpen) return null;

  return (
    <>
      <aside className="w-72 bg-[var(--surface)] border-r border-[var(--border)] hidden lg:flex flex-col py-8 overflow-y-auto">
        {user && isStudio && (
          <div className="px-8 mb-10">
            <div className="p-6 bg-[var(--hover)]/50 rounded-[2rem] border border-[var(--border)] flex flex-col items-center text-center group cursor-pointer hover:border-blue-500/30 transition-all" onClick={() => window.location.href = `/channel/${activeChannel?.id || user.uid}`}>
              <div className="relative mb-4">
                <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-full opacity-20 group-hover:opacity-40 blur-sm transition-opacity" />
                <img
                  src={activeChannel?.photoURL || user.photoURL || ''}
                  alt="Channel"
                  className="w-20 h-20 rounded-full border-2 border-[var(--surface)] relative z-10 object-cover shadow-xl"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-black/40 rounded-full backdrop-blur-[2px]">
                  <Settings className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-[var(--text-primary)] truncate w-full">Ваш канал</h3>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest truncate w-full mt-1.5">{activeChannel?.displayName || user.displayName}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col flex-1 overflow-y-auto scrollbar-hide">
          {isStudio ? (
            <div className="space-y-1">
              <div className="px-8 mb-4 flex items-center gap-3">
                <div className="h-px bg-[var(--border)] flex-1" />
                <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em]">Студия</span>
                <div className="h-px bg-[var(--border)] flex-1" />
              </div>
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
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-8 mb-4 flex items-center gap-3">
                <div className="h-px bg-[var(--border)] flex-1" />
                <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em]">Навигация</span>
                <div className="h-px bg-[var(--border)] flex-1" />
              </div>
              {mainItems.map((item) => (
                <SidebarItem key={item.path} icon={item.icon} label={item.label} path={item.path} isActive={location.pathname === item.path} />
              ))}
            </div>
          )}
        </div>

        <div className="mt-auto flex flex-col pt-6 px-4">
          {showInstall && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-4 px-6 py-4 bg-blue-600/5 hover:bg-blue-600/10 text-blue-600 rounded-2xl transition-all mb-2 group"
            >
              <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">Установить PWA</span>
            </button>
          )}
          <SidebarItem icon={HelpCircle} label="Справка" path="/help" isActive={location.pathname === '/help'} />
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--surface)]/95 backdrop-blur-xl border-t border-[var(--border)] z-50 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around p-2 overflow-x-auto scrollbar-hide">
          {(isStudio ? studioItems : mainItems).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const isLocked = item.path === '/studio/community' && (user?.subscribers || 0) < 10;
            
            if (isLocked) {
              return (
                <div key={item.label} className="flex flex-col items-center gap-1.5 p-3 min-w-[70px] opacity-20 shrink-0">
                  <Icon className="w-5 h-5" />
                  <span className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap">{item.label}</span>
                </div>
              );
            }

            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex flex-col items-center gap-1.5 p-3 min-w-[70px] rounded-2xl transition-all shrink-0 relative ${
                  isActive ? 'text-blue-600' : 'text-[var(--text-secondary)] hover:text-blue-400'
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-b-full shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
                )}
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
                <span className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
