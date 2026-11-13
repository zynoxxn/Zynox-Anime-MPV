import React from 'react';

interface AdminSkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text' | 'card' | 'table-row';
  count?: number;
}

export const AdminSkeleton: React.FC<AdminSkeletonProps> = ({
  className = '',
  variant = 'rect',
  count = 1,
}) => {
  const items = Array.from({ length: count });

  let baseStyle = 'animate-pulse bg-white/5';
  if (variant === 'circle') baseStyle += ' rounded-full';
  else if (variant === 'text') baseStyle += ' rounded h-4';
  else if (variant === 'card') baseStyle += ' rounded-2xl h-24 border border-white/5';
  else if (variant === 'table-row') baseStyle += ' rounded-xl h-14 border border-white/5';
  else baseStyle += ' rounded-xl';

  return (
    <>
      {items.map((_, i) => (
        <div key={i} className={`${baseStyle} ${className}`} />
      ))}
    </>
  );
};
