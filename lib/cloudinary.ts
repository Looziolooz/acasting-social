import { v2 as cloudinary } from 'cloudinary';
import type { AcastingJob, ImageStyle, CustomOverlayStyle } from './types';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ─────────────────────────────────────────────────────────────────
// Style configs
// ─────────────────────────────────────────────────────────────────
const PRESET_MAP = {
  dark:   { brightness: -85, titleColor: 'white',  subColor: 'white',  accentHex: '7C3AED' },
  purple: { brightness: -60, titleColor: 'white',  subColor: 'E5D5FF', accentHex: 'A78BFA' },
  noir:   { brightness: -95, titleColor: 'white',  subColor: 'CCCCCC', accentHex: 'FFFFFF' },
};

/** Return the correct Cloudinary color string: named or rgb:RRGGBB */
function coColor(c: string): string {
  return /^[0-9A-Fa-f]{6}$/.test(c) ? `rgb:${c}` : c;
}

/** Build Cloudinary SDK transformation array */
function buildTransformations(
  job: AcastingJob,
  style: ImageStyle,
  customStyle?: CustomOverlayStyle
) {
  let brightness: number, titleColor: string, subColor: string, accentHex: string;
  let font: string, titleSize: number, bodySize: number, titleY: number, bodyY: number;

  if (style === 'custom' && customStyle) {
    brightness  = customStyle.brightness;
    titleColor  = customStyle.titleColor;
    subColor    = customStyle.bodyColor;
    accentHex   = customStyle.accentColor;
    font        = customStyle.titleFontFamily.replace(/ /g, '_');
    titleSize   = customStyle.titleFontSize;
    bodySize    = customStyle.bodyFontSize;
    titleY      = customStyle.titleY;
    bodyY       = customStyle.bodyY;
  } else {
    const p    = PRESET_MAP[style as keyof typeof PRESET_MAP] ?? PRESET_MAP.dark;
    brightness = p.brightness;
    titleColor = p.titleColor;
    subColor   = p.subColor;
    accentHex  = p.accentHex;
    font       = 'Arial';
    titleSize  = 46;
    bodySize   = 42;
    titleY     = -250;
    bodyY      = 40;
  }

  const divY   = bodyY - 80;
  const expY   = bodyY + 100;
  const ctaY   = bodyY + 260;
  const brandY = bodyY + 350;

  const title  = job.title || 'Casting';
  const salary = job.salary ? `Arvode: ${job.salary} kr` : 'Arvode: Ej angivet';
  const expiry = `Ansök senast: ${job.expiryDate ? job.expiryDate.split('T')[0] : 'Löpande'}`;

  return [
    { width: 1080, height: 1920, crop: 'fill' as const, gravity: 'face:auto', quality: 90 },
    { effect: `brightness:${brightness}` },
    // Title
    {
      overlay: { font_family: font, font_size: titleSize, font_weight: 'bold', text_align: 'center', text: title },
      gravity: 'center', y: titleY, width: 900, crop: 'fit' as const, color: coColor(titleColor),
    },
    // Divider
    {
      overlay: { font_family: 'Arial', font_size: 65, font_weight: 'bold', text: '__' },
      gravity: 'center', y: divY, color: coColor(accentHex),
    },
    // Salary
    {
      overlay: { font_family: font, font_size: bodySize, font_weight: 'bold', text_align: 'center', text: salary },
      gravity: 'center', y: bodyY, width: 900, crop: 'fit' as const, color: coColor(subColor),
    },
    // Expiry
    {
      overlay: { font_family: font, font_size: bodySize, font_weight: 'bold', text_align: 'center', text: expiry },
      gravity: 'center', y: expY, width: 900, crop: 'fit' as const, color: coColor(subColor),
    },
    // CTA
    {
      overlay: { font_family: font, font_size: bodySize, font_weight: 'bold', text_align: 'center', text: 'Ansök nu på' },
      gravity: 'center', y: ctaY, width: 900, crop: 'fit' as const, color: coColor(subColor),
    },
    // Brand
    {
      overlay: { font_family: font, font_size: bodySize + 4, font_weight: 'bold', text_align: 'center', text: 'ACASTING.se' },
      gravity: 'center', y: brandY, width: 900, crop: 'fit' as const, color: coColor(accentHex),
    },
  ];
}

// ─────────────────────────────────────────────────────────────────
// Main export: upload source → transform via SDK → fetch server-side
// → re-upload processed image → return clean URL (no transform params)
// ─────────────────────────────────────────────────────────────────
export async function generateOverlayImage(
  sourceUrl: string,
  job: AcastingJob,
  style: ImageStyle = 'dark',
  customStyle?: CustomOverlayStyle
): Promise<string> {
  console.log('[cloudinary] Uploading source image:', sourceUrl);

  // 1. Upload source image to Cloudinary
  const uploaded = await cloudinary.uploader.upload(sourceUrl, {
    folder: 'acasting_source',
    resource_type: 'image',
  });
  console.log('[cloudinary] Source public_id:', uploaded.public_id);

  // 2. Build transformation URL using SDK (handles encoding properly)
  const transformation = buildTransformations(job, style, customStyle);
  const cdnUrl = cloudinary.url(uploaded.public_id, {
    secure: true,
    format: 'jpg',
    transformation,
  });
  console.log('[cloudinary] CDN transform URL:', cdnUrl);

  // 3. Fetch transformed image server-side (Node.js, no browser encoding issues)
  const res = await fetch(cdnUrl);
  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Cloudinary transform failed [${res.status}]: ${errText}`);
  }

  // 4. Re-upload processed image as a standalone clean asset
  const buffer = Buffer.from(await res.arrayBuffer());
  const dataUri = `data:image/jpeg;base64,${buffer.toString('base64')}`;

  const finalResult = await cloudinary.uploader.upload(dataUri, {
    folder: 'acasting_processed',
    format: 'jpg',
    resource_type: 'image',
  });
  console.log('[cloudinary] Final clean URL:', finalResult.secure_url);

  // 5. Return clean direct URL — no transformation params, no encoding issues
  return finalResult.secure_url;
}

export async function generatePlaceholderAndUpload(jobTitle: string): Promise<string> {
  const result = await cloudinary.uploader.upload(
    `https://placehold.co/1080x1920/0D0D1A/7C3AED.jpg?text=${encodeURIComponent((jobTitle || 'Casting').slice(0, 30))}`,
    { folder: 'acasting_source' }
  );
  return result.secure_url;
}
