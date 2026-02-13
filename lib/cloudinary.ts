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

function cfColor(color?: string): string {
  if (!color || color === 'white') return 'white';
  if (color === 'black') return 'black';
  const hex = color.startsWith('#') ? color.slice(1) : color;
  if (/^[0-9A-Fa-f]{6}$/.test(hex)) return `rgb:${hex}`;
  return 'white';
}

/**
 * Costruisce l'URL Cloudinary con overlay — basato sul workflow n8n funzionante.
 * Il pattern base è IDENTICO al workflow originale.
 */
export function buildOverlayUrl(
  publicId: string,
  job: AcastingJob,
  style: ImageStyle = 'cinematic',
  custom?: CustomImageSettings
): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  // ── Resolve values (custom overrides > style defaults > base) ──
  const titleText = custom?.titleText || job.title || 'Casting';
  const titleSize = custom?.titleSize ?? 46;
  const titleColor = cfColor(custom?.titleColor);
  const titleY = custom?.titleY ?? -250;
  const titleFont = custom?.titleFont ?? 'Arial';

  const bodySize = custom?.subtitleSize ?? 46;
  const bodyColor = cfColor(custom?.subtitleColor);
  const bodyFont = custom?.subtitleFont ?? 'Arial';

  const ctaText = custom?.ctaText ?? 'ACASTING.SE';
  const accentColor = cfColor(custom?.accentColor ?? '7C3AED');

  const brightness = custom?.brightness ?? (
    style === 'noir' ? -90 :
    style === 'purple' ? -60 :
    style === 'cinematic' ? -85 : -75
  );

  // Prepara testi come nel workflow
  const salaryText = !job.salary || job.salary === 'Ej angivet'
    ? 'Arvode: Ej angivet'
    : `Arvode: ${job.salary} kr`;
  const expiryText = `Ansök senast: ${job.expiryDate?.split('T')[0] || 'Löpande'}`;

  // ── Build transforms — stessa struttura del workflow n8n ──
  const transforms = [
    'w_1080,h_1920,c_fill,g_center,q_auto:best',
    `e_brightness:${brightness}`,
    `l_text:${titleFont}_${titleSize}_bold_center:${enc(titleText)},g_center,y_${titleY},w_900,c_fit,co_${titleColor}`,
    'l_text:Arial_65_bold:__,g_center,y_-80,co_white',
    `l_text:${bodyFont}_${bodySize}_bold_center:${enc(salaryText)},g_center,y_40,w_900,c_fit,co_${bodyColor}`,
    `l_text:${bodyFont}_${bodySize}_bold_center:${enc(expiryText)},g_center,y_140,w_900,c_fit,co_${bodyColor}`,
    `l_text:${bodyFont}_44_bold_center:${enc('Ansök nu på')},g_center,y_300,w_900,c_fit,co_${bodyColor}`,
    `l_text:${titleFont}_46_bold_center:${enc(ctaText)},g_center,y_380,w_900,c_fit,co_${accentColor}`,
    'f_jpg'
  ].join('/');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}.jpg`;
}

/**
 * Genera l'URL per il download — segue la stessa logica di buildOverlayUrl.
 */
export function buildHDDownloadUrl(
  publicId: string,
  job: AcastingJob,
  style: ImageStyle = 'cinematic',
  custom?: CustomImageSettings
): string {
  return buildOverlayUrl(publicId, job, style, custom);
}