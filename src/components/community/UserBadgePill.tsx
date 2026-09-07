import React from 'react';
import type { UserBadge } from '../../types/library';
import { Sparkles, Flame, Heart, MessageSquare, Award, Crown } from 'lucide-react';

interface UserBadgePillProps {
  badge: UserBadge;
  size?: 'sm' | 'md';
}

export const UserBadgePill: React.FC<UserBadgePillProps> = ({ badge, size = 'sm' }) => {
  const renderIcon = () => {
    const iconClass = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5';
    switch (badge.iconName) {
      case 'Sparkles':
        return <Sparkles className={iconClass} />;
      case 'Flame':
        return <Flame className={iconClass} />;
      case 'Heart':
        return <Heart className={iconClass} />;
      case 'MessageSquare':
        return <MessageSquare className={iconClass} />;
      case 'Award':
        return <Award className={iconClass} />;
      case 'Crown':
        return <Crown className={iconClass} />;
      default:
        return <Sparkles className={iconClass} />;
    }
  };

  return (
    <span
      title={badge.description}
      className={`inline-flex items-center gap-1 rounded-full font-medium border shadow-sm ${
        badge.color
      } ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}`}
    >
      {renderIcon()}
      <span>{badge.name}</span>
    </span>
  );
};
