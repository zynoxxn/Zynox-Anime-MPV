import React from 'react';
import { Button } from './Button';
import { AlertCircle, RefreshCw, FolderSearch } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl bg-[#0B1324] border border-white/5 space-y-4 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#94A3B8] shadow-inner">
        {icon || <FolderSearch className="w-7 h-7 text-[#1E88FF]" />}
      </div>
      <div className="space-y-1.5 max-w-md">
        <h3 className="text-base sm:text-lg font-black text-white">{title}</h3>
        {description && <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">{description}</p>}
      </div>
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load content',
  message = 'A temporary connection error occurred. Please try again.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-4 ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
        <AlertCircle className="w-7 h-7" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h3 className="text-base sm:text-lg font-black text-white">{title}</h3>
        <p className="text-xs sm:text-sm text-rose-300 leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <Button
          variant="secondary"
          size="md"
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={onRetry}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
