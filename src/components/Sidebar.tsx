import React from 'react';
import { Home, Layout, BarChart2, MessageSquare, Settings, HelpCircle, User, PlaySquare, Youtube, Clock, Heart, ListMusic } from 'lucide-react';
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
  { icon: Clock, label: 'История', path: '/history' },
  { icon: Heart, label: 'Понравившиеся', path: '/favorites' },
  { icon: ListMusic, label: 'Плейлисты', path: '/playlists' },
];

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();

  const SidebarItem = ({ icon: Icon, label, path }: { icon: any, label: string, path: string }) => {
    const isActive = location.pathname === path;
    return (
      <Link
        to={path}
        className={`flex items-center gap-4 px-6 py-3 transition-all ${
          isActive 
            ? 'bg-gray-100 text-red-600 border-r-4 border-red-600' 
            : 'hover:bg-gray-50 text-gray-600 hover:text-black'
        }`}
      >
        <Icon className={`w-5 h-5 ${isActive ? 'text-red-600' : ''}`} />
        <span className={`text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
      </Link>
    );
  };

  return (
    <>
      <aside className="w-64 bg-white border-r border-gray-200 hidden lg:flex flex-col py-6">
        {user && (
          <div className="px-6 mb-8 flex flex-col items-center text-center">
            <div className="relative group cursor-pointer" onClick={() => window.location.href = `/channel/${user.uid}`}>
              <img
                src={user.photoURL || ''}
                alt="Channel"
                className="w-28 h-28 rounded-full border-2 border-gray-100 mb-4 group-hover:opacity-80 transition-opacity"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Settings className="w-8 h-8 text-white drop-shadow-md" />
              </div>
            </div>
            <h3 className="font-bold text-sm truncate w-full">Ваш канал</h3>
            <p className="text-xs text-gray-500 truncate w-full mt-1">{user.displayName}</p>
          </div>
        )}

        <div className="flex flex-col">
          <div className="px-6 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Студия</div>
          {studioItems.map((item) => (
            <SidebarItem key={item.path} icon={item.icon} label={item.label} path={item.path} />
          ))}
        </div>

        <div className="mt-8 flex flex-col border-t border-gray-100 pt-6">
          <div className="px-6 mb-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Навигация</div>
          {mainItems.map((item) => (
            <SidebarItem key={item.path} icon={item.icon} label={item.label} path={item.path} />
          ))}
        </div>

        <div className="mt-auto flex flex-col border-t border-gray-100 pt-4">
          <SidebarItem icon={Settings} label="Настройки" path="/settings" />
          <SidebarItem icon={HelpCircle} label="Справка" path="/help" />
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
        <div className="flex items-center justify-around p-1">
          {studioItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex flex-col items-center gap-1 p-2 min-w-[60px] rounded-lg transition-colors ${
                  isActive ? 'text-red-600' : 'text-gray-500 hover:text-black'
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
