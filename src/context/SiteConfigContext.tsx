import React, { createContext, useContext, useState, useEffect } from 'react';
import type { SiteConfig } from '../types/library';
import { getSiteSettings, DEFAULT_SITE_CONFIG } from '../lib/firestore/site-settings';

interface SiteConfigContextType {
  siteConfig: SiteConfig;
  setSiteConfig: (config: SiteConfig | ((prev: SiteConfig) => SiteConfig)) => void;
  refreshConfig: () => Promise<void>;
}

const SiteConfigContext = createContext<SiteConfigContextType>({
  siteConfig: DEFAULT_SITE_CONFIG,
  setSiteConfig: () => {},
  refreshConfig: async () => {},
});

export const SiteConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);

  const refreshConfig = async () => {
    try {
      const cfg = await getSiteSettings();
      setSiteConfig(cfg);
    } catch (err) {
      console.warn('Could not load site configuration:', err);
    }
  };

  useEffect(() => {
    refreshConfig();
  }, []);

  // Update dynamic document title as fallback only if not set by page SEO
  useEffect(() => {
    if (typeof document !== 'undefined' && siteConfig.siteName) {
      if (!document.title || document.title.startsWith('ZYNOX ANIME — Anime Streaming')) {
        document.title = `${siteConfig.siteName} — Watch Anime Online Free in HD`;
      }
    }
  }, [siteConfig.siteName]);

  return (
    <SiteConfigContext.Provider value={{ siteConfig, setSiteConfig, refreshConfig }}>
      {children}
    </SiteConfigContext.Provider>
  );
};

export const useSiteConfig = () => useContext(SiteConfigContext);
