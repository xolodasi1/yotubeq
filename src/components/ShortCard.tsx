import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Video } from '../types';

export default function ShortCard({ video }: { video: Video; key?: React.Key }) {
  const navigate = useNavigate();

  return (
    <div 
      className="group flex flex-col gap-2 cursor-pointer w-40 md:w-48 shrink-0" 
      onClick={() => navigate(`/shorts?v=${video.id}`)}
    >
      <div className="relative aspect-[9/16] rounded-xl overflow-hidden border border-gray-200 group-hover:border-red-600 transition-all duration-300 shadow-sm">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
          <h3 className="font-bold text-white line-clamp-2 leading-tight text-sm">
            {video.title}
          </h3>
          <span className="text-[10px] text-gray-200 mt-1 block font-medium">{video.views?.toLocaleString() || 0} просмотров</span>
        </div>
      </div>
    </div>
  );
}
