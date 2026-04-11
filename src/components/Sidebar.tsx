import React from 'react';
import { Home, Layout, BarChart2, MessageSquare, Settings, HelpCircle, User, PlaySquare, Youtube, Clock, Heart, ListMusic, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App';

const studioItems = [
  { icon: Home, label: 'Главная', path: '/studio' },
  { icon: Layout, label: 'Контент', path: '/studio/content' },
  { icon: BarChart2, label: 'Аналитика', path: '/studio/analytics' },
  { icon: MessageSquare, label: 'Комментарии', path: '/studio/comments' },
];

const mainItems = [
  { icon: Youtube, label: 'На главную', path: '/' },
  { icon: Users, label: 'Топ каналов', path: '/top-channels' },
  { icon: Clock, label: 'История', path: '/history' },
  { icon: Heart, label: 'Понравившиеся', path: '/favorites' },
  { icon: ListMusic, label: 'Плейлисты', path: '/playlists' },
];

const SidebarItem = ({ icon: Icon, label, path, isActive }: { icon: any, label: string, path: string, isActive: boolean, key?: string }) => {
  return (
    <Link
      to={path}
      className={`flex items-center gap-4 px-6 py-3 transition-all ${
        isActive 
          ? 'bg-[var(--studio-hover)] text-blue-600 border-r-4 border-blue-600' 
          : 'hover:bg-[var(--studio-hover)] text-[var(--studio-muted)] hover:text-blue-600'
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

  return (
    <>
      <aside className="w-64 bg-[var(--studio-sidebar)] border-r border-[var(--studio-border)] hidden lg:flex flex-col py-6">
        {user && isStudio && (
          <div className="px-6 mb-8 flex flex-col items-center text-center">
            <div className="relative group cursor-pointer" onClick={() => window.location.href = `/channel/${user.uid}`}>
              <img
                src={user.photoURL || ''}
                alt="Channel"
                className="w-28 h-28 rounded-full border-2 border-[var(--studio-border)] mb-4 group-hover:opacity-80 transition-opacity"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Settings className="w-8 h-8 text-white drop-shadow-md" />
              </div>
            </div>
            <h3 className="font-bold text-sm truncate w-full text-[var(--studio-text)]">Ваш канал</h3>
            <p className="text-xs text-[var(--studio-muted)] truncate w-full mt-1">{user.displayName}</p>
          </div>
        )}

        <div className="flex flex-col">
          {isStudio ? (
            <>
              <div className="px-6 mb-2 text-[10px] font-bold text-[var(--studio-muted)] uppercase tracking-wider">Студия</div>
              {studioItems.map((item) => (
                <SidebarItem key={item.path} icon={item.icon} label={item.label} path={item.path} isActive={location.pathname === item.path} />
              ))}
            </>
          ) : (
            <>
              <div className="px-6 mb-2 text-[10px] font-bold text-[var(--studio-muted)] uppercase tracking-wider">Навигация</div>
              {mainItems.map((item) => (
                <SidebarItem key={item.path} icon={item.icon} label={item.label} path={item.path} isActive={location.pathname === item.path} />
              ))}
            </>
          )}
        </div>

        <div className="mt-auto flex flex-col border-t border-[var(--studio-border)] pt-4">
          <SidebarItem icon={Settings} label="Настройки" path="/settings" isActive={location.pathname === '/settings'} />
          <SidebarItem icon={HelpCircle} label="Справка" path="/help" isActive={location.pathname === '/help'} />
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--studio-sidebar)] border-t border-[var(--studio-border)] z-50 pb-safe">
        <div className="flex items-center justify-around p-1">
          {(isStudio ? studioItems : mainItems).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex flex-col items-center gap-1 p-2 min-w-[60px] rounded-lg transition-colors ${
                  isActive ? 'text-blue-600' : 'text-[var(--studio-muted)] hover:text-blue-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
