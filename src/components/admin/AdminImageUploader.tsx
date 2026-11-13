import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  AlertCircle,
  RefreshCw,
  Trash2,
  ExternalLink,
  Link as LinkIcon,
  Loader2,
} from 'lucide-react';
import {
  validateImageFile,
  uploadAnimeImage,
  safeDeleteStorageFile,
  isFirebaseStorageUrl,
  POSTER_MAX_SIZE_MB,
  BANNER_MAX_SIZE_MB,
} from '../../lib/storage';
import { normalizeImageHostingUrl } from '../../lib/image-hosting';

export interface AdminImageUploaderProps {
  label: string;
  type?: 'poster' | 'banner';
  currentUrl?: string;
  value?: string;
  animeId?: string;
  onUrlChange?: (newUrl: string) => void;
  onChange?: (newUrl: string) => void;
  aspectRatio?: string;
  required?: boolean;
  recommendedText?: string;
}

export const AdminImageUploader: React.FC<AdminImageUploaderProps> = ({
  label,
  type = 'banner',
  currentUrl,
  value,
  animeId,
  onUrlChange,
  onChange,
  aspectRatio,
  required = false,
  recommendedText,
}) => {
  const activeUrl = currentUrl !== undefined ? currentUrl : (value || '');
  const handleUrlUpdate = (newUrl: string) => {
    if (onUrlChange) onUrlChange(newUrl);
    if (onChange) onChange(newUrl);
  };
  const effectiveType = type || (aspectRatio === '2:3' ? 'poster' : 'banner');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [showPasteUrl, setShowPasteUrl] = useState(false);
  const [manualUrl, setManualUrl] = useState(activeUrl);

  const maxMb = effectiveType === 'poster' ? POSTER_MAX_SIZE_MB : BANNER_MAX_SIZE_MB;
  const isPoster = effectiveType === 'poster';

  useEffect(() => {
    setManualUrl(activeUrl);
  }, [activeUrl]);

  useEffect(() => {
    return () => {
      if (localPreview && localPreview.startsWith('blob:')) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    const validation = validateImageFile(file, effectiveType);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid image file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    setIsUploading(true);
    setUploadProgress(0);

    const oldUrl = activeUrl;

    try {
      const result = await uploadAnimeImage({
        file,
        animeId,
        type: effectiveType,
        onProgress: (pct) => setUploadProgress(pct),
      });

      handleUrlUpdate(result.downloadUrl);
      setManualUrl(result.downloadUrl);
      setLocalPreview(null);

      if (oldUrl && oldUrl !== result.downloadUrl && isFirebaseStorageUrl(oldUrl)) {
        safeDeleteStorageFile(oldUrl).catch(() => {});
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to upload image.');
      setLocalPreview(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    const oldUrl = activeUrl;
    handleUrlUpdate('');
    setManualUrl('');
    setLocalPreview(null);
    setErrorMessage(null);

    if (oldUrl && isFirebaseStorageUrl(oldUrl)) {
      safeDeleteStorageFile(oldUrl).catch(() => {});
    }
  };

  const handlePasteUrlSave = () => {
    const raw = manualUrl.trim();
    if (!raw) {
      handleUrlUpdate('');
      return;
    }
    const { normalizedUrl } = normalizeImageHostingUrl(raw);
    handleUrlUpdate(normalizedUrl);
    setManualUrl(normalizedUrl);
    setErrorMessage(null);
    setShowPasteUrl(false);
  };

  const activeDisplayUrl = localPreview || activeUrl;

  return (
    <div className="space-y-2">
      {/* Label above */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-white">
          {label} {required && <span className="text-[#1E88FF]">*</span>}
        </label>
        {recommendedText && (
          <span className="text-[11px] text-[#94A3B8] hidden sm:inline">
            {recommendedText}
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        disabled={isUploading}
        className="hidden"
      />

      {/* Uploaded Preview or Drop Area */}
      {activeDisplayUrl ? (
        <div className="bg-[#0B1324] border border-white/10 rounded-[12px] p-3 flex items-center gap-3.5">
          {/* Aspect-constrained preview */}
          <div
            className={`relative rounded-[8px] overflow-hidden bg-black/40 border border-white/10 shrink-0 ${
              isPoster ? 'w-16 h-24' : 'w-32 h-18'
            }`}
          >
            <img
              src={activeDisplayUrl}
              alt={label}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://via.placeholder.com/300x200/0b1324/64748b?text=Image';
              }}
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-[#1E88FF] animate-spin" />
              </div>
            )}
          </div>

          {/* Details & Actions */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white truncate">
                {isPoster ? 'Poster image' : 'Banner image'}
              </span>
              <a
                href={activeDisplayUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#94A3B8] hover:text-white"
                title="Open original"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <p className="text-[11px] text-[#94A3B8] font-mono truncate">
              {activeDisplayUrl}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="h-8 px-3 rounded-[8px] bg-white/5 hover:bg-white/10 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Replace</span>
              </button>

              <button
                type="button"
                disabled={isUploading}
                onClick={handleRemove}
                className="h-8 px-2.5 rounded-[8px] border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40"
                title="Remove image"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Drop/tap area 120px high (spec exact) */
        <div
          onClick={() => {
            if (!isUploading) fileInputRef.current?.click();
          }}
          className={`h-[120px] border-2 border-dashed border-white/15 hover:border-[#1E88FF]/50 hover:bg-[#1E88FF]/5 rounded-[12px] flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-colors ${
            isUploading ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          {isUploading ? (
            <div className="space-y-2 flex flex-col items-center">
              <Loader2 className="w-5 h-5 text-[#1E88FF] animate-spin" />
              <span className="text-xs font-semibold text-white">
                Uploading... {uploadProgress}%
              </span>
              {/* 4px primary progress bar */}
              <div className="w-40 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1E88FF] transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1 flex flex-col items-center">
              <UploadCloud className="w-5 h-5 text-[#94A3B8]" />
              <div className="text-xs font-semibold text-white">
                Upload image
              </div>
              <div className="text-[11px] text-[#94A3B8]">
                JPG, PNG, WEBP · max {maxMb} MB
              </div>
            </div>
          )}
        </div>
      )}

      {/* Small "Paste URL" text link below */}
      <div className="pt-0.5">
        <button
          type="button"
          onClick={() => setShowPasteUrl((prev) => !prev)}
          className="text-xs text-[#1E88FF] hover:underline flex items-center gap-1 cursor-pointer font-medium"
        >
          <LinkIcon className="w-3 h-3" />
          <span>{showPasteUrl ? 'Hide paste URL' : 'Or paste image URL / Drive link'}</span>
        </button>

        {showPasteUrl && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="https://drive.google.com/... or https://..."
              className="flex-1 h-9 bg-[#101A30] border border-white/10 focus:border-[#1E88FF] rounded-[8px] px-3 text-xs text-white outline-none font-mono"
            />
            <button
              type="button"
              onClick={handlePasteUrlSave}
              className="h-9 px-3 rounded-[8px] bg-[#1E88FF] hover:bg-[#3B9BFF] text-white text-xs font-semibold shrink-0 cursor-pointer"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-2 rounded-[8px] bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
