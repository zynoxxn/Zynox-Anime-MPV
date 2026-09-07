/**
 * Compresses an image File or Data URL to a compact thumbnail suitable for avatars/posters.
 * Resizes to max 256x256, outputs WebP or JPEG (~15KB - 30KB max), avoiding Firestore 1MB document limits.
 */
export async function compressAvatarImage(
  fileOrDataUrl: File | string,
  maxDimension = 256,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const proceedWithImg = () => {
        try {
          let { width, height } = img;
          if (width <= 0 || height <= 0) {
            resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
            return;
          }

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Try WebP first, fallback to JPEG
          let compressed = '';
          try {
            compressed = canvas.toDataURL('image/webp', quality);
          } catch {
            compressed = '';
          }

          if (!compressed || !compressed.startsWith('data:image/webp')) {
            compressed = canvas.toDataURL('image/jpeg', quality);
          }

          resolve(compressed);
        } catch (e) {
          console.warn('Image compression fallback:', e);
          resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
        }
      };

      img.onload = proceedWithImg;
      img.onerror = () => {
        resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
      };

      if (typeof fileOrDataUrl === 'string') {
        img.src = fileOrDataUrl;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = (e.target?.result as string) || '';
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(fileOrDataUrl);
      }
    } catch {
      resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
    }
  });
}
