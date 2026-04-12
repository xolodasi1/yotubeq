import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Video } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Eye, ThumbsUp, Snowflake } from 'lucide-react';

export default function VideoCard({ video }: { video: Video; key?: string }) {
  const navigate = useNavigate();
  const formattedDate = video.createdAt 
    ? formatDistanceToNow(new Date(video.createdAt), { addSuffix: true, locale: ru }) 
    : 'недавно';

  return (
    <div 
      className="bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col"
      onClick={() => navigate(`/video/${video.id}`)}
    >
      <div className="relative aspect-video">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-1 right-1 bg-black/80 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
          {video.duration}
        </div>
      </div>
      
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-semibold text-sm text-[var(--text-primary)] line-clamp-2 mb-1 leading-snug">
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
