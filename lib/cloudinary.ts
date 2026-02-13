// lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';
import type { AcastingJob, ImageStyle, CustomImageSettings } from './types';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadImageToCloudinary(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'acasting', quality: 'auto:best', format: 'jpg' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!.public_id);
      }
    );
    uploadStream.end(buffer);
  });
}

export async function generatePlaceholderAndUpload(jobTitle: string): Promise<string> {
  const url = `https://placehold.co/1080x1920/0D0D1A/7C3AED.png?text=${encodeURIComponent(jobTitle)}`;
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ folder: 'acasting/placeholders' }, (err, res) => {
      if (err) return reject(err);
      resolve(res!.public_id);
    }).end(buffer);
  });
}

const enc = (text: string) =>
  encodeURIComponent(text || '')
    .replace(/,/g, '%2C')
    .replace(/\//g, '%2F');

// Map font name to Cloudinary-safe font identifier
function cloudinaryFont(fontName?: string): string {
  if (!fontName) return 'Arial';
  // Cloudinary uses underscores for spaces in font names
  return fontName.replace(/\s+/g, '%20');
}

// Normalize color - strip # if present, handle named colors
function normalizeColor(color?: string): string {
  if (!color) return 'white';
  if (color === 'white') return 'white';
  if (color === 'black') return 'rgb:000000';
  // If it starts with #, strip it and use rgb: prefix
  if (color.startsWith('#')) return `rgb:${color.slice(1)}`;
  // If it's a hex without #, add rgb: prefix
  if (/^[0-9A-Fa-f]{6}$/.test(color)) return `rgb:${color}`;
  return color;
}

export function buildOverlayUrl(
  publicId: string,
  job: AcastingJob,
  style: ImageStyle = 'cinematic',
  custom?: CustomImageSettings
): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  // Resolve settings from style + custom overrides
  const titleFont = cloudinaryFont(custom?.titleFont ?? 'Arial');
  const titleSize = custom?.titleSize ?? 54;
  const titleColor = normalizeColor(custom?.titleColor ?? 'white');
  const titleY = custom?.titleY ?? -250;
  const titleText = custom?.titleText || job.title;

  const subtitleFont = cloudinaryFont(custom?.subtitleFont ?? 'Arial');
  const subtitleSize = custom?.subtitleSize ?? 46;
  const subtitleColor = normalizeColor(custom?.subtitleColor ?? 'white');

  const ctaColor = normalizeColor(custom?.ctaColor ?? '7C3AED');
  const ctaText = custom?.ctaText ?? 'ACASTING.SE';

  const accentHex = custom?.accentColor ?? (style === 'purple' ? 'A78BFA' : '7C3AED');
  const accentColor = normalizeColor(accentHex);

  const brightness = custom?.brightness ?? (
    style === 'noir' ? -90 :
    style === 'purple' ? -60 :
    style === 'cinematic' ? -85 : -75
  );

  const outputFormat = custom?.outputFormat ?? 'jpg';
  const outputQuality = custom?.outputQuality ?? 100;

  // Build transformation chain - HD quality pipeline
  const transforms = [
    // Base: fill to 1080x1920, high DPR, max quality
    `w_1080,h_1920,c_fill,g_center,dpr_2.0,q_${outputQuality},fl_force_strip`,
    // Brightness overlay
    `e_brightness:${brightness}`,
    // Title text
    `l_text:${titleFont}_${titleSize}_bold_center:${enc(titleText)},g_center,y_${titleY},w_900,c_fit,co_${titleColor}`,
    // Separator line
    'l_text:Arial_65_bold:__,g_center,y_-80,co_white',
    // Salary
    `l_text:${subtitleFont}_${subtitleSize}_bold_center:${enc(job.salary || 'Ej angivet')},g_center,y_40,w_900,c_fit,co_${subtitleColor}`,
    // Expiry date
    `l_text:${subtitleFont}_${subtitleSize}_bold_center:${enc(job.expiryDate || 'Löpande')},g_center,y_140,w_900,c_fit,co_${subtitleColor}`,
    // CTA text
    `l_text:${subtitleFont}_44_bold_center:Ansök nu på,g_center,y_300,w_900,c_fit,co_${subtitleColor}`,
    // Brand CTA
    `l_text:${titleFont}_52_bold_center:${enc(ctaText)},g_center,y_390,w_900,c_fit,co_${accentColor}`,
    // Output format
    `f_${outputFormat}`,
  ].join('/');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}.${outputFormat}`;
}

/**
 * Builds an HD download URL - even higher quality for saving
 */
export function buildHDDownloadUrl(
  publicId: string,
  job: AcastingJob,
  style: ImageStyle = 'cinematic',
  custom?: CustomImageSettings
): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  const titleFont = cloudinaryFont(custom?.titleFont ?? 'Arial');
  const titleSize = custom?.titleSize ?? 54;
  const titleColor = normalizeColor(custom?.titleColor ?? 'white');
  const titleY = custom?.titleY ?? -250;
  const titleText = custom?.titleText || job.title;

  const subtitleFont = cloudinaryFont(custom?.subtitleFont ?? 'Arial');
  const subtitleSize = custom?.subtitleSize ?? 46;
  const subtitleColor = normalizeColor(custom?.subtitleColor ?? 'white');

  const ctaColor = normalizeColor(custom?.ctaColor ?? '7C3AED');
  const ctaText = custom?.ctaText ?? 'ACASTING.SE';
  const accentHex = custom?.accentColor ?? (style === 'purple' ? 'A78BFA' : '7C3AED');
  const accentColor = normalizeColor(accentHex);

  const brightness = custom?.brightness ?? (
    style === 'noir' ? -90 :
    style === 'purple' ? -60 :
    style === 'cinematic' ? -85 : -75
  );

  // Max quality download - no DPR trick, native 1080x1920 at q_100
  const transforms = [
    'w_1080,h_1920,c_fill,g_center,q_100,fl_force_strip.lossy',
    `e_brightness:${brightness}`,
    `l_text:${titleFont}_${titleSize}_bold_center:${enc(titleText)},g_center,y_${titleY},w_900,c_fit,co_${titleColor}`,
    'l_text:Arial_65_bold:__,g_center,y_-80,co_white',
    `l_text:${subtitleFont}_${subtitleSize}_bold_center:${enc(job.salary || 'Ej angivet')},g_center,y_40,w_900,c_fit,co_${subtitleColor}`,
    `l_text:${subtitleFont}_${subtitleSize}_bold_center:${enc(job.expiryDate || 'Löpande')},g_center,y_140,w_900,c_fit,co_${subtitleColor}`,
    `l_text:${subtitleFont}_44_bold_center:Ansök nu på,g_center,y_300,w_900,c_fit,co_${subtitleColor}`,
    `l_text:${titleFont}_52_bold_center:${enc(ctaText)},g_center,y_390,w_900,c_fit,co_${accentColor}`,
    'f_png', // PNG for max quality download
  ].join('/');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}.png`;
}