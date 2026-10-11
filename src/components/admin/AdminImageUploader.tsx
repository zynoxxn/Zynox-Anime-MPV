import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  Loader2,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  validateImageFile,
  uploadAnimeImage,
  safeDeleteStorageFile,
  isFirebaseStorageUrl,
  POSTER_MAX_SIZE_MB,
  BANNER_MAX_SIZE_MB,
} from '../../lib/storage';

interface AdminImageUploaderProps {
  label: string;
  type: 'poster' | 'banner';
  currentUrl?: string;
  animeId?: string;
  onUrlChange: (newUrl: string) => void;
  required?: boolean;
  recommendedText?: string;
}

export const AdminImageUploader: React.FC<AdminImageUploaderProps> = ({
  label,
  type,
  currentUrl = '',
  animeId,
  onUrlChange,
  required = false,
  recommendedText,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [showManualUrl, setShowManualUrl] = useState(false);
  const [manualUrlInput, setManualUrlInput] = useState(currentUrl);

  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const maxMb = type === 'poster' ? POSTER_MAX_SIZE_MB : BANNER_MAX_SIZE_MB;
  const isPoster = type === 'poster';

  // Sync manual input if external currentUrl changes
  useEffect(() => {
    setManualUrlInput(currentUrl);
  }, [currentUrl]);

  // Clean up any temporary object URL on unmount
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

    // Reset feedback
    setErrorMessage(null);
    setSuccessMessage(null);
    setConfirmingRemove(false);

    // 1. Client-side Image Validation
    const validation = validateImageFile(file, type);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid file selection.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. Immediate Local Preview for zero-latency feedback on mobile / desktop
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);

    // 3. Upload directly to Firebase Storage
    setIsUploading(true);
    setUploadProgress(0);

    const oldUrl = currentUrl;

    try {
      const result = await uploadAnimeImage({
        file,
        animeId,
        type,
        onProgress: (pct) => setUploadProgress(pct),
      });

      // 4. Update parent with Firebase Storage download URL
      onUrlChange(result.downloadUrl);
      setManualUrlInput(result.downloadUrl);
      setLocalPreview(null);
      setSuccessMessage('Uploaded to Firebase Storage!');
      setTimeout(() => setSuccessMessage(null), 4000);

      // 5. Safely clean up previous file from Firebase Storage if replaced
      if (oldUrl && oldUrl !== result.downloadUrl && isFirebaseStorageUrl(oldUrl)) {
        safeDeleteStorageFile(oldUrl).catch(() => {});
      }
    } catch (err: any) {
      console.error('[Upload Error]:', err);
      setErrorMessage(err?.message || 'Failed to upload image. Please try again.');
      setLocalPreview(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (!confirmingRemove) {
      setConfirmingRemove(true);
      return;
    }

    const oldUrl = currentUrl;
    setConfirmingRemove(false);
    onUrlChange('');
    setManualUrlInput('');
    setLocalPreview(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Attempt cleanup if it was stored in Firebase Storage
    if (oldUrl && isFirebaseStorageUrl(oldUrl)) {
      safeDeleteStorageFile(oldUrl).catch(() => {});
    }
  };

  const handleManualUrlSave = () => {
    const trimmed = manualUrlInput.trim();
    onUrlChange(trimmed);
    setErrorMessage(null);
    setSuccessMessage('URL updated');
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const activeDisplayUrl = localPreview || currentUrl;
  const isFromFirebase = currentUrl ? isFirebaseStorageUrl(currentUrl) : false;

  return (
    <div className="space-y-2">
      {/* Label and Badge Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <label className="text-xs font-bold text-[#94A3B8] flex items-center gap-1.5">
          <span>{label}</span>
          {required && <span className="text-rose-400">*</span>}
          {isFromFirebase && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" />
              Firebase Storage
            </span>
          )}
          {currentUrl && !isFromFirebase && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              External URL
            </span>
          )}
        </label>

        {recommendedText && (
          <span className="text-[10px] text-[#64748B]">{recommendedText}</span>
        )}
      </div>

      {/* Hidden Native File Input (accepts camera/gallery on Android/iOS) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        disabled={isUploading}
        className="hidden"
      />

      {/* Image Preview & Action Controls */}
      {activeDisplayUrl ? (
        <div className="bg-[#050A14] border border-white/10 hover:border-white/20 rounded-2xl p-3 sm:p-4 transition-all">
          <div
            className={`flex flex-col ${
              isPoster ? 'sm:flex-row' : 'flex-col'
            } gap-4 items-start`}
          >
            {/* Visual Image Preview */}
            <div
              className={`relative rounded-xl overflow-hidden border border-white/10 shrink-0 bg-black/40 group ${
                isPoster
                  ? 'w-28 h-40 sm:w-32 sm:h-44'
                  : 'w-full h-32 sm:h-44'
              }`}
            >
              <img
                src={activeDisplayUrl}
                alt={`${label} Preview`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  // Fallback placeholder if broken URL
                  (e.target as HTMLImageElement).src =
                    'https://via.placeholder.com/400x250/0b1322/64748b?text=Image+Unavailable';
                }}
              />

              {/* Uploading Overlay */}
              {isUploading && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-3 text-center">
                  <Loader2 className="w-6 h-6 text-[#1683FF] animate-spin mb-2" />
                  <span className="text-[11px] font-bold text-white">
                    Uploading... {uploadProgress}%
                  </span>
                </div>
              )}

              {/* Open Full Image Link */}
              <a
                href={activeDisplayUrl}
                target="_blank"
                rel="noreferrer"
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-[#1683FF] text-white opacity-0 group-hover:opacity-100 transition-all"
                title="View full image in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Actions & Status Details */}
            <div className="flex-1 min-w-0 space-y-3 w-full">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white truncate">
                    {isPoster ? 'Active Poster' : 'Active Banner'}
                  </span>
                  {localPreview && (
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-medium">
                      Local Preview
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#64748B] break-all line-clamp-1 font-mono">
                  {currentUrl || 'Image selected and ready'}
                </p>
              </div>

              {/* Action Buttons for Mobile and PC */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-3.5 py-2 rounded-xl bg-[#1683FF] hover:bg-[#2196FF] active:scale-95 text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span>{isUploading ? 'Uploading...' : `Replace ${isPoster ? 'Poster' : 'Banner'}`}</span>
                </button>

                {confirmingRemove ? (
                  <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                    <button
                      type="button"
                      onClick={handleRemove}
                      disabled={isUploading}
                      className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirm Delete?</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingRemove(false)}
                      className="px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#94A3B8] hover:text-white text-xs font-medium transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={isUploading}
                    className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs transition-all flex items-center gap-1.5 border border-rose-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowManualUrl(!showManualUrl)}
                  className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white font-medium text-[11px] transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>Edit URL</span>
                  {showManualUrl ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </div>

              {/* Upload Progress Bar if active */}
              {isUploading && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px] font-semibold text-[#94A3B8]">
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Uploading to Firebase Storage...
                    </span>
                    <span className="text-white font-bold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#1683FF] to-cyan-400 rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State: Direct Tap / Click to Upload */
        <div
          onClick={() => {
            if (!isUploading) fileInputRef.current?.click();
          }}
          className={`border-2 border-dashed border-white/15 hover:border-[#1683FF]/60 hover:bg-[#1683FF]/5 bg-[#050A14] rounded-2xl p-5 sm:p-6 text-center cursor-pointer transition-all group ${
            isUploading ? 'opacity-70 pointer-events-none' : ''
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-2.5">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#94A3B8] group-hover:text-[#1683FF] group-hover:border-[#1683FF]/40 group-hover:scale-105 transition-all">
              {isUploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-[#1683FF]" />
              ) : isPoster ? (
                <ImageIcon className="w-6 h-6" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-bold text-white">
                {isUploading ? (
                  <span>Uploading to Firebase Storage ({uploadProgress}%)...</span>
                ) : (
                  <span>Upload {isPoster ? 'Poster' : 'Banner'}</span>
                )}
              </p>
              <p className="text-[11px] text-[#64748B] max-w-sm">
                Tap to pick from phone or PC (JPG, PNG, WEBP • Max {maxMb}MB)
              </p>
            </div>

            {/* Direct Upload Trigger Button */}
            {!isUploading && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="mt-1 px-4 py-2 rounded-xl bg-[#1683FF] hover:bg-[#2196FF] text-white font-semibold text-xs transition-all flex items-center gap-2 shadow-md shadow-[#1683FF]/20 active:scale-95 cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload {isPoster ? 'Poster' : 'Banner'}</span>
              </button>
            )}

            {/* Live Progress Bar during initial upload */}
            {isUploading && (
              <div className="w-full max-w-xs space-y-1 pt-2">
                <div className="flex justify-between text-[10px] text-[#94A3B8]">
                  <span>Uploading image...</span>
                  <span className="font-bold text-white">{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#1683FF] to-cyan-400 rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual URL input fallback toggle (Useful for existing legacy URLs or manual inspection) */}
      {showManualUrl && (
        <div className="bg-[#050A14] border border-white/10 rounded-xl p-3 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
            <span>Direct Image URL / Fallback</span>
            <span className="text-[10px] text-[#64748B]">Auto-saved when uploading</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={manualUrlInput}
              onChange={(e) => setManualUrlInput(e.target.value)}
              placeholder="https://firebasestorage.googleapis.com/... or external image URL"
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#1683FF] font-mono text-[11px]"
            />
            <button
              type="button"
              onClick={handleManualUrlSave}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors shrink-0 cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Error Feedback Message */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span className="flex-1">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white text-xs px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Success Feedback Message */}
      {successMessage && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
};
