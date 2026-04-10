import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Video } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Eye, ThumbsUp } from 'lucide-react';

export default function VideoCard({ video }: { video: Video }) {
  const navigate = useNavigate();
  const formattedDate = video.createdAt 
    ? formatDistanceToNow(new Date(video.createdAt), { addSuffix: true, locale: ru }) 
    : 'недавно';

  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col"
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
        <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1 leading-snug">
          {video.title}
        </h3>
        
        <div className="mt-auto">
          <Link 
            to={`/channel/${video.authorId}`}
            className="text-xs text-gray-500 hover:text-gray-900 transition-colors truncate block mb-2"
            onClick={(e) => e.stopPropagation()}
          >
            {video.authorName}
          </Link>
          
          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {video.views?.toLocaleString() || 0}
              </span>
              <span className="flex items-center gap-1">
                <ThumbsUp className="w-3 h-3" />
                {video.likes?.toLocaleString() || 0}
              </span>
            </div>
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
