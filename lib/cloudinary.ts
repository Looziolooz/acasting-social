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
      { folder: 'acasting' },
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

function cloudinaryFont(fontName?: string): string {
  if (!fontName) return 'Arial';
  return fontName.replace(/\s+/g, '%20');
}

/**
 * Normalizza i colori per Cloudinary URL overlay.
 * Cloudinary accetta: co_white, co_black, co_rgb:HEXCODE
 */
function toCloudinaryColor(color?: string): string {
  if (!color) return 'white';
  if (color === 'white' || color === 'black') return color;
  // Strip # if present
  const hex = color.startsWith('#') ? color.slice(1) : color;
  // If it's a valid 6-char hex, use rgb: prefix
  if (/^[0-9A-Fa-f]{6}$/.test(hex)) return `rgb:${hex}`;
  return 'white';
}

function getStyleBrightness(style: ImageStyle): number {
  switch (style) {
    case 'noir': return -90;
    case 'purple': return -60;
    case 'cinematic': return -85;
    default: return -75;
  }
}

export function buildOverlayUrl(
  publicId: string,
  job: AcastingJob,
  style: ImageStyle = 'cinematic',
  custom?: CustomImageSettings
): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  const titleFont = cloudinaryFont(custom?.titleFont);
  const titleSize = custom?.titleSize ?? 54;
  const titleColor = toCloudinaryColor(custom?.titleColor ?? 'white');
  const titleY = custom?.titleY ?? -250;
  const titleText = custom?.titleText || job.title;

  const subtitleFont = cloudinaryFont(custom?.subtitleFont);
  const subtitleSize = custom?.subtitleSize ?? 46;
  const subtitleColor = toCloudinaryColor(custom?.subtitleColor ?? 'white');

  const ctaText = custom?.ctaText ?? 'ACASTING.SE';
  const accentHex = custom?.accentColor ?? (style === 'purple' ? 'A78BFA' : '7C3AED');
  const accentColor = toCloudinaryColor(accentHex);

  const brightness = custom?.brightness ?? getStyleBrightness(style);

  const transforms = [
    'w_1080,h_1920,c_fill,g_center,q_auto:best',
    `e_brightness:${brightness}`,
    `l_text:${titleFont}_${titleSize}_bold_center:${enc(titleText)},g_center,y_${titleY},w_900,c_fit,co_${titleColor}`,
    'l_text:Arial_65_bold:__,g_center,y_-80,co_white',
    `l_text:${subtitleFont}_${subtitleSize}_bold_center:${enc(job.salary || 'Ej angivet')},g_center,y_40,w_900,c_fit,co_${subtitleColor}`,
    `l_text:${subtitleFont}_${subtitleSize}_bold_center:${enc(job.expiryDate || 'Löpande')},g_center,y_140,w_900,c_fit,co_${subtitleColor}`,
    `l_text:${subtitleFont}_44_bold_center:Ansök nu på,g_center,y_300,w_900,c_fit,co_${subtitleColor}`,
    `l_text:${titleFont}_52_bold_center:${enc(ctaText)},g_center,y_390,w_900,c_fit,co_${accentColor}`,
    'f_jpg'
  ].join('/');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}.jpg`;
}

/**
 * HD Download URL - PNG max quality, no DPR trick
 */
export function buildHDDownloadUrl(
  publicId: string,
  job: AcastingJob,
  style: ImageStyle = 'cinematic',
  custom?: CustomImageSettings
): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  const titleFont = cloudinaryFont(custom?.titleFont);
  const titleSize = custom?.titleSize ?? 54;
  const titleColor = toCloudinaryColor(custom?.titleColor ?? 'white');
  const titleY = custom?.titleY ?? -250;
  const titleText = custom?.titleText || job.title;

  const subtitleFont = cloudinaryFont(custom?.subtitleFont);
  const subtitleSize = custom?.subtitleSize ?? 46;
  const subtitleColor = toCloudinaryColor(custom?.subtitleColor ?? 'white');

  const ctaText = custom?.ctaText ?? 'ACASTING.SE';
  const accentHex = custom?.accentColor ?? (style === 'purple' ? 'A78BFA' : '7C3AED');
  const accentColor = toCloudinaryColor(accentHex);

  const brightness = custom?.brightness ?? getStyleBrightness(style);

  const transforms = [
    'w_1080,h_1920,c_fill,g_center,q_100',
    `e_brightness:${brightness}`,
    `l_text:${titleFont}_${titleSize}_bold_center:${enc(titleText)},g_center,y_${titleY},w_900,c_fit,co_${titleColor}`,
    'l_text:Arial_65_bold:__,g_center,y_-80,co_white',
    `l_text:${subtitleFont}_${subtitleSize}_bold_center:${enc(job.salary || 'Ej angivet')},g_center,y_40,w_900,c_fit,co_${subtitleColor}`,
    `l_text:${subtitleFont}_${subtitleSize}_bold_center:${enc(job.expiryDate || 'Löpande')},g_center,y_140,w_900,c_fit,co_${subtitleColor}`,
    `l_text:${subtitleFont}_44_bold_center:Ansök nu på,g_center,y_300,w_900,c_fit,co_${subtitleColor}`,
    `l_text:${titleFont}_52_bold_center:${enc(ctaText)},g_center,y_390,w_900,c_fit,co_${accentColor}`,
    'f_png'
  ].join('/');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}.png`;
}