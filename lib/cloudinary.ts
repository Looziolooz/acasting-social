// lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';
import type { AcastingJob, ImageStyle, CustomImageSettings } from './types';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ============================================================
// 🆕 HELPER: Estrai sempre l'URL a massima risoluzione
// ============================================================
function getHighResImageUrl(imageUrl: string): string {
  // 1. Se è già un blob URL diretto → massima qualità, usalo così
  if (imageUrl.includes('acasting.blob.core.windows.net')) {
    return imageUrl;
  }

  // 2. Se è un URL CDN (assets.acasting.se/images/...), estrai il blob originale
  if (imageUrl.includes('assets.acasting.se')) {
    const blobMatch = imageUrl.match(
      /plain\/(https:\/\/acasting\.blob\.core\.windows\.net\/.+)/
    );
    if (blobMatch) return blobMatch[1];

    // Fallback: forza la larghezza massima dal CDN
    return imageUrl.replace(/w:\d+/, 'w:2000');
  }

  // 3. Qualsiasi altro URL → usalo così com'è
  return imageUrl;
}

// ============================================================
// UPLOAD — Preserva qualità originale al 100%
// ============================================================
export async function uploadImageToCloudinary(imageUrl: string): Promise<string> {
  try {
    // Usa sempre la versione a massima risoluzione
    const highResUrl = getHighResImageUrl(imageUrl);

    console.log(`📸 Original URL: ${imageUrl.substring(0, 120)}...`);
    console.log(`🔍 High-res URL: ${highResUrl.substring(0, 120)}...`);

    const response = await fetch(highResUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'image/png,image/jpeg,image/webp,image/*,*/*;q=0.8',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} - ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    console.log(`📦 Buffer size: ${(buffer.length / 1024).toFixed(2)} KB`);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'acasting',
          quality: 100, // Lossless upload
          resource_type: 'image',
          type: 'upload',
          overwrite: true,
          invalidate: true,
          // NON applicare trasformazioni in fase di upload
          transformation: [],
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary upload error:', error);
            return reject(error);
          }
          console.log(
            `✅ Upload OK: ${result!.public_id} — ${result!.width}x${result!.height}, ${(result!.bytes / 1024).toFixed(2)} KB`
          );
          resolve(result!.public_id);
        }
      );
      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw error;
  }
}

// ============================================================
// PLACEHOLDER — Generato se manca l'immagine originale
// ============================================================
export async function generatePlaceholderAndUpload(
  jobTitle: string
): Promise<string> {
  const url = `https://placehold.co/1080x1920/0D0D1A/7C3AED.png?text=${encodeURIComponent(jobTitle)}`;
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: 'acasting/placeholders',
          quality: 100,
          format: 'png',
        },
        (err, res) => {
          if (err) return reject(err);
          resolve(res!.public_id);
        }
      )
      .end(buffer);
  });
}

// ============================================================
// HELPERS per encoding testo e colori Cloudinary
// ============================================================
const enc = (text: string) =>
  encodeURIComponent(text || '')
    .replace(/,/g, '%2C')
    .replace(/\//g, '%2F');

function cfColor(color?: string): string {
  if (!color || color === 'white') return 'rgb:FFFFFF';
  if (color === 'black') return 'rgb:000000';
  const hex = color.startsWith('#') ? color.slice(1) : color;
  return `rgb:${hex}`;
}

// ============================================================
// BUILD OVERLAY URL — Preview (ottimizzato per web)
// ============================================================
export function buildOverlayUrl(
  publicId: string,
  job: AcastingJob,
  style: ImageStyle = 'cinematic',
  custom?: CustomImageSettings
): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  // Parametri di output
  const width = custom?.outputWidth ?? 1080;
  const height = custom?.outputHeight ?? 1920;
  const quality = custom?.outputQuality ?? 90;
  const format = custom?.outputFormat ?? 'auto';

  // Parametri testo
  const titleText = custom?.titleText || job.title || 'Casting';
  const titleSize = custom?.titleSize ?? 54;
  const titleColor = cfColor(custom?.titleColor);
  const titleY = custom?.titleY ?? -250;
  const titleFont = custom?.titleFont ?? 'Arial';

  const bodySize = custom?.subtitleSize ?? 46;
  const bodyColor = cfColor(custom?.subtitleColor || 'white');
  const bodyFont = custom?.subtitleFont ?? 'Arial';

  const ctaText = custom?.ctaText ?? 'ACASTING.SE';
  const accentColor = cfColor(custom?.accentColor ?? '7C3AED');

  const brightness =
    custom?.brightness ??
    (style === 'noir' ? -90 : style === 'purple' ? -60 : -85);

  const salaryText =
    !job.salary || job.salary === 'Ej angivet'
      ? 'Arvode: Ej angivet'
      : `Arvode: ${job.salary} kr`;
  const expiryText = `Ansök senast: ${job.expiryDate?.split('T')[0] || 'Löpande'}`;

  const transforms = [
    // FASE 1: Ridimensionamento dall'originale HD
    `w_${width},h_${height},c_fill,g_auto`,

    // FASE 2: Qualità esplicita (no auto imprevedibile)
    `q_${quality}`,
    `f_${format}`,

    // FASE 3: Effetti immagine
    `e_brightness:${brightness}`,
    'e_sharpen:60',

    // FASE 4: Text overlays
    `l_text:${titleFont}_${titleSize}_bold_center:${enc(titleText)},g_center,y_${titleY},w_940,c_fit,co_${titleColor}`,
    'l_text:Arial_65_bold:__,g_center,y_-80,co_rgb:FFFFFF',
    `l_text:${bodyFont}_${bodySize}_bold_center:${enc(salaryText)},g_center,y_40,w_900,c_fit,co_${bodyColor}`,
    `l_text:${bodyFont}_${bodySize}_bold_center:${enc(expiryText)},g_center,y_140,w_900,c_fit,co_${bodyColor}`,
    `l_text:${bodyFont}_44_bold_center:${enc('Ansök nu på')},g_center,y_300,w_900,c_fit,co_${bodyColor}`,
    `l_text:${titleFont}_48_bold_center:${enc(ctaText)},g_center,y_380,w_900,c_fit,co_${accentColor}`,
  ].join('/');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}`;
}

// ============================================================
// BUILD HD DOWNLOAD URL — Massima qualità per download
// ============================================================
export function buildHDDownloadUrl(
  publicId: string,
  job: AcastingJob,
  style: ImageStyle = 'cinematic',
  custom?: CustomImageSettings
): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  // Per il download forziamo PNG a qualità 100, niente lossy
  const width = custom?.outputWidth ?? 1080;
  const height = custom?.outputHeight ?? 1920;

  const titleText = custom?.titleText || job.title || 'Casting';
  const titleSize = custom?.titleSize ?? 54;
  const titleColor = cfColor(custom?.titleColor);
  const titleY = custom?.titleY ?? -250;
  const titleFont = custom?.titleFont ?? 'Arial';

  const bodySize = custom?.subtitleSize ?? 46;
  const bodyColor = cfColor(custom?.subtitleColor || 'white');
  const bodyFont = custom?.subtitleFont ?? 'Arial';

  const ctaText = custom?.ctaText ?? 'ACASTING.SE';
  const accentColor = cfColor(custom?.accentColor ?? '7C3AED');

  const brightness =
    custom?.brightness ??
    (style === 'noir' ? -90 : style === 'purple' ? -60 : -85);

  const salaryText =
    !job.salary || job.salary === 'Ej angivet'
      ? 'Arvode: Ej angivet'
      : `Arvode: ${job.salary} kr`;
  const expiryText = `Ansök senast: ${job.expiryDate?.split('T')[0] || 'Löpande'}`;

  const transforms = [
    // Download: risoluzione reale, no dpr
    `w_${width},h_${height},c_fill,g_auto`,

    // Qualità massima, PNG lossless
    'q_100',
    'f_png',

    // Effetti
    `e_brightness:${brightness}`,
    'e_sharpen:60',

    // Text overlays (identici al preview)
    `l_text:${titleFont}_${titleSize}_bold_center:${enc(titleText)},g_center,y_${titleY},w_940,c_fit,co_${titleColor}`,
    'l_text:Arial_65_bold:__,g_center,y_-80,co_rgb:FFFFFF',
    `l_text:${bodyFont}_${bodySize}_bold_center:${enc(salaryText)},g_center,y_40,w_900,c_fit,co_${bodyColor}`,
    `l_text:${bodyFont}_${bodySize}_bold_center:${enc(expiryText)},g_center,y_140,w_900,c_fit,co_${bodyColor}`,
    `l_text:${bodyFont}_44_bold_center:${enc('Ansök nu på')},g_center,y_300,w_900,c_fit,co_${bodyColor}`,
    `l_text:${titleFont}_48_bold_center:${enc(ctaText)},g_center,y_380,w_900,c_fit,co_${accentColor}`,
  ].join('/');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}`;
}