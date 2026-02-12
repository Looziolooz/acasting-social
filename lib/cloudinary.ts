import { v2 as cloudinary } from 'cloudinary';
import type { AcastingJob, ImageStyle } from './types';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadImageToCloudinary(imageUrl: string): Promise<string> {
  const result = await cloudinary.uploader.upload(imageUrl, {
    folder: 'acasting',
    resource_type: 'image',
  });
  return result.public_id;
}

// Encodes text safely for Cloudinary URL transformations
function enc(text: string): string {
  return encodeURIComponent(text || '')
    .replace(/,/g, '%2C')
    .replace(/\//g, '%2F')
    .replace(/:/g, '%3A');
}

export function buildOverlayUrl(
  publicId: string,
  job: AcastingJob,
  style: ImageStyle = 'dark'
): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;

  const styleConfig = {
    dark: { brightness: -80, titleColor: 'white', subColor: 'white', accentColor: '7C3AED' },
    purple: { brightness: -60, titleColor: 'white', subColor: 'E5D5FF', accentColor: 'A78BFA' },
    noir: { brightness: -95, titleColor: 'white', subColor: 'CCCCCC', accentColor: 'FFFFFF' },
    warm: { brightness: -65, titleColor: 'FFEDD8', subColor: 'FFC599', accentColor: 'FF6B35' },
  }[style];

  const title = job.title || 'Casting';
  const salary = job.salary ? `Arvode: ${job.salary} kr` : 'Arvode: Ej angivet';
  const expiry = `Ansök senast: ${job.expiryDate ? job.expiryDate.split('T')[0] : 'Löpande'}`;
  const city = job.city || 'Sverige';

  const transforms = [
    // Base: resize to portrait Instagram/TikTok format
    'w_1080,h_1920,c_fill,g_face:auto,dpr_2.0,q_90',
    // Dark overlay
    `e_brightness:${styleConfig.brightness}`,
    // Decorative line top
    `l_text:Arial_4_bold:.,g_north,y_120,co_${styleConfig.accentColor},w_200`,
    // Category badge
    `l_text:Arial_28_bold:${enc((job.category || 'CASTING').toUpperCase())},g_north,y_80,co_${styleConfig.accentColor}`,
    // Title (large)
    `l_text:Arial_58_bold_center:${enc(title)},g_center,y_-280,w_920,c_fit,co_${styleConfig.titleColor}`,
    // Divider
    `l_text:Arial_36_bold:─────────────,g_center,y_-160,co_${styleConfig.accentColor}`,
    // City
    `l_text:Arial_38_bold_center:${enc('📍 ' + city)},g_center,y_-90,w_920,c_fit,co_${styleConfig.subColor}`,
    // Salary
    `l_text:Arial_46_bold_center:${enc(salary)},g_center,y_10,w_920,c_fit,co_${styleConfig.titleColor}`,
    // Expiry date
    `l_text:Arial_38_bold_center:${enc(expiry)},g_center,y_100,w_920,c_fit,co_${styleConfig.subColor}`,
    // Bottom CTA divider
    `l_text:Arial_36_bold:─────────────,g_center,y_260,co_${styleConfig.accentColor}`,
    // CTA line 1
    `l_text:Arial_42_bold_center:Ansök nu på,g_center,y_340,w_920,c_fit,co_${styleConfig.subColor}`,
    // CTA brand
    `l_text:Arial_72_bold_center:ACASTING.SE,g_center,y_430,w_920,c_fit,co_${styleConfig.accentColor}`,
    // Output format
    'f_jpg',
  ].join('/');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}.jpg`;
}

// Generate a placeholder image when no source image is available
export async function generatePlaceholderAndUpload(jobTitle: string): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  // Upload a solid color placeholder
  const result = await cloudinary.uploader.upload(
    `https://placehold.co/1080x1920/0D0D1A/7C3AED.jpg?text=${encodeURIComponent(jobTitle)}`,
    { folder: 'acasting/placeholders' }
  );
  return result.public_id;
}
