import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface AdminErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const AdminErrorState: React.FC<AdminErrorStateProps> = ({
  message = 'Failed to load data. Please check your connection and try again.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-3 ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
          Something went wrong
        </h4>
        <p className="text-xs text-rose-300/80 leading-relaxed">
          {message}
        </p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 h-9 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
};
