import React from 'react';
import { Link } from 'react-router-dom';
import { Video } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { Play, Eye, Clock } from 'lucide-react';

export default function VideoCard({ video }: { video: Video, key?: string }) {
  const formattedDate = video.createdAt 
    ? formatDistanceToNow(new Date(video.createdAt), { addSuffix: true }) 
    : 'recently';

  return (
    <Link to={`/video/${video.id}`} className="group flex flex-col gap-3">
      <div className="relative aspect-video rounded-2xl overflow-hidden border border-ice-border group-hover:border-ice-accent transition-all duration-300 shadow-lg group-hover:shadow-[0_0_20px_rgba(0,242,255,0.2)]">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-ice-accent/90 flex items-center justify-center transform scale-50 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-6 h-6 text-ice-bg ml-1" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {video.duration}
        </div>
      </div>
      
      <div className="flex gap-3">
        <Link to={`/channel/${video.authorId}`} className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <img
            src={video.authorPhotoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${video.authorId}`}
            alt={video.authorName}
            className="w-10 h-10 rounded-full border border-ice-border hover:border-ice-accent transition-colors"
          />
        </Link>
        <div className="flex flex-col min-w-0">
          <h3 className="font-bold text-ice-text line-clamp-2 group-hover:text-ice-accent transition-colors leading-tight">
            {video.title}
          </h3>
          <Link 
            to={`/channel/${video.authorId}`}
            className="text-sm text-ice-muted hover:text-ice-text transition-colors mt-1 truncate"
            onClick={(e) => e.stopPropagation()}
          >
            {video.authorName}
          </Link>
          <div className="flex items-center gap-2 text-xs text-ice-muted mt-0.5">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {video.views?.toLocaleString() || 0}
            </span>
            <span>•</span>
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
