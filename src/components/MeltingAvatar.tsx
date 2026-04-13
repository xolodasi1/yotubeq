import React from 'react';
import { differenceInDays } from 'date-fns';

interface MeltingAvatarProps {
  photoURL: string;
  lastPostAt?: any;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const MeltingAvatar: React.FC<MeltingAvatarProps> = ({ 
  photoURL, 
  lastPostAt, 
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-24 h-24 md:w-32 md:h-32'
  };

  const calculateMelt = () => {
    if (!lastPostAt) return 0;
    
    const lastDate = lastPostAt.toDate ? lastPostAt.toDate() : new Date(lastPostAt);
    const days = differenceInDays(new Date(), lastDate);
    
    if (days <= 3) return 0;
    if (days <= 7) return 1; // Slight melt
    if (days <= 14) return 2; // Medium melt
    return 3; // Extreme melt
  };

  const meltLevel = calculateMelt();

  const getMeltStyles = () => {
    switch (meltLevel) {
      case 1:
        return {
          filter: 'blur(0.5px) contrast(1.1) brightness(0.9)',
          borderRadius: '45% 55% 50% 50% / 50% 50% 55% 45%',
          transform: 'translateY(1px)'
        };
      case 2:
        return {
          filter: 'blur(1.5px) contrast(1.2) brightness(0.8) saturate(0.8)',
          borderRadius: '40% 60% 40% 60% / 60% 40% 60% 40%',
          transform: 'translateY(3px) scaleY(0.95)'
        };
      case 3:
        return {
          filter: 'blur(3px) contrast(1.5) brightness(0.6) grayscale(0.5)',
          borderRadius: '30% 70% 20% 80% / 80% 20% 70% 30%',
          transform: 'translateY(6px) scaleY(0.85)',
          opacity: 0.7
        };
      default:
        return {};
    }
  };

  return (
    <div className={`relative shrink-0 ${sizeClasses[size]} ${className}`}>
      <img
        src={photoURL}
        alt="Avatar"
        className={`w-full h-full object-cover transition-all duration-1000 ease-in-out rounded-full`}
        style={getMeltStyles()}
      />
      {meltLevel > 0 && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-blue-500/20 blur-sm rounded-full animate-pulse" />
      )}
    </div>
  );
};
