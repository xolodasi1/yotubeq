import React from 'react';
import { Home, Compass, PlaySquare, Clock, ThumbsUp, History, User, Settings, HelpCircle, Smartphone, Trophy } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App';

const menuItems = [
  { icon: Home, label: 'Главная', path: '/' },
  { icon: Smartphone, label: 'Shorts', path: '/shorts' },
  { icon: Trophy, label: 'Топ каналов', path: '/top-channels' },
  { icon: Compass, label: 'Навигатор', path: '/explore' },
  { icon: PlaySquare, label: 'Подписки', path: '/subs' },
];

const libraryItems = [
  { icon: History, label: 'История', path: '/history' },
  { icon: Clock, label: 'Смотреть позже', path: '/watch-later' },
  { icon: ThumbsUp, label: 'Понравившиеся', path: '/liked' },
];

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();

  const SidebarItem = ({ icon: Icon, label, path }: { icon: any, label: string, path: string, key?: string }) => {
    const isActive = location.pathname === path;
    return (
      <Link
        to={path}
        className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
          isActive 
            ? 'bg-ice-accent/20 text-ice-accent border-l-4 border-ice-accent' 
            : 'hover:bg-white/5 text-ice-muted hover:text-ice-text'
        }`}
      >
        <Icon className={`w-5 h-5 ${isActive ? 'text-ice-accent' : ''}`} />
        <span className="text-sm font-medium">{label}</span>
      </Link>
    );
  };

  return (
    <>
      <aside className="w-64 glass border-r border-ice-border hidden lg:flex flex-col p-4 gap-6">
        <div className="flex flex-col gap-1">
          {menuItems.map((item) => (
            <SidebarItem key={item.path} icon={item.icon} label={item.label} path={item.path} />
          ))}
        </div>

        <div className="h-px bg-ice-border mx-2" />

        <div className="flex flex-col gap-1">
          <h3 className="px-4 text-xs font-bold text-ice-muted uppercase tracking-widest mb-2">Библиотека</h3>
          {libraryItems.map((item) => (
            <SidebarItem key={item.path} icon={item.icon} label={item.label} path={item.path} />
          ))}
        </div>

        {user && (
          <>
            <div className="h-px bg-ice-border mx-2" />
            <div className="flex flex-col gap-1">
              <h3 className="px-4 text-xs font-bold text-ice-muted uppercase tracking-widest mb-2">Мой канал</h3>
              <SidebarItem icon={User} label="Ваш канал" path={`/channel/${user.uid}`} />
              <SidebarItem icon={PlaySquare} label="Студия" path="/studio" />
            </div>
          </>
        )}

        <div className="mt-auto flex flex-col gap-1">
          <SidebarItem icon={Settings} label="Настройки" path="/settings" />
          <SidebarItem icon={HelpCircle} label="Справка" path="/help" />
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass border-t border-ice-border z-50 pb-safe">
        <div className="flex items-center justify-around p-1">
          {menuItems.slice(0, 3).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex flex-col items-center gap-1 p-2 min-w-[60px] rounded-lg transition-colors ${
                  isActive ? 'text-ice-accent' : 'text-ice-muted hover:text-ice-text'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_0_8px_rgba(0,242,255,0.8)]' : ''}`} />
                <span className="text-[9px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          <Link
            to="/subs"
            className={`flex flex-col items-center gap-1 p-2 min-w-[60px] rounded-lg transition-colors ${
              location.pathname === '/subs' ? 'text-ice-accent' : 'text-ice-muted hover:text-ice-text'
            }`}
          >
            <PlaySquare className={`w-5 h-5 ${location.pathname === '/subs' ? 'drop-shadow-[0_0_8px_rgba(0,242,255,0.8)]' : ''}`} />
            <span className="text-[9px] font-medium">Подписки</span>
          </Link>
          {user && (
            <Link
              to={`/channel/${user.uid}`}
              className={`flex flex-col items-center gap-1 p-2 min-w-[60px] rounded-lg transition-colors ${
                location.pathname.includes('/channel/') ? 'text-ice-accent' : 'text-ice-muted hover:text-ice-text'
              }`}
            >
              <User className={`w-5 h-5 ${location.pathname.includes('/channel/') ? 'drop-shadow-[0_0_8px_rgba(0,242,255,0.8)]' : ''}`} />
              <span className="text-[9px] font-medium">Вы</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
