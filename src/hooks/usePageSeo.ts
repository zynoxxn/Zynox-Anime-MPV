import { useEffect } from 'react';
import { updateDocumentSeo, type SeoMetadata } from '../lib/seo';

/**
 * Hook to update document SEO tags reactively
 */
export function usePageSeo(metadata: SeoMetadata | null): void {
  useEffect(() => {
    if (metadata) {
      updateDocumentSeo(metadata);
    }
  }, [
    metadata?.title,
    metadata?.description,
    metadata?.keywords,
    metadata?.ogImage,
    metadata?.canonicalUrl,
  ]);
}
