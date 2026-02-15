// lib/cloudinary.ts — v5: Simplified (upload only, no URL transforms)
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Upload a pre-generated image buffer to Cloudinary.
 */
export async function uploadFinalImage(
  buffer: Buffer,
  jobId: string
): Promise<CloudinaryUploadResult> {
  console.log(`📤 Uploading final image: ${(buffer.length / 1024).toFixed(1)} KB`);

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'acasting/social',
        public_id: `social-${jobId}-${Date.now()}`,
        resource_type: 'image',
        type: 'upload',
        format: 'png',
        quality: "100",
        flags: "preserve_transparency",
        overwrite: true,
        invalidate: true,
      },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          return reject(error);
        }

        console.log(`✅ Hosted: ${result!.secure_url}`);

        resolve({
          publicId: result!.public_id,
          url: result!.url,
          secureUrl: result!.secure_url,
          width: result!.width,
          height: result!.height,
          bytes: result!.bytes,
        });
      }
    ).end(buffer);
  });
}

/**
 * Genera l'URL di anteprima usando f_auto, q_90 e dpr_2.0 per la massima nitidezza (come n8n)
 */
export function getPreviewUrl(secureUrl: string): string {
  return secureUrl.replace('/upload/', '/upload/f_auto,q_90,dpr_2.0/');
}

/**
 * The original PNG URL is the HD download URL
 */
export function getDownloadUrl(secureUrl: string): string {
  return secureUrl;
}