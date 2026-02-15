// lib/image-generator.ts — Server-side image generation with Sharp
// This generates the FINAL image server-side, then uploads to Cloudinary for hosting.
// No more Cloudinary URL transformations = no more quality issues.

import sharp from 'sharp';
import type { AcastingJob, ImageStyle, CustomImageSettings } from './types';

// ============================================================
// TYPES
// ============================================================
export interface GeneratedImage {
  buffer: Buffer;
  width: number;
  height: number;
  sourceQuality: 'high' | 'medium' | 'low';
}

// ============================================================
// FETCH SOURCE IMAGE
// ============================================================
function getImageUrlCandidates(imageUrl: string): string[] {
  const candidates: string[] = [];

  if (imageUrl.includes('assets.acasting.se')) {
    const blobMatch = imageUrl.match(
      /plain\/(https:\/\/acasting\.blob\.core\.windows\.net\/.+)/
    );
    if (blobMatch) candidates.push(blobMatch[1]);
    candidates.push(imageUrl.replace(/w:\d+/, 'w:2000'));
    candidates.push(imageUrl.replace(/w:\d+/, 'w:1200'));
  }

  if (
    imageUrl.includes('acasting.blob.core.windows.net') &&
    !candidates.includes(imageUrl)
  ) {
    candidates.unshift(imageUrl);
  }

  if (!candidates.includes(imageUrl)) candidates.push(imageUrl);
  return candidates;
}

async function fetchSourceImage(imageUrl: string): Promise<Buffer | null> {
  const candidates = getImageUrlCandidates(imageUrl);

  for (const url of candidates) {
    try {
      console.log(`🔄 Fetching: ${url.substring(0, 100)}...`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          Accept: 'image/*,*/*;q=0.8',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) continue;

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 1024) continue;

      console.log(`✅ Source: ${(buffer.length / 1024).toFixed(1)} KB`);
      return buffer;
    } catch {
      continue;
    }
  }
  return null;
}

// ============================================================
// CLASSIFY QUALITY
// ============================================================
function classifyQuality(width: number, height: number): 'high' | 'medium' | 'low' {
  const mp = (width * height) / 1_000_000;
  if (mp >= 1.5) return 'high';
  if (mp >= 0.5) return 'medium';
  return 'low';
}

// ============================================================
// ESCAPE XML for SVG text
// ============================================================
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ============================================================
// WORD WRAP for SVG text
// ============================================================
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    }
  }
  if (currentLine) lines.push(currentLine.trim());
  return lines;
}

// ============================================================
// BUILD SVG TEXT OVERLAY
// Creates all text + gradient as a single SVG, composited on top
// ============================================================
function buildTextOverlaySvg(
  job: AcastingJob,
  width: number,
  height: number,
  style: ImageStyle,
  custom?: CustomImageSettings
): Buffer {
  const titleText = custom?.titleText || job.title || 'Casting';
  const accentHex = custom?.accentColor ?? '7C3AED';
  const titleSize = custom?.titleSize ?? 56;

  const salaryText =
    !job.salary || job.salary === 'Ej angivet'
      ? 'Arvode: Ej angivet'
      : `Arvode: ${job.salary} kr`;
  const expiryText = `Ansök senast: ${job.expiryDate?.split('T')[0] || 'Löpande'}`;

  // Word-wrap title
  const titleLines = wrapText(titleText, 28);
  const titleBlockHeight = titleLines.length * (titleSize + 8);

  // Calculate vertical positions (centered in lower half)
  const titleStartY = height * 0.38;
  const separatorY = titleStartY + titleBlockHeight + 30;
  const salaryY = separatorY + 80;
  const expiryY = salaryY + 70;
  const ctaLabelY = expiryY + 100;
  const ctaBrandY = ctaLabelY + 60;

  // Style-based gradient
  let gradientColor = '13, 13, 26'; // dark blue-black default
  let gradientOpacity = 0.85;

  if (style === 'noir') {
    gradientColor = '0, 0, 0';
    gradientOpacity = 0.9;
  } else if (style === 'purple') {
    gradientColor = '45, 15, 80';
    gradientOpacity = 0.8;
  }

  const titleSvgLines = titleLines
    .map(
      (line, i) =>
        `<text x="${width / 2}" y="${titleStartY + i * (titleSize + 8)}" 
          font-family="Arial, Helvetica, sans-serif" font-size="${titleSize}" font-weight="bold" 
          fill="white" text-anchor="middle">${escapeXml(line)}</text>`
    )
    .join('\n');

  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gradient overlay: transparent top → dark bottom -->
    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(${gradientColor}, 0)" />
      <stop offset="25%" stop-color="rgba(${gradientColor}, 0.1)" />
      <stop offset="45%" stop-color="rgba(${gradientColor}, ${gradientOpacity * 0.5})" />
      <stop offset="65%" stop-color="rgba(${gradientColor}, ${gradientOpacity * 0.8})" />
      <stop offset="100%" stop-color="rgba(${gradientColor}, ${gradientOpacity})" />
    </linearGradient>
    <!-- Top gradient for vignette -->
    <linearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0.4)" />
      <stop offset="30%" stop-color="rgba(0,0,0,0)" />
    </linearGradient>
  </defs>

  <!-- Gradient overlays -->
  <rect width="${width}" height="${height}" fill="url(#grad)" />
  <rect width="${width}" height="${height * 0.3}" fill="url(#topGrad)" />

  <!-- Title -->
  ${titleSvgLines}

  <!-- Separator line -->
  <line x1="${width / 2 - 30}" y1="${separatorY}" x2="${width / 2 + 30}" y2="${separatorY}" 
    stroke="white" stroke-width="3" stroke-linecap="round" />

  <!-- Salary -->
  <text x="${width / 2}" y="${salaryY}" 
    font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="bold" 
    fill="white" text-anchor="middle">${escapeXml(salaryText)}</text>

  <!-- Expiry -->
  <text x="${width / 2}" y="${expiryY}" 
    font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="bold" 
    fill="white" text-anchor="middle">${escapeXml(expiryText)}</text>

  <!-- CTA Label -->
  <text x="${width / 2}" y="${ctaLabelY}" 
    font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="bold" 
    fill="rgba(255,255,255,0.9)" text-anchor="middle">Ansök nu på</text>

  <!-- CTA Brand -->
  <text x="${width / 2}" y="${ctaBrandY}" 
    font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="bold" 
    fill="#${accentHex}" text-anchor="middle">ACASTING.SE</text>
</svg>`;

  return Buffer.from(svg);
}

// ============================================================
// 🔥 MAIN: Generate Social Image
// ============================================================
export async function generateSocialImage(
  imageUrl: string | null,
  job: AcastingJob,
  style: ImageStyle = 'cinematic',
  custom?: CustomImageSettings
): Promise<GeneratedImage> {
  const W = custom?.outputWidth ?? 1080;
  const H = custom?.outputHeight ?? 1920;

  let sourceQuality: 'high' | 'medium' | 'low' = 'low';
  let backgroundBuffer: Buffer;

  // Step 1: Prepare background
  if (imageUrl) {
    const sourceBuffer = await fetchSourceImage(imageUrl);

    if (sourceBuffer) {
      const metadata = await sharp(sourceBuffer).metadata();
      const srcW = metadata.width || 0;
      const srcH = metadata.height || 0;
      sourceQuality = classifyQuality(srcW, srcH);

      console.log(`📐 Source: ${srcW}x${srcH} → Quality: ${sourceQuality.toUpperCase()}`);

      // Process background based on quality
      let bgPipeline = sharp(sourceBuffer).resize(W, H, {
        fit: 'cover',
        position: 'attention', // Smart crop (face detection)
      });

      if (sourceQuality === 'low') {
        // LOW: Heavy blur → atmospheric background (like iOS lockscreen)
        // This makes ANY image look great regardless of resolution
        bgPipeline = bgPipeline
          .blur(40)          // Strong gaussian blur (removes all pixel artifacts)
          .modulate({
            brightness: 0.6,  // Darken
            saturation: 1.4,  // Boost colors (blur makes them flat)
          })
          .gamma(1.5);       // Lift shadows slightly for depth
      } else if (sourceQuality === 'medium') {
        // MEDIUM: Light blur + darken
        bgPipeline = bgPipeline
          .blur(12)          // Soft blur (hides compression artifacts)
          .modulate({
            brightness: 0.55,
            saturation: 1.2,
          });
      } else {
        // HIGH: Crisp image, just darken for text readability
        bgPipeline = bgPipeline
          .modulate({
            brightness: 0.4,  // Darken significantly for white text contrast
            saturation: 1.1,
          })
          .sharpen({ sigma: 1.2 }); // Subtle sharpening
      }

      // Apply style-specific color grading
      if (style === 'noir') {
        bgPipeline = bgPipeline.greyscale().modulate({ brightness: 0.85 });
      } else if (style === 'purple') {
        bgPipeline = bgPipeline.tint({ r: 100, g: 40, b: 160 });
      }

      backgroundBuffer = await bgPipeline.toFormat('png').toBuffer();
    } else {
      // Source fetch failed → solid gradient background
      console.log('⚠️ Source fetch failed, using gradient background');
      backgroundBuffer = await createGradientBackground(W, H, style);
    }
  } else {
    // No image URL → gradient background
    backgroundBuffer = await createGradientBackground(W, H, style);
  }

  // Step 2: Create text overlay SVG
  const textSvg = buildTextOverlaySvg(job, W, H, style, custom);

  // Step 3: Composite everything
  const finalBuffer = await sharp(backgroundBuffer)
    .composite([
      {
        input: textSvg,
        top: 0,
        left: 0,
        blend: 'over',
      },
    ])
    .png({ quality: 100 }) // Lossless output
    .toBuffer();

  console.log(`✅ Generated: ${W}x${H}, ${(finalBuffer.length / 1024).toFixed(1)} KB, quality: ${sourceQuality}`);

  return {
    buffer: finalBuffer,
    width: W,
    height: H,
    sourceQuality,
  };
}

// ============================================================
// GRADIENT BACKGROUND (fallback when no image available)
// ============================================================
async function createGradientBackground(
  width: number,
  height: number,
  style: ImageStyle
): Promise<Buffer> {
  let topColor: string;
  let bottomColor: string;

  switch (style) {
    case 'noir':
      topColor = '#1a1a1a';
      bottomColor = '#000000';
      break;
    case 'purple':
      topColor = '#2d0f50';
      bottomColor = '#0d0d1a';
      break;
    default:
      topColor = '#1a1028';
      bottomColor = '#0d0d1a';
  }

  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${topColor}" />
      <stop offset="100%" stop-color="${bottomColor}" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)" />
</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}