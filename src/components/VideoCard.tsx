import React from 'react';
import { Link } from 'react-router-dom';
import { Video } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { Play, Eye, Clock } from 'lucide-react';

export default function VideoCard({ video }: { video: Video, key?: string }) {
  const formattedDate = video.createdAt?.toDate 
    ? formatDistanceToNow(video.createdAt.toDate(), { addSuffix: true }) 
    : 'recently';

  return (
    <Link to={`/video/${video.id}`} className="group flex flex-col gap-3">
      <div className="relative aspect-video rounded-2xl overflow-hidden border border-ice-border group-hover:border-ice-accent transition-all duration-300 shadow-lg group-hover:shadow-[0_0_20px_rgba(0,242,255,0.2)]">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 bg-ice-accent rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.6)]">
            <Play className="w-6 h-6 text-ice-bg fill-current ml-1" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 backdrop-blur-md rounded text-[10px] font-bold text-ice-text border border-ice-border">
          {video.duration || '10:00'}
        </div>
      </div>

      <div className="flex gap-3 px-1">
        <Link to={`/channel/${video.authorId}`} className="shrink-0">
          <img
            src={video.authorPhotoUrl}
            alt={video.authorName}
            className="w-10 h-10 rounded-full border border-ice-border group-hover:border-ice-accent transition-colors shadow-sm"
            referrerPolicy="no-referrer"
          />
        </Link>
        <div className="flex flex-col gap-1 min-w-0">
          <h3 className="text-sm font-bold line-clamp-2 leading-tight group-hover:text-ice-accent transition-colors">
            {video.title}
          </h3>
          <div className="flex flex-col text-xs text-ice-muted font-medium">
            <Link to={`/channel/${video.authorId}`} className="hover:text-ice-text transition-colors">
              {video.authorName}
            </Link>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {video.views.toLocaleString()}</span>
              <span className="w-1 h-1 bg-ice-muted rounded-full" />
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formattedDate}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
