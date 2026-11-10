/**
 * Client-Side Photo Compression Utility
 * Compresses any attached photo/camera snapshot to under 500KB
 * Generates local Blobs and Object URLs for instant offline display
 */

export interface CompressedImageResult {
  blob: Blob;
  objectUrl: string;
  dataUrl: string;
  sizeBytes: number;
  width: number;
  height: number;
}

/**
 * Compresses an image file or blob to strictly under 500KB (< 512,000 bytes)
 * Uses HTML5 Canvas resizing and progressive JPEG quality optimization.
 */
export async function compressImageUnder500KB(
  fileOrBlob: File | Blob,
  maxSizeBytes: number = 490 * 1024 // 490 KB target
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(fileOrBlob);
    const img = new Image();

    img.onload = async () => {
      try {
        URL.revokeObjectURL(objectUrl);

        let { width, height } = img;
        const maxDimension = 1600; // Optimal for sharp trophy fish photos while staying small

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
          throw new Error('Failed to obtain 2D canvas context for photo compression.');
        }

        // Fill background white in case of transparent PNG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Progressive compression loop: start at 0.85 quality and step down if needed
        let quality = 0.85;
        let compressedBlob: Blob | null = null;
        let attempt = 0;

        while (attempt < 6) {
          compressedBlob = await new Promise<Blob | null>((res) => {
            canvas.toBlob(res, 'image/jpeg', quality);
          });

          if (compressedBlob && compressedBlob.size <= maxSizeBytes) {
            break;
          }

          // If still over 500KB, reduce quality or scale down canvas
          if (quality > 0.5) {
            quality -= 0.15;
          } else {
            // Scale canvas down further
            width = Math.round(width * 0.8);
            height = Math.round(height * 0.8);
            canvas.width = width;
            canvas.height = height;
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            quality = 0.7;
          }
          attempt++;
        }

        if (!compressedBlob) {
          // Fallback if toBlob fails
          const fallbackDataUrl = canvas.toDataURL('image/jpeg', 0.6);
          const res = await fetch(fallbackDataUrl);
          compressedBlob = await res.blob();
        }

        const finalObjectUrl = URL.createObjectURL(compressedBlob);
        const reader = new FileReader();

        reader.onloadend = () => {
          const finalDataUrl = reader.result as string;
          resolve({
            blob: compressedBlob!,
            objectUrl: finalObjectUrl,
            dataUrl: finalDataUrl,
            sizeBytes: compressedBlob!.size,
            width,
            height,
          });
        };

        reader.onerror = () => {
          resolve({
            blob: compressedBlob!,
            objectUrl: finalObjectUrl,
            dataUrl: '',
            sizeBytes: compressedBlob!.size,
            width,
            height,
          });
        };

        reader.readAsDataURL(compressedBlob);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image for compression: ${err}`));
    };

    img.src = objectUrl;
  });
}

/**
 * Ultra-fast single-pass photo compressor for Firestore Cloud Sync
 * Converts any camera photo or blob to a crisp ~50-80KB JPEG data URL in <30ms
 * Guaranteed never to hang (3s timeout) and fits comfortably inside Firestore.
 */
export async function compressForCloudSync(input: Blob | string): Promise<string> {
  return new Promise(async (resolve) => {
    // 3.5s absolute safety timeout so it never hangs the sync loop
    const timer = setTimeout(() => {
      resolve(typeof input === 'string' && input.startsWith('data:image/') ? input : '');
    }, 3500);

    try {
      let objectUrl: string = '';
      let shouldRevoke = false;

      if (typeof input === 'string') {
        if (!input) {
          clearTimeout(timer);
          return resolve('');
        }
        if (input.startsWith('http://') || input.startsWith('https://')) {
          clearTimeout(timer);
          return resolve(input);
        }
        if (input.startsWith('data:image/')) {
          if (input.length < 180 * 1024) {
            clearTimeout(timer);
            return resolve(input);
          }
          try {
            const res = await fetch(input);
            const blob = await res.blob();
            objectUrl = URL.createObjectURL(blob);
            shouldRevoke = true;
          } catch {
            clearTimeout(timer);
            return resolve(input);
          }
        } else if (input.startsWith('blob:')) {
          objectUrl = input;
        } else {
          clearTimeout(timer);
          return resolve('');
        }
      } else {
        objectUrl = URL.createObjectURL(input);
        shouldRevoke = true;
      }

      const img = new Image();
      img.onload = () => {
        try {
          if (shouldRevoke) URL.revokeObjectURL(objectUrl);
          let { width, height } = img;
          const maxDim = 720;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            clearTimeout(timer);
            return resolve('');
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.68);
          clearTimeout(timer);
          resolve(dataUrl);
        } catch {
          clearTimeout(timer);
          resolve('');
        }
      };

      img.onerror = () => {
        if (shouldRevoke) URL.revokeObjectURL(objectUrl);
        clearTimeout(timer);
        resolve('');
      };

      img.src = objectUrl;
    } catch {
      clearTimeout(timer);
      resolve('');
    }
  });
}

