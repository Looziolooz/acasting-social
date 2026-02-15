// lib/cloudinary.ts — Advanced Quality Pipeline
import { v2 as cloudinary } from 'cloudinary';
import type { AcastingJob, ImageStyle, CustomImageSettings } from './types';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ============================================================
// TYPES
// ============================================================
interface UploadResult {
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  quality: 'high' | 'medium' | 'low';
}

// ============================================================
// QUALITY DETECTION — Classifica l'immagine sorgente
// ============================================================
function classifyImageQuality(
  width: number,
  height: number,
  bytes: number
): 'high' | 'medium' | 'low' {
  const megapixels = (width * height) / 1_000_000;
  const sizeKB = bytes / 1024;

  // High: >= 1MP e >= 200KB (immagine reale con dettagli)
  if (megapixels >= 1 && sizeKB >= 200) return 'high';

  // Medium: >= 0.3MP o >= 100KB
  if (megapixels >= 0.3 || sizeKB >= 100) return 'medium';

  // Low: tutto il resto (thumbnail, placeholder, immagini tiny)
  return 'low';
}

// ============================================================
// URL CANDIDATES — Lista prioritizzata di URL sorgente
// ============================================================
function getImageUrlCandidates(imageUrl: string): string[] {
  const candidates: string[] = [];

  if (imageUrl.includes('assets.acasting.se')) {
    // Estrai blob URL originale (massima qualità)
    const blobMatch = imageUrl.match(
      /plain\/(https:\/\/acasting\.blob\.core\.windows\.net\/.+)/
    );
    if (blobMatch) candidates.push(blobMatch[1]);

    // CDN con larghezza massima
    candidates.push(imageUrl.replace(/w:\d+/, 'w:2000'));
    // CDN con larghezza alta come fallback
    candidates.push(imageUrl.replace(/w:\d+/, 'w:1200'));
  }

  if (
    imageUrl.includes('acasting.blob.core.windows.net') &&
    !candidates.includes(imageUrl)
  ) {
    candidates.unshift(imageUrl);
  }

  if (!candidates.includes(imageUrl)) {
    candidates.push(imageUrl);
  }

  return candidates;
}

// ============================================================
// ROBUST FETCH — Prova più URL con fallback
// ============================================================
async function fetchImageBuffer(imageUrl: string): Promise<Buffer> {
  const candidates = getImageUrlCandidates(imageUrl);

  for (const url of candidates) {
    try {
      console.log(`🔄 Trying: ${url.substring(0, 100)}...`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'image/png,image/jpeg,image/webp,image/*,*/*;q=0.8',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`⚠️ HTTP ${response.status} — ${url.substring(0, 60)}`);
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 1024) {
        console.warn(`⚠️ Too small (${buffer.length}B), skipping`);
        continue;
      }

      console.log(`✅ Fetched: ${(buffer.length / 1024).toFixed(1)} KB`);
      return buffer;
    } catch (err) {
      console.warn(`⚠️ Failed: ${String(err).substring(0, 80)}`);
      continue;
    }
  }

  throw new Error(`All fetch attempts failed for: ${imageUrl}`);
}

// ============================================================
// UPLOAD — Carica e analizza qualità
// ============================================================
export async function uploadImageToCloudinary(
  imageUrl: string
): Promise<UploadResult> {
  try {
    const buffer = await fetchImageBuffer(imageUrl);

    console.log(`📤 Uploading ${(buffer.length / 1024).toFixed(1)} KB...`);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'acasting',
          quality: 100,
          resource_type: 'image',
          type: 'upload',
          overwrite: true,
          invalidate: true,
          transformation: [],
        },
        (error, result) => {
          if (error) {
            console.error('❌ Upload error:', error);
            return reject(error);
          }

          const w = result!.width;
          const h = result!.height;
          const b = result!.bytes;
          const quality = classifyImageQuality(w, h, b);

          console.log(
            `✅ Uploaded: ${result!.public_id} — ${w}x${h}, ${(b / 1024).toFixed(1)} KB → Quality: ${quality.toUpperCase()}`
          );

          resolve({
            publicId: result!.public_id,
            width: w,
            height: h,
            bytes: b,
            quality,
          });
        }
      );
      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error('❌ Upload pipeline failed:', error);
    throw error;
  }
}

// ============================================================
// PLACEHOLDER — Per job senza immagine
// ============================================================
export async function generatePlaceholderAndUpload(
  jobTitle: string
): Promise<UploadResult> {
  const url = `https://placehold.co/1080x1920/0D0D1A/7C3AED.png?text=${encodeURIComponent(jobTitle)}`;
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: 'acasting/placeholders', quality: 100, format: 'png' },
        (err, res) => {
          if (err) return reject(err);
          resolve({
            publicId: res!.public_id,
            width: res!.width,
            height: res!.height,
            bytes: res!.bytes,
            quality: 'low',
          });
        }
      )
      .end(buffer);
  });
}

// ============================================================
// TEXT ENCODING + COLORS
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
// 🔥 QUALITY-AWARE ENHANCEMENT PIPELINE
// Genera trasformazioni diverse in base alla qualità sorgente
// ============================================================
function buildEnhancementTransforms(
  sourceQuality: 'high' | 'medium' | 'low',
  width: number,
  height: number,
  style: ImageStyle
): string[] {
  const transforms: string[] = [];

  switch (sourceQuality) {
    case 'high':
      // Immagine già buona → ridimensiona e basta
      transforms.push(`w_${width},h_${height},c_fill,g_auto`);
      transforms.push('q_90');
      transforms.push('f_jpg');
      transforms.push('e_sharpen:50');
      break;

    case 'medium':
      // Qualità media → upscale prima, poi ridimensiona
      // Cloudinary: prima porta a dimensione grande, poi ritaglia
      transforms.push(`w_${width},h_${height},c_fill,g_auto`);
      transforms.push('q_90');
      transforms.push('f_jpg');
      // Enhance per migliorare dettagli
      transforms.push('e_improve:outdoor');
      transforms.push('e_sharpen:70');
      // Anti-noise per rimuovere artefatti da compressione
      transforms.push('e_noise:10');
      break;

    case 'low':
      // Qualità bassa → pipeline aggressiva
      // Step 1: Upscale con AI (raddoppia risoluzione)
      transforms.push('e_upscale');
      // Step 2: Ridimensiona alla dimensione target
      transforms.push(`w_${width},h_${height},c_fill,g_auto`);
      transforms.push('q_90');
      transforms.push('f_jpg');
      // Step 3: Enhancement suite completa
      transforms.push('e_improve:outdoor:70');
      transforms.push('e_sharpen:80');
      // Step 4: Denoise per pulire artefatti
      transforms.push('e_noise:15');
      // Step 5: Vibrance per colori più vivi (maschera la bassa qualità)
      transforms.push('e_vibrance:30');
      break;
  }

  return transforms;
}

// ============================================================
// 🔥 SMART OVERLAY BUILDER
// Adatta brightness e overlay in base alla qualità sorgente
// ============================================================
function buildSmartBrightness(
  sourceQuality: 'high' | 'medium' | 'low',
  style: ImageStyle,
  customBrightness?: number
): number {
  // Se l'utente ha specificato un valore custom, rispettalo
  if (customBrightness !== undefined) return customBrightness;

  // Per immagini di bassa qualità, brightness più scuro per nascondere artefatti
  const qualityAdjust = sourceQuality === 'low' ? -10 : sourceQuality === 'medium' ? -5 : 0;

  const baseBrightness = {
    cinematic: -85,
    purple: -60,
    noir: -95,
    custom: -75,
  }[style];

  return Math.max(-100, baseBrightness + qualityAdjust);
}

// ============================================================
// BUILD OVERLAY URL — Preview (quality-aware)
// ============================================================
export function buildOverlayUrl(
  publicId: string,
  job: AcastingJob,
  style: ImageStyle = 'cinematic',
  custom?: CustomImageSettings,
  sourceQuality: 'high' | 'medium' | 'low' = 'high'
): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

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

  const brightness = buildSmartBrightness(sourceQuality, style, custom?.brightness);

  const salaryText =
    !job.salary || job.salary === 'Ej angivet'
      ? 'Arvode: Ej angivet'
      : `Arvode: ${job.salary} kr`;
  const expiryText = `Ansök senast: ${job.expiryDate?.split('T')[0] || 'Löpande'}`;

  // Phase 1: Enhancement (quality-aware)
  const enhancementTransforms = buildEnhancementTransforms(
    sourceQuality,
    width,
    height,
    style
  );

  // Phase 2: Brightness + style effects
  const styleTransforms = [
    `e_brightness:${brightness}`,
  ];

  // Per stile noir, aggiungi desaturazione
  if (style === 'noir') {
    styleTransforms.push('e_grayscale');
    styleTransforms.push('e_contrast:30');
  }

  // Per stile purple, aggiungi tint viola
  if (style === 'purple') {
    styleTransforms.push('e_tint:40:7C3AED:blueviolet');
  }

  // Phase 3: Vignettatura (migliora il look e maschera bordi di bassa qualità)
  const vignetteTransforms = ['e_vignette:30'];

  // Phase 4: Text overlays
  const textTransforms = [
    `l_text:${titleFont}_${titleSize}_bold_center:${enc(titleText)},g_center,y_${titleY},w_940,c_fit,co_${titleColor}`,
    'l_text:Arial_65_bold:__,g_center,y_-80,co_rgb:FFFFFF',
    `l_text:${bodyFont}_${bodySize}_bold_center:${enc(salaryText)},g_center,y_40,w_900,c_fit,co_${bodyColor}`,
    `l_text:${bodyFont}_${bodySize}_bold_center:${enc(expiryText)},g_center,y_140,w_900,c_fit,co_${bodyColor}`,
    `l_text:${bodyFont}_44_bold_center:${enc('Ansök nu på')},g_center,y_300,w_900,c_fit,co_${bodyColor}`,
    `l_text:${titleFont}_48_bold_center:${enc(ctaText)},g_center,y_380,w_900,c_fit,co_${accentColor}`,
  ];

  const allTransforms = [
    ...enhancementTransforms,
    ...styleTransforms,
    ...vignetteTransforms,
    ...textTransforms,
  ].join('/');

  const finalUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${allTransforms}/${publicId}`;

  console.log(`🎨 Overlay URL (quality: ${sourceQuality}): ${finalUrl.substring(0, 150)}...`);

  return finalUrl;
}

// ============================================================
// BUILD HD DOWNLOAD URL — Massima qualità
// ============================================================
export function buildHDDownloadUrl(
  publicId: string,
  job: AcastingJob,
  style: ImageStyle = 'cinematic',
  custom?: CustomImageSettings,
  sourceQuality: 'high' | 'medium' | 'low' = 'high'
): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

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

  const brightness = buildSmartBrightness(sourceQuality, style, custom?.brightness);

  const salaryText =
    !job.salary || job.salary === 'Ej angivet'
      ? 'Arvode: Ej angivet'
      : `Arvode: ${job.salary} kr`;
  const expiryText = `Ansök senast: ${job.expiryDate?.split('T')[0] || 'Löpande'}`;

  // Per download: pipeline ancora più aggressiva
  const enhancementTransforms: string[] = [];

  if (sourceQuality === 'low') {
    enhancementTransforms.push('e_upscale');
    enhancementTransforms.push(`w_${width},h_${height},c_fill,g_auto`);
    enhancementTransforms.push('e_improve:outdoor:80');
    enhancementTransforms.push('e_sharpen:90');
    enhancementTransforms.push('e_noise:20');
    enhancementTransforms.push('e_vibrance:40');
  } else if (sourceQuality === 'medium') {
    enhancementTransforms.push(`w_${width},h_${height},c_fill,g_auto`);
    enhancementTransforms.push('e_improve:outdoor:60');
    enhancementTransforms.push('e_sharpen:70');
    enhancementTransforms.push('e_noise:10');
  } else {
    enhancementTransforms.push(`w_${width},h_${height},c_fill,g_auto`);
    enhancementTransforms.push('e_sharpen:50');
  }

  const styleTransforms = [`e_brightness:${brightness}`];
  if (style === 'noir') {
    styleTransforms.push('e_grayscale');
    styleTransforms.push('e_contrast:30');
  }
  if (style === 'purple') {
    styleTransforms.push('e_tint:40:7C3AED:blueviolet');
  }

  const textTransforms = [
    `l_text:${titleFont}_${titleSize}_bold_center:${enc(titleText)},g_center,y_${titleY},w_940,c_fit,co_${titleColor}`,
    'l_text:Arial_65_bold:__,g_center,y_-80,co_rgb:FFFFFF',
    `l_text:${bodyFont}_${bodySize}_bold_center:${enc(salaryText)},g_center,y_40,w_900,c_fit,co_${bodyColor}`,
    `l_text:${bodyFont}_${bodySize}_bold_center:${enc(expiryText)},g_center,y_140,w_900,c_fit,co_${bodyColor}`,
    `l_text:${bodyFont}_44_bold_center:${enc('Ansök nu på')},g_center,y_300,w_900,c_fit,co_${bodyColor}`,
    `l_text:${titleFont}_48_bold_center:${enc(ctaText)},g_center,y_380,w_900,c_fit,co_${accentColor}`,
  ];

  const allTransforms = [
    ...enhancementTransforms,
    // Download: qualità massima PNG
    'q_100',
    'f_png',
    'e_vignette:30',
    ...styleTransforms,
    ...textTransforms,
  ].join('/');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${allTransforms}/${publicId}`;
}