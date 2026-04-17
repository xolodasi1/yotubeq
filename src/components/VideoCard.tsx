import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Video } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { safeFormatDistanceToNow } from '../lib/dateUtils';
import { Eye, ThumbsUp, Snowflake, Ban, Clock, Music as MusicIcon } from 'lucide-react';
import { useAuth } from '../App';
import { databaseService } from '../lib/databaseService';
import { toast } from 'sonner';

export default function VideoCard({ video }: { video: Video; key?: React.Key }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isHiding, setIsHiding] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const formattedDate = safeFormatDistanceToNow(video.createdAt);

  const handleHideChannel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return toast.error('Войдите, чтобы скрыть канал');
    
    setIsHiding(true);
    try {
      await databaseService.hideChannel(user.uid, video.authorId);
      toast.success('Канал больше не будет рекомендоваться');
      window.location.reload();
    } catch (err) {
      toast.error('Не удалось скрыть канал');
      setIsHiding(false);
    }
  };

  const handleWatchLater = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return toast.error('Войдите, чтобы добавить в "Смотреть позже"');
    
    setIsAdding(true);
    try {
      await databaseService.addToWatchLater(user.uid, video.id);
      toast.success('Добавлено в "Смотреть позже"');
    } catch (err) {
      toast.error('Не удалось добавить');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div 
      className="bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col group"
      onClick={() => navigate(`/video/${video.id}`)}
    >
      <div className={`relative overflow-hidden ${
        video.isShort || video.type === 'short' ? 'aspect-[9/16]' :
        video.isMusic || video.isPhoto || video.type === 'photo' ? 'aspect-square' :
        'aspect-video'
      }`}>
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {!(video.isPhoto || video.type === 'photo') && video.duration && (
          <div className="absolute bottom-1 right-1 bg-black/80 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
            {video.duration}
          </div>
        )}
        <button
          onClick={handleWatchLater}
          disabled={isAdding}
          className="absolute top-2 left-2 bg-black/60 hover:bg-blue-500/80 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all"
          title="Смотреть позже"
        >
          <Clock className="w-4 h-4" />
        </button>
        <button
          onClick={handleHideChannel}
          disabled={isHiding}
          className="absolute top-2 right-2 bg-black/60 hover:bg-red-500/80 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all"
          title="Не рекомендовать канал"
        >
          <Ban className="w-4 h-4" />
        </button>
      </div>
      
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-semibold text-sm text-[var(--text-primary)] line-clamp-2 mb-1 leading-snug flex items-center gap-1.5">
          {video.isMusic && <MusicIcon className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
          {video.title}
        </h3>
        
        <div className="mt-auto">
          <Link 
            to={`/channel/${video.authorId}`}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors truncate block mb-2"
            onClick={(e) => e.stopPropagation()}
          >
            {video.authorName}
          </Link>
          
          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {video.views?.toLocaleString() || 0}
              </span>
              <span className="flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" />
                {video.likes?.toLocaleString() || 0}
              </span>
              {video.ices ? (
                <span className="flex items-center gap-1 text-blue-400">
                  <Snowflake className="w-3 h-3" />
                  {video.ices?.toLocaleString() || 0}
                </span>
              ) : null}
            </div>
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
