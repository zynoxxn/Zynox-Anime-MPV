import React from 'react';
import { Compass, Home, Search } from 'lucide-react';
import { usePageSeo } from '../hooks/usePageSeo';

interface NotFoundViewProps {
  navigate: (path: string) => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ navigate }) => {
  usePageSeo({
    title: 'Page Not Found (404)',
    description: 'The requested page could not be found. Browse published anime or return to the homepage.',
  });

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 bg-[#050A14]">
      <div className="max-w-md w-full bg-[#0B1324] border border-white/10 rounded-2xl p-6 sm:p-8 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-[#1E88FF]/15 border border-[#1E88FF]/30 flex items-center justify-center mx-auto text-[#1E88FF]">
          <Compass className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold tracking-widest uppercase text-[#94A3B8]">
            Error 404
          </p>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Page Not Found
          </h1>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            The page or anime link you entered does not exist or may have been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="h-11 px-5 rounded-xl bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>Go to Home</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/browse')}
            className="h-11 px-5 rounded-xl bg-[#101A30] hover:bg-[#16223D] border border-white/10 text-[#CBD5E1] hover:text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Search className="w-4 h-4 shrink-0" />
            <span>Browse Anime</span>
          </button>
        </div>
      </div>
    </div>
  );
};
