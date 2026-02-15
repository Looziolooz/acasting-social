// lib/cloudinary.ts — v5: Simplified (upload only, no URL transforms)
// Image generation is now done server-side by image-generator.ts
// Cloudinary is used ONLY for hosting the final image.

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
 * Returns the direct URL — no URL transformations needed.
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
 * Upload a pre-generated image and return a JPG version for preview (smaller file)
 */
export function getPreviewUrl(secureUrl: string): string {
  // Convert the PNG URL to a Cloudinary-optimized JPG for faster preview
  return secureUrl.replace('/upload/', '/upload/q_85,f_jpg/');
}

/**
 * The original PNG URL is the HD download URL (no transforms needed)
 */
export function getDownloadUrl(secureUrl: string): string {
  return secureUrl; // Already full quality PNG
}