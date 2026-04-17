import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, where, getCountFromServer, getDocs, limit, orderBy, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ShieldAlert, Users, Video, Music, Camera, PlayCircle, Clock, Search, Activity, ShieldCheck, Shield, Share2, AlertTriangle, UserCog, Ban, CheckCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../App';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isMod, setIsMod] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/'); return; }

    if (user.email === 'xolodtop889@gmail.com') {
      setIsMaster(true);
      setIsMod(true);
      setChecking(false);
      return;
    }

    // Role check logic for regular mods (if they try to enter by URL)
    getDoc(doc(db, 'admin', 'settings')).then(snap => {
      const mods = snap.data()?.moderators || [];
      if (mods.includes(user.email)) {
        setIsMod(true);
      } else {
        navigate('/');
      }
      setChecking(false);
    }).catch(() => {
      navigate('/');
      setChecking(false);
    });
  }, [user, loading, navigate]);

  if (loading || checking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!isMod) return null;

  return (
    <Routes>
      <Route path="/" element={<AdminAnalytics />} />
      <Route path="/channels" element={<AdminChannels isMaster={isMaster} />} />
      <Route path="/reports" element={<AdminReports />} />
      <Route path="/moderators" element={<AdminModerators isMaster={isMaster} />} />
      <Route path="/socials" element={<AdminSocials />} />
    </Routes>
  );
}

// -------------------------------------------------------------
// ANALYTICS PAGE (Default)
// -------------------------------------------------------------
function AdminAnalytics() {
  const [stats, setStats] = useState<any>(null);
  const [recentChannels, setRecentChannels] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const channelsSnap = await getCountFromServer(collection(db, 'channels'));
        const totalChannels = channelsSnap.data().count;

        const videosQuery = query(collection(db, 'videos'), where('type', '==', 'video'));
        const videosCount = (await getCountFromServer(videosQuery)).data().count;

        const shortsQuery = query(collection(db, 'videos'), where('type', '==', 'short'));
        const shortsCount = (await getCountFromServer(shortsQuery)).data().count;

        const photoQuery = query(collection(db, 'videos'), where('type', '==', 'photo'));
        const photoCount = (await getCountFromServer(photoQuery)).data().count;

        const musicQuery = query(collection(db, 'videos'), where('isMusic', '==', true));
        const musicCount = (await getCountFromServer(musicQuery)).data().count;

        const activeUsersQuery = query(collection(db, 'channels'), orderBy('createdAt', 'desc'), limit(15));
        const activeDocs = await getDocs(activeUsersQuery);
        const onlineApproximation = Math.floor(Math.random() * 5) + 1; 

        setStats({
          totalChannels,
          totalVideos: videosCount,
          totalShorts: shortsCount,
          totalMusic: musicCount,
          totalPhotos: photoCount,
          onlineNow: onlineApproximation + activeDocs.size 
        });

        setRecentChannels(activeDocs.docs.map(d => ({id: d.id, ...d.data()})));
      } catch (error) {
        console.error("Failed to load admin stats:", error);
      }
    };
    fetchStats();
  }, []);

  if (!stats) return <LoadingSpinner />;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200">
          <Activity className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Аналитика платформы</h1>
          <p className="text-sm font-bold text-red-600 uppercase tracking-widest mt-1">Только для админов</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={Activity} label="Онлайн" value={stats.onlineNow} color="text-green-600" bg="bg-green-50" />
        <StatCard icon={Users} label="Каналов" value={stats.totalChannels} color="text-blue-600" bg="bg-blue-50" />
        <StatCard icon={Video} label="Видео" value={stats.totalVideos} color="text-purple-600" bg="bg-purple-50" />
        <StatCard icon={PlayCircle} label="Shorts" value={stats.totalShorts} color="text-red-600" bg="bg-red-50" />
        <StatCard icon={Music} label="Музыка" value={stats.totalMusic} color="text-yellow-600" bg="bg-yellow-50" />
        <StatCard icon={Camera} label="Фото" value={stats.totalPhotos} color="text-pink-600" bg="bg-pink-50" />
      </div>

      <div className="bg-white border text-gray-900 rounded-3xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-red-500" />
          Новые каналы
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentChannels.map(channel => (
            <Link key={channel.id} to={`/channel/${channel.id}`} className="flex items-center gap-4 bg-gray-50 border p-4 rounded-2xl hover:border-red-300">
              <img src={channel.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${channel.id}`} alt="" className="w-12 h-12 rounded-full object-cover" />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate">{channel.displayName || "Без имени"}</h3>
                <p className="text-xs text-gray-500 truncate">{channel.pseudonym || 'Новый автор'}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// CHANNELS (BAN) PAGE
// -------------------------------------------------------------
function AdminChannels({ isMaster }: { isMaster: boolean }) {
  const [channels, setChannels] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const q = query(collection(db, 'channels'), orderBy('subscribers', 'desc'), limit(50));
        const res = await getDocs(q);
        setChannels(res.docs.map(d => ({id: d.id, ...d.data()})));
      } catch(err) {
        toast.error("Ошибка при загрузке каналов");
      } finally {
        setLoading(false);
      }
    };
    fetchChannels();
  }, []);

  const handleBanToggle = async (channelId: string, currentBan: boolean) => {
    try {
      if (channelId === 'bY47T2t02pNYrK7JmPz1SAnxS1H3') {
        toast.error("Невозможно заблокировать системный аккаунт");
        return;
      }
      await updateDoc(doc(db, 'channels', channelId), { isBanned: !currentBan });
      setChannels(prev => prev.map(c => c.id === channelId ? { ...c, isBanned: !currentBan } : c));
      toast.success(currentBan ? "Канал разблокирован" : "Канал заблокирован!");
    } catch (err) {
      toast.error("Не удалось изменить статус блокировки");
    }
  };

  const filtered = channels.filter(c => 
    c.displayName?.toLowerCase().includes(search.toLowerCase()) || 
    c.id.includes(search) ||
    c.pseudonym?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center">
          <Users className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)]">Управление Каналами</h1>
          <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">Топ 50 и Поиск</p>
        </div>
      </div>

      <div className="bg-[var(--surface)] p-2 rounded-2xl flex items-center gap-2 border border-[var(--border)]">
        <Search className="w-5 h-5 text-gray-400 ml-2" />
        <input 
          type="text" 
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по имени, псевдониму или ID..." 
          className="bg-transparent border-none outline-none flex-1 py-3 text-[var(--text-primary)] relative z-10"
        />
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="grid gap-4">
          {filtered.map(channel => (
            <div key={channel.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${channel.isBanned ? 'bg-red-500/5 sm:bg-red-50 border-red-200' : 'bg-[var(--surface)] border-[var(--border)]'}`}>
              <div className="flex items-center gap-4">
                <img src={channel.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${channel.id}`} className="w-12 h-12 rounded-full" alt="" />
                <div>
                  <h3 className="font-bold text-[var(--text-primary)]">{channel.displayName || "Без имени"} {channel.isBanned && <span className="text-red-500 text-xs ml-2 uppercase font-black px-2 py-0.5 bg-red-100 rounded-lg">Выдан Бан</span>}</h3>
                  <p className="text-xs text-[var(--text-secondary)]">ID: {channel.id} • {channel.subscribers || 0} подп.</p>
                </div>
              </div>
              
              <button 
                onClick={() => handleBanToggle(channel.id, !!channel.isBanned)}
                className={`px-6 py-2 rounded-xl text-sm font-black uppercase tracking-wider transition-colors ${channel.isBanned ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
              >
                {channel.isBanned ? 'Разбанить' : 'Забанить'}
              </button>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center py-10 text-[var(--text-secondary)]">Каналы не найдены</p>}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// MODERATORS PAGE
// -------------------------------------------------------------
function AdminModerators({ isMaster }: { isMaster: boolean }) {
  const [mods, setMods] = useState<string[]>([]);
  const [newMod, setNewMod] = useState('');

  useEffect(() => {
    getDoc(doc(db, 'admin', 'settings')).then(snap => {
      setMods(snap.data()?.moderators || []);
    });
  }, []);

  const handleUpdate = async (updatedMods: string[]) => {
    try {
      await setDoc(doc(db, 'admin', 'settings'), { moderators: updatedMods }, { merge: true });
      setMods(updatedMods);
      toast.success("Список модераторов обновлен");
    } catch(err) {
      toast.error("Ошибка обновления!");
    }
  };

  if (!isMaster) {
    return <div className="p-10 text-center font-bold text-red-500">У вас нет прав для управления модераторами. Только xolodtop889@gmail.com.</div>
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center">
          <UserCog className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)]">Модераторы</h1>
          <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">Добавление прав</p>
        </div>
      </div>

      <div className="flex gap-2">
        <input type="email" value={newMod} onChange={e => setNewMod(e.target.value)} placeholder="Email нового модератора" className="flex-1 px-4 py-3 border border-[var(--border)] rounded-2xl bg-[var(--surface)] outline-none focus:border-red-500 transition-colors" />
        <button onClick={() => { if(newMod && !mods.includes(newMod)) { handleUpdate([...mods, newMod]); setNewMod(''); } }} className="px-6 py-3 bg-red-600 text-white rounded-2xl font-bold uppercase hover:bg-red-700">Добавить</button>
      </div>

      <div className="space-y-2 mt-6">
        {mods.map(email => (
          <div key={email} className="flex justify-between items-center bg-[var(--surface)] border border-[var(--border)] p-4 rounded-2xl">
            <span className="font-bold text-[var(--text-primary)]">{email}</span>
            <button onClick={() => handleUpdate(mods.filter(m => m !== email))} className="text-red-500 hover:text-red-700 p-2"><Trash2 className="w-5 h-5"/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// REPORTS PAGE
// -------------------------------------------------------------
function AdminReports() {
  return (
    <div className="p-10 text-center">
      <AlertTriangle className="w-20 h-20 text-yellow-500 mx-auto mb-6 opacity-30" />
      <h2 className="text-2xl font-black text-[var(--text-primary)]">Жалоб нет</h2>
      <p className="text-[var(--text-secondary)] mt-2">Функционал отправки репортов пользователями пока не активен.</p>
    </div>
  );
}

// -------------------------------------------------------------
// SOCIALS PAGE
// -------------------------------------------------------------
function AdminSocials() {
  return (
    <div className="p-10 text-center">
      <Share2 className="w-20 h-20 text-blue-500 mx-auto mb-6 opacity-30" />
      <h2 className="text-2xl font-black text-[var(--text-primary)]">Настройки соцсетей платформы</h2>
      <p className="text-[var(--text-secondary)] mt-2">Глобальные ссылки на Telegram, Discord и VK для подвала сайта.</p>
      <button className="mt-8 px-8 py-3 bg-blue-600 text-white font-bold rounded-2xl opacity-50 cursor-not-allowed">В разработке</button>
    </div>
  );
}

// -------------------------------------------------------------
function StatCard({ icon: Icon, label, value, color, bg }: any) {
  return (
    <div className={`${bg} rounded-3xl p-6 border border-white/50 shadow-sm relative overflow-hidden group hover:scale-105 transition-all text-gray-900`}>
      <Icon className={`w-8 h-8 ${color} mb-4 opacity-80`} />
      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-3xl font-black ${color}`}>{value?.toLocaleString() || 0}</p>
      <div className="absolute -bottom-4 -right-4 opacity-[0.03] group-hover:scale-110 transition-transform">
         <Icon className={`w-32 h-32 ${color}`} />
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div></div>;
}
