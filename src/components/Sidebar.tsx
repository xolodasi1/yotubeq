import React from 'react';
import { Home, Compass, PlaySquare, Clock, ThumbsUp, History, User, Settings, HelpCircle, Smartphone } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../App';

const menuItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Smartphone, label: 'Shorts', path: '/shorts' },
  { icon: Compass, label: 'Explore', path: '/explore' },
  { icon: PlaySquare, label: 'Subscriptions', path: '/subs' },
];

const libraryItems = [
  { icon: History, label: 'History', path: '/history' },
  { icon: Clock, label: 'Watch Later', path: '/watch-later' },
  { icon: ThumbsUp, label: 'Liked Videos', path: '/liked' },
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
          <h3 className="px-4 text-xs font-bold text-ice-muted uppercase tracking-widest mb-2">Library</h3>
          {libraryItems.map((item) => (
            <SidebarItem key={item.path} icon={item.icon} label={item.label} path={item.path} />
          ))}
        </div>

        {user && (
          <>
            <div className="h-px bg-ice-border mx-2" />
            <div className="flex flex-col gap-1">
              <h3 className="px-4 text-xs font-bold text-ice-muted uppercase tracking-widest mb-2">My Channel</h3>
              <SidebarItem icon={User} label="Your Channel" path={`/channel/${user.uid}`} />
              <SidebarItem icon={PlaySquare} label="Studio" path="/studio" />
            </div>
          </>
        )}

        <div className="mt-auto flex flex-col gap-1">
          <SidebarItem icon={Settings} label="Settings" path="/settings" />
          <SidebarItem icon={HelpCircle} label="Help" path="/help" />
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass border-t border-ice-border z-50 pb-safe">
        <div className="flex items-center justify-around p-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-lg transition-colors ${
                  isActive ? 'text-ice-accent' : 'text-ice-muted hover:text-ice-text'
                }`}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'drop-shadow-[0_0_8px_rgba(0,242,255,0.8)]' : ''}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          {user && (
            <Link
              to={`/channel/${user.uid}`}
              className={`flex flex-col items-center gap-1 p-2 min-w-[64px] rounded-lg transition-colors ${
                location.pathname.includes('/channel/') ? 'text-ice-accent' : 'text-ice-muted hover:text-ice-text'
              }`}
            >
              <User className={`w-6 h-6 ${location.pathname.includes('/channel/') ? 'drop-shadow-[0_0_8px_rgba(0,242,255,0.8)]' : ''}`} />
              <span className="text-[10px] font-medium">You</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
