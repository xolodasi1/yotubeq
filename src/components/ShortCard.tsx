import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Video } from '../types';
import { Play } from 'lucide-react';

export default function ShortCard({ video }: { video: Video, key?: string }) {
  const navigate = useNavigate();

  return (
    <div className="group flex flex-col gap-2 cursor-pointer w-40 md:w-48 shrink-0" onClick={() => navigate(`/video/${video.id}`)}>
      <div className="relative aspect-[9/16] rounded-2xl overflow-hidden border border-ice-border group-hover:border-ice-accent transition-all duration-300 shadow-lg group-hover:shadow-[0_0_20px_rgba(0,242,255,0.2)]">
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
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
          <h3 className="font-bold text-ice-text line-clamp-2 leading-tight text-sm">
            {video.title}
          </h3>
          <span className="text-xs text-ice-muted mt-1 block">{video.views?.toLocaleString() || 0} просмотров</span>
        </div>
      </div>
    </div>
  );
}
