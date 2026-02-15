// lib/cloudinary.ts — v5: Simplified (High Quality Hosting)
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

export async function uploadFinalImage(buffer: Buffer, jobId: string): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'acasting/social',
        public_id: `social-${jobId}-${Date.now()}`,
        resource_type: 'image',
        format: 'png',
        quality: "100",
        overwrite: true,
        invalidate: true,
      },
      (error, result) => {
        if (error) return reject(error);
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
 * Genera l'URL di anteprima HD (Simile a n8n)
 */
export function getPreviewUrl(secureUrl: string): string {
  // This matches the "transforms" logic in your n8n JSON file
  return secureUrl.replace('/upload/', '/upload/f_auto,q_90,dpr_2.0/');
}

export function getDownloadUrl(secureUrl: string): string {
  return secureUrl;
}